/// <reference types="vite/client" />

interface Window {
  Telegram: {
    WebApp: {
      ready: () => void;
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