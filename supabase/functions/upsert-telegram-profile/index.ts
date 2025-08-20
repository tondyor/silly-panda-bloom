// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// @ts-ignore
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");

async function validateTelegramData(initData: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("Security Critical: TELEGRAM_BOT_TOKEN is not set.");
    return false;
  }

  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return false;

  params.delete("hash");
  const dataCheckArr: string[] = [];
  for (const [key, value] of params.entries()) {
    dataCheckArr.push(`${key}=${value}`);
  }
  dataCheckArr.sort();
  const dataCheckString = dataCheckArr.join("\n");

  const encoder = new TextEncoder();

  const secretKey = await crypto.subtle.importKey(
    "raw",
    encoder.encode("WebAppData"),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const secret = await crypto.subtle.sign("HMAC", secretKey, encoder.encode(TELEGRAM_BOT_TOKEN));

  const finalKey = await crypto.subtle.importKey(
    "raw",
    secret,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const signatureBuffer = await crypto.subtle.sign("HMAC", finalKey, encoder.encode(dataCheckString));
  
  const hashArray = Array.from(new Uint8Array(signatureBuffer));
  const calculatedHash = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');

  return hash === calculatedHash;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  console.log("--- Invoking upsert-telegram-profile function ---");

  try {
    const { initData } = await req.json();
    if (!initData) {
      console.error("Validation Error: Missing initData in request body.");
      return new Response(JSON.stringify({ error: "Missing initData" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("Step 1: Request body parsed successfully.");

    const isTelegramDataValid = await validateTelegramData(initData);
    if (!isTelegramDataValid) {
      console.error("Authentication Error: Invalid initData received.");
      return new Response(JSON.stringify({ error: "Authentication error: invalid initData" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("Step 2: Telegram data validated successfully.");

    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get("user")!);

    if (!user || !user.id) {
        console.error("Data Error: Could not extract user data from initData.");
        return new Response(JSON.stringify({ error: "Could not extract user data from initData" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
    console.log(`Step 3: User data parsed. User ID: ${user.id}, Username: ${user.username || 'N/A'}`);

    const supabase = createClient(
      // @ts-ignore
      Deno.env.get("SUPABASE_URL")!,
      // @ts-ignore
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    console.log("Step 4: Supabase client created.");

    const { data: profile, error: upsertProfileError } = await supabase
      .from('telegram_profiles')
      .upsert({
        telegram_id: user.id,
        first_name: user.first_name || null,
        last_name: user.last_name || null,
        username: user.username || null,
        language_code: user.language_code || null,
        avatar_url: user.photo_url || null,
        is_premium: user.is_premium || false,
      }, { onConflict: 'telegram_id' })
      .select()
      .single();

    if (upsertProfileError) {
      console.error("Database Error: Failed to upsert Telegram profile.", upsertProfileError);
      throw new Error(`Database error: ${upsertProfileError.message}`);
    }
    
    console.log(`Step 5: Telegram profile for user ${user.id} upserted successfully.`);
    console.log("--- upsert-telegram-profile function finished successfully ---");
    
    return new Response(JSON.stringify({ success: true, profile }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("--- CRITICAL ERROR in upsert-telegram-profile function ---", error);
    return new Response(JSON.stringify({ error: error.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});