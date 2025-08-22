// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// --- Переменные окружения ---
// @ts-ignore
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
// @ts-ignore
const ADMIN_TELEGRAM_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// --- Вспомогательные функции ---
async function sendMessage(chatId: string | number, text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("LOG: TELEGRAM_BOT_TOKEN не установлен.");
    return;
  }
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`LOG: Ошибка Telegram API (sendMessage) для chatId ${chatId}:`, JSON.stringify(errorData, null, 2));
    }
  } catch (e) {
    console.error(`LOG: Не удалось отправить сообщение в Telegram для ${chatId}:`, e);
  }
}

serve(async (req) => {
  try {
    const payload = await req.json();
    console.log("--- Получен вебхук от Telegram ---", JSON.stringify(payload, null, 2));

    const message = payload.message;

    if (!message || !message.from) {
      console.log("LOG: Получен вебхук без сообщения или отправителя. Игнорируется.");
      return new Response("OK", { status: 200 });
    }

    const senderId = String(message.from.id);
    const adminId = ADMIN_TELEGRAM_CHAT_ID;
    console.log(`LOG: ID отправителя: ${senderId}, ID админа из секрета: ${adminId}`);

    if (senderId !== adminId) {
      console.log("LOG: Сообщение не от администратора. Игнорируется.");
      return new Response("OK", { status: 200 });
    }
    console.log("LOG: Сообщение от администратора.");

    const isReply = message.reply_to_message && message.reply_to_message.text;
    if (!isReply) {
      console.log("LOG: Сообщение не является ответом. Игнорируется.");
      return new Response("OK", { status: 200 });
    }
    console.log("LOG: Сообщение является ответом.");

    const replyText = message.text ? message.text.toLowerCase().trim() : "";
    if (!['ok', 'ок'].includes(replyText)) {
      console.log(`LOG: Текст ответа "${replyText}" не является командой. Игнорируется.`);
      return new Response("OK", { status: 200 });
    }
    console.log("LOG: Получена команда 'ok'.");

    const originalText = message.reply_to_message.text;
    const orderIdMatch = originalText.match(/Номер заказа: #(\S+)/);

    if (!orderIdMatch || !orderIdMatch[1]) {
      console.log("LOG: Не удалось найти номер заказа в исходном сообщении.");
      return new Response("OK", { status: 200 });
    }
    const orderId = orderIdMatch[1];
    console.log(`LOG: Найден номер заказа: ${orderId}`);

    const supabase = createClient(
      // @ts-ignore
      Deno.env.get("SUPABASE_URL")!,
      // @ts-ignore
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('status, telegram_id')
      .eq('order_id', orderId)
      .single();

    if (findError || !order) {
      console.error(`LOG: Заказ #${orderId} не найден в базе данных.`, findError);
      await sendMessage(ADMIN_TELEGRAM_CHAT_ID, `❌ Ошибка: Заказ #${orderId} не найден в базе данных.`);
      return new Response("OK", { status: 200 });
    }
    console.log(`LOG: Найден заказ #${orderId}. Текущий статус: ${order.status}.`);

    if (order.status === 'Новая заявка') {
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'Оплачен' })
        .eq('order_id', orderId);

      if (updateError) {
        console.error(`LOG: Ошибка обновления заказа #${orderId}.`, updateError);
        await sendMessage(ADMIN_TELEGRAM_CHAT_ID, `❌ Ошибка базы данных при обновлении заказа #${orderId}: ${updateError.message}`);
      } else {
        console.log(`LOG: Статус заказа #${orderId} успешно изменен на 'Оплачен'.`);
        await sendMessage(ADMIN_TELEGRAM_CHAT_ID, `✅ Заказ #${orderId} успешно отмечен как оплаченный.`);
        await sendMessage(order.telegram_id, `✅ Ваша заявка #${orderId} была оплачена и принята в обработку.`);
      }
    } else {
      console.warn(`LOG: Попытка изменить статус заказа #${orderId}, который уже в статусе '${order.status}'.`);
      await sendMessage(ADMIN_TELEGRAM_CHAT_ID, `⚠️ Невозможно изменить статус заказа #${orderId}. Его текущий статус: *${order.status}*.`);
    }

  } catch (e) {
    console.error("--- КРИТИЧЕСКАЯ ОШИБКА в telegram-webhook ---", e);
  }

  return new Response("OK", { status: 200 });
});