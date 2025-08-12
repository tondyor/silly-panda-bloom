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

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const ADMIN_TELEGRAM_ID = Deno.env.get("ADMIN_TELEGRAM_ID");

    const body = await req.json();
    const message = body.message;

    if (!message || !message.chat || !message.text) {
      return new Response("ok"); // Not a message we care about
    }

    const chatId = message.chat.id;
    const text = message.text;
    const user = message.from;

    // Handle /start command from any user
    if (text === "/start") {
      if (user) {
        // Upsert user data with extended fields including optional username
        const { error } = await supabase
          .from("telegram_users")
          .upsert(
            {
              telegram_id: user.id,
              username: user.username || null,
              first_name: user.first_name,
              last_name: user.last_name || null,
              language_code: user.language_code || null,
              is_premium: false,
              registered_at: new Date().toISOString(),
              completed_deals_count: 0,
              total_volume_vnd: 0,
              total_volume_usdt: 0,
            },
            { onConflict: "telegram_id" }
          );

        if (error) {
          console.error("Error upserting telegram user:", error);
          return new Response(
            JSON.stringify({ error: "Failed to save user data." }),
            { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
          );
        }
      }

      // Send welcome message back
      await supabase.functions.invoke("send-telegram-notification", {
        body: { chatId: chatId, text: "Добро пожаловать! Мы сохранили ваш профиль." },
      });

      return new Response("ok");
    }

    return new Response("ok", { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (error) {
    console.error("Error handling Telegram update:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});