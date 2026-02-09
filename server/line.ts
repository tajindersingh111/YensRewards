import { messagingApi, validateSignature } from '@line/bot-sdk';
import type { webhook } from '@line/bot-sdk';
import { FlexMessage, generateLineFlexTemplate, LineTemplateType } from './line-flex-templates';
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

export async function sendLineImageMessage(
  lineUserId: string,
  imageUrl: string,
  text?: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const client = await getLineClient();

    const messages: any[] = [
      {
        type: 'image',
        originalContentUrl: imageUrl,
        previewImageUrl: imageUrl,
      }
    ];

    if (text) {
      messages.push({
        type: 'text',
        text: text,
      });
    }

    await client.pushMessage({
      to: lineUserId,
      messages,
    });

    return {
      success: true,
      messageId: lineUserId,
    };
  } catch (error: any) {
    console.error('Error sending LINE image message:', error);
    return {
      success: false,
      error: error.message || 'Failed to send LINE image message',
    };
  }
}

// Send Flex Message to a specific user
export async function sendLineFlexMessage(
  lineUserId: string,
  flexMessage: FlexMessage
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const client = await getLineClient();

    console.log(`📱 Sending LINE Flex message to ${lineUserId}`);
    
    await client.pushMessage({
      to: lineUserId,
      messages: [flexMessage as any]
    });

    console.log(`✅ LINE Flex message sent successfully`);
    
    return {
      success: true,
      messageId: lineUserId,
    };
  } catch (error: any) {
    console.error('❌ Error sending LINE Flex message:', error);
    return {
      success: false,
      error: error.message || 'Failed to send LINE Flex message',
    };
  }
}

// Send templated Flex Message
export async function sendLineTemplatedMessage(
  lineUserId: string,
  templateType: LineTemplateType,
  params: {
    customerName?: string;
    points?: number;
    pointsEarned?: number;
    totalPoints?: number;
    transactionAmount?: number;
    reward?: string;
    promoTitle?: string;
    promoDescription?: string;
    promoCode?: string;
    validUntil?: string;
    imageUrl?: string;
    currentTier?: string;
    pointsToNextTier?: number;
    nextTier?: string;
    phone?: string;
    title?: string;
    message?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    emoji?: string;
  }
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const flexMessage = generateLineFlexTemplate(templateType, params);
    return await sendLineFlexMessage(lineUserId, flexMessage);
  } catch (error: any) {
    console.error('❌ Error sending LINE templated message:', error);
    return {
      success: false,
      error: error.message || 'Failed to send LINE templated message',
    };
  }
}

// Reply with Flex Message
export async function replyLineFlexMessage(
  replyToken: string,
  flexMessage: FlexMessage
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getLineClient();
    
    await client.replyMessage({
      replyToken,
      messages: [flexMessage as any]
    });
    
    console.log(`✅ LINE Flex reply sent successfully`);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error sending LINE Flex reply:', error);
    return {
      success: false,
      error: error.message || 'Failed to send LINE Flex reply',
    };
  }
}

// Reply with templated Flex Message
export async function replyLineTemplatedMessage(
  replyToken: string,
  templateType: LineTemplateType,
  params: {
    customerName?: string;
    points?: number;
    pointsEarned?: number;
    totalPoints?: number;
    transactionAmount?: number;
    reward?: string;
    promoTitle?: string;
    promoDescription?: string;
    promoCode?: string;
    validUntil?: string;
    imageUrl?: string;
    currentTier?: string;
    pointsToNextTier?: number;
    nextTier?: string;
    phone?: string;
    title?: string;
    message?: string;
    ctaLabel?: string;
    ctaUrl?: string;
    emoji?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const flexMessage = generateLineFlexTemplate(templateType, params);
    return await replyLineFlexMessage(replyToken, flexMessage);
  } catch (error: any) {
    console.error('❌ Error sending LINE templated reply:', error);
    return {
      success: false,
      error: error.message || 'Failed to send LINE templated reply',
    };
  }
}

// Broadcast Flex Message to all followers
export async function broadcastLineFlexMessage(
  flexMessage: FlexMessage
): Promise<{ success: boolean; error?: string }> {
  try {
    const client = await getLineClient();

    console.log(`📢 Broadcasting LINE Flex message`);
    
    await client.broadcast({
      messages: [flexMessage as any]
    });

    console.log(`✅ LINE Flex broadcast sent successfully`);
    
    return {
      success: true,
    };
  } catch (error: any) {
    console.error('❌ Error broadcasting LINE Flex message:', error);
    return {
      success: false,
      error: error.message || 'Failed to broadcast LINE Flex message',
    };
  }
}

export { WebhookEvent };
