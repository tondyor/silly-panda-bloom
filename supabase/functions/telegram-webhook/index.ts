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
      const repliedToMessage = message.reply_to_message;
      if (!repliedToMessage || !repliedToMessage.text) {
        console.log("LOG: Admin message is not a reply or replied-to message has no text. Ignoring.");
        return new Response("OK", { status: 200 });
      }

      const originalText = repliedToMessage.text;
      let orderId: string | null = null;
      let targetTelegramId: string | null = null; // The user ID to send the message to

      // Try to extract orderId and targetTelegramId from a forwarded user message
      const userMessageMatch = originalText.match(/\(ID: `(\d+)`\) по заказу #(\S+):/);
      if (userMessageMatch) {
        targetTelegramId = userMessageMatch[1];
        orderId = userMessageMatch[2];
        console.log(`LOG: Admin replied to a user message. Target User ID: ${targetTelegramId}, Order ID: ${orderId}`);
      } else {
        // Fallback: Try to extract orderId from an initial order notification (for commands like ok/stop)
        const orderNotificationMatch = originalText.match(/Номер заказа: #(\S+)/);
        if (orderNotificationMatch) {
          orderId = orderNotificationMatch[1];
          // In this case, targetTelegramId will be fetched from the order itself
          console.log(`LOG: Admin replied to an order notification. Order ID: ${orderId}`);
        }
      }

      if (!orderId) {
        console.log("LOG: Could not determine order ID from replied-to message. Ignoring.");
        return new Response("OK", { status: 200 });
      }

      // Fetch order details to get the actual telegram_id and status
      const { data: order, error: findError } = await supabase
        .from('orders')
        .select('status, telegram_id, admin_conversation_started')
        .eq('order_id', orderId)
        .single();

      if (findError || !order) {
        await sendMessage(adminId, `❌ Ошибка: Заказ #${orderId} не найден.`);
        return new Response("OK", { status: 200 });
      }

      // If targetTelegramId was not extracted from the replied-to message (e.g., it was an order notification),
      // use the order's telegram_id as the target.
      if (!targetTelegramId) {
        targetTelegramId = String(order.telegram_id);
      }

      const replyText = message.text ? message.text.trim() : "";
      const commandText = replyText.toLowerCase();

      // Handle commands first
      if (['ok', 'ок'].includes(commandText)) {
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
      else if (replyText.startsWith('/')) { // This is the old /сообщение command
        const messageToUser = replyText.substring(1).trim();
        if (messageToUser) {
          const timestamp = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
          const formattedMessage = `[ADMIN - ${timestamp}]: ${messageToUser}`;
          await supabase.rpc('append_to_chat_history', {
              target_order_id: orderId,
              new_message: formattedMessage
          });
          await sendMessage(targetTelegramId, `*Администратор:*\n${messageToUser}`);
          await sendMessage(adminId, `✅ Сообщение отправлено клиенту по заказу #${orderId} и сохранено в истории.`);
          if (!order.admin_conversation_started) {
            await supabase.from('orders').update({ admin_conversation_started: true }).eq('order_id', orderId);
          }
        } else {
          await sendMessage(adminId, `⚠️ Нельзя отправить пустое сообщение.`);
        }
      }
      else if (replyText) { // This is the new direct reply logic (non-command)
        console.log(`LOG: Admin sending direct reply to user ${targetTelegramId} for order #${orderId}.`);
        const timestamp = new Date().toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' });
        const formattedMessage = `[ADMIN - ${timestamp}]: ${replyText}`;
        await supabase.rpc('append_to_chat_history', {
            target_order_id: orderId,
            new_message: formattedMessage
        });
        await sendMessage(targetTelegramId, `*Администратор:*\n${replyText}`);
        await sendMessage(adminId, `✅ Сообщение отправлено клиенту по заказу #${orderId} и сохранено в истории.`);
        if (!order.admin_conversation_started) {
          await supabase.from('orders').update({ admin_conversation_started: true }).eq('order_id', orderId);
        }
      } else {
        console.log(`LOG: Admin's reply is empty or not a recognized command. Ignoring.`);
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