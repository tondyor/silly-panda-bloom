// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { userData } = await req.json();

    console.log('=== TELEGRAM USER DATA RECEIVED ON APP LOAD ===');
    console.log('User Data:', JSON.stringify(userData, null, 2));
    
    if (userData && userData.id) {
        console.log(`User ID: ${userData.id}, Username: ${userData.username || 'N/A'}`);
    } else {
        console.warn('Received data does not contain a valid user object.');
    }

    return new Response(JSON.stringify({ success: true, message: "Log received" }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error("Error in log-telegram-user-data function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})