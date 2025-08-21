// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// @ts-ignore
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
// @ts-ignore
const ADMIN_TELEGRAM_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

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
  const secretKey = await crypto.subtle.importKey("raw", encoder.encode("WebAppData"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const secret = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(TELEGRAM_BOT_TOKEN));
  const finalKey = await crypto.subtle.importKey("raw", secret, { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const signatureBuffer = await crypto.subtle.sign("HMAC", finalKey, encoder.encode(dataCheckString));
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  return hash === calculatedHash;
}

/**
 * Экранирует специальные символы для Telegram MarkdownV2.
 * Применяется ТОЛЬКО к динамическим данным (имена, номера счетов и т.д.).
 */
function escapeMarkdownV2(text: string | number): string {
  const str = String(text);
  const charsToEscape = ['_', '*', '[', ']', '(', ')', '~', '`', '>', '#', '+', '-', '=', '|', '{', '}', '.', '!'];
  let escapedText = str;
  for (const char of charsToEscape) {
    escapedText = escapedText.replace(new RegExp(`\\${char}`, 'g'), `\\${char}`);
  }
  return escapedText;
}

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

// Статические тексты с уже экранированными спецсимволами
const translations: Record<string, Record<string, string>> = {
  ru: {
    orderAcceptedTitle: "🥰{{firstName}}, ваша заявка принята\\!",
    orderNumber: "Номер заказа:",
    youSend: "Вы отправляете:",
    toReceive: "К получению \\(VND\\):",
    depositWallet: "Кошелек для пополнения:",
    usdtNetwork: "Сеть USDT:",
    attention: "Внимание\\!",
    sendOnlyUsdtWarning: "Отправляйте средства только на указанный адрес в сети {{network}}\\! В противном случае ваши средства могут быть навсегда утеряны\\.",
    status: "Статус:",
    newApplication: "Новая заявка \\(Не оплачен\\)",
    contactSoon: "Мы скоро свяжемся с вами для подтверждения\\.",
    adminNewOrder: "😏 *Новый заказ\\!*",
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
    orderAcceptedTitle: "🥰{{firstName}}, your application has been accepted\\!",
    orderNumber: "Order number:",
    youSend: "You send:",
    toReceive: "To receive \\(VND\\):",
    depositWallet: "Deposit wallet:",
    usdtNetwork: "USDT Network:",
    attention: "Attention\\!",
    sendOnlyUsdtWarning: "Send funds only to the specified address on the {{network}} network\\. Otherwise, your funds may be lost forever\\.",
    status: "Status:",
    newApplication: "New application \\(Unpaid\\)",
    contactSoon: "We will contact you soon for confirmation\\.",
    adminNewOrder: "😏 *New order\\!*",
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
    orderAcceptedTitle: "🥰{{firstName}}, đơn hàng của bạn đã được chấp nhận\\!",
    orderNumber: "Mã đơn hàng:",
    youSend: "Bạn gửi:",
    toReceive: "Nhận \\(VND\\):",
    depositWallet: "Ví nạp tiền:",
    usdtNetwork: "Mạng USDT:",
    attention: "Chú ý\\!",
    sendOnlyUsdtWarning: "Chỉ gửi tiền USDT đến địa chỉ được chỉ định trên mạng {{network}}\\! Nếu không, tiền của bạn có thể bị mất vĩnh viễn\\.",
    status: "Trạng thái:",
    newApplication: "Đơn hàng mới \\(Chưa thanh toán\\)",
    contactSoon: "Chúng tôi sẽ liên hệ với bạn sớm để xác nhận\\.",
    adminNewOrder: "😏 *Đơn hàng mới\\!*",
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
  const selectedLang = translations[lang] || translations['en'];
  let text = selectedLang[key] || key;
  if (params) {
    for (const pKey in params) {
      text = text.replace(new RegExp(`{{${pKey}}}`, 'g'), params[pKey]);
    }
  }
  return text;
}

function formatOrderForTelegram(order: any, forAdmin: boolean, lang: string): string {
  const locale = lang === 'vi' ? 'vi-VN' : 'ru-RU';

  if (forAdmin) {
    const clientUsername = escapeMarkdownV2(order.telegram_username || 'N/A');
    const clientIdentifier = order.telegram_id ? `ID: ${order.telegram_id} \\(@${clientUsername}\\)` : getTranslation(lang, 'client');
    const publicId = escapeMarkdownV2(order.public_id);
    const bankName = escapeMarkdownV2(order.vnd_bank_name || '');
    const bankAccountNumber = escapeMarkdownV2(order.vnd_bank_account_number || '');
    const deliveryAddress = escapeMarkdownV2(order.delivery_address || '');
    const contactPhone = escapeMarkdownV2(order.contact_phone || '');

    const details = [
      getTranslation(lang, 'adminNewOrder'),
      ``,
      `${getTranslation(lang, 'orderNumber')} \`#${publicId}\``,
      `${getTranslation(lang, 'client')} ${clientIdentifier}`,
      `-----------------------------------`,
      `${getTranslation(lang, 'youSend')} ${order.from_amount.toLocaleString(locale)} ${order.payment_currency}`,
      `${getTranslation(lang, 'toReceive')} ${order.calculated_vnd.toLocaleString('vi-VN')}`,
      `${getTranslation(lang, 'exchangeRate')} ${order.exchange_rate.toLocaleString(locale)}`,
      `-----------------------------------`,
      `${getTranslation(lang, 'deliveryMethod')} ${order.delivery_method === 'bank' ? getTranslation(lang, 'bankTransfer') : getTranslation(lang, 'cash')}`,
    ];

    if (order.payment_currency === 'USDT') {
      details.push(`${getTranslation(lang, 'usdtNetwork')} ${escapeMarkdownV2(order.usdt_network)}`);
    }
    if (order.delivery_method === 'bank') {
      details.push(`${getTranslation(lang, 'bank')} ${bankName}`);
      details.push(`${getTranslation(lang, 'accountNumber')} \`${bankAccountNumber}\``);
    } else {
      details.push(`${getTranslation(lang, 'deliveryAddress')} ${deliveryAddress}`);
    }
    if (order.contact_phone) {
      details.push(`${getTranslation(lang, 'contactPhone')} ${contactPhone}`);
    }
    details.push(`-----------------------------------`);
    details.push(`${getTranslation(lang, 'status')} ${escapeMarkdownV2(order.status)}`);
    return details.join('\n');

  } else {
    const escapedFirstName = escapeMarkdownV2(order.telegram_user_first_name || '');
    const title = getTranslation(lang, 'orderAcceptedTitle', { firstName: escapedFirstName ? ` ${escapedFirstName}` : '' });
    const publicId = escapeMarkdownV2(order.public_id);
    const depositAddress = escapeMarkdownV2(order.deposit_address || '');
    
    const details = [
      title,
      `${getTranslation(lang, 'orderNumber')} \`#${publicId}\``,
      `-----------------------------------`,
      `${getTranslation(lang, 'youSend')} ${order.from_amount.toLocaleString(locale)} ${order.payment_currency}`,
      `${getTranslation(lang, 'toReceive')} ${order.calculated_vnd.toLocaleString('vi-VN')}`,
    ];

    if (order.payment_currency === 'USDT' && order.deposit_address && order.deposit_address !== 'N/A') {
      details.push(``);
      details.push(getTranslation(lang, 'depositWallet'));
      details.push(`\`${depositAddress}\``);
      details.push(`${getTranslation(lang, 'usdtNetwork')} ${escapeMarkdownV2(order.usdt_network)}`);
      details.push(``);
      details.push(`*${getTranslation(lang, 'attention')}* ${getTranslation(lang, 'sendOnlyUsdtWarning', { network: escapeMarkdownV2(order.usdt_network) })}`);
    }

    details.push(`-----------------------------------`);
    details.push(`${getTranslation(lang, 'status')} ${getTranslation(lang, 'newApplication')}`);
    details.push(``);
    details.push(getTranslation(lang, 'contactSoon'));
    return details.join('\n');
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  console.log("--- Invoking create-order function ---");
  try {
    const { initData, formData } = await req.json();
    if (!initData || !formData) {
      return new Response(JSON.stringify({ error: "Отсутствуют initData или formData" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const isTelegramDataValid = await validateTelegramData(initData);
    if (!isTelegramDataValid) {
      return new Response(JSON.stringify({ error: "Ошибка аутентификации: неверные initData" }), { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get("user")!);
    if (!user || !user.id) {
      return new Response(JSON.stringify({ error: "Не удалось извлечь данные пользователя из initData" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: userProfile } = await supabase.from('telegram_profiles').select('language_code').eq('telegram_id', user.id).single();
    let userLang = 'en';
    if (userProfile?.language_code && ['ru', 'en', 'vi'].includes(userProfile.language_code)) {
      userLang = userProfile.language_code;
    } else if (user.language_code && ['ru', 'en', 'vi'].includes(user.language_code)) {
      userLang = user.language_code;
    }
    
    // public_id теперь генерируется базой данных. Мы его не передаем.
    const orderToInsert = {
      payment_currency: formData.paymentCurrency, from_amount: formData.fromAmount, calculated_vnd: formData.calculatedVND, exchange_rate: formData.exchangeRate,
      delivery_method: formData.deliveryMethod, usdt_network: formData.usdtNetwork ?? null, vnd_bank_name: formData.vndBankName ?? null,
      vnd_bank_account_number: formData.vndBankAccountNumber ?? null, delivery_address: formData.deliveryAddress ?? null, contact_phone: formData.contactPhone ?? null,
      status: "Новая заявка", telegram_id: user.id,
    };

    // Вставляем заказ и сразу получаем его обратно с помощью .select().single()
    // чтобы получить сгенерированный базой данных public_id
    const { data: insertedOrder, error: insertError } = await supabase.from("orders").insert(orderToInsert).select().single();

    if (insertError) throw new Error(`Ошибка базы данных: ${insertError.message}`);
    
    const fullOrderDetailsForNotification = { ...insertedOrder, telegram_user_first_name: user.first_name, telegram_username: user.username, deposit_address: formData.depositAddress };
    const clientMessageText = formatOrderForTelegram(fullOrderDetailsForNotification, false, userLang);
    const inlineKeyboard = { inline_keyboard: [[{ text: 'RU', callback_data: `lang_ru_${insertedOrder.public_id}` }, { text: 'EN', callback_data: `lang_en_${insertedOrder.public_id}` }, { text: 'VIET', callback_data: `lang_vi_${insertedOrder.public_id}` }]] };
    const clientMessageResponse = await sendMessage(user.id, clientMessageText, inlineKeyboard);
    if (clientMessageResponse?.ok) {
      const messageId = clientMessageResponse.result.message_id;
      await supabase.from('order_messages').insert({ chat_id: user.id, message_id: messageId, order_id: insertedOrder.id, telegram_id: user.id });
    }
    if (ADMIN_TELEGRAM_CHAT_ID && ADMIN_TELEGRAM_CHAT_ID.trim() !== '') {
      const adminMessage = formatOrderForTelegram(fullOrderDetailsForNotification, true, 'ru');
      await sendMessage(ADMIN_TELEGRAM_CHAT_ID, adminMessage);
    }
    console.log("--- create-order function finished successfully ---");
    return new Response(JSON.stringify(insertedOrder), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("--- CRITICAL ERROR in create-order function ---", error);
    return new Response(JSON.stringify({ error: error.message || "Внутренняя ошибка сервера" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});