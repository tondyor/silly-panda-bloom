import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import { verifyInitData } from "../_shared/telegram-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_API_URL = `https://api.telegram.org/bot${Deno.env.get("TELEGRAM_BOT_TOKEN")}`;

async function sendTelegramApiRequest(method: string, body: Record<string, any>) {
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/${method}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    return response;
  } catch (error) {
    console.error(`Failed to call Telegram API method ${method}:`, error);
    return new Response(JSON.stringify({ ok: false, description: error.message }), { status: 500 });
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { initData, order } = await req.json();
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");
    const adminChatId = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");

    if (!initData || !order || !botToken || !adminChatId) {
      return new Response(JSON.stringify({ ok: false, error: "Missing required data or server configuration." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verification = verifyInitData(initData, botToken);
    if (!verification.ok || !verification.data) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_init_data", details: verification.error }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userData = JSON.parse(verification.data.user);
    const queryId = verification.data.query_id;
    const userId = userData.id;

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const orderPayload = {
      user_id: userId,
      payment_currency: order.paymentCurrency,
      from_amount: order.fromAmount,
      calculated_vnd: order.calculatedVND,
      exchange_rate: order.exchangeRate,
      delivery_method: order.deliveryMethod,
      usdt_network: order.usdtNetwork ?? null,
      vnd_bank_name: order.vndBankName ?? null,
      vnd_bank_account_number: order.vndBankAccountNumber ?? null,
      delivery_address: order.deliveryAddress ?? null,
      contact_phone: order.contactPhone ?? null,
      status: "Новая заявка",
      public_id: `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`,
    };

    const { data: insertedOrder, error: insertError } = await supabase
      .from("orders")
      .insert(orderPayload)
      .select()
      .single();

    if (insertError) {
      throw new Error(`Supabase insert error: ${insertError.message}`);
    }

    const orderId = insertedOrder.public_id;
    let sendMessageStatus = { ok: false, need_start: false };

    if (queryId) {
      await sendTelegramApiRequest('answerWebAppQuery', {
        web_app_query_id: queryId,
        result: {
          type: 'article',
          id: String(orderId),
          title: 'Заказ создан',
          input_message_content: {
            message_text: `✅ Заказ #${orderId} успешно создан. Детали отправлены в личные сообщения.`
          }
        }
      });
    }

    const userMessage = `✅ Ваш заказ #${orderId} создан.\nСтатус: ${insertedOrder.status}.`;
    const smResponse = await sendTelegramApiRequest('sendMessage', {
      chat_id: userId,
      text: userMessage,
    });
    
    if (smResponse.ok) {
      sendMessageStatus.ok = true;
    } else if (smResponse.status === 403) {
      sendMessageStatus.need_start = true;
    }

    const adminMessage = `Новый заказ #${orderId} от пользователя ${userId}.\nСумма: ${order.fromAmount} ${order.paymentCurrency}.`;
    await sendTelegramApiRequest('sendMessage', {
      chat_id: adminChatId,
      text: adminMessage,
    });

    return new Response(JSON.stringify({
      ok: true,
      order_id: orderId,
      status: insertedOrder.status,
      notification_status: sendMessageStatus,
    }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in create-telegram-order:", error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});