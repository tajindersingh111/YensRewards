// Yens Thai Ice Cream - LINE Flex Message Templates
// Rich, interactive message templates for LINE

// Colors
const YENS_YELLOW = '#FCD34D';
const YENS_BLUE = '#1E40AF';
const YENS_GREEN = '#10B981';
const LINE_GREEN = '#00B900';

// Type definitions for LINE Flex Message
export interface FlexBubble {
  type: 'bubble';
  size?: 'nano' | 'micro' | 'kilo' | 'mega' | 'giga';
  header?: FlexBox;
  hero?: FlexImage | FlexBox;
  body?: FlexBox;
  footer?: FlexBox;
  styles?: {
    header?: { backgroundColor?: string };
    hero?: { backgroundColor?: string };
    body?: { backgroundColor?: string };
    footer?: { backgroundColor?: string };
  };
}

interface FlexBox {
  type: 'box';
  layout: 'horizontal' | 'vertical' | 'baseline';
  contents: FlexComponent[];
  spacing?: string;
  margin?: string;
  paddingAll?: string;
  paddingTop?: string;
  paddingBottom?: string;
  paddingStart?: string;
  paddingEnd?: string;
  backgroundColor?: string;
  cornerRadius?: string;
  justifyContent?: string;
  alignItems?: string;
  flex?: number;
}

interface FlexText {
  type: 'text';
  text: string;
  size?: string;
  color?: string;
  weight?: string;
  align?: string;
  wrap?: boolean;
  margin?: string;
  flex?: number;
  decoration?: string;
}

interface FlexImage {
  type: 'image';
  url: string;
  size?: string;
  aspectRatio?: string;
  aspectMode?: string;
  backgroundColor?: string;
}

interface FlexButton {
  type: 'button';
  action: {
    type: string;
    label: string;
    uri?: string;
    text?: string;
  };
  style?: 'primary' | 'secondary' | 'link';
  color?: string;
  height?: 'sm' | 'md';
  margin?: string;
}

interface FlexSeparator {
  type: 'separator';
  margin?: string;
  color?: string;
}

interface FlexSpacer {
  type: 'spacer';
  size?: string;
}

interface FlexFiller {
  type: 'filler';
}

type FlexComponent = FlexBox | FlexText | FlexImage | FlexButton | FlexSeparator | FlexSpacer | FlexFiller;

export interface FlexMessage {
  type: 'flex';
  altText: string;
  contents: FlexBubble | { type: 'carousel'; contents: FlexBubble[] };
}

// ============================================
// FLEX MESSAGE TEMPLATES
// ============================================

// Welcome Message - When customer adds LINE
export function welcomeFlexMessage(customerName: string, points: number = 0): FlexMessage {
  const bubble: FlexBubble = {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '🍨',
              size: '3xl',
              align: 'center',
              flex: 0
            } as FlexText,
            {
              type: 'text',
              text: 'Yens Thai Ice Cream',
              size: 'lg',
              color: YENS_BLUE,
              weight: 'bold',
              align: 'center',
              flex: 1
            } as FlexText
          ],
          justifyContent: 'center',
          alignItems: 'center',
          paddingAll: 'lg'
        }
      ],
      paddingAll: 'md'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: `ยินดีต้อนรับ ${customerName}!`,
          size: 'xl',
          weight: 'bold',
          color: '#333333',
          align: 'center'
        } as FlexText,
        {
          type: 'text',
          text: 'Welcome to Yens Rewards! 🎉',
          size: 'md',
          color: '#666666',
          align: 'center',
          margin: 'md'
        } as FlexText,
        {
          type: 'separator',
          margin: 'xl',
          color: '#EEEEEE'
        } as FlexSeparator,
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'Your Points Balance',
              size: 'sm',
              color: '#888888',
              align: 'center'
            } as FlexText,
            {
              type: 'text',
              text: `${points}`,
              size: '3xl',
              weight: 'bold',
              color: YENS_BLUE,
              align: 'center',
              margin: 'sm'
            } as FlexText,
            {
              type: 'text',
              text: 'points',
              size: 'sm',
              color: '#888888',
              align: 'center'
            } as FlexText
          ],
          margin: 'xl',
          paddingAll: 'lg',
          backgroundColor: '#FEF3C7',
          cornerRadius: 'lg'
        }
      ],
      paddingAll: 'xl'
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: '📱 View My Rewards',
            uri: 'https://yens-rewards-leonard59.replit.app/customer'
          },
          style: 'primary',
          color: YENS_BLUE,
          height: 'md'
        } as FlexButton
      ],
      paddingAll: 'lg'
    },
    styles: {
      header: { backgroundColor: YENS_YELLOW }
    }
  };

  return {
    type: 'flex',
    altText: `Welcome ${customerName}! You have ${points} points.`,
    contents: bubble
  };
}

