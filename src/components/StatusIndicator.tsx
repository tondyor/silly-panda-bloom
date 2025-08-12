import React from 'react';

interface StatusIndicatorProps {
  isLoading: boolean;
  error: string | null;
  isReady: boolean;
  onRetry: () => void;
}

export const StatusIndicator: React.FC<StatusIndicatorProps> = ({ 
  isLoading, 
  error, 
  isReady, 
  onRetry 
}) => {
  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-4">
        <div className="flex items-start">
          <div className="flex-shrink-0">
            <span className="text-red-500 text-xl">❌</span>
          </div>
          <div className="ml-3 flex-1">
            <h3 className="text-sm font-medium text-red-800">
              Ошибка подключения
            </h3>
            <div className="mt-2 text-sm text-red-700">
              <p>{error}</p>
            </div>
            <div className="mt-3">
              <button
                onClick={onRetry}
                className="bg-red-100 hover:bg-red-200 text-red-800 px-3 py-1 rounded text-sm font-medium transition-colors"
              >
                Попробовать снова
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <span className="text-blue-500 text-xl">⏳</span>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-800">
              Подключение к Telegram...
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (isReady) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center">
          <div className="flex-shrink-0">
            <span className="text-green-500 text-xl">✅</span>
          </div>
          <div className="ml-3">
            <p className="text-sm text-green-800">
              Готово к работе
            </p>
          </div>
        </div>
      </div>
    );
  }

  return null;
};