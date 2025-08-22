// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// --- Переменные окружения ---
// @ts-ignore
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
// @ts-ignore
const ADMIN_TELEGRAM_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// --- Вспомогательные функции ---

/**
 * Отправляет сообщение в указанный чат Telegram.
 * @param chatId ID чата для отправки.
 * @param text Текст сообщения с поддержкой Markdown.
 */
async function sendMessage(chatId: string | number, text: string): Promise<void> {
  if (!TELEGRAM_BOT_TOKEN) {
    console.error("LOG: TELEGRAM_BOT_TOKEN не установлен.");
    return;
  }
  try {
    const response = await fetch(`${TELEGRAM_API_URL}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: chatId, text, parse_mode: 'Markdown' }),
    });
    if (!response.ok) {
      const errorData = await response.json();
      console.error(`LOG: Ошибка Telegram API (sendMessage) для chatId ${chatId}:`, JSON.stringify(errorData, null, 2));
    }
  } catch (e) {
    console.error(`LOG: Не удалось отправить сообщение в Telegram для ${chatId}:`, e);
  }
}

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

  try {
    const { initData, orderId } = await req.json();
    if (!initData || !orderId) {
      return new Response(JSON.stringify({ error: "Отсутствуют initData или orderId" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isTelegramDataValid = await validateTelegramData(initData);
    if (!isTelegramDataValid) {
      return new Response(JSON.stringify({ error: "Ошибка аутентификации: неверные initData" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const params = new URLSearchParams(initData);
    const user = JSON.parse(params.get("user")!);

    if (!user || !user.id) {
        return new Response(JSON.stringify({ error: "Не удалось извлечь данные пользователя" }), {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
    }

    const supabase = createClient(
      // @ts-ignore
      Deno.env.get("SUPABASE_URL")!,
      // @ts-ignore
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: order, error: findError } = await supabase
      .from('orders')
      .select('telegram_id, status')
      .eq('order_id', orderId)
      .single();

    if (findError || !order) {
      return new Response(JSON.stringify({ error: `Заказ #${orderId} не найден.` }), {
        status: 404,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.telegram_id !== user.id) {
      return new Response(JSON.stringify({ error: "У вас нет прав для отмены этого заказа." }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (order.status !== 'Новая заявка') {
      return new Response(JSON.stringify({ error: `Этот заказ уже в статусе '${order.status}' и не может быть отменен.` }), {
        status: 409,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: updatedOrder, error: updateError } = await supabase
      .from('orders')
      .update({ status: 'Отклонен' })
      .eq('order_id', orderId)
      .select()
      .single();

    if (updateError) {
      throw new Error(`Ошибка базы данных при отмене заказа: ${updateError.message}`);
    }

    // --- Отправка уведомлений ---
    // 1. Уведомление клиенту
    const clientMessage = `Ваша заявка #${orderId} была отменена.`;
    await sendMessage(user.id, clientMessage);

    // 2. Уведомление администратору
    if (ADMIN_TELEGRAM_CHAT_ID) {
      const adminMessage = `❗️ Клиент (ID: \`${user.id}\`) отменил заявку #${orderId}.`;
      await sendMessage(ADMIN_TELEGRAM_CHAT_ID, adminMessage);
    }

    return new Response(JSON.stringify(updatedOrder), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("--- CRITICAL ERROR in cancel-order function ---", error);
    return new Response(JSON.stringify({ error: error.message || "Внутренняя ошибка сервера" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});