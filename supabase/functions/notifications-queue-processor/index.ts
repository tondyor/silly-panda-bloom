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
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

function getMessageText(messageType: string, payload: any): string {
  switch (messageType) {
    case 'order_created_user':
      return `🎉 Ваш заказ #${payload.publicId} создан успешно! Мы свяжемся с вами в ближайшее время.`;
    case 'order_created_admin':
      return `📋 Новый заказ #${payload.publicId}\nОт: \`${payload.telegramId}\`\nСумма: ${payload.fromAmount} ${payload.paymentCurrency}\nСпособ: ${payload.deliveryMethod}`;
    // Add other message types here
    default:
      return `Неизвестный тип уведомления: ${messageType}`;
  }
}

async function sendTelegramMessage(chatId: number, text: string): Promise<{ ok: boolean; data?: any }> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("Telegram Bot Token not configured.");
    return { ok: false, data: { error: "Server configuration error" } };
  }
  try {
    const response = await fetch(TELEGRAM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
    const data = await response.json();
    return { ok: response.ok, data };
  } catch (error) {
    console.error(`Failed to send message to ${chatId}:`, error);
    return { ok: false, data: { error: error.message } };
  }
}

serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // 1. Fetch pending jobs
    const { data: jobs, error: fetchError } = await supabase
      .from('notification_queue')
      .select('*')
      .eq('status', 'pending')
      .or(`next_retry_at.is.null,next_retry_at.lte.${new Date().toISOString()}`)
      .order('priority', { ascending: false }) // high -> normal -> low
      .order('created_at', { ascending: true })
      .limit(10);

    if (fetchError) throw new Error(`Failed to fetch jobs: ${fetchError.message}`);
    if (!jobs || jobs.length === 0) {
      return new Response(JSON.stringify({ message: "No pending notifications to process." }), { headers: corsHeaders });
    }

    // 2. Mark jobs as 'processing' to prevent double processing
    const jobIds = jobs.map(j => j.id);
    await supabase.from('notification_queue').update({ status: 'processing' }).in('id', jobIds);

    // 3. Process each job
    const processingPromises = jobs.map(async (job) => {
      const messageText = getMessageText(job.message_type, job.payload);
      const result = await sendTelegramMessage(job.telegram_id, messageText);

      if (result.ok) {
        // Success: mark as 'sent'
        await supabase.from('notification_queue').update({ status: 'sent' }).eq('id', job.id);
        console.log(`Successfully sent notification ${job.id} to ${job.telegram_id}`);
      } else {
        // Failure: handle retry logic
        const newAttempts = job.attempts + 1;
        if (newAttempts >= job.max_attempts) {
          // Dead letter
          await supabase.from('notification_queue').update({ status: 'dead_letter' }).eq('id', job.id);
          console.error(`Notification ${job.id} failed permanently and moved to dead letter queue.`, result.data);
        } else {
          // Schedule retry with exponential backoff
          const delaySeconds = Math.pow(2, newAttempts) * 5; // 10s, 20s, 40s...
          const nextRetryAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
          await supabase.from('notification_queue').update({
            status: 'pending',
            attempts: newAttempts,
            next_retry_at: nextRetryAt,
          }).eq('id', job.id);
          console.warn(`Failed to send notification ${job.id}. Retrying at ${nextRetryAt}.`, result.data);
        }
      }
    });

    await Promise.all(processingPromises);

    return new Response(JSON.stringify({ message: `Processed ${jobs.length} notifications.` }), { headers: corsHeaders });

  } catch (error) {
    console.error("Error in notification queue processor:", error);
    return new Response(JSON.stringify({ error: error.message }), { status: 500, headers: corsHeaders });
  }
});