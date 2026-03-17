import twilio from 'twilio';

let connectionSettings: any;

async function getCredentials() {
  const hostname = process.env.REPLIT_CONNECTORS_HOSTNAME;
  const xReplitToken = process.env.REPL_IDENTITY
    ? 'repl ' + process.env.REPL_IDENTITY
    : process.env.WEB_REPL_RENEWAL
    ? 'depl ' + process.env.WEB_REPL_RENEWAL
    : null;

  if (!xReplitToken) {
    throw new Error('X_REPLIT_TOKEN not found for repl/depl');
  }

  connectionSettings = await fetch(
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=twilio',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.account_sid || !connectionSettings.settings.api_key || !connectionSettings.settings.api_key_secret)) {
    throw new Error('Twilio not connected');
  }
  return {
    accountSid: connectionSettings.settings.account_sid,
    apiKey: connectionSettings.settings.api_key,
    apiKeySecret: connectionSettings.settings.api_key_secret,
    phoneNumber: connectionSettings.settings.phone_number
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
 * Removes a leading 0 that sometimes follows the country code when
 * users store the full local format (e.g. +660651158955 → +66651158955).
 */
function normalizeE164(phone: string): string {
  if (!phone) return phone;
  // Strip all spaces/dashes first
  let normalized = phone.replace(/[\s\-]/g, '');
  // Ensure it starts with +
  if (!normalized.startsWith('+')) return normalized;
  // Remove the leading 0 that follows the country code:
  // +XX0XXXXXXX → +XXXXXXXXX  (matches +1-3 digits then a 0 before the subscriber number)
  normalized = normalized.replace(/^(\+\d{1,3})0(\d)/, '$1$2');
  return normalized;
}

export async function sendSMS(to: string, message: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const client = await getTwilioClient();
    const fromPhone = await getTwilioFromPhoneNumber();

    const toNormalized = normalizeE164(to);
    console.log(`Sending SMS to ${toNormalized} (original: ${to})`);
    
    const result = await client.messages.create({
      body: message,
      from: fromPhone,
      to: toNormalized
    });

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