// Points Earned Message
export function pointsEarnedFlexMessage(
  customerName: string,
  pointsEarned: number,
  totalPoints: number,
  transactionAmount?: number
): FlexMessage {
  const bubble: FlexBubble = {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: '🎉',
          size: 'xl',
          flex: 0
        } as FlexText,
        {
          type: 'text',
          text: 'Points Earned!',
          size: 'lg',
          color: '#FFFFFF',
          weight: 'bold',
          margin: 'sm'
        } as FlexText
      ],
      paddingAll: 'lg',
      backgroundColor: YENS_GREEN
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: `+${pointsEarned}`,
          size: '3xl',
          weight: 'bold',
          color: YENS_GREEN,
          align: 'center'
        } as FlexText,
        {
          type: 'text',
          text: 'points',
          size: 'md',
          color: '#888888',
          align: 'center'
        } as FlexText,
        ...(transactionAmount ? [{
          type: 'text',
          text: `฿${transactionAmount.toLocaleString()} purchase`,
          size: 'sm',
          color: '#AAAAAA',
          align: 'center',
          margin: 'sm'
        } as FlexText] : []),
        {
          type: 'separator',
          margin: 'xl',
          color: '#EEEEEE'
        } as FlexSeparator,
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: 'Total Balance:',
              size: 'md',
              color: '#666666'
            } as FlexText,
            {
              type: 'text',
              text: `${totalPoints} pts`,
              size: 'lg',
              weight: 'bold',
              color: YENS_BLUE,
              align: 'end'
            } as FlexText
          ],
          margin: 'xl'
        }
      ],
      paddingAll: 'xl'
    },
    styles: {
      body: { backgroundColor: '#FFFFFF' }
    }
  };

  return {
    type: 'flex',
    altText: `You earned ${pointsEarned} points! Total: ${totalPoints}`,
    contents: bubble
  };
}

// Birthday Message
export function birthdayFlexMessage(customerName: string, reward: string = 'Free Ice Cream Scoop'): FlexMessage {
  const bubble: FlexBubble = {
    type: 'bubble',
    size: 'mega',
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '🎂🎉🎈',
          size: 'xxl',
          align: 'center'
        } as FlexText,
        {
          type: 'text',
          text: 'Happy Birthday!',
          size: 'xl',
          weight: 'bold',
          color: YENS_BLUE,
          align: 'center',
          margin: 'md'
        } as FlexText
      ],
      paddingAll: 'xl'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: `สุขสันต์วันเกิด ${customerName}!`,
          size: 'lg',
          weight: 'bold',
          color: '#333333',
          align: 'center',
          wrap: true
        } as FlexText,
        {
          type: 'text',
          text: 'Wishing you a sweet day filled with joy!',
          size: 'sm',
          color: '#666666',
          align: 'center',
          wrap: true,
          margin: 'md'
        } as FlexText,
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: '🎁 Your Birthday Gift',
              size: 'md',
              color: '#333333',
              align: 'center',
              weight: 'bold'
            } as FlexText,
            {
              type: 'text',
              text: reward,
              size: 'lg',
              weight: 'bold',
              color: YENS_BLUE,
              align: 'center',
              margin: 'md',
              wrap: true
            } as FlexText,
            {
              type: 'text',
              text: 'Valid for 7 days',
              size: 'xs',
              color: '#888888',
              align: 'center',
              margin: 'sm'
            } as FlexText
          ],
          margin: 'xl',
          paddingAll: 'lg',
          backgroundColor: '#FEF3C7',
          cornerRadius: 'lg'
        }
      ],
      paddingAll: 'xl'
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: '🎂 Claim Birthday Gift',
            uri: 'https://yens-rewards-leonard59.replit.app/customer'
          },
          style: 'primary',
          color: '#E91E63',
          height: 'md'
        } as FlexButton
      ],
      paddingAll: 'lg'
    },
    styles: {
      header: { backgroundColor: YENS_YELLOW }
    }
  };

  return {
    type: 'flex',
    altText: `Happy Birthday ${customerName}! Claim your birthday gift: ${reward}`,
    contents: bubble
  };
}

