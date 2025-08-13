/// <reference types="vite/client" />

interface Window {
  Telegram: {
    WebApp: {
      ready: () => void;
      expand: () => void;
      initData: string;
      initDataUnsafe?: {
        query_id?: string;
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