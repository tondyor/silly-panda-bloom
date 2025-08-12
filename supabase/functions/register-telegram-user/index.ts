// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
// @ts-ignore
import { parse } from "https://deno.land/std@0.190.0/node/querystring.ts";

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

    // Parse initData to extract user information
    const parsedInitData = parse(initData);
    const userString = parsedInitData.user as string;

    if (!userString) {
      console.warn("initData did not contain user information.");
      return new Response(JSON.stringify({ message: "No user info in initData" }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const user = JSON.parse(userString);

    if (!user || !user.id) {
      console.warn("Parsed user object is invalid or missing ID.");
      return new Response(JSON.stringify({ message: "Invalid user info" }), {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // Upsert user data into telegram_users table
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
          registered_at: new Date().toISOString(), // Update timestamp on each open
        },
        { onConflict: "telegram_id" }
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

    console.log(`Successfully registered/updated Telegram user: ${user.id}`);
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