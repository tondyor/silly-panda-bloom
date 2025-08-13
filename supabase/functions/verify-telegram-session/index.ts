/// <reference types="https://deno.land/x/deno/cli/types/v8.d.ts" />

import { serve } from "std/http/server.ts";
import { createClient } from "@supabase/supabase-js";
import { verifyInitData } from "shared/telegram-auth.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

declare const Deno: any;

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { initData, allowsWriteToPm } = await req.json();
    const botToken = Deno.env.get("TELEGRAM_BOT_TOKEN");

    if (!initData || !botToken) {
      return new Response(JSON.stringify({ ok: false, error: "Missing initData or bot token configuration." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const verification = verifyInitData(initData, botToken);

    if (!verification.ok || !verification.data) {
      return new Response(JSON.stringify({ ok: false, error: "invalid_init_data", details: verification.error }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userData = JSON.parse(verification.data.user);
    const queryId = verification.data.query_id;
    const chatInstance = verification.data.chat_instance;

    const sessionData = {
      user_id: userData.id,
      username: userData.username,
      language_code: userData.language_code,
      allows_write_to_pm: allowsWriteToPm,
      chat_instance: chatInstance,
      last_query_id: queryId,
    };

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { error } = await supabase.from("tg_sessions").upsert(sessionData, { onConflict: 'user_id' });

    if (error) {
      throw new Error(`Supabase upsert error: ${error.message}`);
    }

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in verify-telegram-session:", error);
    return new Response(JSON.stringify({ ok: false, error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});