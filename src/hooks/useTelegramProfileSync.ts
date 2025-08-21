import { useEffect } from 'react';
import { useTelegram } from './useTelegram';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

export const useTelegramProfileSync = () => {
  const { data: telegramData, isLoading: isTelegramLoading, error: telegramError } = useTelegram();

  useEffect(() => {
    const syncProfile = async () => {
      if (isTelegramLoading || telegramError || !telegramData?.user || !telegramData.initData) {
        return;
      }

      const telegramUser = telegramData.user;

      try {
        // Получаем ID аутентифицированного пользователя Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session?.user) {
          console.warn("No active Supabase session found for profile sync. User might not be logged in yet.");
          // Если нет сессии, мы не можем связать с auth.users.id.
          // Для корректной работы RLS, 'id' должен быть связан с auth.uid().
          // Это означает, что пользователь должен быть авторизован в Supabase.
          toast.error("Ошибка синхронизации профиля: Пользователь не авторизован в Supabase.");
          return;
        }

        const supabaseUserId = session.user.id;

        const { error: upsertProfileError } = await supabase
          .from('telegram_profiles')
          .upsert({
            id: supabaseUserId, // ID пользователя Supabase (UUID)
            telegram_id: telegramUser.id, // ID пользователя Telegram (bigint)
            first_name: telegramUser.first_name || null,
            last_name: telegramUser.last_name || null,
            username: telegramUser.username || null,
            language_code: telegramUser.language_code || null,
            avatar_url: telegramUser.photo_url || null,
            is_premium: telegramUser.is_premium || false,
          }, { onConflict: 'telegram_id', ignoreDuplicates: false }); // Конфликт по telegram_id

        if (upsertProfileError) {
          console.error("Error upserting Telegram profile:", upsertProfileError);
          toast.error("Ошибка синхронизации профиля Telegram.");
        } else {
          console.log(`Telegram profile for user ${telegramUser.id} synced successfully.`);
        }
      } catch (err) {
        console.error("Unexpected error during Telegram profile sync:", err);
        toast.error("Неизвестная ошибка при синхронизации профиля.");
      }
    };

    syncProfile();
  }, [isTelegramLoading, telegramError, telegramData]);
};