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
    console.log("Received update:", JSON.stringify(body));

    const message = body.message;

    if (!message) {
      console.log("No message field in update");
      return new Response("ok");
    }

    if (!message.chat) {
      console.log("No chat field in message");
      return new Response("ok");
    }

    if (!message.text) {
      console.log("No text field in message");
      return new Response("ok");
    }

    const chatId = message.chat.id;
    const text = message.text;
    const user = message.from;

    if (!user) {
      console.log("No user info in message.from");
      return new Response("ok");
    }

    console.log(`Received message from user ${user.id}: ${text}`);

    if (text === "/start") {
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
      } else {
        console.log("User upserted successfully");
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
        const sendResult = await supabase.functions.invoke("send-telegram-notification", {
          body: { chatId: chatId, text: "Добро пожаловать! Мы сохранили ваш профиль." },
        });
        console.log("Sent fallback welcome message:", sendResult);
      } else {
        // Format user info message
        const infoText = formatUserInfo(userInfo);

        // Send detailed user info message
        const sendResult = await supabase.functions.invoke("send-telegram-notification", {
          body: { chatId: chatId, text: infoText },
        });
        console.log("Sent detailed user info message:", sendResult);
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