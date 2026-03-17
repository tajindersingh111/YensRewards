/**
 * Vonage (Nexmo) SMS — used for Thai (+66) numbers.
 * Vonage has direct carrier connections to AIS, DTAC and True Move,
 * so messages actually arrive unlike US Twilio long-code numbers.
 *
 * Sender: alphanumeric "YensThai" (shows as a name, not a number).
 * Sign up at https://dashboard.nexmo.com/sign-up and grab your
 * API Key and API Secret, then add them as Replit secrets:
 *   VONAGE_API_KEY
 *   VONAGE_API_SECRET
 */

const VONAGE_API_URL = 'https://rest.nexmo.com/sms/json';
// If a virtual number is purchased from Vonage dashboard, set VONAGE_FROM_NUMBER env var
// (e.g. "447700900000") — numbers bypass alphanumeric sender registration requirements.
// Falls back to alphanumeric "YensThai" while awaiting sender ID approval.
const VONAGE_SENDER = process.env.VONAGE_FROM_NUMBER || 'YensThai';

export function isVonageConfigured(): boolean {
  return !!(process.env.VONAGE_API_KEY && process.env.VONAGE_API_SECRET);
}

export async function sendVonageSMS(
  to: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  const apiKey    = process.env.VONAGE_API_KEY;
  const apiSecret = process.env.VONAGE_API_SECRET;

  if (!apiKey || !apiSecret) {
    return {
      success: false,
      error: 'Vonage not configured — add VONAGE_API_KEY and VONAGE_API_SECRET secrets',
    };
  }

  // Vonage expects numbers without the leading +
  const toNormalized = to.startsWith('+') ? to.slice(1) : to;

  try {
    // Only use unicode encoding if message contains non-ASCII characters (Thai, etc.)
    // Thai carriers filter unicode SMS from unregistered senders — English arrives fine
    const needsUnicode = /[^\u0000-\u007F]/.test(message);

    const response = await fetch(VONAGE_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        api_key:    apiKey,
        api_secret: apiSecret,
        from:       VONAGE_SENDER,
        to:         toNormalized,
        text:       message,
        ...(needsUnicode ? { type: 'unicode' } : {}),
      }),
    });

    const data = await response.json() as any;
    const msg  = data?.messages?.[0];

    if (!msg) {
      return { success: false, error: 'Vonage returned no message object' };
    }

    // Vonage status "0" means success
    if (msg.status === '0') {
      console.log(`Vonage SMS sent to ${to} — ID: ${msg['message-id']}`);
      return { success: true, messageId: msg['message-id'] };
    }

    const errorText = msg['error-text'] || `Vonage error status ${msg.status}`;
    console.error(`Vonage SMS failed to ${to}: ${errorText}`);
    return { success: false, error: errorText };

  } catch (err: any) {
    console.error('Vonage SMS exception:', err);
    return { success: false, error: err.message || 'Vonage request failed' };
  }
}
