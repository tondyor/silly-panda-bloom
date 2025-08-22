// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

console.log("--- [DIAGNOSTIC LOG] Функция telegram-webhook запущена ---");

serve(async (req) => {
  // Эта запись появится в логах, если Telegram успешно вызовет функцию
  console.log(`--- [DIAGNOSTIC LOG] ВЕБХУК ПОЛУЧЕН! ${new Date().toISOString()} ---`);
  
  try {
    const payload = await req.json();
    console.log("--- [DIAGNOSTIC LOG] Тело запроса:", JSON.stringify(payload, null, 2));
  } catch (e) {
    console.log("--- [DIAGNOSTIC LOG] Не удалось прочитать тело запроса:", e.message);
  }
  
  // Отвечаем Telegram, что все в порядке
  return new Response("OK", { status: 200 });
});