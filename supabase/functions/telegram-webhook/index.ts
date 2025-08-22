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
    console.log("--- Получен вебхук от Telegram ---");

    const message = payload.message;
    if (!message || !message.from) {
      console.log("LOG: Получен вебхук без сообщения или отправителя. Игнорируется.");
      return new Response("OK", { status: 200 });
    }

    const senderId = String(message.from.id);
    const adminId = ADMIN_TELEGRAM_CHAT_ID;
    
    const supabase = createClient(
      // @ts-ignore
      Deno.env.get("SUPABASE_URL")!,
      // @ts-ignore
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- ЛОГИКА ДЛЯ АДМИНИСТРАТОРА ---
    if (senderId === adminId) {
      console.log("LOG: Сообщение от администратора.");
      const isReply = message.reply_to_message && message.reply_to_message.text;
      if (!isReply) {
        console.log("LOG: Сообщение не является ответом. Игнорируется.");
        return new Response("OK", { status: 200 });
      }

      const originalText = message.reply_to_message.text;
      const orderIdMatch = originalText.match(/Номер заказа: #(\S+)/);
      if (!orderIdMatch || !orderIdMatch[1]) {
        console.log("LOG: Не удалось найти номер заказа в исходном сообщении.");
        return new Response("OK", { status: 200 });
      }
      const orderId = orderIdMatch[1];
      console.log(`LOG: Администратор работает с заказом #${orderId}`);

      const { data: order, error: findError } = await supabase
        .from('orders')
        .select('status, telegram_id, admin_conversation_started')
        .eq('order_id', orderId)
        .single();

      if (findError || !order) {
        await sendMessage(adminId, `❌ Ошибка: Заказ #${orderId} не найден.`);
        return new Response("OK", { status: 200 });
      }

      const replyText = message.text ? message.text.trim() : "";
      const commandText = replyText.toLowerCase();

      // Команда: /сообщение
      if (replyText.startsWith('/')) {
        const messageToUser = replyText.substring(1).trim();
        if (messageToUser) {
          // 1. Логируем сообщение администратора
          const timestamp = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
          const formattedMessage = `[ADMIN - ${timestamp}]: ${messageToUser}`;
          await supabase.rpc('append_to_chat_history', {
              target_order_id: orderId,
              new_message: formattedMessage
          });

          // 2. Отправляем сообщение клиенту
          await sendMessage(order.telegram_id, `*Администратор:*\n${messageToUser}`);
          await sendMessage(adminId, `✅ Сообщение отправлено клиенту по заказу #${orderId} и сохранено в истории.`);
          
          // 3. Активируем режим диалога
          if (!order.admin_conversation_started) {
            await supabase.from('orders').update({ admin_conversation_started: true }).eq('order_id', orderId);
          }
        } else {
          await sendMessage(adminId, `⚠️ Нельзя отправить пустое сообщение.`);
        }
      }
      // Команда: ok/ок
      else if (['ok', 'ок'].includes(commandText)) {
        if (order.status === 'Новая заявка') {
          await supabase.from('orders').update({ status: 'Оплачен' }).eq('order_id', orderId);
          await sendMessage(adminId, `✅ Заказ #${orderId} отмечен как оплаченный.`);
          await sendMessage(order.telegram_id, `✅ Ваша заявка #${orderId} была оплачена и принята в обработку.`);
          if (order.admin_conversation_started) {
            await sendMessage(order.telegram_id, `Диалог с администратором по этому заказу закрыт. Администратор больше не увидит ваши сообщения.`);
          }
        } else {
          await sendMessage(adminId, `⚠️ Невозможно изменить статус заказа #${orderId}. Его текущий статус: *${order.status}*.`);
        }
      }
      // Команда: stop/стоп
      else if (['stop', 'стоп'].includes(commandText)) {
        if (order.status === 'Новая заявка') {
          await supabase.from('orders').update({ status: 'Отменен' }).eq('order_id', orderId);
          await sendMessage(adminId, `🚫 Заказ #${orderId} отменен.`);
          await sendMessage(order.telegram_id, `🚫 Ваша заявка #${orderId} была отменена администратором.`);
          if (order.admin_conversation_started) {
            await sendMessage(order.telegram_id, `Диалог с администратором по этому заказу закрыт. Администратор больше не увидит ваши сообщения.`);
          }
        } else {
          await sendMessage(adminId, `⚠️ Невозможно отменить заказ #${orderId}. Его текущий статус: *${order.status}*.`);
        }
      }
      // Неизвестная команда
      else {
        console.log(`LOG: Текст ответа "${replyText}" не является командой. Игнорируется.`);
      }
    } 
    // --- ЛОГИКА ДЛЯ КЛИЕНТА ---
    else {
      console.log(`LOG: Сообщение от клиента ID: ${senderId}.`);
      const { data: activeOrder, error: activeOrderError } = await supabase
        .from('orders')
        .select('order_id')
        .eq('telegram_id', senderId)
        .eq('status', 'Новая заявка')
        .eq('admin_conversation_started', true)
        .limit(1)
        .single();

      if (activeOrderError) {
        console.log(`LOG: Ошибка поиска активного диалога для клиента ${senderId}.`, activeOrderError.message);
      }

      if (activeOrder) {
        console.log(`LOG: Найден активный диалог для клиента ${senderId} по заказу #${activeOrder.order_id}. Пересылаю и логирую сообщение.`);
        
        // 1. Логируем сообщение клиента
        const timestamp = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
        const formattedMessage = `[USER - ${timestamp}]: ${message.text}`;
        await supabase.rpc('append_to_chat_history', {
            target_order_id: activeOrder.order_id,
            new_message: formattedMessage
        });

        // 2. Пересылаем сообщение админу
        const userFirstName = message.from.first_name || '';
        const userUsername = message.from.username ? `(@${message.from.username})` : '';
        const forwardMessage = `*Сообщение от клиента ${userFirstName} ${userUsername} (ID: \`${senderId}\`) по заказу #${activeOrder.order_id}:*\n\n${message.text}`;
        await sendMessage(adminId, forwardMessage);
      } else {
        console.log(`LOG: Для клиента ${senderId} не найдено активных диалогов. Сообщение игнорируется.`);
      }
    }

  } catch (e) {
    console.error("--- КРИТИЧЕСКАЯ ОШИБКА в telegram-webhook ---", e);
  }

  return new Response("OK", { status: 200 });
});