import React from 'react'
import { Link } from 'react-router-dom'
import { ArrowRightLeft, Loader2, AlertCircle } from 'lucide-react'
import { Card, CardContent, CardHeader } from '@/components/ui/card'
import { UserProfile } from '@/components/UserProfile'
import { Button } from '@/components/ui/button'
import { LanguageSwitcher } from '@/components/LanguageSwitcher'
import { useTelegram } from '@/hooks/useTelegram'
import { OrderHistory } from '@/components/OrderHistory'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'

const AccountPage = () => {
  const { data: telegramData, isLoading: isTelegramLoading, error: telegramError } = useTelegram();

  const renderContent = () => {
    if (isTelegramLoading) {
      return (
        <div className="flex justify-center items-center h-48">
          <Loader2 className="h-8 w-8 animate-spin text-gray-500" />
        </div>
      );
    }

    if (telegramError) {
      return (
        <Alert variant="destructive" className="m-4">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Ошибка</AlertTitle>
          <AlertDescription>{telegramError}</AlertDescription>
        </Alert>
      );
    }

    if (telegramData?.user?.id) {
      return <OrderHistory telegramId={telegramData.user.id} />;
    }

    return (
      <div className="text-center text-gray-600 p-6">
        <p>Не удалось определить пользователя.</p>
      </div>
    );
  };

  return (
    <div
      className="min-h-screen flex flex-col items-center justify-start relative overflow-hidden px-2 pb-2 sm:px-4 sm:pb-4 lg:px-6 lg:pb-6"
      style={{
        backgroundImage: "url('/vietnam-background.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div
        className="absolute inset-0 z-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.7) 100%)',
        }}
      ></div>

      <div className="w-full max-w-lg flex justify-center items-baseline gap-x-2 my-4 z-10 relative">
        <h1 className="text-5xl sm:text-7xl font-extrabold text-white drop-shadow-[0_4px_5px_rgba(0,0,0,0.9)]">
          История
        </h1>
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-2xl overflow-hidden relative z-10 bg-white/75 backdrop-blur-sm border-4 border-white/60">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-red-600 to-orange-500 text-white p-3">
          <UserProfile />
          <Link to="/">
            <Button
              variant="ghost"
              className="h-auto p-2 text-white hover:bg-white/20 hover:text-white border-2 border-white/80 rounded-lg relative right-1"
            >
              <ArrowRightLeft className="h-8 w-8" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="p-0 bg-gray-100/50">
          {renderContent()}
        </CardContent>
      </Card>
    </div>
  )
}

export default AccountPage