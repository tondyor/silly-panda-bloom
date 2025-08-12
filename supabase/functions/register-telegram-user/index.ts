// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// @ts-ignore
import { HmacSha256 } from "https://deno.land/std@0.190.0/crypto/mod.ts";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

// Функция для верификации данных, как описано в документации Telegram
async function validateTelegramData(initData: string): Promise<{ isValid: boolean; data: URLSearchParams }> {
  if (!BOT_TOKEN) {
    console.error("BOT_TOKEN is not set.");
    return { isValid: false, data: new URLSearchParams() };
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) {
    return { isValid: false, data: params };
  }
  params.delete("hash");

  const dataCheckArr: string[] = [];
  params.sort();
  for (const [key, value] of params.entries()) {
    dataCheckArr.push(`${key}=${value}`);
  }
  const dataCheckString = dataCheckArr.join("\n");

  const secretKey = new HmacSha256(BOT_TOKEN).update("WebAppData").digest();
  const hmac = new HmacSha256(secretKey).update(dataCheckString).hex();

  return { isValid: hmac === hash, data: params };
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { initData } = await req.json();

    if (!initData) {
      return new Response(JSON.stringify({ error: "Missing initData" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { isValid, data: validatedParams } = await validateTelegramData(initData);

    if (!isValid) {
      console.error("Validation failed: Invalid hash.");
      return new Response(JSON.stringify({ error: "Invalid data: hash validation failed" }), {
        status: 403,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const userString = validatedParams.get("user");
    if (!userString) {
      return new Response(JSON.stringify({ error: "User data not found in initData" }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const user = JSON.parse(userString);

    const { data, error } = await supabase
      .from("telegram_users")
      .upsert(
        {
          telegram_id: user.id,
          first_name: user.first_name || null,
          last_name: user.last_name || null,
          username: user.username || null,
          language_code: user.language_code || null,
          is_premium: user.is_premium || false,
        },
        { onConflict: "telegram_id", ignoreDuplicates: false }
      )
      .select()
      .single();

    if (error) {
      console.error("Error upserting telegram user:", error);
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    console.log(`Successfully validated and registered/updated Telegram user: ${user.id}`);
    return new Response(JSON.stringify({ success: true, user: data }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Unexpected error in register-telegram-user:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});