// Yens Thai Ice Cream - LINE Flex Message Templates (Thai)
// Rich, interactive message templates for LINE

// Colors
const YENS_YELLOW = '#FCD34D';
const YENS_BLUE = '#1E40AF';
const YENS_GREEN = '#10B981';

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
// FLEX MESSAGE TEMPLATES (THAI)
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
          text: `ยินดีต้อนรับ คุณ${customerName}!`,
          size: 'xl',
          weight: 'bold',
          color: '#333333',
          align: 'center',
          wrap: true
        } as FlexText,
        {
          type: 'text',
          text: 'ขอบคุณที่เข้าร่วม Yens Rewards 🎉',
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
              text: 'คะแนนสะสมของคุณ',
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
              text: 'คะแนน',
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
            label: '📱 ดูรางวัลของฉัน',
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
    altText: `ยินดีต้อนรับ คุณ${customerName}! คุณมี ${points} คะแนน`,
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
          text: 'รับคะแนนแล้ว!',
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
          text: 'คะแนน',
          size: 'md',
          color: '#888888',
          align: 'center'
        } as FlexText,
        ...(transactionAmount ? [{
          type: 'text',
          text: `ยอดซื้อ ฿${transactionAmount.toLocaleString()}`,
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
              text: 'คะแนนรวม:',
              size: 'md',
              color: '#666666'
            } as FlexText,
            {
              type: 'text',
              text: `${totalPoints} คะแนน`,
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
    altText: `คุณได้รับ ${pointsEarned} คะแนน! รวม ${totalPoints} คะแนน`,
    contents: bubble
  };
}

// Birthday Message
export function birthdayFlexMessage(customerName: string, reward: string = 'ไอศกรีมฟรี 1 สกู๊ป'): FlexMessage {
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
          text: 'สุขสันต์วันเกิด!',
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
          text: `สุขสันต์วันเกิด คุณ${customerName}!`,
          size: 'lg',
          weight: 'bold',
          color: '#333333',
          align: 'center',
          wrap: true
        } as FlexText,
        {
          type: 'text',
          text: 'ขอให้มีความสุขมากๆ ในวันพิเศษของคุณ!',
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
              text: '🎁 ของขวัญวันเกิด',
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
              text: 'ใช้ได้ภายใน 7 วัน',
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
            label: '🎂 รับของขวัญวันเกิด',
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
    altText: `สุขสันต์วันเกิด คุณ${customerName}! รับของขวัญ: ${reward}`,
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
          text: '🔥 โปรโมชันพิเศษ!',
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
              text: 'ใช้โค้ด:',
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
          text: `ใช้ได้ถึง: ${validUntil}`,
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
            label: '🛒 รับข้อเสนอ',
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
    altText: `โปรโมชันพิเศษ: ${promoTitle}`,
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

  const tierNames: Record<string, string> = {
    'Bronze': 'บรอนซ์',
    'Silver': 'ซิลเวอร์',
    'Gold': 'โกลด์',
    'Platinum': 'แพลทินัม',
    'Diamond': 'ไดมอนด์'
  };

  const tierColor = tierColors[currentTier] || YENS_YELLOW;
  const tierNameTh = tierNames[currentTier] || currentTier;
  const nextTierNameTh = nextTier ? (tierNames[nextTier] || nextTier) : '';

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
              text: 'ระดับสมาชิกของคุณ',
              size: 'xs',
              color: '#666666'
            } as FlexText,
            {
              type: 'text',
              text: `สมาชิก${tierNameTh}`,
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
              text: 'คะแนนรวม:',
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
        ...(pointsToNextTier && nextTierNameTh ? [
          {
            type: 'separator',
            margin: 'lg',
            color: '#EEEEEE'
          } as FlexSeparator,
          {
            type: 'text',
            text: `อีก ${pointsToNextTier} คะแนนเพื่อเลื่อนขั้นเป็น${nextTierNameTh}!`,
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
    altText: `คุณ${customerName} คุณเป็นสมาชิก${tierNameTh} มี ${totalPoints} คะแนน!`,
    contents: bubble
  };
}

// Account Linked Confirmation with Bonus Points
export function accountLinkedFlexMessage(customerName: string, phone: string): FlexMessage {
  const BONUS_POINTS = 50;
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
          text: 'เชื่อมต่อสำเร็จ!',
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
          text: `สวัสดี คุณ${customerName}!`,
          size: 'lg',
          weight: 'bold',
          color: '#333333',
          align: 'center'
        } as FlexText,
        {
          type: 'text',
          text: 'บัญชี LINE ของคุณเชื่อมต่อกับ Yens Rewards เรียบร้อยแล้ว',
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
              text: '🎁 คุณได้รับโบนัส',
              size: 'sm',
              color: '#666666',
              align: 'center'
            } as FlexText,
            {
              type: 'text',
              text: `+${BONUS_POINTS} คะแนน!`,
              size: 'xxl',
              weight: 'bold',
              color: YENS_BLUE,
              align: 'center'
            } as FlexText
          ],
          margin: 'lg',
          paddingAll: 'lg',
          backgroundColor: YENS_YELLOW,
          cornerRadius: 'lg'
        },
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
            label: '📱 ดูรางวัลของฉัน',
            uri: 'https://app.yensthai.com/customer'
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
    altText: `สวัสดี คุณ${customerName}! บัญชี LINE เชื่อมต่อกับ Yens Rewards เรียบร้อยแล้ว +${BONUS_POINTS} คะแนน!`,
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
      return welcomeFlexMessage(params.customerName || 'ลูกค้า', params.points || 0);
    case 'points_earned':
      return pointsEarnedFlexMessage(
        params.customerName || 'ลูกค้า',
        params.pointsEarned || 0,
        params.totalPoints || 0,
        params.transactionAmount
      );
    case 'birthday':
      return birthdayFlexMessage(params.customerName || 'ลูกค้า', params.reward);
    case 'promotion':
      return promotionFlexMessage(
        params.promoTitle || 'โปรโมชันพิเศษ',
        params.promoDescription || '',
        params.promoCode,
        params.validUntil,
        params.imageUrl
      );
    case 'tier_status':
      return tierStatusFlexMessage(
        params.customerName || 'ลูกค้า',
        params.currentTier || 'Bronze',
        params.totalPoints || 0,
        params.pointsToNextTier,
        params.nextTier
      );
    case 'account_linked':
      return accountLinkedFlexMessage(
        params.customerName || 'ลูกค้า',
        params.phone || ''
      );
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
