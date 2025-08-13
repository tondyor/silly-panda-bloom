import { serve } from "https://deno.land/std@0.190.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Простое кэширование в памяти
let cachedRate: number | null = null;
let lastFetchTimestamp: number = 0;
const CACHE_DURATION_SECONDS = 60; // Кэшировать на 60 секунд

async function fetchRateFromCoinGecko() {
  try {
    const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=tether&vs_currencies=vnd');
    if (!response.ok) {
      throw new Error(`CoinGecko API ответил со статусом: ${response.status}`);
    }
    const data = await response.json();
    if (data && data.tether && data.tether.vnd) {
      return data.tether.vnd;
    } else {
      throw new Error('Неверная структура данных от API CoinGecko');
    }
  } catch (error) {
    console.error('Ошибка при запросе к CoinGecko:', error.message);
    throw error;
  }
}

serve(async (req) => {
  // Обработка CORS preflight-запроса
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const now = Date.now();
    const isCacheStale = (now - lastFetchTimestamp) / 1000 > CACHE_DURATION_SECONDS;

    if (isCacheStale || !cachedRate) {
      console.log('Кэш устарел или пуст. Запрашиваем новый курс у CoinGecko.');
      cachedRate = await fetchRateFromCoinGecko();
      lastFetchTimestamp = now;
    } else {
      console.log('Возвращаем кэшированный курс.');
    }

    return new Response(
      JSON.stringify({ rate: cachedRate }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    return new Response(
      JSON.stringify({ error: `Не удалось получить курс обмена: ${error.message}` }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    )
  }
})