// Promotion Message
export function promotionFlexMessage(
  promoTitle: string,
  promoDescription: string,
  promoCode?: string,
  validUntil?: string,
  imageUrl?: string
): FlexMessage {
  const bubble: FlexBubble = {
    type: 'bubble',
    size: 'mega',
    ...(imageUrl ? {
      hero: {
        type: 'image',
        url: imageUrl,
        size: 'full',
        aspectRatio: '20:13',
        aspectMode: 'cover'
      } as FlexImage
    } : {}),
    header: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: '🔥 Special Offer!',
          size: 'sm',
          color: YENS_BLUE
        } as FlexText,
        {
          type: 'text',
          text: promoTitle,
          size: 'xl',
          weight: 'bold',
          color: '#333333',
          wrap: true,
          margin: 'sm'
        } as FlexText
      ],
      paddingAll: 'lg'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: promoDescription,
          size: 'md',
          color: '#555555',
          wrap: true
        } as FlexText,
        ...(promoCode ? [{
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'USE CODE:',
              size: 'xs',
              color: '#888888',
              align: 'center'
            } as FlexText,
            {
              type: 'text',
              text: promoCode,
              size: 'xl',
              weight: 'bold',
              color: YENS_BLUE,
              align: 'center'
            } as FlexText
          ],
          margin: 'xl',
          paddingAll: 'lg',
          backgroundColor: '#F5F5F5',
          cornerRadius: 'md'
        } as FlexBox] : []),
        ...(validUntil ? [{
          type: 'text',
          text: `Valid until: ${validUntil}`,
          size: 'xs',
          color: '#888888',
          align: 'center',
          margin: 'lg'
        } as FlexText] : [])
      ],
      paddingAll: 'xl'
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: '🛒 Claim Offer',
            uri: 'https://yens-rewards-leonard59.replit.app/customer'
          },
          style: 'primary',
          color: YENS_BLUE,
          height: 'md'
        } as FlexButton
      ],
      paddingAll: 'lg'
    },
    styles: {
      header: { backgroundColor: YENS_YELLOW }
    }
  };

  return {
    type: 'flex',
    altText: `Special Offer: ${promoTitle}`,
    contents: bubble
  };
}

// Tier Status Message
export function tierStatusFlexMessage(
  customerName: string,
  currentTier: string,
  totalPoints: number,
  pointsToNextTier?: number,
  nextTier?: string
): FlexMessage {
  const tierColors: Record<string, string> = {
    'Bronze': '#CD7F32',
    'Silver': '#C0C0C0',
    'Gold': '#FFD700',
    'Platinum': '#E5E4E2',
    'Diamond': '#B9F2FF'
  };

  const tierColor = tierColors[currentTier] || YENS_YELLOW;

  const bubble: FlexBubble = {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: '👑',
          size: 'xl',
          flex: 0
        } as FlexText,
        {
          type: 'box',
          layout: 'vertical',
          contents: [
            {
              type: 'text',
              text: 'Your Tier Status',
              size: 'xs',
              color: '#666666'
            } as FlexText,
            {
              type: 'text',
              text: `${currentTier} Member`,
              size: 'lg',
              weight: 'bold',
              color: '#333333'
            } as FlexText
          ],
          margin: 'md'
        }
      ],
      paddingAll: 'lg',
      backgroundColor: tierColor
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: 'Total Points:',
              size: 'md',
              color: '#666666'
            } as FlexText,
            {
              type: 'text',
              text: `${totalPoints}`,
              size: 'lg',
              weight: 'bold',
              color: YENS_BLUE,
              align: 'end'
            } as FlexText
          ]
        },
        ...(pointsToNextTier && nextTier ? [
          {
            type: 'separator',
            margin: 'lg',
            color: '#EEEEEE'
          } as FlexSeparator,
          {
            type: 'text',
            text: `${pointsToNextTier} more points to ${nextTier}!`,
            size: 'sm',
            color: '#888888',
            align: 'center',
            margin: 'lg',
            wrap: true
          } as FlexText
        ] : [])
      ],
      paddingAll: 'xl'
    }
  };

  return {
    type: 'flex',
    altText: `${customerName}, you're a ${currentTier} member with ${totalPoints} points!`,
    contents: bubble
  };
}

