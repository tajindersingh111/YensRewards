import twilio from 'twilio';

let connectionSettings: any;

export function isTwilioConfigured(): boolean {
  const sid = process.env.TWILIO_ACCOUNT_SID;
  const key = process.env.TWILIO_API_KEY;
  const secret = process.env.TWILIO_API_KEY_SECRET;
  
  if (!sid || !key || !secret) return false;
  if (
    sid.includes('YOUR_TWILIO_ACCOUNT_SID') || 
    key.includes('YOUR_TWILIO_API_KEY') || 
    secret.includes('YOUR_TWILIO_API_KEY_SECRET')
  ) {
    return false;
  }
  return true;
}

async function getCredentials() {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const apiKey = process.env.TWILIO_API_KEY;
  const apiKeySecret = process.env.TWILIO_API_KEY_SECRET;
  const phoneNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!isTwilioConfigured()) {
    throw new Error('Twilio credentials are not configured or contain placeholder values');
  }

  return {
    accountSid: accountSid!,
    apiKey: apiKey!,
    apiKeySecret: apiKeySecret!,
    phoneNumber: phoneNumber || ''
  };
}

export async function getTwilioClient() {
  const { accountSid, apiKey, apiKeySecret } = await getCredentials();
  return twilio(apiKey, apiKeySecret, {
    accountSid: accountSid
  });
}

export async function getTwilioFromPhoneNumber() {
  const { phoneNumber } = await getCredentials();
  return phoneNumber;
}

/**
 * Normalize a phone number to strict E.164 format.
 *
 * Handles several common storage formats:
 *  1. Already valid E.164:        +66651158955   → +66651158955 (unchanged)
 *  2. Extra 0 after country code: +660651158955  → +66651158955
 *  3. Local Thai format (10 dig): 0651158955     → +66651158955
 *  4. Local Thai format (no +):   0864929XXX     → +66864929XXX
 *  5. Strips spaces/dashes from any of the above
 */
export function normalizeE164(phone: string): string {
  if (!phone) return phone;

  // Strip spaces, dashes and parentheses
  let n = phone.replace(/[\s\-().]/g, '');

  if (n.startsWith('+')) {
    // Already has country code — just remove any stray leading 0 after the code
    // e.g. +660651158955 → +66651158955
    n = n.replace(/^(\+\d{1,3})0(\d)/, '$1$2');
    return n;
  }

  // No leading + — treat as local Thai number if it starts with 0
  if (n.startsWith('0') && n.length >= 9) {
    // Strip leading 0, prepend Thailand country code
    return '+66' + n.slice(1);
  }

  // Unknown format — return as-is and let Twilio report the error
  return n;
}

export async function sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const toNormalized = normalizeE164(to);

    // Thai numbers (+66): route through Vonage if configured
    const isVonageConfigured = () => !!(process.env.VONAGE_API_KEY && process.env.VONAGE_API_SECRET);
    if (toNormalized.startsWith('+66') && isVonageConfigured()) {
      console.log(`Routing Thai number ${toNormalized} to Vonage`);
      const { sendVonageSMS } = await import('./vonage');
      return await sendVonageSMS(toNormalized, message);
    }

    if (!isTwilioConfigured()) {
      console.warn(`Twilio is not configured. Skipping SMS to ${toNormalized}`);
      return {
        success: false,
        error: 'Twilio is not configured — please configure valid TWILIO_ACCOUNT_SID, TWILIO_API_KEY, and TWILIO_API_KEY_SECRET'
      };
    }

    const client = await getTwilioClient();

    // Check for a Messaging Service SID (preferred for international delivery)
    const messagingServiceSid = process.env.TWILIO_MESSAGING_SERVICE_SID;

    let messageParams: any;

    if (messagingServiceSid) {
      // Use Messaging Service — best routing for international numbers (Thailand, UK, etc.)
      console.log(`Sending SMS to ${toNormalized} via Messaging Service ${messagingServiceSid}`);
      messageParams = {
        body: message,
        messagingServiceSid,
        to: toNormalized
      };
    } else {
      // Fall back to direct phone number
      const fromPhone = await getTwilioFromPhoneNumber();
      console.log(`Sending SMS to ${toNormalized} from ${fromPhone} (original: ${to})`);
      messageParams = {
        body: message,
        from: fromPhone,
        to: toNormalized
      };
    }

    const result = await client.messages.create(messageParams);
    console.log(`SMS sent successfully. SID: ${result.sid}`);

    return {
      success: true,
      messageId: result.sid
    };
  } catch (error: any) {
    console.error('Error sending SMS:', error);
    return {
      success: false,
      error: error.message || 'Failed to send SMS'
    };
  }
}
