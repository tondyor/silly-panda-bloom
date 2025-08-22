import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// --- Переменные окружения ---
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const ADMIN_TELEGRAM_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// --- Локализованные сообщения ---
const translations = {
  ru: {
    adminOrderNotFound: "❌ Ошибка: Заказ #{orderId} не найден.",
    adminOrderPaid: "✅ Заказ #{orderId} отмечен как оплаченный.",
    clientOrderPaid: "✅ Ваша заявка #{orderId} была оплачена и принята в обработку.",
    conversationClosed: "Диалог с администратором по этому заказу закрыт. Администратор больше не увидит ваши сообщения.",
    cannotChangeStatus: "⚠️ Невозможно изменить статус заказа #{orderId}. Его текущий статус: *{status}*.",
    orderCancelledAdmin: "🚫 Заказ #{orderId} отменен.",
    clientOrderCancelled: "🚫 Ваша заявка #{orderId} была отменена администратором.",
    cannotSendEmpty: "⚠️ Нельзя отправить пустое сообщение.",
    messageSent: "✅ Сообщение отправлено клиенту по заказу #{orderId} и сохранено в истории.",
    adminPrefix: "*Администратор:*",
    clientMessagePrefix: "*Сообщение от клиента {userFirstName} {userUsername} (ID: `{senderId}`) по заказу #{orderId}:*\n\n",
    // Новые переводы для прямой отправки сообщений по имени пользователя
    adminUserNotFound: "❌ Ошибка: Пользователь с именем @{username} не найден.",
    adminMessageSentToUser: "✅ Сообщение отправлено пользователю @{username}.",
    adminDirectMessagePrefix: "*Сообщение от администратора:*",
  },
  en: {
    adminOrderNotFound: "❌ Error: Order #{orderId} not found.",
    adminOrderPaid: "✅ Order #{orderId} marked as paid.",
    clientOrderPaid: "✅ Your application #{orderId} has been paid and is being processed.",
    conversationClosed: "The conversation with the administrator for this order is closed. The administrator will no longer see your messages.",
    cannotChangeStatus: "⚠️ Cannot change status of order #{orderId}. Its current status is: *{status}*.",
    orderCancelledAdmin: "🚫 Order #{orderId} cancelled.",
    clientOrderCancelled: "🚫 Your application #{orderId} has been cancelled by the administrator.",
    cannotSendEmpty: "⚠️ Cannot send an empty message.",
    messageSent: "✅ Message sent to client for order #{orderId} and saved in history.",
    adminPrefix: "*Administrator:*",
    clientMessagePrefix: "*Message from client {userFirstName} {userUsername} (ID: `{senderId}`) for order #{orderId}:*\n\n",
    // New translations for direct messages by username
    adminUserNotFound: "❌ Error: User with username @{username} not found.",
    adminMessageSentToUser: "✅ Message sent to user @{username}.",
    adminDirectMessagePrefix: "*Message from administrator:*",
  },
  vi: {
    adminOrderNotFound: "❌ Lỗi: Không tìm thấy đơn hàng #{orderId}.",
    adminOrderPaid: "✅ Đơn hàng #{orderId} đã được đánh dấu là đã thanh toán.",
    clientOrderPaid: "✅ Đơn đăng ký #{orderId} của bạn đã được thanh toán và đang được xử lý.",
    conversationClosed: "Cuộc trò chuyện với quản trị viên cho đơn hàng này đã đóng. Quản trị viên sẽ không còn thấy tin nhắn của bạn.",
    cannotChangeStatus: "⚠️ Không thể thay đổi trạng thái đơn hàng #{orderId}. Trạng thái hiện tại của nó là: *{status}*.",
    orderCancelledAdmin: "🚫 Đơn hàng #{orderId} đã bị hủy.",
    clientOrderCancelled: "🚫 Đơn đăng ký #{orderId} của bạn đã bị quản trị viên hủy.",
    cannotSendEmpty: "⚠️ Không thể gửi tin nhắn trống.",
    messageSent: "✅ Tin nhắn đã được gửi đến khách hàng cho đơn hàng #{orderId} và đã lưu vào lịch sử.",
    adminPrefix: "*Quản trị viên:*",
    clientMessagePrefix: "*Tin nhắn từ khách hàng {userFirstName} {userUsername} (ID: `{senderId}`) cho đơn hàng #{orderId}:*\n\n",
    // New translations for direct messages by username
    adminUserNotFound: "❌ Lỗi: Không tìm thấy người dùng với tên @{username}.",
    adminMessageSentToUser: "✅ Tin nhắn đã được gửi đến người dùng @{username}.",
    adminDirectMessagePrefix: "*Tin nhắn từ quản trị viên:*",
  }
};

function getLocalizedMessage(lang: string, key: string, params: Record<string, any> = {}): string {
  const langCode = lang.split('-')[0]; // Use base language code
  const messages = translations[langCode as keyof typeof translations] || translations.ru; // Default to Russian
  let message = messages[key as keyof typeof messages] || key; // Fallback to key if not found

  for (const paramKey in params) {
    message = message.replace(`{${paramKey}}`, params[paramKey]);
  }
  return message;
}

