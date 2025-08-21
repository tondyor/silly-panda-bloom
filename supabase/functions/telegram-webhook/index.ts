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
    console.error("TELEGRAM_BOT_TOKEN не установлен.");
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
      console.error(`Ошибка Telegram API (sendMessage) для chatId ${chatId}:`, JSON.stringify(errorData, null, 2));
    }
  } catch (e) {
    console.error(`Не удалось отправить сообщение в Telegram для ${chatId}:`, e);
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
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    const message = payload.message;

    // --- Базовая валидация ---
    if (!message || !message.chat || !message.chat.id) {
      return new Response("OK"); // Подтверждаем получение для Telegram
    }

    const chatId = message.chat.id;
    const messageText = message.text ? message.text.trim().toLowerCase() : "";

    // --- Проверка безопасности: сообщение от администратора? ---
    if (String(chatId) !== ADMIN_TELEGRAM_CHAT_ID) {
      return new Response("OK");
    }

    // --- Проверка логики: это ответ с правильным ключевым словом? ---
    const isReply = message.reply_to_message;
    const isTriggerWord = messageText === "ок" || messageText === "ok";

    if (isReply && isTriggerWord) {
      const originalMessageText = isReply.text;
      if (!originalMessageText) {
        await sendMessage(ADMIN_TELEGRAM_CHAT_ID, "❌ Не удалось прочитать текст исходного сообщения.");
        return new Response("OK");
      }

      // --- Извлечение ID заказа ---
      const orderId = parseOrderId(originalMessageText);
      if (!orderId) {
        await sendMessage(ADMIN_TELEGRAM_CHAT_ID, `❌ Не удалось найти номер заказа в исходном сообщении.`);
        return new Response("OK");
      }

      // --- Взаимодействие с БД ---
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

      if (findError || !order) {
        await sendMessage(ADMIN_TELEGRAM_CHAT_ID, `❌ Ошибка: Заказ с номером #${orderId} не найден.`);
        return new Response("OK");
      }

      if (order.status === "Оплачен") {
        await sendMessage(ADMIN_TELEGRAM_CHAT_ID, `ℹ️ Заказ #${orderId} уже имеет статус 'Оплачен'.`);
        return new Response("OK");
      }

      // Обновление статуса
      const { error: updateError } = await supabase
        .from("orders")
        .update({ status: "Оплачен" })
        .eq("order_id", orderId);

      if (updateError) {
        await sendMessage(ADMIN_TELEGRAM_CHAT_ID, `❌ Ошибка базы данных при обновлении заказа #${orderId}.`);
        return new Response("OK");
      }

      // --- Уведомления ---
      const clientTelegramId = order.telegram_id;

      // 1. Уведомление клиенту
      if (clientTelegramId) {
        const clientMessage = `✅ Обмен по вашей заявке #${orderId} успешно завершен! Спасибо, что выбрали нас.`;
        await sendMessage(clientTelegramId, clientMessage);
      }

      // 2. Подтверждение администратору
      const adminConfirmation = `✅ Статус заказа #${orderId} изменен на 'Оплачен'. Уведомление клиенту отправлено.`;
      await sendMessage(ADMIN_TELEGRAM_CHAT_ID, adminConfirmation);

    }

    // Всегда возвращаем 200 OK для Telegram
    return new Response("OK");

  } catch (error) {
    console.error("--- КРИТИЧЕСКАЯ ОШИБКА в telegram-webhook ---", error);
    return new Response("Error processing webhook", { status: 500 });
  }
});