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

// --- Локализованные сообщения ---
const translations = {
  ru: {
    orderAcceptedTitle: "*🥰{firstName}, ваша заявка принята!*",
    orderNumber: "*Номер заказа:* `{orderId}`",
    youSend: "*Вы отправляете:* {amount} {currency}",
    youReceive: "*К получению (VND):* {amountVND}",
    depositWallet: "*Кошелек для пополнения:*",
    usdtNetwork: "*Сеть USDT:* {network}",
    attention: "*Внимание!* Отправляйте средства только на указанный адрес в сети {network}. В противном случае ваши средства могут быть навсегда утеряны.",
    statusNew: "*Статус:* Новая заявка (Не оплачен)",
    contactSoon: "Мы скоро свяжемся с вами для подтверждения.",
    adminNewOrder: "Новый заказ!",
    adminOrderNumber: "Номер заказа: #{orderId}",
    adminClient: "Клиент: {clientIdentifier}",
    adminSends: "Отдает: {amount} {currency}",
    adminReceives: "Получает (VND): {amountVND}",
    adminRate: "Курс: {rate}",
    adminDeliveryMethod: "Способ получения: {method}",
    adminBank: "Банковский перевод",
    adminCash: "Наличные",
    adminUsdtNetwork: "Сеть USDT: {network}",
    adminBankName: "Банк: {bankName}",
    adminBankAccountNumber: "Номер счета: {accountNumber}",
    adminDeliveryAddress: "Адрес доставки: {address}",
    adminContactPhone: "Телефон для связи: {phone}",
    adminStatus: "Статус: {status}",
  },
  en: {
    orderAcceptedTitle: "*🥰{firstName}, your application has been accepted!*",
    orderNumber: "*Order number:* `{orderId}`",
    youSend: "*You are sending:* {amount} {currency}",
    youReceive: "*To receive (VND):* {amountVND}",
    depositWallet: "*Deposit wallet:*",
    usdtNetwork: "*USDT Network:* {network}",
    attention: "*Attention!* Send funds only to the specified address on the {network} network. Otherwise, your funds may be lost forever.",
    statusNew: "*Status:* New application (Unpaid)",
    contactSoon: "We will contact you shortly for confirmation.",
    adminNewOrder: "New order!",
    adminOrderNumber: "Order number: #{orderId}",
    adminClient: "Client: {clientIdentifier}",
    adminSends: "Sends: {amount} {currency}",
    adminReceives: "Receives (VND): {amountVND}",
    adminRate: "Rate: {rate}",
    adminDeliveryMethod: "Delivery method: {method}",
    adminBank: "Bank transfer",
    adminCash: "Cash",
    adminUsdtNetwork: "USDT Network: {network}",
    adminBankName: "Bank: {bankName}",
    adminBankAccountNumber: "Account number: {accountNumber}",
    adminDeliveryAddress: "Delivery address: {address}",
    adminContactPhone: "Contact phone: {phone}",
    adminStatus: "Status: {status}",
  },
  vi: {
    orderAcceptedTitle: "*🥰{firstName}, đơn đăng ký của bạn đã được chấp nhận!*",
    orderNumber: "*Mã đơn hàng:* `{orderId}`",
    youSend: "*Bạn gửi:* {amount} {currency}",
    youReceive: "*Nhận được (VND):* {amountVND}",
    depositWallet: "*Ví nạp tiền:*",
    usdtNetwork: "*Mạng USDT:* {network}",
    attention: "*Chú ý!* Chỉ gửi tiền đến địa chỉ được chỉ định trên mạng {network}. Nếu không, tiền của bạn có thể bị mất vĩnh viễn.",
    statusNew: "*Trạng thái:* Đơn mới (Chưa thanh toán)",
    contactSoon: "Chúng tôi sẽ liên hệ với bạn sớm để xác nhận.",
    adminNewOrder: "Đơn hàng mới!",
    adminOrderNumber: "Mã đơn hàng: #{orderId}",
    adminClient: "Khách hàng: {clientIdentifier}",
    adminSends: "Gửi: {amount} {currency}",
    adminReceives: "Nhận (VND): {amountVND}",
    adminRate: "Tỷ giá: {rate}",
    adminDeliveryMethod: "Phương thức nhận: {method}",
    adminBank: "Chuyển khoản ngân hàng",
    adminCash: "Tiền mặt",
    adminUsdtNetwork: "Mạng USDT: {network}",
    adminBankName: "Ngân hàng: {bankName}",
    adminBankAccountNumber: "Số tài khoản: {accountNumber}",
    adminDeliveryAddress: "Địa chỉ giao hàng: {address}",
    adminContactPhone: "Số điện thoại liên hệ: {phone}",
    adminStatus: "Trạng thái: {status}",
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
      headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
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
 * Экранирует специальные символы Markdown.
 * @param text Входная строка.
 * @returns Строка с экранированными символами.
 */
function escapeMarkdown(text: string | number | null | undefined): string {
  if (text === null || text === undefined) return '';
  const str = String(text);
  return str
    .replace(/_/g, '\\_')
    .replace(/\*/g, '\\*')
    .replace(/\[/g, '\\[')
    .replace(/`/g, '\\`');
}

/**
 * Форматирует детали заказа в читаемую строку для сообщений в Telegram.
 * @param order Полный объект заказа.
 * @param forAdmin Булево значение для переключения между форматами для админа и клиента.
 * @param lang Язык для форматирования.
 * @returns Отформатированная строка.
 */
function formatOrderForTelegram(order: any, forAdmin: boolean, lang: string): string {
  if (forAdmin) {
    const safeUsername = escapeMarkdown(order.telegram_username || 'N/A');
    const clientIdentifier = order.telegram_id ? `ID: ${order.telegram_id} (@${safeUsername})` : 'Клиент';
    const details = [
      getLocalizedMessage(lang, 'adminNewOrder'),
      ``,
      getLocalizedMessage(lang, 'adminOrderNumber', { orderId: order.order_id }),
      getLocalizedMessage(lang, 'adminClient', { clientIdentifier }),
      `-----------------------------------`,
      getLocalizedMessage(lang, 'adminSends', { amount: order.from_amount.toLocaleString('ru-RU'), currency: order.payment_currency }),
      getLocalizedMessage(lang, 'adminReceives', { amountVND: order.calculated_vnd.toLocaleString('vi-VN') }),
      getLocalizedMessage(lang, 'adminRate', { rate: order.exchange_rate.toLocaleString('ru-RU') }),
      `-----------------------------------`,
      getLocalizedMessage(lang, 'adminDeliveryMethod', { method: order.delivery_method === 'bank' ? getLocalizedMessage(lang, 'adminBank') : getLocalizedMessage(lang, 'adminCash') }),
    ];

    if (order.payment_currency === 'USDT') {
      details.push(getLocalizedMessage(lang, 'adminUsdtNetwork', { network: escapeMarkdown(order.usdt_network) }));
    }

    if (order.delivery_method === 'bank') {
      details.push(getLocalizedMessage(lang, 'adminBankName', { bankName: escapeMarkdown(order.vnd_bank_name) }));
      details.push(getLocalizedMessage(lang, 'adminBankAccountNumber', { accountNumber: escapeMarkdown(order.vnd_bank_account_number) }));
    } else {
      details.push(getLocalizedMessage(lang, 'adminDeliveryAddress', { address: escapeMarkdown(order.delivery_address) }));
    }

    if (order.contact_phone) {
      details.push(getLocalizedMessage(lang, 'adminContactPhone', { phone: escapeMarkdown(order.contact_phone) }));
    }
    
    details.push(`-----------------------------------`);
    details.push(getLocalizedMessage(lang, 'adminStatus', { status: order.status }));

    return details.join('\n');
  } else {
    const firstName = order.telegram_user_first_name ? ` ${order.telegram_user_first_name}` : '';
    const title = getLocalizedMessage(lang, 'orderAcceptedTitle', { firstName });
    
    const details = [
      title,
      getLocalizedMessage(lang, 'orderNumber', { orderId: order.order_id }),
      `-----------------------------------`,
      getLocalizedMessage(lang, 'youSend', { amount: order.from_amount.toLocaleString('ru-RU'), currency: order.payment_currency }),
      getLocalizedMessage(lang, 'youReceive', { amountVND: order.calculated_vnd.toLocaleString('vi-VN') }),
    ];

    if (order.payment_currency === 'USDT' && order.deposit_address && order.deposit_address !== 'N/A') {
      details.push(``);
      details.push(getLocalizedMessage(lang, 'depositWallet'));
      details.push(`\`${order.deposit_address}\``);
      details.push(getLocalizedMessage(lang, 'usdtNetwork', { network: order.usdt_network }));
      details.push(``);
      details.push(getLocalizedMessage(lang, 'attention', { network: order.usdt_network }));
    }

    details.push(`-----------------------------------`);
    details.push(getLocalizedMessage(lang, 'statusNew'));
    details.push(``);
    details.push(getLocalizedMessage(lang, 'contactSoon'));

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
    const queryId = params.get("query_id"); // Сохраняем queryId, но не используем answerWebAppQuery

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

    // Fetch user's language from telegram_profiles
    const { data: userProfile, error: profileError } = await supabase
      .from('telegram_profiles')
      .select('language_code')
      .eq('telegram_id', user.id)
      .single();

    const userLang = userProfile?.language_code || 'ru'; // Default to Russian if not found

    // 5. Подготовка и сохранение заказа в базу данных
    // ID заказа (order_id) теперь генерируется базой данных автоматически
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
    // insertedOrder теперь содержит сгенерированный базой данных order_id
    console.log(`Step 5: Order #${insertedOrder.order_id} created successfully in database.`);

    // 6. Подготовка данных для уведомлений
    const fullOrderDetailsForNotification = {
        ...insertedOrder,
        telegram_user_first_name: user.first_name,
        telegram_username: user.username,
        deposit_address: formData.depositAddress, // Из формы на фронтенде
    };
    
    const clientMessageText = formatOrderForTelegram(fullOrderDetailsForNotification, false, userLang); // Pass userLang
    console.log("Step 6: Notification data prepared.");

    // 7. Отправка уведомлений
    // Отправляем только прямое сообщение в личный чат пользователя
    await sendMessage(user.id, clientMessageText);
    console.log(`Step 7: Sent direct message to user ${user.id}.`);

    // 7c. (Опционально) Уведомление администратора (всегда на русском для админа)
    if (ADMIN_TELEGRAM_CHAT_ID) {
      const adminMessage = formatOrderForTelegram(fullOrderDetailsForNotification, true, 'ru'); // Admin messages always in Russian
      await sendMessage(ADMIN_TELEGRAM_CHAT_ID, adminMessage);
      console.log(`Step 7c: Sent notification to admin chat.`);
    }

    // 8. Возврат успешного ответа фронтенду
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