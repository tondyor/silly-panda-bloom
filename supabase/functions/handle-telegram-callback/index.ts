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

// --- Вспомогательные функции для Telegram API ---
/**
 * Редактирует существующее сообщение в Telegram.
 * @param chatId ID чата.
 * @param messageId ID сообщения.
 * @param text Новый текст сообщения.
 * @param reply_markup Опциональная разметка для кнопок.
 */
async function editMessageText(chatId: string | number, messageId: number, text: string, reply_markup?: any): Promise<void> {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/editMessageText`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, message_id: messageId, text, parse_mode: 'Markdown', reply_markup }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Ошибка Telegram API (editMessageText) для chatId ${chatId}, messageId ${messageId}:`, JSON.stringify(errorData, null, 2));
    }
  } catch (e) {
    console.error(`Не удалось отредактировать сообщение в Telegram для ${chatId}, ${messageId}:`, e);
  }
}

/**
 * Отвечает на callback-запрос, чтобы убрать состояние загрузки с кнопки.
 * @param callbackQueryId ID callback-запроса.
 */
async function answerCallbackQuery(callbackQueryId: string): Promise<void> {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ callback_query_id: callbackQueryId }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Ошибка Telegram API (answerCallbackQuery) для callbackQueryId ${callbackQueryId}:`, JSON.stringify(errorData, null, 2));
    }
  } catch (e) {
    console.error(`Не удалось ответить на callback-запрос ${callbackQueryId}:`, e);
  }
}

// --- Серверные переводы (дублируются для автономности функции) ---
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
 * @param lang Язык для форматирования сообщения.
 * @returns Отформатированная строка.
 */
function formatClientOrderMessage(order: any, lang: string): string {
  const firstName = order.telegram_user_first_name ? ` ${order.telegram_user_first_name}` : '';
  const title = getTranslation(lang, 'orderAcceptedTitle', { firstName });
  
  const details = [
    title,
    `${getTranslation(lang, 'orderNumber')} \`#${order.public_id}\``,
    `-----------------------------------`,
    `${getTranslation(lang, 'youSend')} ${order.from_amount.toLocaleString('ru-RU')} ${order.payment_currency}`,
    `${getTranslation(lang, 'toReceive')} ${order.calculated_vnd.toLocaleString('vi-VN')}`,
  ];

  if (order.payment_currency === 'USDT' && order.deposit_address && order.deposit_address !== 'N/A') {
    details.push(``);
    details.push(`${getTranslation(lang, 'depositWallet')}`);
    details.push(`\`${order.deposit_address}\``);
    details.push(`${getTranslation(lang, 'usdtNetwork')} ${order.usdt_network}`);
    details.push(``);
    details.push(`*${getTranslation(lang, 'attention')}* ${getTranslation(lang, 'sendOnlyUsdtWarning', { network: order.usdt_network })}`);
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

  console.log("--- Invoking handle-telegram-callback function ---");

  try {
    const body = await req.json();
    const callbackQuery = body.callback_query;

    if (!callbackQuery) {
      console.error("Validation Error: Missing callback_query in request body.");
      return new Response(JSON.stringify({ error: "Missing callback_query" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const data = callbackQuery.data; // e.g., "lang_ru_ORD-12345"
    const chatId = callbackQuery.message.chat.id;
    const messageId = callbackQuery.message.message_id;
    const fromUser = callbackQuery.from; // User who clicked the button
    const callbackQueryId = callbackQuery.id;

    console.log(`Callback received: data=${data}, chatId=${chatId}, messageId=${messageId}`);

    // Parse callback data
    const parts = data.split('_');
    if (parts.length !== 3 || parts[0] !== 'lang') {
      console.error("Invalid callback data format:", data);
      await answerCallbackQuery(callbackQueryId); // Dismiss loading
      return new Response(JSON.stringify({ error: "Invalid callback data" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const newLang = parts[1]; // 'ru', 'en', 'vi'
    const orderPublicId = parts[2]; // 'ORD-12345'

    const supabase = createClient(
      // @ts-ignore
      Deno.env.get("SUPABASE_URL")!,
      // @ts-ignore
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Fetch order details
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('*')
      .eq('public_id', orderPublicId)
      .single();

    if (orderError || !order) {
      console.error("Database Error: Failed to fetch order.", orderError);
      await answerCallbackQuery(callbackQueryId); // Dismiss loading
      return new Response(JSON.stringify({ error: "Order not found" }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch user profile for first_name and username
    const { data: userProfile, error: profileError } = await supabase
      .from('telegram_profiles')
      .select('first_name, username')
      .eq('telegram_id', order.telegram_id)
      .single();

    const fullOrderDetailsForNotification = {
      ...order,
      telegram_user_first_name: userProfile?.first_name || fromUser.first_name,
      telegram_username: userProfile?.username || fromUser.username,
      // Note: deposit_address is not stored in DB, so we need to re-calculate or pass it if needed.
      // For simplicity, we'll assume it's not critical for language change.
      // If it were, it would need to be stored with the order or passed in callback_data.
      deposit_address: order.payment_currency === 'USDT' ? (
        order.usdt_network === 'BEP20' ? "0x66095f5be059C3C3e1f44416aEAd8085B8F42F3e" :
        order.usdt_network === 'TON' ? "UQCgn4ztELQZLiGWTtOFcZoN22Lf4B6Vd7IO6WsBZuXM8edg" :
        order.usdt_network === 'TRC20' ? "TAAQEjDBQK5hN1MGumVUjtzX42qRYCjTkB" :
        order.usdt_network === 'ERC20' ? "0x54C7fA815AE5a5DDEd5DAa4A36CFB6903cE7D896" :
        order.usdt_network === 'SPL' ? "9vBe1AP3197jP4PSjC2jUsyadr82Sey3nXbxAT3LSQwm" : "N/A"
      ) : "N/A",
    };

    const updatedMessageText = formatClientOrderMessage(fullOrderDetailsForNotification, newLang);

    // Re-create inline keyboard for the updated message
    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: 'RU', callback_data: `lang_ru_${orderPublicId}` },
          { text: 'EN', callback_data: `lang_en_${orderPublicId}` },
          { text: 'VIET', callback_data: `lang_vi_${orderPublicId}` },
        ]
      ]
    };

    await editMessageText(chatId, messageId, updatedMessageText, inlineKeyboard);
    await answerCallbackQuery(callbackQueryId); // Dismiss loading state

    console.log(`Message ${messageId} in chat ${chatId} updated to ${newLang}.`);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("--- CRITICAL ERROR in handle-telegram-callback function ---", error);
    await answerCallbackQuery(callbackQueryId); // Ensure callback is answered even on error
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});