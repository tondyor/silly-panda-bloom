// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

function getAlphabeticalPrefix(index: number): string {
  let result = "";
  let tempIndex = index;
  for (let i = 0; i < 3; i++) {
    const charCode = "A".charCodeAt(0) + (tempIndex % 26);
    result = String.fromCharCode(charCode) + result;
    tempIndex = Math.floor(tempIndex / 26);
  }
  return result;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const ADMIN_TELEGRAM_ID = Deno.env.get("ADMIN_TELEGRAM_ID");

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const { orderData } = await req.json();

    if (!orderData) {
      throw new Error("Missing order data.");
    }

    // Here we assume telegram_user_id is set by other means (e.g. server-side logic or webhook)
    // So we do NOT expect telegramUser data from client anymore

    // 1. Get next order number
    const { data: nextOrderNumberData, error: rpcError } = await supabase.rpc(
      "get_next_order_id",
    );

    if (rpcError) {
      console.error("RPC Error:", rpcError);
      throw new Error(`Failed to get next order ID: ${rpcError.message}`);
    }

    let nextOrderNumber: number;
    if (typeof nextOrderNumberData === "number") {
      nextOrderNumber = nextOrderNumberData;
    } else if (
      nextOrderNumberData && typeof nextOrderNumberData === "object"
    ) {
      const key = Object.keys(nextOrderNumberData)[0];
      nextOrderNumber = nextOrderNumberData[key];
    } else {
      throw new Error("Invalid response from get_next_order_id function.");
    }

    // 2. Generate public order ID
    const alphabeticalIndex = nextOrderNumber - 564;
    const prefix = getAlphabeticalPrefix(alphabeticalIndex);
    const publicId = `${prefix}${nextOrderNumber}`;

    // 3. Prepare order data for insertion
    const {
      paymentCurrency,
      fromAmount,
      calculatedVND,
      exchangeRate,
      deliveryMethod,
      vndBankName,
      vndBankAccountNumber,
      deliveryAddress,
      contactPhone,
      usdtNetwork,
    } = orderData;

    // Since telegram_user_id is no longer passed from client, set it to null or handle accordingly
    const newOrder = {
      public_id: publicId,
      payment_currency: paymentCurrency,
      from_amount: fromAmount,
      calculated_vnd: calculatedVND,
      exchange_rate: exchangeRate,
      delivery_method: deliveryMethod,
      vnd_bank_name: vndBankName || null,
      vnd_bank_account_number: vndBankAccountNumber || null,
      delivery_address: deliveryAddress || null,
      contact_phone: contactPhone || null,
      usdt_network: usdtNetwork || null,
      status: "Новая заявка",
      telegram_user_id: null,
    };

    // 4. Insert new order into the table
    const { data: insertedOrder, error: insertError } = await supabase
      .from("orders")
      .insert(newOrder)
      .select()
      .single();

    if (insertError) {
      console.error("Insert Error:", insertError);
      throw new Error(`Failed to insert order: ${insertError.message}`);
    }

    // 5. Send notifications
    const clientMessage = `Вы создали заявку номер ${publicId}. Следуйте инструкциям по оплате или дождитесь сообщения оператора.`;

    const adminMessage = `
Новая заявка: *#${publicId}*

*Детали:*
Отдает: ${fromAmount} ${paymentCurrency}
Получает: ${calculatedVND.toLocaleString("vi-VN")} VND
Способ: ${deliveryMethod === "bank" ? "Банк" : "Наличные"}
${
      deliveryMethod === "bank"
        ? `Банк: ${vndBankName}\nСчет: ${vndBankAccountNumber}`
        : `Адрес: ${deliveryAddress}`
    }
${paymentCurrency === "USDT" ? `Сеть: ${usdtNetwork}` : ""}
    `.trim();

    // Notifications to admin only, since client chatId unknown
    if (ADMIN_TELEGRAM_ID) {
      supabase.functions.invoke("send-telegram-notification", {
        body: { chatId: ADMIN_TELEGRAM_ID, text: adminMessage },
      });
    }

    // 6. Return the created order to the frontend
    return new Response(JSON.stringify(insertedOrder), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error creating order:", error);
    return new Response(
      JSON.stringify({ error: `Failed to create order: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});