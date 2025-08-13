/// <reference types="vite/client" />

interface Window {
  Telegram: {
    WebApp: {
      ready: () => void;
      expand: () => void;
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
      HapticFeedback: {
        notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
        impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
        selectionChanged: () => void;
      };
      requestWriteAccess: (callback: (isAllowed: boolean) => void) => void;
    };
  };
}