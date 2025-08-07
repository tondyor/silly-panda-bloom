// @ts-nocheck
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function getAlphabeticalPrefix(index: number): string {
  let result = '';
  let tempIndex = index;
  for (let i = 0; i < 3; i++) {
    const charCode = 'A'.charCodeAt(0) + (tempIndex % 26);
    result = String.fromCharCode(charCode) + result;
    tempIndex = Math.floor(tempIndex / 26);
  }
  return result;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const orderData = await req.json();

    // 1. Получаем следующий номер заказа через RPC вызов
    const { data: nextOrderNumber, error: rpcError } = await supabase.rpc('get_next_order_id');

    if (rpcError) {
        console.error('RPC Error:', rpcError);
        throw new Error(`Failed to get next order ID: ${rpcError.message}`);
    }
    
    if (typeof nextOrderNumber !== 'number') {
        throw new Error('Invalid response from get_next_order_id function.');
    }

    // 2. Генерируем публичный ID заказа
    const alphabeticalIndex = nextOrderNumber - 564;
    const prefix = getAlphabeticalPrefix(alphabeticalIndex);
    const publicId = `${prefix}${nextOrderNumber}`;

    // 3. Готовим данные для вставки в базу
    const {
      paymentCurrency,
      fromAmount,
      calculatedVND,
      exchangeRate,
      deliveryMethod,
      vndBankName,
      vndBankAccountNumber,
      deliveryAddress,
      telegramContact,
      contactPhone,
      usdtNetwork,
    } = orderData;

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
      telegram_contact: telegramContact,
      contact_phone: contactPhone || null,
      usdt_network: usdtNetwork || null,
      status: 'pending',
    };

    // 4. Вставляем новый заказ в таблицу
    const { data: insertedOrder, error: insertError } = await supabase
      .from('orders')
      .insert(newOrder)
      .select()
      .single();

    if (insertError) {
        console.error('Insert Error:', insertError);
        throw new Error(`Failed to insert order: ${insertError.message}`);
    }

    return new Response(
      JSON.stringify(insertedOrder),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating order:', error);
    return new Response(
      JSON.stringify({ error: `Failed to create order: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})