import { messagingApi, validateSignature } from '@line/bot-sdk';
import type { webhook } from '@line/bot-sdk';
const { MessagingApiClient } = messagingApi;

// Type alias for webhook events
type WebhookEvent = webhook.Event;

export async function getLineClient() {
  const channelAccessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  
  if (!channelAccessToken) {
    throw new Error('LINE_CHANNEL_ACCESS_TOKEN not found in environment variables');
  }

  return new MessagingApiClient({
    channelAccessToken
  });
}

export async function sendLineMessage(
  lineUserId: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const client = await getLineClient();

    console.log(`📱 Sending LINE message to ${lineUserId}: ${message}`);
    
    const result = await client.pushMessage({
      to: lineUserId,
      messages: [
        {
          type: 'text',
          text: message,
        }
      ]
    });

    console.log(`✅ LINE message sent successfully`);
    
    return {
      success: true,
      messageId: lineUserId, // LINE doesn't return message ID, use userId
    };
  } catch (error: any) {
    console.error('❌ Error sending LINE message:', error);
    return {
      success: false,
      error: error.message || 'Failed to send LINE message',
    };
  }
}

export async function sendLineBroadcast(
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getLineClient();

    console.log(`📢 Sending LINE broadcast: ${message}`);
    
    await client.broadcast({
      messages: [
        {
          type: 'text',
          text: message,
        }
      ]
    });

    console.log(`✅ LINE broadcast sent successfully`);
    
    return {
      success: true,
    };
  } catch (error: any) {
    console.error('❌ Error sending LINE broadcast:', error);
    return {
      success: false,
      error: error.message || 'Failed to send LINE broadcast',
    };
  }
}

export async function getLineProfile(lineUserId: string): Promise<any> {
  try {
    const client = await getLineClient();
    const profile = await client.getProfile(lineUserId);
    return profile;
  } catch (error: any) {
    console.error('❌ Error getting LINE profile:', error);
    throw error;
  }
}

// Verify LINE webhook signature
export function verifyLineSignature(body: string, signature: string): boolean {
  const channelSecret = process.env.LINE_CHANNEL_SECRET;
  
  if (!channelSecret) {
    console.error('❌ LINE_CHANNEL_SECRET not found');
    return false;
  }
  
  console.log(`🔐 Verifying signature with secret length: ${channelSecret.length}`);
  
  try {
    const isValid = validateSignature(body, channelSecret, signature);
    console.log(`🔐 Signature verification result: ${isValid}`);
    return isValid;
  } catch (error) {
    console.error('❌ Signature verification error:', error);
    return false;
  }
}

// Send reply message (uses replyToken from webhook event)
export async function replyLineMessage(
  replyToken: string,
  message: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getLineClient();
    
    await client.replyMessage({
      replyToken,
      messages: [
        {
          type: 'text',
          text: message,
        }
      ]
    });
    
    console.log(`✅ LINE reply sent successfully`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error sending LINE reply:', error);
    return {
      success: false,
      error: error.message || 'Failed to send LINE reply',
    };
  }
}

// Process webhook events
export interface LineWebhookBody {
  destination: string;
  events: WebhookEvent[];
}

export { WebhookEvent };
