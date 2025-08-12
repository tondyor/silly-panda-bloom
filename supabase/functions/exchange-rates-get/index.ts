// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PROFIT_MARGIN = -0.02; // -2%

function average(arr: number[]): number {
  if (arr.length === 0) return 0;
  return arr.reduce((a, b) => a + b, 0) / arr.length;
}

async function fetchUsdtVndRates(): Promise<number[]> {
  const sources = [
    fetch("https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=vnd").then(res => res.ok ? res.json() : Promise.reject(`CoinGecko failed with status ${res.status}`)).then(data => data?.tether?.vnd),
    fetch("https://api.coinpaprika.com/v1/tickers/usdt-tether").then(res => res.ok ? res.json() : Promise.reject(`CoinPaprika failed with status ${res.status}`)).then(data => data?.quotes?.VND?.price),
    fetch("https://min-api.cryptocompare.com/data/price?fsym=USDT&tsyms=VND").then(res => res.ok ? res.json() : Promise.reject(`CryptoCompare failed with status ${res.status}`)).then(data => data?.VND)
  ];

  const responses = await Promise.allSettled(sources);
  const results: number[] = [];
  responses.forEach((response, index) => {
    if (response.status === 'fulfilled' && typeof response.value === 'number') {
      results.push(response.value);
    } else if (response.status === 'rejected') {
      console.warn(`Source ${index} failed:`, response.reason);
    }
  });
  return results;
}

async function fetchRubVndRates(): Promise<number[]> {
  const sources = [
    fetch("https://api.exchangerate.host/convert?from=RUB&to=VND").then(res => res.ok ? res.json() : Promise.reject(`ExchangeRate.host failed with status ${res.status}`)).then(data => data?.result),
    fetch("https://api.frankfurter.app/latest?from=RUB&to=VND").then(res => res.ok ? res.json() : Promise.reject(`Frankfurter failed with status ${res.status}`)).then(data => data?.rates?.VND),
    fetch("https://open.er-api.com/v6/latest/RUB").then(res => res.ok ? res.json() : Promise.reject(`ER API failed with status ${res.status}`)).then(data => data?.rates?.VND)
  ];

  const responses = await Promise.allSettled(sources);
  const results: number[] = [];
  responses.forEach((response, index) => {
    if (response.status === 'fulfilled' && typeof response.value === 'number') {
      results.push(response.value);
    } else if (response.status === 'rejected') {
      console.warn(`Source ${index} failed:`, response.reason);
    }
  });
  return results;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { currency } = await req.json();
    if (currency !== 'USDT' && currency !== 'RUB') {
      return new Response(JSON.stringify({ error: "Invalid currency specified. Use 'USDT' or 'RUB'." }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    let rates: number[] = [];
    if (currency === "USDT") {
      rates = await fetchUsdtVndRates();
    } else {
      rates = await fetchRubVndRates();
    }

    if (rates.length === 0) {
      throw new Error(`Could not fetch any exchange rates for ${currency}-VND.`);
    }

    const avgRate = average(rates);
    const finalRate = avgRate * (1 + PROFIT_MARGIN);

    return new Response(JSON.stringify({ rate: finalRate, sourceCount: rates.length }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Error in exchange-rates-get function:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});