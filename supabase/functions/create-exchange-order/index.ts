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

async function sendTelegramMessage(chatId: string | number, text: string): Promise<void> {
    if (!TELEGRAM_BOT_TOKEN || !chatId) {
      console.error("sendTelegramMessage failed: Missing token or chatId.", { chatId });
      return;
    }
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
      console.error(`Telegram API error for chatId ${chatId}. Status: ${response.status}.`, errorData);
      throw new Error(`Telegram API error: ${errorData.description}`);
    }
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    const body = await req.json();
    // ИСПРАВЛЕНО: Извлекаем orderData из тела запроса
    const orderData = body.orderData; 
    
    console.log('=== ORDER REQUEST RECEIVED ===');
    console.log('Request method:', req.method);
    console.log('Request headers:', Object.fromEntries(req.headers.entries()));
    console.log('Full orderData:', JSON.stringify(orderData, null, 2));
    
    // ИСПРАВЛЕНО: Ищем telegramId внутри объекта orderData
    const telegramId = orderData.telegramId;
    
    console.log('=== TELEGRAM ID VALIDATION ===');
    console.log('telegramId value:', telegramId);
    console.log('telegramId type:', typeof telegramId);
    
    if (!telegramId || typeof telegramId !== 'number' || telegramId <= 0) {
      console.error('❌ VALIDATION FAILED: Invalid telegram ID');
      return new Response(
        JSON.stringify({ 
          error: 'Invalid or missing telegram ID',
          received: telegramId,
          type: typeof telegramId
        }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log('✅ VALIDATION PASSED');
    console.log('Using telegramId:', telegramId);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

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
      contact_phone: orderData.contactPhone ?? null,
      public_id: publicId,
      status: "Новая заявка",
      created_at: new Date().toISOString(),
      telegram_id: telegramId, // <-- Используем проверенный telegramId
    };

    const { data: insertedOrder, error: insertError } = await supabase
      .from("orders")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message || "Ошибка при создании заказа" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('✅ Order saved to database with telegram_id:', insertedOrder.telegram_id);

    // === ОТПРАВКА УВЕДОМЛЕНИЙ ===
    console.log('Sending notification to client:', telegramId);
    try {
      await sendTelegramMessage(telegramId, `🎉 Ваш заказ #${publicId} создан успешно! Мы свяжемся с вами в ближайшее время.`);
      console.log('✅ Client notification sent successfully to:', telegramId);
    } catch (error) {
      console.error('❌ Failed to send client notification:', error);
    }
    
    if (ADMIN_TELEGRAM_CHAT_ID) {
      console.log('Sending notification to admin:', ADMIN_TELEGRAM_CHAT_ID);
      try {
        await sendTelegramMessage(
          ADMIN_TELEGRAM_CHAT_ID, 
          `📋 Новый заказ #${publicId} от пользователя ${telegramId}\n\nДанные заказа: ${JSON.stringify(orderData, null, 2)}`
        );
        console.log('✅ Admin notification sent successfully');
      } catch (error) {
        console.error('❌ Failed to send admin notification:', error);
      }
    }
    
    console.log('=== ORDER PROCESSING COMPLETE ===');
    
    return new Response(
      JSON.stringify(insertedOrder), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('=== SERVER ERROR ===');
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ 
        error: 'Internal server error',
        details: error.message 
      }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});