// --- Вспомогательные функции ---
async function sendMessage(chatId: string | number, text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("LOG: TELEGRAM_BOT_TOKEN не установлен.");
    return;
  }
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
      body: JSON_stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
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
    const messageText = message.text ? message.text.trim() : "";

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // --- НОВАЯ ЛОГИКА ДЛЯ АДМИНИСТРАТОРА: ПРЯМАЯ ОТПРАВКА СООБЩЕНИЯ ПО ИМЕНИ ПОЛЬЗОВАТЕЛЯ ---
    if (senderId === adminId && messageText.startsWith('@') && !message.reply_to_message) {
      console.log("LOG: Администратор пытается отправить прямое сообщение по имени пользователя.");
      const parts = messageText.split(' ');
      const targetUsernameWithAt = parts[0]; // Например, @username
      const directMessageContent = parts.slice(1).join(' ').trim();

      if (!targetUsernameWithAt || !directMessageContent) {
        await sendMessage(adminId, getLocalizedMessage('ru', 'cannotSendEmpty'));
        return new Response("OK", { status: 200 });
      }

      const targetUsername = targetUsernameWithAt.substring(1); // Удаляем '@'

      const { data: profileData, error: profileError } = await supabase
        .from('telegram_profiles')
        .select('telegram_id, language_code')
        .eq('username', targetUsername)
        .single();

      if (profileError || !profileData) {
        console.error(`LOG: Пользователь с именем пользователя ${targetUsername} не найден или ошибка базы данных:`, profileError?.message);
        await sendMessage(adminId, getLocalizedMessage('ru', 'adminUserNotFound', { username: targetUsername }));
        return new Response("OK", { status: 200 });
      }

      const targetTelegramId = profileData.telegram_id;
      const targetUserLang = profileData.language_code || 'ru'; // Язык пользователя, по умолчанию русский

      await sendMessage(targetTelegramId, `${getLocalizedMessage(targetUserLang, 'adminDirectMessagePrefix')}\n${directMessageContent}`);
      await sendMessage(adminId, getLocalizedMessage('ru', 'adminMessageSentToUser', { username: targetUsername }));
      console.log(`LOG: Сообщение отправлено пользователю @${targetUsername} (ID: ${targetTelegramId}) от администратора.`);
      return new Response("OK", { status: 200 });
    }
    // --- КОНЕЦ НОВОЙ ЛОГИКИ ---

    // --- ЛОГИКА ДЛЯ АДМИНИСТРАТОРА (ОТВЕТЫ НА СООБЩЕНИЯ) ---
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
        await sendMessage(adminId, getLocalizedMessage('ru', 'adminOrderNotFound', { orderId })); // Admin message always in Russian
        return new Response("OK", { status: 200 });
      }

      // If targetTelegramId was not extracted from the replied-to message (e.g., it was an order notification),
      // use the order's telegram_id as the target.
      if (!targetTelegramId) {
        targetTelegramId = String(order.telegram_id);
      }

      // Fetch target user's language for admin replies
      let targetUserLang = 'ru'; // Default for admin replies
      if (targetTelegramId) {
        const { data: targetUserProfile, error: targetProfileError } = await supabase
          .from('telegram_profiles')
          .select('language_code')
          .eq('telegram_id', targetTelegramId)
          .single();
        if (targetProfileError) {
          console.error(`LOG: Failed to fetch target user profile for ID ${targetTelegramId}:`, targetProfileError.message);
        } else if (targetUserProfile?.language_code) {
          targetUserLang = targetUserProfile.language_code;
        }
      }

      const replyText = message.text ? message.text.trim() : "";
      const commandText = replyText.toLowerCase();

      // Handle commands first
      if (['ok', 'ок'].includes(commandText)) {
        if (order.status === 'Новая заявка') {
          await supabase.from('orders').update({ status: 'Оплачен' }).eq('order_id', orderId);
          await sendMessage(adminId, getLocalizedMessage('ru', 'adminOrderPaid', { orderId }));
          await sendMessage(order.telegram_id, getLocalizedMessage(targetUserLang, 'clientOrderPaid', { orderId }));
          if (order.admin_conversation_started) {
            await sendMessage(order.telegram_id, getLocalizedMessage(targetUserLang, 'conversationClosed'));
          }
        } else {
          await sendMessage(adminId, getLocalizedMessage('ru', 'cannotChangeStatus', { orderId, status: order.status }));
        }
      }
      else if (['stop', 'стоп'].includes(commandText)) {
        if (order.status === 'Новая заявка') {
          await supabase.from('orders').update({ status: 'Отменен' }).eq('order_id', orderId);
          await sendMessage(adminId, getLocalizedMessage('ru', 'orderCancelledAdmin', { orderId }));
          await sendMessage(order.telegram_id, getLocalizedMessage(targetUserLang, 'clientOrderCancelled', { orderId }));
          if (order.admin_conversation_started) {
            await sendMessage(order.telegram_id, getLocalizedMessage(targetUserLang, 'conversationClosed'));
          }
        } else {
          await sendMessage(adminId, getLocalizedMessage('ru', 'cannotChangeStatus', { orderId, status: order.status }));
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
          await sendMessage(targetTelegramId, `${getLocalizedMessage(targetUserLang, 'adminPrefix')}\n${messageToUser}`);
          await sendMessage(adminId, getLocalizedMessage('ru', 'messageSent', { orderId }));
          if (!order.admin_conversation_started) {
            await supabase.from('orders').update({ admin_conversation_started: true }).eq('order_id', orderId);
          }
        } else {
          await sendMessage(adminId, getLocalizedMessage('ru', 'cannotSendEmpty'));
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
        await sendMessage(targetTelegramId, `${getLocalizedMessage(targetUserLang, 'adminPrefix')}\n${replyText}`);
        await sendMessage(adminId, getLocalizedMessage('ru', 'messageSent', { orderId }));
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
        const forwardMessage = getLocalizedMessage('ru', 'clientMessagePrefix', { userFirstName, userUsername, senderId, orderId: activeOrder.order_id }) + message.text;
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