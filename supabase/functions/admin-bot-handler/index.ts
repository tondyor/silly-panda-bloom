import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// --- Переменные окружения из секретов Supabase ---
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const ADMIN_TELEGRAM_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");
const WEBHOOK_SECRET_TOKEN = Deno.env.get("WEBHOOK_SECRET_TOKEN"); // Используем общий секрет для простоты
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

// --- Вспомогательная функция для отправки сообщений ---
async function sendMessage(chatId: string | number, text: string): Promise<void> {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Ошибка Telegram API (sendMessage) для chatId ${chatId}:`, errorData);
    }
  } catch (e) {
    console.error(`Не удалось отправить сообщение в Telegram для ${chatId}:`, e);
  }
}

// --- Основная логика сервера ---
serve(async (req) => {
  // 1. Безопасность: Проверяем секретный токен из заголовка
  if (req.headers.get("X-Telegram-Bot-Api-Secret-Token") !== WEBHOOK_SECRET_TOKEN) {
    console.error("Ошибка безопасности: Неверный или отсутствующий секретный токен вебхука.");
    return new Response("Unauthorized", { status: 401 });
  }

  try {
    const update = await req.json();

    // 2. Обрабатываем только новые текстовые сообщения
    if (update.message && update.message.text) {
      const message = update.message;
      const chatId = message.chat.id;

      // 3. Проверяем, что сообщение пришло от администратора. Если нет - игнорируем.
      if (String(chatId) !== ADMIN_TELEGRAM_CHAT_ID) {
        console.log(`Сообщение от не-администратора (${chatId}), игнорируется.`);
        return new Response("OK", { status: 200 });
      }

      // 4. Проверяем, является ли сообщение командой для отправки
      if (message.text.startsWith('@')) {
        const parts = message.text.split(' ');
        const username = parts[0].substring(1);
        const textToSend = parts.slice(1).join(' ');

        // Проверяем корректность формата команды
        if (!username || !textToSend) {
          await sendMessage(ADMIN_TELEGRAM_CHAT_ID, "❗️ *Ошибка формата.*\nИспользуйте: `@username Ваше сообщение`");
          return new Response("OK", { status: 200 });
        }

        // 5. Ищем пользователя в базе данных
        const { data: profile, error } = await supabase
          .from('telegram_profiles')
          .select('telegram_id')
          .eq('username', username)
          .single();

        if (error || !profile) {
          console.error(`Пользователь @${username} не найден:`, error);
          await sendMessage(ADMIN_TELEGRAM_CHAT_ID, `❌ *Пользователь не найден.*\nНе удалось найти пользователя с ником \`@${username}\` в базе данных.`);
          return new Response("OK", { status: 200 });
        }

        // 6. Отправляем сообщение пользователю
        const targetTelegramId = profile.telegram_id;
        const messageForUser = `*Сообщение от поддержки:*\n\n${textToSend}`;
        await sendMessage(targetTelegramId, messageForUser);

        // 7. Отправляем подтверждение администратору
        await sendMessage(ADMIN_TELEGRAM_CHAT_ID, `✅ *Сообщение отправлено.*\nВаше сообщение для \`@${username}\` успешно доставлено.`);
        console.log(`Сообщение от администратора отправлено пользователю @${username} (ID: ${targetTelegramId})`);
      }
    }

    // 8. Возвращаем успешный ответ Telegram
    return new Response("OK", { status: 200 });

  } catch (error) {
    console.error("--- КРИТИЧЕСКАЯ ОШИБКА в admin-bot-handler ---", error);
    return new Response("Internal Server Error", { status: 500 });
  }
});