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

const ADMIN_TELEGRAM_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");

async function enqueueNotification(supabase: any, telegramId: number, messageType: string, payload: any, priority: 'high' | 'normal' = 'normal') {
  if (!telegramId) return;

  const { error } = await supabase
    .from('notification_queue')
    .insert({
      telegram_id: telegramId,
      message_type: messageType,
      payload: payload,
      priority: priority,
    });

  if (error) {
    console.error(`Failed to enqueue notification ${messageType} for ${telegramId}:`, error);
  } else {
    console.log(`Successfully enqueued notification ${messageType} for ${telegramId}`);
  }
}

serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
        return new Response(null, { headers: corsHeaders });
    }

    const { orderData } = await req.json();
    
    const telegramId = orderData.telegramId;
    
    if (!telegramId || typeof telegramId !== 'number' || telegramId <= 0) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing telegram ID' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
      telegram_id: telegramId,
    };

    const { data: insertedOrder, error: insertError } = await supabase
      .from("orders")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("❌ DB Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message || "Ошибка при создании заказа" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Enqueue notifications instead of sending directly
    const notificationPayload = {
      publicId: publicId,
      telegramId: telegramId,
      fromAmount: orderData.fromAmount,
      paymentCurrency: orderData.paymentCurrency,
      deliveryMethod: orderData.deliveryMethod,
    };

    await enqueueNotification(supabase, telegramId, 'order_created_user', notificationPayload, 'high');
    
    if (ADMIN_TELEGRAM_CHAT_ID) {
      await enqueueNotification(supabase, Number(ADMIN_TELEGRAM_CHAT_ID), 'order_created_admin', notificationPayload, 'normal');
    }
    
    return new Response(
      JSON.stringify(insertedOrder), 
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('=== UNHANDLED SERVER ERROR ===');
    console.error('Error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: error.message }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});