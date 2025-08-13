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
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`;

async function sendTelegramMessage(chatId: string | number, text: string): Promise<boolean> {
  if (!TELEGRAM_BOT_TOKEN || !chatId) {
    console.error("sendTelegramMessage failed: Missing token or chatId.", { chatId });
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
      console.error(`Telegram API error for chatId ${chatId}:`, errorData);
      return false;
    }
    
    console.log(`Successfully sent status update to chatId ${chatId}.`);
    return true;
  } catch (error) {
    console.error(`Failed to send telegram message to ${chatId}:`, error);
    return false;
  }
}

function formatStatusUpdateMessage(order: any, newStatus: string, adminNote?: string): string {
  const firstName = order.telegram_user_first_name ? ` ${order.telegram_user_first_name}` : '';
  
  let statusEmoji = "📋";
  let statusMessage = "";
  
  switch (newStatus) {
    case "Оплачен":
      statusEmoji = "✅";
      statusMessage = `*${statusEmoji} Отлично${firstName}! Оплата получена*`;
      break;
    case "В обработке":
      statusEmoji = "⏳";
      statusMessage = `*${statusEmoji} Ваша заявка в обработке${firstName}*`;
      break;
    case "Готов к выдаче":
      statusEmoji = "🎯";
      statusMessage = `*${statusEmoji} Отлично${firstName}! Ваш заказ готов*`;
      break;
    case "Выполнен":
      statusEmoji = "🎉";
      statusMessage = `*${statusEmoji} Поздравляем${firstName}! Заказ выполнен*`;
      break;
    case "Отменен":
      statusEmoji = "❌";
      statusMessage = `*${statusEmoji} Заказ отменен${firstName}*`;
      break;
    default:
      statusMessage = `*📋 Статус заказа обновлен${firstName}*`;
  }
  
  const details = [
    statusMessage,
    ``,
    `📋 *Номер заявки:* #${order.public_id}`,
    `📈 *Новый статус:* ${newStatus}`,
    `💰 *Сумма:* ${order.from_amount.toLocaleString('ru-RU')} ${order.payment_currency}`,
    `💵 *К получению:* ${order.calculated_vnd.toLocaleString('vi-VN')} VND`,
  ];

  if (adminNote) {
    details.push(``, `📝 *Комментарий:* ${adminNote}`);
  }

  // Добавляем специальные инструкции в зависимости от статуса
  if (newStatus === "Оплачен") {
    details.push(``, `Теперь мы обрабатываем ваш заказ. Обычно это занимает от 15 минут до 2 часов.`);
  } else if (newStatus === "Готов к выдаче") {
    if (order.delivery_method === 'bank') {
      details.push(``, `💳 Средства будут переведены на ваш банковский счет в ближайшее время:`);
      details.push(`🏦 ${order.vnd_bank_name}`);
      details.push(`💳 ${order.vnd_bank_account_number}`);
    } else {
      details.push(``, `🚚 Курьер выезжает по адресу:`);
      details.push(`📍 ${order.delivery_address}`);
    }
    if (order.contact_phone) {
      details.push(`📞 Мы свяжемся с вами по номеру: ${order.contact_phone}`);
    }
  } else if (newStatus === "Выполнен") {
    details.push(``, `Благодарим за использование наших услуг! 🙏`);
    details.push(`Если у вас есть вопросы, обращайтесь в поддержку.`);
  }

  details.push(``, `📅 *Обновлено:* ${new Date().toLocaleString('ru-RU')}`);

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
    const { orderId, newStatus, adminNote } = body;

    if (!orderId || !newStatus) {
      return new Response(
        JSON.stringify({ error: "orderId и newStatus обязательны" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Получаем текущий заказ
    const { data: currentOrder, error: fetchError } = await supabase
      .from("orders")
      .select("*")
      .eq("public_id", orderId)
      .single();

    if (fetchError || !currentOrder) {
      console.error("Order fetch error:", fetchError);
      return new Response(
        JSON.stringify({ error: "Заказ не найден" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Проверяем, изменился ли статус
    if (currentOrder.status === newStatus) {
      return new Response(
        JSON.stringify({ message: "Статус уже установлен", order: currentOrder }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Обновляем статус заказа
    const { data: updatedOrder, error: updateError } = await supabase
      .from("orders")
      .update({ 
        status: newStatus, 
        updated_at: new Date().toISOString() 
      })
      .eq("public_id", orderId)
      .select()
      .single();

    if (updateError) {
      console.error("Order update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Ошибка при обновлении заказа" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Order ${orderId} status updated to: ${newStatus}`);

    // Отправляем уведомление клиенту, если у него есть telegram_id
    let notificationSent = false;
    let notificationError = null;

    if (updatedOrder.telegram_id) {
      // Получаем дополнительную информацию о пользователе
      const { data: telegramUser } = await supabase
        .from("telegram_users")
        .select("first_name")
        .eq("telegram_id", updatedOrder.telegram_id)
        .single();

      const orderWithUserInfo = {
        ...updatedOrder,
        telegram_user_first_name: telegramUser?.first_name || null,
      };

      const statusMessage = formatStatusUpdateMessage(orderWithUserInfo, newStatus, adminNote);
      notificationSent = await sendTelegramMessage(updatedOrder.telegram_id, statusMessage);
      
      if (!notificationSent) {
        notificationError = `Не удалось отправить уведомление клиенту (ID: ${updatedOrder.telegram_id})`;
      }
    } else {
      notificationError = "У заказа нет связанного Telegram ID";
    }

    return new Response(
      JSON.stringify({
        success: true,
        order: updatedOrder,
        oldStatus: currentOrder.status,
        newStatus: newStatus,
        notificationSent: notificationSent,
        notificationError: notificationError
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
