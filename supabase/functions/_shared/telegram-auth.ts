import { createHmac } from "https://deno.land/std@0.190.0/node/crypto.ts";

/**
 * Verifies the initData string from a Telegram Web App.
 * @param initData The initData string from `window.Telegram.WebApp.initData`.
 * @param botToken The Telegram bot token.
 * @returns An object with `ok: true` and the parsed data if valid, or `ok: false` otherwise.
 */
export function verifyInitData(initData: string, botToken: string): {
  ok: boolean;
  data?: Record<string, string>;
  error?: string;
} {
  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
      return { ok: false, error: 'Hash is missing from initData' };
    }

    params.delete('hash');
    const pairs: string[] = [];
    // deno-lint-ignore-next-line
    for (const key of [...params.keys()].sort()) {
      pairs.push(`${key}=${params.get(key)}`);
    }
    const dataCheckString = pairs.join('\n');

    const secretKey = createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();

    const hmac = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');
    
    if (hmac !== hash) {
      return { ok: false, error: 'Invalid hash' };
    }

    const data: Record<string, string> = {};
    for (const [key, value] of params.entries()) {
      data[key] = value;
    }

    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: e.message };
  }
}