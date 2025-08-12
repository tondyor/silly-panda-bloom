import React from 'react';
import { useTelegramWebApp } from '../hooks/useTelegramWebApp';

export const TelegramConnectionStatus: React.FC = () => {
  const { isInitialized, isLoading, error, user, retry } = useTelegramWebApp();
  
  if (isInitialized && user) {
    return (
      <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
        <div className="flex items-center">
          <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
          <span>Подключено к Telegram • {user.first_name}</span>
        </div>
      </div>
    );
  }
  
  if (isLoading) {
    return (
      <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
        <div className="flex items-center">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-700 mr-2"></div>
          <span>Подключение к Telegram...</span>
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
            <div>
              <div className="font-semibold">Ошибка подключения</div>
              <div className="text-sm">Приложение должно быть открыто в Telegram</div>
            </div>
          </div>
          <button
            onClick={retry}
            className="bg-red-600 hover:bg-red-700 text-white font-bold py-2 px-4 rounded text-sm"
          >
            Попробовать снова
          </button>
        </div>
      </div>
    );
  }
  
  return null;
};