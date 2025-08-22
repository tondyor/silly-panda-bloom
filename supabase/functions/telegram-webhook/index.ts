// ... (предыдущий код)
      await sendMessage(targetTelegramId, `${getLocalizedMessage(targetUserLang, 'adminDirectMessagePrefix')}\n${directMessageContent}`);
      await sendMessage(adminId, getLocalizedMessage('ru', 'adminMessageSentToUser', { username: targetUsername }));
      console.log(`LOG: Сообщение отправлено пользователю @${targetUsername} (ID: ${targetTelegramId}) от администратора.`);
      return new Response("OK", { status: 200 });
// ... (остальной код)