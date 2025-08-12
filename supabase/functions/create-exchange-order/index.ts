// @ts-ignore
import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
// @ts-ignore
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

declare const Deno: {
  env: {
    get(key: string): string | undefined;
  };
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
const ADMIN_TELEGRAM_CHAT_ID = Deno.env.get("ADMIN_TELEGRAM_CHAT_ID");
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

async function sendTelegramMessage(chatId: string | number, text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !chatId) {
    console.error("sendTelegramMessage failed: Missing token or chatId.", { chatId: chatId });
    return false;
  }

  try {
    const response = await fetch(TELEGRAM_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text: text,
        parse_mode: 'Markdown',
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error(`Telegram API error for chatId ${chatId}. Status: ${response.status}`, errorData);
      return false;
    }
    
    console.log(`Successfully sent message to chatId ${chatId}.`);
    return true;
  } catch (error) {
    console.error(`Failed to send telegram message to ${chatId} due to a network or other error:`, error);
    return false;
  }
}

function formatOrderForTelegram(order: any, forAdmin: boolean): string {
  if (forAdmin) {
    const clientIdentifier = order.telegram_user_id ? `ID: ${order.telegram_user_id}` : 'Клиент';
    const details = [
      `😏 Новый заказ!`,
      ``,
      `#${order.public_id}`,
      `Клиент: ${clientIdentifier}`,
      `-----------------------------------`,
      `Вы получите: ${order.from_amount.toLocaleString('ru-RU')} ${order.payment_currency}`,
      `Отправить (VND): ${order.calculated_vnd.toLocaleString('vi-VN')}`,
      `-----------------------------------`,
      `Способ получения: ${order.delivery_method === 'bank' ? 'Банковский перевод' : 'Наличные'}`,
    ];

    if (order.payment_currency === 'USDT') {
      details.push(`Сеть USDT: ${order.usdt_network}`);
    }

    if (order.delivery_method === 'bank') {
      details.push(`Банк: ${order.vnd_bank_name}`);
      details.push(`Номер счета: ${order.vnd_bank_account_number}`);
    } else {
      details.push(`Адрес доставки: ${order.delivery_address}`);
    }

    if (order.contact_phone) {
      details.push(`Телефон для связи: ${order.contact_phone}`);
    }
    
    details.push(`-----------------------------------`);
    details.push(`Статус: ${order.status}`);

    return details.join('\n');
  } else {
    const firstName = order.telegram_user_first_name ? ` ${order.telegram_user_first_name}` : '';
    const title = `*🥰${firstName} Вы оформили новую заявку!*`;
    
    const details = [
      title,
      `#${order.public_id}`,
      `-----------------------------------`,
      `Вы отправляете: ${order.from_amount.toLocaleString('ru-RU')} ${order.payment_currency}`,
      `К получению (VND): ${order.calculated_vnd.toLocaleString('vi-VN')}`,
    ];

    if (order.payment_currency === 'USDT' && order.deposit_address && order.deposit_address !== 'N/A') {
      details.push(``);
      details.push(`Кошелек для пополнения:`);
      details.push(`\`${order.deposit_address}\``);
      details.push(`Сеть USDT: ${order.usdt_network}`);
      details.push(``);
      details.push(`Внимание отправляйте средства только на указанный адрес в сети ${order.usdt_network}. В противном случае ваши средства могут быть навсегда утеряны.`);
    }

    details.push(`-----------------------------------`);
    details.push(`Способ получения: ${order.delivery_method === 'bank' ? 'Банковский перевод' : 'Наличные'}`);

    if (order.delivery_method === 'bank') {
      details.push(`Банк: ${order.vnd_bank_name}`);
      details.push(`Номер счета: ${order.vnd_bank_account_number}`);
    } else if (order.delivery_method === 'cash') {
        details.push(`Адрес доставки: ${order.delivery_address}`);
    }
    
    details.push(`-----------------------------------`);
    details.push(`Статус: Новая заявка (Не оплачен)`);

    return details.join('\n');
  }
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const body = await req.json();
    const orderData = body.orderData;
    
    const publicId = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    const insertData = {
      payment_currency: orderData.paymentCurrency,
      from_amount: orderData.fromAmount,
      calculated_vnd: orderData.calculatedVND,
      exchange_rate: orderData.exchangeRate,
      delivery_method: orderData.deliveryMethod,
      usdt_network: orderData.usdtNetwork ?? null,
      vnd_bank_name: orderData.vndBankName ?? null,
      vnd_bank_account_number: orderData.vndBankAccountNumber ?? null,
      delivery_address: orderData.deliveryAddress ?? null,
      contact_phone: orderData.contactPhone ?? null,
      public_id: publicId,
      status: "Новая заявка",
      created_at: new Date().toISOString(),
      telegram_user_id: orderData.telegramUserId ?? null,
    };

    const { data: insertedOrder, error: insertError } = await supabase
      .from("orders")
      .insert(insertData)
      .select()
      .single();

    if (insertError) {
      console.error("Insert error:", insertError);
      return new Response(
        JSON.stringify({ error: insertError.message || "Ошибка при создании заказа" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const fullOrderDetailsForNotification = {
        ...insertedOrder,
        telegram_user_first_name: orderData.telegramUserFirstName,
        deposit_address: orderData.depositAddress,
    };

    // --- НОВАЯ ЛОГИКА ОТПРАВКИ ---

    // 1. Сначала отправляем сообщение КЛИЕНТУ и определяем статус
    let clientNotificationStatus = "❌ Уведомление клиенту не отправлено (ID не получен).";
    if (insertedOrder.telegram_user_id) {
      const clientMessage = formatOrderForTelegram(fullOrderDetailsForNotification, false);
      const wasClientNotified = await sendTelegramMessage(insertedOrder.telegram_user_id, clientMessage);

      if (wasClientNotified) {
        clientNotificationStatus = `✅ Уведомление клиенту (ID: ${insertedOrder.telegram_user_id}) отправлено.`;
      } else {
        clientNotificationStatus = `❌ Ошибка отправки уведомления клиенту (ID: ${insertedOrder.telegram_user_id}).`;
      }
    }

    // 2. Затем отправляем сообщение АДМИНИСТРАТОРУ со статусом
    if (ADMIN_TELEGRAM_CHAT_ID) {
      let adminMessage = formatOrderForTelegram(fullOrderDetailsForNotification, true);
      adminMessage += `\n\n---\n*Статус уведомления:*\n${clientNotificationStatus}`;
      await sendTelegramMessage(ADMIN_TELEGRAM_CHAT_ID, adminMessage);
    } else {
      console.warn("ADMIN_TELEGRAM_CHAT_ID is not set. Cannot send admin notification.");
    }

    return new Response(
      JSON.stringify(insertedOrder),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Внутренняя ошибка сервера" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});