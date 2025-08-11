import { serve } from "https://deno.land/std@0.190.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (_req) => {
  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    // Calculate the timestamp for one hour ago
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();

    // Find orders that are older than one hour and still have "Новая заявка" status
    const { data: ordersToCancel, error: selectError } = await supabase
      .from('orders')
      .select('id')
      .eq('status', 'Новая заявка')
      .lt('created_at', oneHourAgo);

    if (selectError) {
      throw new Error(`Failed to fetch old orders: ${selectError.message}`);
    }

    if (ordersToCancel && ordersToCancel.length > 0) {
      const orderIds = ordersToCancel.map(o => o.id);
      
      // Update their status to "Отменен"
      const { error: updateError } = await supabase
        .from('orders')
        .update({ status: 'Отменен' })
        .in('id', orderIds);

      if (updateError) {
        throw new Error(`Failed to cancel orders: ${updateError.message}`);
      }
      
      console.log(`Successfully cancelled ${ordersToCancel.length} old orders.`);
      return new Response(JSON.stringify({ message: `Cancelled ${ordersToCancel.length} orders.` }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ message: "No old orders to cancel." }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in cancel-old-orders function:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
})