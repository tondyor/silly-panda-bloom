// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Переменные окружения ---
// @ts-ignore
const ADMIN_TELEGRAM_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");
// @ts-ignore
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
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

/**
 * Извлекает ID заказа из текста уведомления.
 * Ожидаемый формат: "Номер заказа: #ORD-XXXXXX"
 * @param text Текст исходного сообщения.
 * @returns Строка с ID заказа или null, если не найден.
 */
function parseOrderId(text: string): string | null {
  const match = text.match(/Номер заказа: #(\S+)/);
  return match ? match[1] : null;
}

// --- Основная логика сервера ---
serve(async (req) => {
  console.log("--- [START] Invoking telegram-webhook function ---");

  if (req.method === "OPTIONS") {
    console.log("LOG: Handling OPTIONS preflight request.");
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log("Step 1: Payload received from Telegram.", JSON.stringify(payload, null, 2));

    const message = payload.message;

    // --- Базовая валидация ---
    if (!message || !message.chat || !message.chat.id) {
      console.log("LOG: Invalid payload structure. Missing message or chat.id. Exiting.");
      return new Response("OK"); // Подтверждаем получение для Telegram
    }

    const chatId = message.chat.id;
    const messageText = message.text ? message.text.trim().toLowerCase() : "";
    console.log(`Step 2: Extracted data. Chat ID: ${chatId}, Message Text: "${messageText}"`);

    // --- Проверка безопасности: сообщение от администратора? ---
    console.log(`Step 3: Security check. Comparing Chat ID (${chatId}) with ADMIN_TELEGRAM_CHAT_ID (${ADMIN_TELEGRAM_CHAT_ID}).`);
    if (String(chatId) !== ADMIN_TELEGRAM_CHAT_ID) {
      console.log("LOG: Security check FAILED. Message is not from admin. Exiting.");
      return new Response("OK");
    }
    console.log("LOG: Security check PASSED.");

    // --- Проверка логики: это ответ с правильным ключевым словом? ---
    const isReply = message.reply_to_message;
    const isTriggerWord = messageText === "ок" || messageText === "ok";
    console.log(`Step 4: Logic check. Is it a reply? ${!!isReply}. Is it a trigger word? ${isTriggerWord}.`);

    if (isReply && isTriggerWord) {
      console.log("LOG: Entered main logic block (isReply && isTriggerWord).");

      const originalMessageText = isReply.text;
      if (!originalMessageText) {
        console.error("LOG: Could not read original message text from reply. Exiting.");
        await sendMessage(ADMIN_TELEGRAM_CHAT_ID, "❌ Не удалось прочитать текст исходного сообщения.");
        return new Response("OK");
      }
      console.log(`LOG: Original message text found.`);

      // --- Извлечение ID заказа ---
      const orderId = parseOrderId(originalMessageText);
      if (!orderId) {
        console.error("LOG: Failed to parse order ID from original message. Exiting.");
        await sendMessage(ADMIN_TELEGRAM_CHAT_ID, `❌ Не удалось найти номер заказа в исходном сообщении.`);
        return new Response("OK");
      }
      console.log(`LOG: Parsed Order ID: ${orderId}`);

      // --- Взаимодействие с БД ---
      console.log("LOG: Connecting to Supabase to find the order.");
      const supabase = createClient(
        // @ts-ignore
        Deno.env.get("SUPABASE_URL")!,
        // @ts-ignore
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
      );

      // Поиск заказа
      const { data: order, error: findError } = await supabase
        .from("orders")
        .select("status, telegram_id")
        .eq("order_id", orderId)
        .single();

      if (findError) {
        console.error(`LOG: Supabase findError for order #${orderId}:`, findError);
        await sendMessage(ADMIN_TELEGRAM_CHAT_ID, `❌ Ошибка базы данных при поиске заказа #${orderId}.`);
        return new Response("OK");
      }

      if (!order) {
        console.error(`LOG: Order #${orderId} not found in database.`);
        await sendMessage(ADMIN_TELEGRAM_CHAT_ID, `❌ Ошибка: Заказ с номером #${orderId} не найден.`);
        return new Response("OK");
      }
      console.log(`LOG: Order #${orderId} found. Status: '${order.status}'.`);

      const currentStatus = order.status;
      console.log(`LOG: Processing status: '${currentStatus}'`);

      switch (currentStatus) {
        case 'Отклонен':
        case 'Отменен':
          console.log(`LOG: Matched status '${currentStatus}'. Sending 'already cancelled' message.`);
          await sendMessage(ADMIN_TELEGRAM_CHAT_ID, `ℹ️ Заказ #${orderId} был отменен и не может быть выполнен.`);
          break;

        case 'Оплачен':
          console.log(`LOG: Matched status 'Оплачен'. Sending 'already paid' message.`);
          await sendMessage(ADMIN_TELEGRAM_CHAT_ID, `ℹ️ Заказ #${orderId} уже имеет статус 'Оплачен'.`);
          break;

        case 'Новая заявка': {
          console.log(`LOG: Matched status 'Новая заявка'. Attempting to update.`);
          const { error: updateError } = await supabase
            .from("orders")
            .update({ status: "Оплачен" })
            .eq("order_id", orderId);

          if (updateError) {
            console.error(`LOG: Database error while updating order #${orderId}. Error:`, updateError);
            await sendMessage(ADMIN_TELEGRAM_CHAT_ID, `❌ Ошибка базы данных при обновлении заказа #${orderId}.`);
            break;
          }
          console.log("LOG: Order status updated successfully in the database.");

          const clientTelegramId = order.telegram_id;
          if (clientTelegramId) {
            const clientMessage = `✅ Обмен по вашей заявке #${orderId} успешно завершен! Спасибо, что выбрали нас.`;
            await sendMessage(clientTelegramId, clientMessage);
          }
          
          const adminConfirmation = `✅ Статус заказа #${orderId} изменен на 'Оплачен'. Уведомление клиенту отправлено.`;
          await sendMessage(ADMIN_TELEGRAM_CHAT_ID, adminConfirmation);
          break;
        }

        default:
          console.log(`LOG: Unmatched status: '${currentStatus}'. Sending 'unknown status' message.`);
          await sendMessage(ADMIN_TELEGRAM_CHAT_ID, `⚠️ Неизвестный статус ('${currentStatus}') у заказа #${orderId}.`);
          break;
      }
      console.log(`LOG: Finished processing order #${orderId}.`);
    } else {
        console.log("LOG: Logic check FAILED. Message is not a reply or does not contain a trigger word. No action taken.");
    }

    console.log("--- [END] telegram-webhook function finished successfully ---");
    return new Response("OK");

  } catch (error) {
    console.error("--- [CRITICAL ERROR] in telegram-webhook function ---", error);
    return new Response("Error processing webhook", { status: 500 });
  }
});