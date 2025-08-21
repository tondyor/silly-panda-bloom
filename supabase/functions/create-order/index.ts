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

// --- НОВАЯ УНИВЕРСАЛЬНАЯ ФУНКЦИЯ ЭКРАНИРОВАНИЯ ---
/**
 * Экранирует специальные символы для Telegram MarkdownV2.
 * @param text Входная строка.
 * @returns Экранированная строка, безопасная для отправки.
 */
function escapeMarkdownV2(text: string | number): string {
  const str = String(text);
  // Список символов для экранирования в MarkdownV2
  const charsToEscape = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
  let escapedText = str;
  for (const char of charsToEscape) {
    escapedText = escapedText.replace(new RegExp(`\\${char}`, 'g'), `\\${char}`);
  }
  return escapedText;
}


// --- Вспомогательные функции для Telegram API ---
/**
 * Отправляет сообщение в указанный чат Telegram.
 * @param chatId ID чата для отправки.
 * @param text Текст сообщения с поддержкой Markdown.
 * @param reply_markup Опциональная разметка для кнопок.
 * @returns {Promise<any>} Ответ от Telegram API, содержащий message_id.
 */
async function sendMessage(chatId: string | number, text: string, reply_markup?: any): Promise<any> {
  try {
    console.log(`Attempting to send message to chat ID: ${chatId}`);
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'MarkdownV2', reply_markup }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Ошибка Telegram API (sendMessage) для chatId ${chatId}:`, JSON.stringify(errorData, null, 2));
      return null;
    }
    return await response.json();
  } catch (e) {
    console.error(`Не удалось отправить сообщение в Telegram для ${chatId}:`, e);
    return null;
  }
}

// --- Серверные переводы ---
const translations: Record<string, Record<string, string>> = {
  ru: {
    orderAcceptedTitle: "🥰{{firstName}}, ваша заявка принята!",
    orderNumber: "Номер заказа:",
    youSend: "Вы отправляете:",
    toReceive: "К получению (VND):",
    depositWallet: "Кошелек для пополнения:",
    usdtNetwork: "Сеть USDT:",
    attention: "Внимание!",
    sendOnlyUsdtWarning: "Отправляйте средства только на указанный адрес в сети {{network}}. В противном случае ваши средства могут быть навсегда утеряны.",
    status: "Статус:",
    newApplication: "Новая заявка (Не оплачен)",
    contactSoon: "Мы скоро свяжемся с вами для подтверждения.",
    adminNewOrder: "😏 *Новый заказ!*",
    client: "Клиент:",
    exchangeRate: "Курс:",
    deliveryMethod: "Способ получения:",
    bankTransfer: "Банковский перевод",
    cash: "Наличные",
    bank: "Банк:",
    accountNumber: "Номер счета:",
    deliveryAddress: "Адрес доставки:",
    contactPhone: "Телефон для связи:",
  },
  en: {
    orderAcceptedTitle: "🥰{{firstName}}, your application has been accepted!",
    orderNumber: "Order number:",
    youSend: "You send:",
    toReceive: "To receive (VND):",
    depositWallet: "Deposit wallet:",
    usdtNetwork: "USDT Network:",
    attention: "Attention!",
    sendOnlyUsdtWarning: "Send funds only to the specified address on the {{network}} network. Otherwise, your funds may be lost forever.",
    status: "Status:",
    newApplication: "New application (Unpaid)",
    contactSoon: "We will contact you soon for confirmation.",
    adminNewOrder: "😏 *New order!*",
    client: "Client:",
    exchangeRate: "Exchange rate:",
    deliveryMethod: "Delivery method:",
    bankTransfer: "Bank transfer",
    cash: "Cash",
    bank: "Bank:",
    accountNumber: "Account number:",
    deliveryAddress: "Delivery address:",
    contactPhone: "Contact phone:",
  },
  vi: {
    orderAcceptedTitle: "🥰{{firstName}}, đơn hàng của bạn đã được chấp nhận!",
    orderNumber: "Mã đơn hàng:",
    youSend: "Bạn gửi:",
    toReceive: "Nhận (VND):",
    depositWallet: "Ví nạp tiền:",
    usdtNetwork: "Mạng USDT:",
    attention: "Chú ý!",
    sendOnlyUsdtWarning: "Chỉ gửi tiền USDT đến địa chỉ được chỉ định trên mạng {{network}}. Nếu không, tiền của bạn có thể bị mất vĩnh viễn.",
    status: "Trạng thái:",
    newApplication: "Đơn hàng mới (Chưa thanh toán)",
    contactSoon: "Chúng tôi sẽ liên hệ với bạn sớm để xác nhận.",
    adminNewOrder: "😏 *Đơn hàng mới!*",
    client: "Khách hàng:",
    exchangeRate: "Tỷ giá:",
    deliveryMethod: "Phương thức nhận:",
    bankTransfer: "Chuyển khoản ngân hàng",
    cash: "Tiền mặt",
    bank: "Ngân hàng:",
    accountNumber: "Số tài khoản:",
    deliveryAddress: "Địa chỉ giao hàng:",
    contactPhone: "Số điện thoại liên hệ:",
  },
};

function getTranslation(lang: string, key: string, params?: Record<string, string>): string {
  const selectedLang = translations[lang] || translations['en']; // Fallback to English
  let text = selectedLang[key] || translations['en'][key] || key; // Fallback to English key or key itself
  
  if (params) {
    for (const pKey in params) {
      text = text.replace(new RegExp(`{{${pKey}}}`, 'g'), params[pKey]);
    }
  }
  return text;
}

/**
 * Форматирует детали заказа в читаемую строку для сообщений в Telegram.
 * @param order Полный объект заказа.
 * @param forAdmin Булево значение для переключения между форматами для админа и клиента.
 * @param lang Язык для форматирования сообщения.
 * @returns Отформатированная строка.
 */
function formatOrderForTelegram(order: any, forAdmin: boolean, lang: string): string {
  const locale = lang === 'vi' ? 'vi-VN' : 'ru-RU'; // Используем 'ru-RU' для русского и английского, 'vi-VN' для вьетнамского

  if (forAdmin) {
    const clientUsername = escapeMarkdownV2(order.telegram_username || 'N/A');
    const clientIdentifier = order.telegram_id ? `ID: ${order.telegram_id} (@${clientUsername})` : escapeMarkdownV2(getTranslation(lang, 'client'));
    const publicId = escapeMarkdownV2(order.public_id);
    const bankName = escapeMarkdownV2(order.vnd_bank_name || '');
    const bankAccountNumber = escapeMarkdownV2(order.vnd_bank_account_number || '');
    const deliveryAddress = escapeMarkdownV2(order.delivery_address || '');
    const contactPhone = escapeMarkdownV2(order.contact_phone || '');

    const details = [
      escapeMarkdownV2(getTranslation(lang, 'adminNewOrder')),
      ``,
      `${escapeMarkdownV2(getTranslation(lang, 'orderNumber'))} \`#${publicId}\``,
      `${escapeMarkdownV2(getTranslation(lang, 'client'))} ${clientIdentifier}`,
      escapeMarkdownV2(`-----------------------------------`),
      `${escapeMarkdownV2(getTranslation(lang, 'youSend'))} ${order.from_amount.toLocaleString(locale)} ${order.payment_currency}`,
      `${escapeMarkdownV2(getTranslation(lang, 'toReceive'))} ${order.calculated_vnd.toLocaleString('vi-VN')}`, // VND всегда в вьетнамском формате
      `${escapeMarkdownV2(getTranslation(lang, 'exchangeRate'))} ${order.exchange_rate.toLocaleString(locale)}`,
      escapeMarkdownV2(`-----------------------------------`),
      `${escapeMarkdownV2(getTranslation(lang, 'deliveryMethod'))} ${order.delivery_method === 'bank' ? escapeMarkdownV2(getTranslation(lang, 'bankTransfer')) : escapeMarkdownV2(getTranslation(lang, 'cash'))}`,
    ];

    if (order.payment_currency === 'USDT') {
      details.push(`${escapeMarkdownV2(getTranslation(lang, 'usdtNetwork'))} ${order.usdt_network}`);
    }

    if (order.delivery_method === 'bank') {
      details.push(`${escapeMarkdownV2(getTranslation(lang, 'bank'))} ${bankName}`);
      details.push(`${escapeMarkdownV2(getTranslation(lang, 'accountNumber'))} \`${bankAccountNumber}\``);
    } else {
      details.push(`${escapeMarkdownV2(getTranslation(lang, 'deliveryAddress'))} ${deliveryAddress}`);
    }

    if (order.contact_phone) {
      details.push(`${escapeMarkdownV2(getTranslation(lang, 'contactPhone'))} ${contactPhone}`);
    }
    
    details.push(escapeMarkdownV2(`-----------------------------------`));
    details.push(`${escapeMarkdownV2(getTranslation(lang, 'status'))} ${escapeMarkdownV2(order.status)}`);

    return details.join('\n');
  } else {
    const escapedFirstName = escapeMarkdownV2(order.telegram_user_first_name || '');
    const firstNameForTitle = escapedFirstName ? ` ${escapedFirstName}` : '';
    const title = getTranslation(lang, 'orderAcceptedTitle', { firstName: firstNameForTitle }); // Title is already escaped via firstNameForTitle
    const publicId = escapeMarkdownV2(order.public_id);
    const depositAddress = escapeMarkdownV2(order.deposit_address || '');
    
    const details = [
      title,
      `${escapeMarkdownV2(getTranslation(lang, 'orderNumber'))} \`#${publicId}\``,
      escapeMarkdownV2(`-----------------------------------`),
      `${escapeMarkdownV2(getTranslation(lang, 'youSend'))} ${order.from_amount.toLocaleString(locale)} ${order.payment_currency}`,
      `${escapeMarkdownV2(getTranslation(lang, 'toReceive'))} ${order.calculated_vnd.toLocaleString('vi-VN')}`, // VND всегда в вьетнамском формате
    ];

    if (order.payment_currency === 'USDT' && order.deposit_address && order.deposit_address !== 'N/A') {
      details.push(``);
      details.push(escapeMarkdownV2(getTranslation(lang, 'depositWallet')));
      details.push(`\`${depositAddress}\``);
      details.push(`${escapeMarkdownV2(getTranslation(lang, 'usdtNetwork'))} ${order.usdt_network}`);
      details.push(``);
      details.push(`*${escapeMarkdownV2(getTranslation(lang, 'attention'))}* ${escapeMarkdownV2(getTranslation(lang, 'sendOnlyUsdtWarning', { network: order.usdt_network }))}`);
    }

    details.push(escapeMarkdownV2(`-----------------------------------`));
    details.push(`${escapeMarkdownV2(getTranslation(lang, 'status'))} ${escapeMarkdownV2(getTranslation(lang, 'newApplication'))}`);
    details.push(``);
    details.push(escapeMarkdownV2(getTranslation(lang, 'contactSoon')));

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

    // 3. Парсинг данных пользователя из initData
    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get("user")!);

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

    // 5. Получение языка пользователя из telegram_profiles
    const { data: userProfile, error: profileError } = await supabase
      .from('telegram_profiles')
      .select('language_code')
      .eq('telegram_id', user.id)
      .single();

    let userLang = 'en'; // Default to English
    if (userProfile && userProfile.language_code && ['ru', 'en', 'vi'].includes(userProfile.language_code)) {
      userLang = userProfile.language_code;
    } else if (user.language_code && ['ru', 'en', 'vi'].includes(user.language_code)) {
      userLang = user.language_code;
    }
    console.log(`Step 5: User language determined as ${userLang}.`);

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
        deposit_address: formData.depositAddress,
    };
    
    const clientMessageText = formatOrderForTelegram(fullOrderDetailsForNotification, false, userLang);
    console.log("Step 7: Notification data prepared.");

    // 8. Отправка уведомлений в Telegram
    // 8a. Отправка прямого сообщения в личный чат пользователя с кнопками языка
    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: 'RU', callback_data: `lang_ru_${insertedOrder.public_id}` },
          { text: 'EN', callback_data: `lang_en_${insertedOrder.public_id}` },
          { text: 'VIET', callback_data: `lang_vi_${insertedOrder.public_id}` },
        ]
      ]
    };

    const clientMessageResponse = await sendMessage(user.id, clientMessageText, inlineKeyboard);
    if (clientMessageResponse && clientMessageResponse.ok) {
      const messageId = clientMessageResponse.result.message_id;
      // Сохраняем message_id и chat_id для возможности обновления сообщения
      const { error: saveMessageError } = await supabase
        .from('order_messages')
        .insert({
          chat_id: user.id,
          message_id: messageId,
          order_id: insertedOrder.id,
          telegram_id: user.id,
        });
      if (saveMessageError) {
        console.error("Database Error: Failed to save telegram message ID.", saveMessageError);
      }
      console.log(`Step 8a: Sent direct message to user ${user.id} with message_id ${messageId}.`);
    } else {
      console.error(`Step 8a: Failed to send direct message to user ${user.id}. Response:`, JSON.stringify(clientMessageResponse, null, 2));
    }

    // 8b. (Опционально) Уведомление администратора
    console.log(`Step 8b: ADMIN_TELEGRAM_CHAT_ID value: '${ADMIN_TELEGRAM_CHAT_ID}'`); // Логируем значение
    if (ADMIN_TELEGRAM_CHAT_ID && ADMIN_TELEGRAM_CHAT_ID.trim() !== '') {
      console.log(`Attempting to send admin notification to chat ID: ${ADMIN_TELEGRAM_CHAT_ID}`);
      const adminMessage = formatOrderForTelegram(fullOrderDetailsForNotification, true, 'ru'); // Admin message always in Russian
      const adminMessageResponse = await sendMessage(ADMIN_TELEGRAM_CHAT_ID, adminMessage);
      if (adminMessageResponse && adminMessageResponse.ok) {
        console.log(`Step 8b: Sent notification to admin chat. Response:`, JSON.stringify(adminMessageResponse, null, 2));
      } else {
        console.error(`Step 8b: Failed to send notification to admin chat. Response:`, JSON.stringify(adminMessageResponse, null, 2));
      }
    } else {
      console.warn("ADMIN_TELEGRAM_CHAT_ID is not set or is empty. Admin notification skipped.");
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