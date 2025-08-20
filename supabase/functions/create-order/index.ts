// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

// CORS-заголовки для предзапросов и ответов
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Переменные окружения из секретов Supabase
// @ts-ignore
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
// @ts-ignore
const ADMIN_TELEGRAM_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// --- Безопасность: Валидация данных Telegram WebApp ---
/**
 * Проверяет подлинность данных от Telegram с помощью HMAC-SHA256.
 * @param initData Строка initData из Telegram WebApp.
 * @returns {Promise<boolean>} True, если данные подлинные, иначе false.
 */
async function validateTelegramData(initData: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("Критическая ошибка безопасности: TELEGRAM_BOT_TOKEN не установлен.");
    return false;
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;

  params.delete("hash");
  const dataCheckArr: string[] = [];
  for (const [key, value] of params.entries()) {
    dataCheckArr.push(`${key}=${value}`);
  }
  dataCheckArr.sort();
  const dataCheckString = dataCheckArr.join("\n");

  const encoder = new TextEncoder();

  // 1. Создаем секретный ключ из токена бота
  const secretKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const secret = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(TELEGRAM_BOT_TOKEN));

  // 2. Используем полученный секрет для подписи строки данных
  const finalKey = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", finalKey, encoder.encode(dataCheckString));
  
  // 3. Конвертируем подпись в hex-строку для сравнения
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hash === calculatedHash;
}


// --- Вспомогательные функции для Telegram API ---
/**
 * Отправляет сообщение в указанный чат Telegram.
 * @param chatId ID чата для отправки.
 * @param text Текст сообщения с поддержкой Markdown.
 */
async function sendMessage(chatId: string | number, text: string): Promise<void> {
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
 * Отвечает на запрос WebApp, обычно для отправки сообщения от имени пользователя.
 * @param queryId web_app_query_id из initData.
 * @param result Объект с результатом запроса.
 */
async function answerWebAppQuery(queryId: string, result: any): Promise<void> {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/answerWebAppQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ web_app_query_id: queryId, result }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Ошибка Telegram API (answerWebAppQuery) для queryId ${queryId}:`, JSON.stringify(errorData, null, 2));
    }
  } catch(e) {
    console.error(`Не удалось ответить на запрос WebApp ${queryId}:`, e);
  }
}

// --- Форматирование данных ---
/**
 * Форматирует детали заказа в читаемую строку для сообщений в Telegram.
 * @param order Полный объект заказа.
 * @param forAdmin Булево значение для переключения между форматами для админа и клиента.
 * @returns Отформатированная строка.
 */
function formatOrderForTelegram(order: any, forAdmin: boolean): string {
  if (forAdmin) {
    const clientIdentifier = order.telegram_id ? `ID: ${order.telegram_id} (@${order.telegram_username || 'N/A'})` : 'Клиент';
    const details = [
      `😏 *Новый заказ!*`,
      ``,
      `*Номер заказа:* \`#${order.public_id}\``,
      `*Клиент:* ${clientIdentifier}`,
      `-----------------------------------`,
      `*Отдает:* ${order.from_amount.toLocaleString('ru-RU')} ${order.payment_currency}`,
      `*Получает (VND):* ${order.calculated_vnd.toLocaleString('vi-VN')}`,
      `*Курс:* ${order.exchange_rate.toLocaleString('ru-RU')}`,
      `-----------------------------------`,
      `*Способ получения:* ${order.delivery_method === 'bank' ? 'Банковский перевод' : 'Наличные'}`,
    ];

    if (order.payment_currency === 'USDT') {
      details.push(`*Сеть USDT:* ${order.usdt_network}`);
    }

    if (order.delivery_method === 'bank') {
      details.push(`*Банк:* ${order.vnd_bank_name}`);
      details.push(`*Номер счета:* \`${order.vnd_bank_account_number}\``);
    } else {
      details.push(`*Адрес доставки:* ${order.delivery_address}`);
    }

    if (order.contact_phone) {
      details.push(`*Телефон для связи:* ${order.contact_phone}`);
    }
    
    details.push(`-----------------------------------`);
    details.push(`*Статус:* ${order.status}`);

    return details.join('\n');
  } else {
    const firstName = order.telegram_user_first_name ? ` ${order.telegram_user_first_name}` : '';
    const title = `*🥰${firstName}, ваша заявка принята!*`;
    
    const details = [
      title,
      `*Номер заказа:* \`#${order.public_id}\``,
      `-----------------------------------`,
      `*Вы отправляете:* ${order.from_amount.toLocaleString('ru-RU')} ${order.payment_currency}`,
      `*К получению (VND):* ${order.calculated_vnd.toLocaleString('vi-VN')}`,
    ];

    if (order.payment_currency === 'USDT' && order.deposit_address && order.deposit_address !== 'N/A') {
      details.push(``);
      details.push(`*Кошелек для пополнения:*`);
      details.push(`\`${order.deposit_address}\``);
      details.push(`*Сеть USDT:* ${order.usdt_network}`);
      details.push(``);
      details.push(`*Внимание!* Отправляйте средства только на указанный адрес в сети ${order.usdt_network}. В противном случае ваши средства могут быть навсегда утеряны.`);
    }

    details.push(`-----------------------------------`);
    details.push(`*Статус:* Новая заявка (Не оплачен)`);
    details.push(``);
    details.push(`Мы скоро свяжемся с вами для подтверждения.`);

    return details.join('\n');
  }
}

