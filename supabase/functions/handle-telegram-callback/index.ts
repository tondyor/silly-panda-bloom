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
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

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

async function editMessageText(chatId: string | number, messageId: number, text: string, reply_markup?: any): Promise<any> {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'MarkdownV2', reply_markup }),
    });
    const responseData = await response.json();
    if (!response.ok) {
      console.error(`Ошибка Telegram API (editMessageText) для chatId ${chatId}, messageId ${messageId}:`, JSON.stringify(responseData, null, 2));
    }
    return responseData;
  } catch (e) {
    console.error(`Не удалось отредактировать сообщение в Telegram для ${chatId}, ${messageId}:`, e);
    return null;
  }
}

async function answerCallbackQuery(callbackQueryId: string): Promise<void> {
  try {
    await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId }),
    });
  } catch (e) {
    console.error(`Не удалось ответить на callback-запрос ${callbackQueryId}:`, e);
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

function formatClientOrderMessage(order: any, lang: string): string {
  const locale = lang === 'vi' ? 'vi-VN' : 'ru-RU';
  const escapedFirstName = escapeMarkdownV2(order.telegram_user_first_name || '');
  const title = getTranslation(lang, 'orderAcceptedTitle', { firstName: escapedFirstName ? ` ${escapedFirstName}` : '' });
  const orderId = escapeMarkdownV2(order.order_id); // Используем order_id
  const depositAddress = escapeMarkdownV2(order.deposit_address || '');
  
  const details = [
    title,
    `${getTranslation(lang, 'orderNumber')} \`#${orderId}\``, // Используем orderId
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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }
  let callbackQuery;
  try {
    const body = await req.json();
    callbackQuery = body.callback_query;
    if (!callbackQuery) {
      return new Response(JSON.stringify({ error: "Missing callback_query" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data, message, from, id: callbackQueryId } = callbackQuery;
    const { chat, message_id: messageId } = message;
    await answerCallbackQuery(callbackQueryId);
    const parts = data.split('_');
    if (parts.length !== 3 || parts[0] !== 'lang') {
      return new Response(JSON.stringify({ error: "Invalid callback data" }), { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const newLang = parts[1];
    const orderIdFromCallback = parts[2]; // Получаем order_id из callback_data
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    const { data: order, error: orderError } = await supabase.from('orders').select('*').eq('order_id', orderIdFromCallback).single(); // Ищем по order_id
    if (orderError || !order) {
      return new Response(JSON.stringify({ error: "Order not found" }), { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } });
    }
    const { data: userProfile } = await supabase.from('telegram_profiles').select('first_name, username').eq('telegram_id', order.telegram_id).single();
    const depositAddress = order.payment_currency === 'USDT' ? {
      BEP20: "0x66095f5be059C3C3e1f44416aEAd8085B8F42F3e", TON: "UQCgn4ztELQZLiGWTtOFcZoN22Lf4B6Vd7IO6WsBZuXM8edg",
      TRC20: "TAAQEjDBQK5hN1MGumVUjtzX42qRYCjTkB", ERC20: "0x54C7fA815AE5a5DDEd5DAa4A36CFB6903cE7D896",
      SPL: "9vBe1AP3197jP4PSjC2jUsyadr82Sey3nXbxAT3LSQwm"
    }[order.usdt_network] || "N/A" : "N/A";
    const fullOrderDetails = { ...order, telegram_user_first_name: userProfile?.first_name || from.first_name, telegram_username: userProfile?.username || from.username, deposit_address: depositAddress };
    const updatedMessageText = formatClientOrderMessage(fullOrderDetails, newLang);
    const inlineKeyboard = { inline_keyboard: [[{ text: 'RU', callback_data: `lang_ru_${order.order_id}` }, { text: 'EN', callback_data: `lang_en_${order.order_id}` }, { text: 'VIET', callback_data: `lang_vi_${order.order_id}` }]] }; // Используем order_id
    await editMessageText(chat.id, messageId, updatedMessageText, inlineKeyboard);
    return new Response(JSON.stringify({ success: true }), { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    if (callbackQuery?.id) await answerCallbackQuery(callbackQuery.id);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } });
  }
});