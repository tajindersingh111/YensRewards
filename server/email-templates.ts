// Yens Thai Ice Cream - HTML Email Templates (Thai)
// Beautiful, responsive email templates with Yens branding

const YENS_YELLOW = '#FCD34D';
const YENS_BLUE = '#1E40AF';
const YENS_LIGHT_YELLOW = '#FEF3C7';

// Base wrapper for all emails - responsive and mobile-friendly
function emailWrapper(content: string, previewText: string = ''): string {
  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>Yens Thai Ice Cream</title>
  <!--[if mso]>
  <style type="text/css">
    table {border-collapse: collapse;}
    .fallback-font {font-family: Arial, sans-serif;}
  </style>
  <![endif]-->
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap');
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Sarabun', 'Inter', Arial, sans-serif; background-color: #f5f5f5; }
    
    @media only screen and (max-width: 600px) {
      .container { width: 100% !important; padding: 10px !important; }
      .content { padding: 20px !important; }
      .button { width: 100% !important; text-align: center !important; }
      .header-title { font-size: 24px !important; }
    }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Sarabun', 'Inter', Arial, sans-serif;">
  <!-- Preview text (hidden) -->
  <div style="display: none; max-height: 0; overflow: hidden;">
    ${previewText}
  </div>
  
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          ${content}
        </table>
        
        <!-- Footer -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="margin-top: 20px;">
          <tr>
            <td align="center" style="padding: 20px; color: #666666; font-size: 12px;">
              <p style="margin: 0;">Yens Thai Ice Cream - นครสวรรค์</p>
              <p style="margin: 5px 0 0 0;">ทำด้วยความรักตั้งแต่ปี 2020</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Header component with Yens branding
function emailHeader(title: string, emoji: string = '🍨'): string {
  return `
    <tr>
      <td style="background: linear-gradient(135deg, ${YENS_YELLOW} 0%, #FBBF24 100%); padding: 30px 40px; text-align: center;">
        <div style="font-size: 48px; margin-bottom: 10px;">${emoji}</div>
        <h1 class="header-title" style="color: ${YENS_BLUE}; font-size: 28px; font-weight: 700; margin: 0;">Yens Thai Ice Cream</h1>
        ${title ? `<p style="color: ${YENS_BLUE}; font-size: 16px; margin-top: 8px; opacity: 0.9;">${title}</p>` : ''}
      </td>
    </tr>
  `;
}

// CTA Button component
function ctaButton(text: string, url: string, color: string = YENS_BLUE): string {
  return `
    <table role="presentation" cellspacing="0" cellpadding="0" border="0" style="margin: 20px auto;">
      <tr>
        <td style="border-radius: 8px; background-color: ${color};">
          <a href="${url}" target="_blank" class="button" style="display: inline-block; padding: 14px 32px; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 16px; border-radius: 8px;">
            ${text}
          </a>
        </td>
      </tr>
    </table>
  `;
}

// Divider component
function divider(): string {
  return `
    <tr>
      <td style="padding: 0 40px;">
        <hr style="border: none; border-top: 1px solid #e5e5e5; margin: 0;">
      </td>
    </tr>
  `;
}

// ============================================
// EMAIL TEMPLATES (THAI)
// ============================================

// LINE Invitation Email
export function lineInviteEmail(customerName: string, lineId: string = '@752afsdq'): string {
  const content = `
    ${emailHeader('เชื่อมต่อกับเราผ่าน LINE!')}
    <tr>
      <td class="content" style="padding: 40px;">
        <h2 style="color: #333333; font-size: 22px; margin: 0 0 15px 0;">
          สวัสดี${customerName ? `คุณ${customerName}` : ''}! 👋
        </h2>
        <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          ขอบคุณที่เป็นลูกค้าคนสำคัญของ Yens Thai Ice Cream! เราอยากเชื่อมต่อกับคุณผ่าน LINE
        </p>
        
        <!-- LINE Benefits Box -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #E8F5E9; border-radius: 12px; margin: 20px 0;">
          <tr>
            <td style="padding: 25px;">
              <h3 style="color: #2E7D32; font-size: 18px; margin: 0 0 15px 0;">🎁 เพิ่มเพื่อน LINE รับสิทธิพิเศษ:</h3>
              <ul style="color: #555555; font-size: 15px; line-height: 1.8; margin: 0; padding-left: 20px;">
                <li>โปรโมชันและส่วนลดพิเศษ</li>
                <li>แจ้งเตือนรสชาติใหม่</li>
                <li>ของขวัญวันเกิด</li>
                <li>เช็คคะแนนสะสมง่ายๆ</li>
                <li>บริการลูกค้าสะดวกรวดเร็ว</li>
              </ul>
            </td>
          </tr>
        </table>
        
        <!-- LINE ID Box -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #00B900; border-radius: 12px; margin: 25px 0;">
          <tr>
            <td style="padding: 25px; text-align: center;">
              <p style="color: #ffffff; font-size: 14px; margin: 0 0 10px 0;">LINE Official Account ของเรา:</p>
              <p style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0; letter-spacing: 1px;">${lineId}</p>
              <p style="color: rgba(255,255,255,0.8); font-size: 13px; margin: 10px 0 0 0;">ค้นหา ID นี้ในแอป LINE เพื่อเพิ่มเพื่อน!</p>
            </td>
          </tr>
        </table>
        
        ${ctaButton('📱 เพิ่มเพื่อนใน LINE', `https://line.me/R/ti/p/${lineId}`, '#00B900')}
        
        <p style="color: #888888; font-size: 14px; text-align: center; margin-top: 20px;">
          หลังจากเพิ่มเพื่อนแล้ว ส่งเบอร์โทรศัพท์เพื่อเชื่อมต่อบัญชีสะสมคะแนน!
        </p>
      </td>
    </tr>
  `;
  
  return emailWrapper(content, `${customerName} เชื่อมต่อกับ Yens Thai Ice Cream ผ่าน LINE รับสิทธิพิเศษมากมาย!`);
}

// Birthday Email
export function birthdayEmail(customerName: string, rewardDetails: string = 'ไอศกรีมฟรี 1 สกู๊ป'): string {
  const content = `
    ${emailHeader('สุขสันต์วันเกิด!', '🎂')}
    <tr>
      <td class="content" style="padding: 40px; text-align: center;">
        <h2 style="color: #333333; font-size: 26px; margin: 0 0 15px 0;">
          🎉 สุขสันต์วันเกิด คุณ${customerName}! 🎉
        </h2>
        <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 25px 0;">
          ขอให้มีความสุขและสดใสในวันพิเศษของคุณ!
        </p>
        
        <!-- Birthday Gift Box -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, ${YENS_LIGHT_YELLOW} 0%, #FDE68A 100%); border-radius: 16px; margin: 20px 0;">
          <tr>
            <td style="padding: 30px; text-align: center;">
              <div style="font-size: 64px; margin-bottom: 15px;">🎁</div>
              <h3 style="color: ${YENS_BLUE}; font-size: 20px; margin: 0 0 10px 0;">ของขวัญวันเกิดของคุณ</h3>
              <p style="color: #333333; font-size: 18px; font-weight: 600; margin: 0;">${rewardDetails}</p>
              <p style="color: #666666; font-size: 14px; margin: 15px 0 0 0;">ใช้ได้ภายใน 7 วันนับจากวันเกิด</p>
            </td>
          </tr>
        </table>
        
        <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 25px 0;">
          มารับของขวัญวันเกิดได้ที่ Yens Thai Ice Cream ทุกสาขา! 🍨
        </p>
        
        ${ctaButton('ดูรางวัลของฉัน', 'https://yens-rewards-leonard59.replit.app/customer', YENS_BLUE)}
      </td>
    </tr>
  `;
  
  return emailWrapper(content, `สุขสันต์วันเกิด คุณ${customerName}! รับของขวัญพิเศษจาก Yens Thai Ice Cream 🎂`);
}

// Welcome Email
export function welcomeEmail(customerName: string, points: number = 0): string {
  const content = `
    ${emailHeader('ยินดีต้อนรับสู่ครอบครัวเรา!')}
    <tr>
      <td class="content" style="padding: 40px;">
        <h2 style="color: #333333; font-size: 24px; margin: 0 0 15px 0;">
          ยินดีต้อนรับ คุณ${customerName}! 🎊
        </h2>
        <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          ขอบคุณที่เข้าร่วมครอบครัว Yens Thai Ice Cream! เรายินดีที่คุณเป็นส่วนหนึ่งของโปรแกรมสะสมคะแนน
        </p>
        
        <!-- Points Balance -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${YENS_LIGHT_YELLOW}; border-radius: 12px; margin: 20px 0;">
          <tr>
            <td style="padding: 25px; text-align: center;">
              <p style="color: #666666; font-size: 14px; margin: 0;">คะแนนสะสมปัจจุบัน</p>
              <p style="color: ${YENS_BLUE}; font-size: 42px; font-weight: 700; margin: 10px 0;">${points}</p>
              <p style="color: #666666; font-size: 16px; margin: 0;">คะแนน</p>
            </td>
          </tr>
        </table>
        
        ${divider()}
        
        <tr>
          <td style="padding: 25px 40px;">
            <h3 style="color: #333333; font-size: 18px; margin: 0 0 15px 0;">วิธีสะสมคะแนน:</h3>
            <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0">
              <tr>
                <td style="padding: 8px 0;">
                  <span style="display: inline-block; width: 30px; color: ${YENS_YELLOW}; font-size: 20px;">🍨</span>
                  <span style="color: #555555; font-size: 15px;">รับ 1 คะแนนทุกการใช้จ่าย 10 บาท</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">
                  <span style="display: inline-block; width: 30px; color: ${YENS_YELLOW}; font-size: 20px;">🎂</span>
                  <span style="color: #555555; font-size: 15px;">คะแนนโบนัสพิเศษวันเกิด</span>
                </td>
              </tr>
              <tr>
                <td style="padding: 8px 0;">
                  <span style="display: inline-block; width: 30px; color: ${YENS_YELLOW}; font-size: 20px;">👫</span>
                  <span style="color: #555555; font-size: 15px;">แนะนำเพื่อนรับรางวัลเพิ่ม</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        
        ${ctaButton('ดูรางวัลของฉัน', 'https://yens-rewards-leonard59.replit.app/customer', YENS_BLUE)}
      </td>
    </tr>
  `;
  
  return emailWrapper(content, `ยินดีต้อนรับสู่ Yens Thai Ice Cream คุณ${customerName}! เริ่มสะสมคะแนนวันนี้ 🍨`);
}

// Promotional Email
export function promotionEmail(
  customerName: string,
  promoTitle: string,
  promoDescription: string,
  promoCode: string = '',
  validUntil: string = ''
): string {
  const content = `
    ${emailHeader('โปรโมชันพิเศษ!')}
    <tr>
      <td class="content" style="padding: 40px;">
        <h2 style="color: #333333; font-size: 24px; margin: 0 0 15px 0;">
          สวัสดีคุณ${customerName}! 👋
        </h2>
        <p style="color: #555555; font-size: 16px; line-height: 1.6; margin: 0 0 20px 0;">
          เรามีข้อเสนอพิเศษสำหรับคุณ!
        </p>
        
        <!-- Promo Box -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background: linear-gradient(135deg, ${YENS_YELLOW} 0%, #FBBF24 100%); border-radius: 16px; margin: 20px 0;">
          <tr>
            <td style="padding: 30px; text-align: center;">
              <h3 style="color: ${YENS_BLUE}; font-size: 24px; font-weight: 700; margin: 0 0 10px 0;">${promoTitle}</h3>
              <p style="color: #333333; font-size: 16px; margin: 0;">${promoDescription}</p>
              
              ${promoCode ? `
                <div style="background-color: white; border-radius: 8px; padding: 15px; margin-top: 20px; display: inline-block;">
                  <p style="color: #666666; font-size: 12px; margin: 0 0 5px 0;">ใช้โค้ด:</p>
                  <p style="color: ${YENS_BLUE}; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: 2px;">${promoCode}</p>
                </div>
              ` : ''}
              
              ${validUntil ? `<p style="color: #666666; font-size: 13px; margin: 15px 0 0 0;">ใช้ได้ถึง: ${validUntil}</p>` : ''}
            </td>
          </tr>
        </table>
        
        ${ctaButton('รับข้อเสนอ', 'https://yens-rewards-leonard59.replit.app/customer', YENS_BLUE)}
        
        <p style="color: #888888; font-size: 13px; text-align: center; margin-top: 25px;">
          แสดงอีเมลนี้ที่ Yens Thai Ice Cream ทุกสาขาเพื่อรับสิทธิ์
        </p>
      </td>
    </tr>
  `;
  
  return emailWrapper(content, `${customerName} ${promoTitle} - ข้อเสนอพิเศษจาก Yens Thai Ice Cream!`);
}

// Points Update Email
export function pointsUpdateEmail(
  customerName: string,
  pointsEarned: number,
  totalPoints: number,
  transactionDetails: string = ''
): string {
  const content = `
    ${emailHeader('รับคะแนนแล้ว!')}
    <tr>
      <td class="content" style="padding: 40px; text-align: center;">
        <h2 style="color: #333333; font-size: 22px; margin: 0 0 20px 0;">
          ยินดีด้วย คุณ${customerName}! 🎉
        </h2>
        
        <!-- Points Earned -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #E8F5E9; border-radius: 16px; margin: 20px 0;">
          <tr>
            <td style="padding: 30px; text-align: center;">
              <p style="color: #666666; font-size: 14px; margin: 0;">คุณได้รับ</p>
              <p style="color: #2E7D32; font-size: 48px; font-weight: 700; margin: 10px 0;">+${pointsEarned}</p>
              <p style="color: #2E7D32; font-size: 18px; margin: 0;">คะแนน</p>
              ${transactionDetails ? `<p style="color: #666666; font-size: 13px; margin: 15px 0 0 0;">${transactionDetails}</p>` : ''}
            </td>
          </tr>
        </table>
        
        <!-- Total Balance -->
        <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: ${YENS_LIGHT_YELLOW}; border-radius: 12px; margin: 20px 0;">
          <tr>
            <td style="padding: 20px; text-align: center;">
              <p style="color: #666666; font-size: 14px; margin: 0;">คะแนนสะสมทั้งหมด</p>
              <p style="color: ${YENS_BLUE}; font-size: 32px; font-weight: 700; margin: 8px 0;">${totalPoints} คะแนน</p>
            </td>
          </tr>
        </table>
        
        <p style="color: #555555; font-size: 15px; margin: 20px 0;">
          สะสมต่อไปเพื่อรับรางวัลเพิ่มเติม! 🍨
        </p>
        
        ${ctaButton('ดูรางวัลของฉัน', 'https://yens-rewards-leonard59.replit.app/customer', YENS_BLUE)}
      </td>
    </tr>
  `;
  
  return emailWrapper(content, `${customerName} คุณได้รับ ${pointsEarned} คะแนนจาก Yens Thai Ice Cream!`);
}

// Generic styled email (for custom messages)
export function styledEmail(
  customerName: string,
  subject: string,
  message: string,
  ctaText: string = '',
  ctaUrl: string = ''
): string {
  const content = `
    ${emailHeader('')}
    <tr>
      <td class="content" style="padding: 40px;">
        ${customerName ? `<h2 style="color: #333333; font-size: 22px; margin: 0 0 15px 0;">สวัสดีคุณ${customerName}! 👋</h2>` : ''}
        <div style="color: #555555; font-size: 16px; line-height: 1.7;">
          ${message.split('\n').map(p => `<p style="margin: 0 0 15px 0;">${p}</p>`).join('')}
        </div>
        ${ctaText && ctaUrl ? ctaButton(ctaText, ctaUrl, YENS_BLUE) : ''}
      </td>
    </tr>
  `;
  
  return emailWrapper(content, `${customerName ? 'คุณ' + customerName + ' ' : ''}${subject}`);
}

// Export template type for selection
export type EmailTemplateType = 'line_invite' | 'birthday' | 'welcome' | 'promotion' | 'points_update' | 'custom';

// Template generator function
export function generateEmailTemplate(
  templateType: EmailTemplateType,
  params: {
    customerName: string;
    subject?: string;
    message?: string;
    points?: number;
    pointsEarned?: number;
    promoTitle?: string;
    promoDescription?: string;
    promoCode?: string;
    validUntil?: string;
    rewardDetails?: string;
    transactionDetails?: string;
    ctaText?: string;
    ctaUrl?: string;
  }
): string {
  switch (templateType) {
    case 'line_invite':
      return lineInviteEmail(params.customerName);
    case 'birthday':
      return birthdayEmail(params.customerName, params.rewardDetails);
    case 'welcome':
      return welcomeEmail(params.customerName, params.points || 0);
    case 'promotion':
      return promotionEmail(
        params.customerName,
        params.promoTitle || 'ข้อเสนอพิเศษ',
        params.promoDescription || '',
        params.promoCode,
        params.validUntil
      );
    case 'points_update':
      return pointsUpdateEmail(
        params.customerName,
        params.pointsEarned || 0,
        params.points || 0,
        params.transactionDetails
      );
    case 'custom':
    default:
      return styledEmail(
        params.customerName,
        params.subject || '',
        params.message || '',
        params.ctaText,
        params.ctaUrl
      );
  }
}
