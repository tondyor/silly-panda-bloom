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
    console.error("Security critical: TELEGRAM_BOT_TOKEN is not set.");
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

  console.log("--- Invoking get-order-history function ---");

  try {
    const { initData } = await req.json();
    if (!initData) {
      console.error("Validation Error: Missing initData.");
      return new Response(JSON.stringify({ error: "Отсутствуют initData" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("Step 1: Request body parsed.");

    const isTelegramDataValid = await validateTelegramData(initData);
    if (!isTelegramDataValid) {
      console.error("Authentication Error: Invalid initData.");
      return new Response(JSON.stringify({ error: "Ошибка аутентификации: неверные initData" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    console.log("Step 2: Telegram data validated.");

    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get("user")!);

    if (!user || !user.id) {
        console.error("Data Error: Could not extract user data from initData.");
        return new Response(JSON.stringify({ error: "Не удалось извлечь данные пользователя" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }
    console.log(`Step 3: User data parsed. Telegram ID: ${user.id}`);

    const supabase = createClient(
      // @ts-ignore
      Deno.env.get("SUPABASE_URL")!,
      // @ts-ignore
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );
    console.log("Step 4: Supabase service client created.");

    // Fetch completed orders
    const { data: completedOrders, error: completedError } = await supabase
      .from('orders')
      .select('*')
      .eq('telegram_id', user.id)
      .eq('status', 'Оплачен')
      .order('created_at', { ascending: false });

    if (completedError) {
      console.error("Database Error: Failed to fetch completed orders.", completedError);
      throw new Error(`Ошибка базы данных при получении завершенных заказов: ${completedError.message}`);
    }

    // Fetch recent pending orders (created in the last hour)
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const { data: pendingOrders, error: pendingError } = await supabase
      .from('orders')
      .select('*')
      .eq('telegram_id', user.id)
      .eq('status', 'Новая заявка')
      .gt('created_at', oneHourAgo)
      .order('created_at', { ascending: false });

    if (pendingError) {
      console.error("Database Error: Failed to fetch pending orders.", pendingError);
      throw new Error(`Ошибка базы данных при получении ожидающих заказов: ${pendingError.message}`);
    }

    console.log(`Step 5: Fetched ${completedOrders.length} completed and ${pendingOrders.length} pending orders for user ${user.id}.`);

    return new Response(JSON.stringify({ completedOrders, pendingOrders }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("--- CRITICAL ERROR in get-order-history function ---", error);
    return new Response(JSON.stringify({ error: error.message || "Внутренняя ошибка сервера" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});