// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

function formatUserInfo(user: any): string {
  return `Ваш профиль:
Telegram-ID: ${user.telegram_id}
Имя: ${user.first_name}
Фамилия: ${user.last_name ?? "-"}
Язык: ${user.language_code ?? "-"}
Премиум: ${user.is_premium ? "Да" : "Нет"}
Дата регистрации: ${new Date(user.registered_at).toLocaleString("ru-RU")}
Завершено сделок: ${user.completed_deals_count}
Объем VND: ${user.total_volume_vnd}
Объем USDT: ${user.total_volume_usdt}`;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  let body: any;
  try {
    body = await req.json();
  } catch {
    return new Response("ok", { headers: corsHeaders });
  }

  const message = body.message;
  if (!message?.text || !message.chat?.id) {
    return new Response("ok", { headers: corsHeaders });
  }

  // Only react to /start
  if (message.text.trim().startsWith("/start")) {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    const user = message.from;

    // Upsert user data
    await supabase.from("telegram_users").upsert(
      {
        telegram_id: user.id,
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

    // Fetch user profile
    const { data: userInfo } = await supabase
      .from("telegram_users")
      .select("*")
      .eq("telegram_id", user.id)
      .single();

    const text = userInfo
      ? formatUserInfo(userInfo)
      : "Добро пожаловать! Мы сохранили ваш профиль.";

    // Send back to Telegram
    await fetch(TELEGRAM_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ chat_id: message.chat.id, text }),
    });
  }

  return new Response("ok", { headers: corsHeaders });
});