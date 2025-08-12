// @ts-ignore
// supabase-flags: --no-verify-jwt

import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    const body = await req.json();
    const message = body.message;

    if (!message || !message.chat || !message.text) {
      return new Response("ok"); // Not a message we care about
    }

    const chatId = message.chat.id;
    const text = message.text;
    const user = message.from;

    // Handle /start command from any user
    if (text === '/start') {
      if (user) {
        await supabase
          .from('telegram_users')
          .upsert({
            telegram_id: user.id,
            first_name: user.first_name,
            username: user.username || null,
          }, { onConflict: 'telegram_id' });
      }
      // Optionally, send a welcome message back
      // await supabase.functions.invoke('send-telegram-notification', {
      //   body: { chatId: chatId, text: 'Добро пожаловать!' },
      // });
      return new Response("ok");
    }

    // Handle /ok_ORDERID command ONLY from the admin
    if (chatId.toString() === ADMIN_TELEGRAM_ID) {
      const match = text.match(/^\/ok_([A-Z]{3}\d+)$/);
      if (match && match[1]) {
        const orderId = match[1];

        const { data: updatedOrder, error: updateError } = await supabase
          .from('orders')
          .update({ status: 'Завершен' })
          .eq('public_id', orderId)
          .select('telegram_user_id')
          .single();

        if (updateError) {
          throw new Error(`Failed to update order ${orderId}: ${updateError.message}`);
        }

        if (updatedOrder && updatedOrder.telegram_user_id) {
          await supabase.functions.invoke('send-telegram-notification', {
            body: {
              chatId: updatedOrder.telegram_user_id,
              text: 'Ваш обмен завершен!',
            },
          });
        }
        
        await supabase.functions.invoke('send-telegram-notification', {
          body: {
            chatId: ADMIN_TELEGRAM_ID,
            text: `Заказ #${orderId} успешно помечен как "Завершен".`,
          },
        });
      }
    }

    return new Response("ok", { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error('Error handling Telegram update:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})