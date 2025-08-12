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

function formatUserInfo(user: any): string {
  return `Ваш профиль:
ID: ${user.id}
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

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const message = body.message;

    if (!message || !message.chat || !message.text) {
      return new Response("ok"); // Not a message we care about
    }

    const chatId = message.chat.id;
    const text = message.text;
    const user = message.from;

    if (text === "/start" && user) {
      // Upsert user data with new schema
      const { error: upsertError } = await supabase
        .from("telegram_users")
        .upsert(
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

      if (upsertError) {
        console.error("Error upserting telegram user:", upsertError);
        // Do not return error to Telegram, just log
      }

      // Fetch user info from DB to send full profile
      const { data: userInfo, error: fetchError } = await supabase
        .from("telegram_users")
        .select("*")
        .eq("telegram_id", user.id)
        .single();

      if (fetchError || !userInfo) {
        console.error("Error fetching telegram user info:", fetchError);
        // Send fallback welcome message
        await supabase.functions.invoke("send-telegram-notification", {
          body: { chatId: chatId, text: "Добро пожаловать! Мы сохранили ваш профиль." },
        });
      } else {
        // Format user info message
        const infoText = formatUserInfo(userInfo);

        // Send detailed user info message
        await supabase.functions.invoke("send-telegram-notification", {
          body: { chatId: chatId, text: infoText },
        });
      }

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