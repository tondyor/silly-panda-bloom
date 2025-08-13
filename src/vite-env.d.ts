/// <reference types="vite/client" />

interface Window {
  Telegram: {
    WebApp: {
      ready: () => void;
      initData: string;
      initDataUnsafe?: {
        user?: {
          id: number;
          first_name: string;
          last_name?: string;
          username?: string;
          language_code?: string;
        };
      };
    };
  };
}