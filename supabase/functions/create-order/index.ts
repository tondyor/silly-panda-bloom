// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// @ts-ignore
import { createHmac } from "https://deno.land/std@0.190.0/node/crypto.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const ADMIN_TELEGRAM_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// --- Validation ---
function validateTelegramData(initData: string): boolean {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("TELEGRAM_BOT_TOKEN is not set.");
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
  const secret = createHmac("sha256", "WebAppData").update(TELEGRAM_BOT_TOKEN).digest();
  const calculatedHash = createHmac("sha256", secret).update(dataCheckString).digest("hex");
  return hash === calculatedHash;
}

// --- Telegram API Helpers ---
async function sendMessage(chatId: string | number, text: string): Promise<boolean> {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
    if (!response.ok) {
        const errorData = await response.json();
        console.error(`Telegram API sendMessage error for chatId ${chatId}:`, JSON.stringify(errorData, null, 2));
        return false;
    }
    return true;
  } catch (e) {
    console.error(`Failed to send telegram message to ${chatId}:`, e);
    return false;
  }
}

async function answerWebAppQuery(queryId: string, result: any): Promise<boolean> {
    try {
        const response = await fetch(`${TELEGRAM_API_URL}/answerWebAppQuery`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ web_app_query_id: queryId, result }),
        });
        if (!response.ok) {
            const errorData = await response.json();
            console.error(`Telegram API answerWebAppQuery error for queryId ${queryId}:`, JSON.stringify(errorData, null, 2));
            return false;
        }
        return true;
    } catch(e) {
        console.error(`Failed to answer web app query ${queryId}:`, e);
        return false;
    }
}

// --- Formatting ---
function formatOrderForTelegram(order: any, forAdmin: boolean): string {
  if (forAdmin) {
    const clientIdentifier = order.telegram_id ? `ID: ${order.telegram_id} (@${order.telegram_username || 'N/A'})` : 'Клиент';
    const details = [
      `😏 Новый заказ!`,
      ``,
      `#${order.public_id}`,
      `Клиент: ${clientIdentifier}`,
      `-----------------------------------`,
      `Вы получите: ${order.from_amount.toLocaleString('ru-RU')} ${order.payment_currency}`,
      `Отправить (VND): ${order.calculated_vnd.toLocaleString('vi-VN')}`,
      `-----------------------------------`,
      `Способ получения: ${order.delivery_method === 'bank' ? 'Банковский перевод' : 'Наличные'}`,
    ];

    if (order.payment_currency === 'USDT') {
      details.push(`Сеть USDT: ${order.usdt_network}`);
    }

    if (order.delivery_method === 'bank') {
      details.push(`Банк: ${order.vnd_bank_name}`);
      details.push(`Номер счета: ${order.vnd_bank_account_number}`);
    } else {
      details.push(`Адрес доставки: ${order.delivery_address}`);
    }

    if (order.contact_phone) {
      details.push(`Телефон для связи: ${order.contact_phone}`);
    }
    
    details.push(`-----------------------------------`);
    details.push(`Статус: ${order.status}`);

    return details.join('\n');
  } else {
    const firstName = order.telegram_user_first_name ? ` ${order.telegram_user_first_name}` : '';
    const title = `*🥰${firstName}, ваша заявка принята!*`;
    
    const details = [
      title,
      `Номер заказа: #${order.public_id}`,
      `-----------------------------------`,
      `Вы отправляете: ${order.from_amount.toLocaleString('ru-RU')} ${order.payment_currency}`,
      `К получению (VND): ${order.calculated_vnd.toLocaleString('vi-VN')}`,
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

    return details.join('\n');
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { initData, formData } = await req.json();

    if (!initData || !validateTelegramData(initData)) {
      return new Response(JSON.stringify({ error: "Invalid or missing initData" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get("user")!);
    const queryId = params.get("query_id");

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const publicId = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
    const insertData = {
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
      .insert(insertData)
      .select()
      .single();

    if (insertError) throw insertError;

    const fullOrderDetailsForNotification = {
        ...insertedOrder,
        telegram_user_first_name: user.first_name,
        telegram_username: user.username,
        deposit_address: formData.depositAddress,
    };

    const clientMessageText = formatOrderForTelegram(fullOrderDetailsForNotification, false);

    if (queryId) {
      await answerWebAppQuery(queryId, {
        type: 'article',
        id: crypto.randomUUID(),
        title: 'Заявка успешно создана!',
        input_message_content: { message_text: clientMessageText, parse_mode: 'Markdown' },
      });
    }

    await sendMessage(user.id, clientMessageText);

    if (ADMIN_TELEGRAM_CHAT_ID) {
      const adminMessage = formatOrderForTelegram(fullOrderDetailsForNotification, true);
      await sendMessage(ADMIN_TELEGRAM_CHAT_ID, adminMessage);
    }

    return new Response(JSON.stringify(insertedOrder), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in create-order:", error);
    return new Response(JSON.stringify({ error: "Internal Server Error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});