// --- Основная логика сервера ---
serve(async (req) => {
  // Обработка CORS-предзапроса
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("--- Invoking create-order function ---");

  try {
    // 1. Извлечение данных из тела запроса
    const { initData, formData } = await req.json();
    if (!initData || !formData) {
      console.error("Validation Error: Missing initData or formData in request body.");
      return new Response(JSON.stringify({ error: "Отсутствуют initData или formData" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("Step 1: Request body parsed successfully.");

    // 2. Безопасность: Валидация входящего запроса от Telegram
    const isTelegramDataValid = await validateTelegramData(initData);
    if (!isTelegramDataValid) {
      console.error("Authentication Error: Invalid initData received.");
      return new Response(JSON.stringify({ error: "Ошибка аутентификации: неверные initData" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("Step 2: Telegram data validated successfully.");

    // 3. Парсинг данных пользователя и query_id из initData
    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get("user")!);
    const queryId = params.get("query_id");

    if (!user || !user.id) {
        console.error("Data Error: Could not extract user data from initData.");
        return new Response(JSON.stringify({ error: "Не удалось извлечь данные пользователя из initData" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
    console.log(`Step 3: User data parsed. User ID: ${user.id}, Username: ${user.username || 'N/A'}`);

    // 4. Создание клиента Supabase с сервисным ключом
    const supabase = createClient(
      // @ts-ignore
      Deno.env.get("SUPABASE_URL")!,
      // @ts-ignore
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    console.log("Step 4: Supabase client created.");

    // 5. Upsert профиля пользователя Telegram
    const { error: upsertProfileError } = await supabase
      .from('telegram_profiles')
      .upsert({
        telegram_id: user.id,
        first_name: user.first_name || null,
        last_name: user.last_name || null,
        username: user.username || null,
        language_code: user.language_code || null,
        avatar_url: user.photo_url || null,
        is_premium: user.is_premium || false,
      }, { onConflict: 'telegram_id' });

    if (upsertProfileError) {
      console.error("Database Warning: Failed to upsert Telegram profile.", upsertProfileError);
      // Не прерываем выполнение, но логируем ошибку
    } else {
      console.log(`Step 5: Telegram profile for user ${user.id} upserted successfully.`);
    }

    // 6. Подготовка и сохранение заказа в базу данных
    const publicId = `ORD-${Date.now()}`;
    const orderToInsert = {
      payment_currency: formData.paymentCurrency,
      from_amount: formData.fromAmount,
      calculated_vnd: formData.calculatedVND,
      exchange_rate: formData.exchangeRate,
      delivery_method: formData.deliveryMethod,
      usdt_network: formData.usdtNetwork ?? null,
      vnd_bank_name: formData.vndBankName ?? null,
      vnd_bank_account_number: formData.vndBankAccountNumber ?? null,
      delivery_address: formData.deliveryAddress ?? null,
      contact_phone: formData.contactPhone ?? null,
      public_id: publicId,
      status: "Новая заявка",
      telegram_id: user.id,
    };

    const { data: insertedOrder, error: insertError } = await supabase
      .from("orders")
      .insert(orderToInsert)
      .select()
      .single();

    if (insertError) {
      console.error("Database Error: Failed to insert order.", insertError);
      throw new Error(`Ошибка базы данных: ${insertError.message}`);
    }
    console.log(`Step 6: Order #${publicId} created successfully in database.`);

    // 7. Подготовка данных для уведомлений
    const fullOrderDetailsForNotification = {
        ...insertedOrder,
        telegram_user_first_name: user.first_name,
        telegram_username: user.username,
        deposit_address: formData.depositAddress, // Из формы на фронтенде
    };
    
    const clientMessageText = formatOrderForTelegram(fullOrderDetailsForNotification, false);
    console.log("Step 7: Notification data prepared.");

    // 8. Отправка двойных уведомлений
    // 8a. Через answerWebAppQuery (если доступен queryId)
    if (queryId) {
      await answerWebAppQuery(queryId, {
        type: 'article',
        id: crypto.randomUUID(),
        title: 'Заявка успешно создана!',
        input_message_content: { message_text: clientMessageText, parse_mode: 'Markdown' },
      });
      console.log(`Step 8a: Sent answerWebAppQuery for queryId ${queryId}.`);
    }

    // 8b. Всегда через sendMessage в личный чат пользователя
    await sendMessage(user.id, clientMessageText);
    console.log(`Step 8b: Sent direct message to user ${user.id}.`);

    // 8c. (Опционально) Уведомление администратора
    if (ADMIN_TELEGRAM_CHAT_ID) {
      const adminMessage = formatOrderForTelegram(fullOrderDetailsForNotification, true);
      await sendMessage(ADMIN_TELEGRAM_CHAT_ID, adminMessage);
      console.log(`Step 8c: Sent notification to admin chat.`);
    }

    // 9. Возврат успешного ответа фронтенду
    console.log("--- create-order function finished successfully ---");
    return new Response(JSON.stringify(insertedOrder), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("--- CRITICAL ERROR in create-order function ---", error);
    return new Response(JSON.stringify({ error: error.message || "Внутренняя ошибка сервера" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});