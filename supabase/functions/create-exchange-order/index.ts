// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const ADMIN_TELEGRAM_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

async function sendTelegramMessage(chatId: string | number, text: string) {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is not set.");
    return;
  }
  if (!chatId) {
    console.error("chatId is not provided for telegram message.");
    return;
  }

  try {
    const response = await fetch(TELEGRAM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Telegram API error for chatId ${chatId}:`, errorData);
    }
  } catch (error) {
    console.error(`Failed to send telegram message to ${chatId}:`, error);
  }
}

function formatOrderForTelegram(order: any, forAdmin: boolean): string {
  const clientIdentifier = order.telegram_contact ? `@${order.telegram_contact}` : (order.telegram_user_id ? `ID: ${order.telegram_user_id}`: 'Клиент');
  const title = forAdmin 
    ? `*Новая заявка #${order.public_id}* от ${clientIdentifier}`
    : `*Ваша заявка #${order.public_id} успешно создана!*`;

  const details = [
    title,
    `-----------------------------------`,
    `*Вы отдаете:* ${order.from_amount.toLocaleString('ru-RU')} ${order.payment_currency}`,
    `*Вы получаете (VND):* ${order.calculated_vnd.toLocaleString('vi-VN')}`,
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

  if (forAdmin && order.contact_phone) {
    details.push(`*Телефон для связи:* \`${order.contact_phone}\``);
  }
  
  details.push(`-----------------------------------`);
  if (!forAdmin) {
    details.push(`Наш менеджер скоро свяжется с вами для подтверждения деталей.`);
  }
  details.push(`_Статус: ${order.status}_`);

  return details.join('\n');
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const orderData = body.orderData;

    const publicId = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const insertData = {
      payment_currency: orderData.paymentCurrency,
      from_amount: orderData.fromAmount,
      calculated_vnd: orderData.calculatedVND,
      exchange_rate: orderData.exchangeRate,
      delivery_method: orderData.deliveryMethod,
      usdt_network: orderData.usdtNetwork ?? null,
      vnd_bank_name: orderData.vndBankName ?? null,
      vnd_bank_account_number: orderData.vndBankAccountNumber ?? null,
      delivery_address: orderData.deliveryAddress ?? null,
      telegram_contact: orderData.telegramContactUsername ?? null,
      contact_phone: orderData.contactPhone ?? null,
      public_id: publicId,
      status: "Новая заявка",
      created_at: new Date().toISOString(),
      telegram_user_id: orderData.telegramUserId ?? null,
    };

    const { data, error } = await supabase
      .from("orders")
      .insert(insertData)
      .select()
      .single();

    if (error) {
      console.error("Insert error:", error);
      return new Response(
        JSON.stringify({ error: error.message || "Ошибка при создании заказа" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Send notifications
    // To Admin
    if (ADMIN_TELEGRAM_CHAT_ID) {
      const adminMessage = formatOrderForTelegram(data, true);
      await sendTelegramMessage(ADMIN_TELEGRAM_CHAT_ID, adminMessage);
    } else {
      console.warn("ADMIN_TELEGRAM_CHAT_ID is not set. Cannot send admin notification.");
    }

    // To Client
    if (data.telegram_user_id) {
      const clientMessage = formatOrderForTelegram(data, false);
      await sendTelegramMessage(data.telegram_user_id, clientMessage);
    }

    return new Response(
      JSON.stringify(data),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Внутренняя ошибка сервера" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});