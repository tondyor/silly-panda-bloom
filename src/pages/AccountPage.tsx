import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const AccountPage = () => {
  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden p-2 sm:p-4 lg:p-6"
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
      
      <Card className="w-full max-w-lg mx-auto shadow-2xl rounded-2xl overflow-hidden relative z-10 bg-white/75 backdrop-blur-sm border-4 border-white/60">
        <CardHeader className="p-4 border-b">
          <div className="flex items-center relative justify-center">
            <Link to="/" className="absolute left-0 top-1/2 -translate-y-1/2 p-2 rounded-full hover:bg-gray-200/50 transition-colors">
              <ArrowLeft className="h-6 w-6 text-gray-700" />
            </Link>
            <CardTitle className="text-xl font-bold text-center text-gray-800">
              Личный кабинет
            </CardTitle>
          </div>
        </CardHeader>
        <CardContent className="text-center text-gray-600 p-6">
          <p>Здесь будет история ваших заявок.</p>
        </CardContent>
      </Card>
    </div>
  );
};

export default AccountPage;