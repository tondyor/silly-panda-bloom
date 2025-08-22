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

/**
 * Отправляет сообщение в указанный чат Telegram.
 * @param chatId ID чата для отправки.
 * @param text Текст сообщения с поддержкой Markdown.
 */
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

    // --- Основная логика обработки ответа администратора ---
    const message = payload.message;

    // 1. Проверяем, что это сообщение, что оно от админа, что это ответ и что текст "ок"
    if (
      message &&
      message.from &&
      String(message.from.id) === ADMIN_TELEGRAM_CHAT_ID &&
      message.reply_to_message &&
      message.reply_to_message.text &&
      message.text &&
      ['ok', 'ок'].includes(message.text.toLowerCase().trim())
    ) {
      console.log("LOG: Получен ответ 'ok' от администратора.");

      // 2. Извлекаем номер заказа из оригинального сообщения
      const originalText = message.reply_to_message.text;
      const orderIdMatch = originalText.match(/Номер заказа: #(\S+)/);

      if (!orderIdMatch || !orderIdMatch[1]) {
        console.log("LOG: Не удалось найти номер заказа в исходном сообщении.");
        return new Response("OK", { status: 200 }); // Завершаем, чтобы избежать повторных попыток от Telegram
      }
      const orderId = orderIdMatch[1];
      console.log(`LOG: Найден номер заказа: ${orderId}`);

      // 3. Подключаемся к Supabase и обновляем заказ
      const supabase = createClient(
        // @ts-ignore
        Deno.env.get("SUPABASE_URL")!,
        // @ts-ignore
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Находим заказ
      const { data: order, error: findError } = await supabase
        .from('orders')
        .select('status, telegram_id')
        .eq('order_id', orderId)
        .single();

      if (findError || !order) {
        await sendMessage(ADMIN_TELEGRAM_CHAT_ID, `❌ Ошибка: Заказ #${orderId} не найден в базе данных.`);
        return new Response("OK", { status: 200 });
      }

      // Проверяем статус
      if (order.status === 'Новая заявка') {
        // Обновляем статус на "Оплачен"
        const { error: updateError } = await supabase
          .from('orders')
          .update({ status: 'Оплачен' })
          .eq('order_id', orderId);

        if (updateError) {
          await sendMessage(ADMIN_TELEGRAM_CHAT_ID, `❌ Ошибка базы данных при обновлении заказа #${orderId}: ${updateError.message}`);
        } else {
          console.log(`LOG: Статус заказа #${orderId} успешно изменен на 'Оплачен'.`);
          // Уведомляем админа и клиента
          await sendMessage(ADMIN_TELEGRAM_CHAT_ID, `✅ Заказ #${orderId} успешно отмечен как оплаченный.`);
          await sendMessage(order.telegram_id, `✅ Ваша заявка #${orderId} была оплачена и принята в обработку.`);
        }
      } else {
        // Если статус другой, уведомляем админа
        await sendMessage(ADMIN_TELEGRAM_CHAT_ID, `⚠️ Невозможно изменить статус заказа #${orderId}. Его текущий статус: *${order.status}*.`);
      }
    }

  } catch (e) {
    console.error("--- КРИТИЧЕСКАЯ ОШИБКА в telegram-webhook ---", e);
  }

  // Всегда отвечаем Telegram "OK", чтобы он не слал повторные запросы
  return new Response("OK", { status: 200 });
});