// Account Linked Confirmation
export function accountLinkedFlexMessage(customerName: string, phone: string): FlexMessage {
  const bubble: FlexBubble = {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: '✅',
          size: 'xl',
          flex: 0
        } as FlexText,
        {
          type: 'text',
          text: 'Account Linked!',
          size: 'lg',
          color: '#FFFFFF',
          weight: 'bold',
          margin: 'sm'
        } as FlexText
      ],
      paddingAll: 'lg',
      backgroundColor: YENS_GREEN
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: `สวัสดี ${customerName}!`,
          size: 'lg',
          weight: 'bold',
          color: '#333333',
          align: 'center'
        } as FlexText,
        {
          type: 'text',
          text: 'Your LINE account is now linked to your Yens Rewards.',
          size: 'sm',
          color: '#666666',
          align: 'center',
          wrap: true,
          margin: 'md'
        } as FlexText,
        {
          type: 'box',
          layout: 'horizontal',
          contents: [
            {
              type: 'text',
              text: '📱',
              size: 'md',
              flex: 0
            } as FlexText,
            {
              type: 'text',
              text: phone,
              size: 'md',
              color: YENS_BLUE,
              weight: 'bold',
              margin: 'sm'
            } as FlexText
          ],
          justifyContent: 'center',
          margin: 'lg',
          paddingAll: 'md',
          backgroundColor: '#F5F5F5',
          cornerRadius: 'md'
        }
      ],
      paddingAll: 'xl'
    },
    footer: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'button',
          action: {
            type: 'uri',
            label: '📱 View My Rewards',
            uri: 'https://yens-rewards-leonard59.replit.app/customer'
          },
          style: 'primary',
          color: YENS_BLUE,
          height: 'sm'
        } as FlexButton
      ],
      paddingAll: 'md'
    }
  };

  return {
    type: 'flex',
    altText: `Hi ${customerName}! Your LINE account is now linked to your Yens Rewards.`,
    contents: bubble
  };
}

// Generic styled message (for custom content)
export function styledFlexMessage(
  title: string,
  message: string,
  ctaLabel?: string,
  ctaUrl?: string,
  emoji: string = '🍨'
): FlexMessage {
  const bubble: FlexBubble = {
    type: 'bubble',
    size: 'kilo',
    header: {
      type: 'box',
      layout: 'horizontal',
      contents: [
        {
          type: 'text',
          text: emoji,
          size: 'xl',
          flex: 0
        } as FlexText,
        {
          type: 'text',
          text: title,
          size: 'lg',
          color: YENS_BLUE,
          weight: 'bold',
          margin: 'sm',
          wrap: true
        } as FlexText
      ],
      paddingAll: 'lg'
    },
    body: {
      type: 'box',
      layout: 'vertical',
      contents: [
        {
          type: 'text',
          text: message,
          size: 'md',
          color: '#555555',
          wrap: true
        } as FlexText
      ],
      paddingAll: 'xl'
    },
    ...(ctaLabel && ctaUrl ? {
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [
          {
            type: 'button',
            action: {
              type: 'uri',
              label: ctaLabel,
              uri: ctaUrl
            },
            style: 'primary',
            color: YENS_BLUE,
            height: 'sm'
          } as FlexButton
        ],
        paddingAll: 'md'
      }
    } : {}),
    styles: {
      header: { backgroundColor: YENS_YELLOW }
    }
  };

  return {
    type: 'flex',
    altText: `${title}: ${message.substring(0, 50)}...`,
    contents: bubble
  };
}

// Export template type for selection
export type LineTemplateType = 'welcome' | 'points_earned' | 'birthday' | 'promotion' | 'tier_status' | 'account_linked' | 'custom';

// Template generator function
export function generateLineFlexTemplate(
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
): FlexMessage {
  switch (templateType) {
    case 'welcome':
      return welcomeFlexMessage(params.customerName || 'Customer', params.points || 0);
    case 'points_earned':
      return pointsEarnedFlexMessage(
        params.customerName || 'Customer',
        params.pointsEarned || 0,
        params.totalPoints || 0,
        params.transactionAmount
      );
    case 'birthday':
      return birthdayFlexMessage(params.customerName || 'Customer', params.reward);
    case 'promotion':
      return promotionFlexMessage(
        params.promoTitle || 'Special Offer',
        params.promoDescription || '',
        params.promoCode,
        params.validUntil,
        params.imageUrl
      );
    case 'tier_status':
      return tierStatusFlexMessage(
        params.customerName || 'Customer',
        params.currentTier || 'Bronze',
        params.totalPoints || 0,
        params.pointsToNextTier,
        params.nextTier
      );
    case 'account_linked':
      return accountLinkedFlexMessage(params.customerName || 'Customer', params.phone || '');
    case 'custom':
    default:
      return styledFlexMessage(
        params.title || 'Yens Thai Ice Cream',
        params.message || '',
        params.ctaLabel,
        params.ctaUrl,
        params.emoji
      );
  }
}
