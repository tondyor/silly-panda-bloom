import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { z } from 'https://esm.sh/zod@3.23.2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const orderSchema = z.object({
  paymentCurrency: z.enum(["USDT", "RUB"]),
  fromAmount: z.number().min(1),
  calculatedVND: z.number(),
  exchangeRate: z.number(),
  deliveryMethod: z.enum(["bank", "cash"]),
  vndBankName: z.string().optional().nullable(),
  vndBankAccountNumber: z.string().optional().nullable(),
  deliveryAddress: z.string().optional().nullable(),
  telegramContact: z.string().min(3),
  contactPhone: z.string().optional().nullable(),
  usdtNetwork: z.string().optional().nullable(),
});

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

async function sendTelegramMessage(supabase: any, chatId: number | string, text: string) {
  try {
    await supabase.functions.invoke('send-telegram-notification', {
      body: { chatId, text },
    });
  } catch (e) {
    console.error("Failed to send Telegram message:", e);
  }
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );
    
    const ADMIN_TELEGRAM_ID = Deno.env.get('ADMIN_TELEGRAM_ID');

    const { orderData, telegramUser } = await req.json();

    if (!orderData || !telegramUser || !telegramUser.id) {
        throw new Error("Missing order data or Telegram user information.");
    }

    // Валидация данных заказа
    const parseResult = orderSchema.safeParse(orderData);
    if (!parseResult.success) {
      const errorMessages = parseResult.error.errors.map(e => `${e.path.join('.')}: ${e.message}`).join('\n');
      const errorText = `Ошибка в данных заявки:\n${errorMessages}`;
      // Отправляем сообщение пользователю в Telegram
      await sendTelegramMessage(supabase, telegramUser.id, errorText);
      return new Response(
        JSON.stringify({ error: errorText }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Save or update user in the database
    const { error: userUpsertError } = await supabase
      .from('telegram_users')
      .upsert({
        telegram_id: telegramUser.id,
        first_name: telegramUser.first_name,
        username: telegramUser.username || null,
      }, { onConflict: 'telegram_id' });

    if (userUpsertError) {
        console.error('User Upsert Error:', userUpsertError);
        throw new Error(`Failed to save user data: ${userUpsertError.message}`);
    }

    // 2. Get next order number
    const { data: nextOrderNumberData, error: rpcError } = await supabase.rpc('get_next_order_id');

    if (rpcError) {
        console.error('RPC Error:', rpcError);
        throw new Error(`Failed to get next order ID: ${rpcError.message}`);
    }
    
    let nextOrderNumber: number;
    if (typeof nextOrderNumberData === 'number') {
      nextOrderNumber = nextOrderNumberData;
    } else if (nextOrderNumberData && typeof nextOrderNumberData === 'object') {
      const key = Object.keys(nextOrderNumberData)[0];
      nextOrderNumber = nextOrderNumberData[key];
    } else {
      throw new Error('Invalid response from get_next_order_id function.');
    }

    // 3. Generate public order ID
    const alphabeticalIndex = nextOrderNumber - 564;
    const prefix = getAlphabeticalPrefix(alphabeticalIndex);
    const publicId = `${prefix}${nextOrderNumber}`;

    // 4. Prepare order data for insertion
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
      status: 'Новая заявка',
      telegram_user_id: telegramUser.id,
    };

    // 5. Insert new order into the table
    const { data: insertedOrder, error: insertError } = await supabase
      .from('orders')
      .insert(newOrder)
      .select()
      .single();

    if (insertError) {
        console.error('Insert Error:', insertError);
        throw new Error(`Failed to insert order: ${insertError.message}`);
    }

    // 6. Send notifications
    const clientMessage = `Вы создали заявку номер ${publicId}. Следуйте инструкциям по оплате или дождитесь сообщения оператора.`;
    
    const adminMessage = `
Новая заявка: *#${publicId}*
Пользователь: ${telegramUser.first_name} (${telegramUser.username ? `@${telegramUser.username}` : 'нет username'})
Контакт: ${telegramContact}

*Детали:*
Отдает: ${fromAmount} ${paymentCurrency}
Получает: ${calculatedVND.toLocaleString('vi-VN')} VND
Способ: ${deliveryMethod === 'bank' ? 'Банк' : 'Наличные'}
${deliveryMethod === 'bank' ? `Банк: ${vndBankName}\nСчет: ${vndBankAccountNumber}` : `Адрес: ${deliveryAddress}`}
${paymentCurrency === 'USDT' ? `Сеть: ${usdtNetwork}` : ''}
    `.trim();

    // Invoke notification function (fire and forget)
    supabase.functions.invoke('send-telegram-notification', {
        body: { chatId: telegramUser.id, text: clientMessage },
    });

    if (ADMIN_TELEGRAM_ID) {
        supabase.functions.invoke('send-telegram-notification', {
            body: { chatId: ADMIN_TELEGRAM_ID, text: adminMessage },
        });
    }

    // 7. Return the created order to the frontend
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