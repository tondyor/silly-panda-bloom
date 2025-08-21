import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowRightLeft } from 'lucide-react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { UserProfile } from '@/components/UserProfile';
import { Button } from '@/components/ui/button';
import { LanguageSwitcher } from '@/components/LanguageSwitcher';

const AccountPage = () => {
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-start relative overflow-hidden p-2 sm:p-4 lg:p-6"
      style={{
        backgroundImage: "url('/vietnam-background.png')",
        backgroundSize: 'cover',
        backgroundPosition: 'center',
        backgroundAttachment: 'fixed',
      }}
    >
      <div 
        className="absolute inset-0 z-0"
        style={{ background: 'radial-gradient(ellipse at center, transparent 60%, rgba(0,0,0,0.7) 100%)' }}
      ></div>
      
      <div className="w-full max-w-lg flex justify-center items-baseline gap-x-2 mb-4 z-10 relative pt-8">
        <h1 className="text-5xl sm:text-7xl font-extrabold text-white drop-shadow-[0_4px_5px_rgba(0,0,0,0.9)]">
          История
        </h1>
        <LanguageSwitcher />
      </div>

      <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-2xl overflow-hidden relative z-10 bg-white/75 backdrop-blur-sm border-4 border-white/60">
        <CardHeader className="flex flex-row items-center justify-between bg-gradient-to-r from-red-600 to-orange-500 text-white p-3">
          <UserProfile />
          <Link to="/">
            <Button variant="ghost" className="text-white hover:bg-white/20 hover:text-white h-12 w-12 rounded-lg p-0">
              <ArrowRightLeft className="h-7 w-7" />
            </Button>
          </Link>
        </CardHeader>
        <CardContent className="text-center text-gray-600 p-6">
          <p>Здесь будет история ваших заявок.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountPage;