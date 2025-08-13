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
      console.error(`Telegram API error for chatId ${chatId}. Status: ${response.status}. Full error:`, JSON.stringify(errorData, null, 2));
      return false;
    }
    
    console.log(`Successfully sent message to chatId ${chatId}.`);
    return true;
  } catch (error) {
    console.error(`Failed to send telegram message to ${chatId} due to a network or other error:`, error);
    return false;
  }
}

function formatOrderForClient(order: any): string {
  const firstName = order.telegram_user_first_name ? ` ${order.telegram_user_first_name}` : '';
  const title = `*🎉${firstName}, ваша заявка успешно создана!*`;
  
  const details = [
    title,
    ``,
    `📋 *Номер заявки:* #${order.public_id}`,
    `💰 *Сумма к отправке:* ${order.from_amount.toLocaleString('ru-RU')} ${order.payment_currency}`,
    `💵 *К получению:* ${order.calculated_vnd.toLocaleString('vi-VN')} VND`,
    `📊 *Курс обмена:* 1 ${order.payment_currency} = ${Math.round(order.exchange_rate).toLocaleString('vi-VN')} VND`,
  ];

  // Добавляем информацию о кошельке для USDT
  if (order.payment_currency === 'USDT' && order.deposit_address && order.deposit_address !== 'N/A') {
    details.push(``);
    details.push(`💳 *Кошелек для пополнения:*`);
    details.push(`\`${order.deposit_address}\``);
    details.push(`🌐 *Сеть USDT:* ${order.usdt_network}`);
    details.push(``);
    details.push(`⚠️ *Важно!* Отправляйте средства только на указанный адрес в сети ${order.usdt_network}. В противном случае ваши средства могут быть навсегда утеряны.`);
  }

  details.push(``, `📋 *Детали получения:*`);
  details.push(`🚚 *Способ получения:* ${order.delivery_method === 'bank' ? 'Банковский перевод' : 'Наличные'}`);

  if (order.delivery_method === 'bank') {
    details.push(`🏦 *Банк:* ${order.vnd_bank_name}`);
    details.push(`💳 *Номер счета:* ${order.vnd_bank_account_number}`);
  } else if (order.delivery_method === 'cash') {
    details.push(`📍 *Адрес доставки:* ${order.delivery_address}`);
  }

  if (order.contact_phone) {
    details.push(`📞 *Телефон для связи:* ${order.contact_phone}`);
  }
  
  details.push(``, `📈 *Статус:* Новая заявка (ожидает оплаты)`);
  details.push(``, `Мы свяжемся с вами в ближайшее время для подтверждения деталей!`);

  return details.join('\n');
}

function formatOrderForAdmin(order: any): string {
  const clientIdentifier = order.telegram_id ? `@id${order.telegram_id}` : 'Анонимный клиент';
  const clientName = order.telegram_user_first_name ? ` (${order.telegram_user_first_name})` : '';
  
  const details = [
    `🔔 *НОВЫЙ ЗАКАЗ*`,
    ``,
    `📋 *ID заявки:* #${order.public_id}`,
    `👤 *Клиент:* ${clientIdentifier}${clientName}`,
    ``,
    `💰 *Детали обмена:*`,
    `• Отправляет: ${order.from_amount.toLocaleString('ru-RU')} ${order.payment_currency}`,
    `• Получает: ${order.calculated_vnd.toLocaleString('vi-VN')} VND`,
    `• Курс: 1 ${order.payment_currency} = ${Math.round(order.exchange_rate).toLocaleString('vi-VN')} VND`,
  ];

  if (order.payment_currency === 'USDT') {
    details.push(`• Сеть USDT: ${order.usdt_network}`);
    if (order.deposit_address && order.deposit_address !== 'N/A') {
      details.push(`• Кошелек: \`${order.deposit_address}\``);
    }
  }

  details.push(``, `📋 *Детали доставки:*`);
  details.push(`• Способ: ${order.delivery_method === 'bank' ? 'Банковский перевод' : 'Доставка наличными'}`);

  if (order.delivery_method === 'bank') {
    details.push(`• Банк: ${order.vnd_bank_name}`);
    details.push(`• Счет: ${order.vnd_bank_account_number}`);
  } else {
    details.push(`• Адрес: ${order.delivery_address}`);
  }

  if (order.contact_phone) {
    details.push(`• Телефон: ${order.contact_phone}`);
  }
  
  details.push(``, `📅 *Создан:* ${new Date(order.created_at).toLocaleString('ru-RU')}`);
  details.push(`📈 *Статус:* ${order.status}`);

  return details.join('\n');
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
    
    console.log("Received orderData with telegramId:", orderData.telegramId);

    // Генерируем уникальный публичный ID для заказа
    const publicId = `ORD-${Date.now()}-${Math.floor(Math.random() * 10000)}`;

    // Подготавливаем данные для вставки в базу
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
      telegram_id: orderData.telegramId ?? null,
    };

    // Создаем заказ в базе данных
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

    console.log("Order created successfully:", insertedOrder.public_id);

    // Подготавливаем полную информацию о заказе для уведомлений
    const fullOrderDetails = {
      ...insertedOrder,
      telegram_user_first_name: orderData.telegramUserFirstName,
      deposit_address: orderData.depositAddress,
    };

    // Отправляем уведомления
    const notificationResults = {
      clientNotified: false,
      adminNotified: false,
      clientError: null as string | null,
      adminError: null as string | null,
    };

    // 1. Уведомление клиенту
    if (insertedOrder.telegram_id) {
      console.log("Sending notification to client:", insertedOrder.telegram_id);
      const clientMessage = formatOrderForClient(fullOrderDetails);
      const clientSuccess = await sendTelegramMessage(insertedOrder.telegram_id, clientMessage);
      
      notificationResults.clientNotified = clientSuccess;
      if (!clientSuccess) {
        notificationResults.clientError = `Не удалось отправить уведомление клиенту (ID: ${insertedOrder.telegram_id})`;
      }
    } else {
      notificationResults.clientError = "Telegram ID клиента не указан";
    }

    // 2. Уведомление администратору
    if (ADMIN_TELEGRAM_CHAT_ID) {
      console.log("Sending notification to admin:", ADMIN_TELEGRAM_CHAT_ID);
      
      let adminMessage = formatOrderForAdmin(fullOrderDetails);
      
      // Добавляем информацию о статусе уведомления клиента
      adminMessage += `\n\n📊 *Статус уведомлений:*\n`;
      
      if (notificationResults.clientNotified) {
        adminMessage += `✅ Клиент уведомлен (ID: ${insertedOrder.telegram_id})`;
      } else {
        adminMessage += `❌ ${notificationResults.clientError}`;
      }
      
      const adminSuccess = await sendTelegramMessage(ADMIN_TELEGRAM_CHAT_ID, adminMessage);
      
      notificationResults.adminNotified = adminSuccess;
      if (!adminSuccess) {
        notificationResults.adminError = "Не удалось отправить уведомление администратору";
      }
    } else {
      console.warn("ADMIN_TELEGRAM_CHAT_ID is not set. Cannot send admin notification.");
      notificationResults.adminError = "ID администратора не настроен";
    }

    // Логируем результаты уведомлений
    console.log("Notification results:", notificationResults);

    // Возвращаем успешный ответ с данными заказа
    return new Response(
      JSON.stringify({
        ...insertedOrder,
        notificationStatus: notificationResults
      }),
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
