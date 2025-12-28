import { Resend } from 'resend';
import { generateEmailTemplate, EmailTemplateType } from './email-templates';

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
    'https://' + hostname + '/api/v2/connection?include_secrets=true&connector_names=resend',
    {
      headers: {
        'Accept': 'application/json',
        'X_REPLIT_TOKEN': xReplitToken
      }
    }
  ).then(res => res.json()).then(data => data.items?.[0]);

  if (!connectionSettings || (!connectionSettings.settings.api_key)) {
    throw new Error('Resend not connected');
  }
  return { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
}

// WARNING: Never cache this client.
// Access tokens expire, so a new client must be created each time.
// Always call this function again to get a fresh client.
export async function getUncachableResendClient() {
  const credentials = await getCredentials();
  return {
    client: new Resend(credentials.apiKey),
    fromEmail: connectionSettings.settings.from_email
  };
}

export async function sendEmail(
  to: string,
  subject: string,
  message: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    console.log(`📧 Sending email from: ${fromEmail} to: ${to}`);
    console.log(`📧 Subject: ${subject}`);

    const result = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: subject,
      html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
    });

    // Log the full response for debugging
    console.log(`📧 Full Resend API response:`, JSON.stringify(result, null, 2));

    if (result.error) {
      console.error(`❌ Resend API error:`, result.error);
      return {
        success: false,
        error: result.error.message || 'Resend API error',
      };
    }

    console.log(`✅ Email sent successfully. ID: ${result.data?.id}`);

    return {
      success: true,
      messageId: result.data?.id || undefined,
    };
  } catch (error: any) {
    console.error('❌ Error sending email:', error);
    return {
      success: false,
      error: error.message || 'Failed to send email',
    };
  }
}

// Send email with HTML template
export async function sendTemplatedEmail(
  to: string,
  subject: string,
  templateType: EmailTemplateType,
  params: {
    customerName: string;
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
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    console.log(`📧 Sending templated email (${templateType}) to ${to}`);

    const htmlContent = generateEmailTemplate(templateType, { ...params, subject });

    const result = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: subject,
      html: htmlContent,
    });

    console.log(`✅ Templated email sent successfully. ID: ${result.data?.id}`);

    return {
      success: true,
      messageId: result.data?.id || undefined,
    };
  } catch (error: any) {
    console.error('❌ Error sending templated email:', error);
    return {
      success: false,
      error: error.message || 'Failed to send templated email',
    };
  }
}

// Standard email header with Yens branding
// To use a logo image, update YENS_LOGO_URL to a publicly accessible URL
const YENS_LOGO_URL = ''; // Leave empty for text-based header, or add public URL like 'https://yensthai.com/logo.png'

const STANDARD_EMAIL_HEADER = `
        <!-- Email Header with Yens Branding -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 20px auto; background: linear-gradient(135deg, #FCD34D 0%, #F59E0B 100%); border-radius: 12px; overflow: hidden;">
          <tr>
            <td align="center" style="padding: 24px 20px;">
              <div style="background-color: #1E3A5F; color: #ffffff; font-size: 28px; font-weight: 700; padding: 12px 28px; border-radius: 8px; display: inline-block; font-family: 'Sarabun', Arial, sans-serif; margin-bottom: 8px;">
                Yens
              </div>
              <p style="margin: 8px 0 0 0; color: #1E3A5F; font-size: 14px; font-weight: 600; font-family: 'Sarabun', Arial, sans-serif;">
                รสชาติแห่งสวรรค์ • สิทธิพิเศษสมาชิก
              </p>
            </td>
          </tr>
        </table>
`;

// Standard footer HTML with LINE opt-in and contact info
const STANDARD_EMAIL_FOOTER = `
        <!-- LINE Opt-in Section -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="margin: 20px auto 0 auto; background-color: #E8F5E9; border-radius: 12px;">
          <tr>
            <td align="center" style="padding: 20px;">
              <p style="margin: 0; color: #2E7D32; font-size: 14px; font-weight: 600;">📱 เชื่อมต่อกับเราผ่าน LINE!</p>
              <p style="margin: 8px 0 12px 0; color: #555555; font-size: 13px;">รับโปรโมชั่นพิเศษและอัพเดทข่าวสารก่อนใคร</p>
              <a href="https://lin.ee/yensthai" target="_blank" style="display: inline-block; padding: 10px 24px; background-color: #06C755; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 24px;">
                ➕ เพิ่มเพื่อน LINE @752afsdq
              </a>
            </td>
          </tr>
        </table>
        
        <!-- Footer -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="margin: 20px auto 0 auto;">
          <tr>
            <td align="center" style="padding: 20px; color: #666666; font-size: 12px;">
              <p style="margin: 0; font-weight: 600;">Yens Thai Ice Cream - นครสวรรค์</p>
              <p style="margin: 8px 0 0 0;">
                <a href="https://yensthai.com" target="_blank" style="color: #1E40AF; text-decoration: none;">🌐 yensthai.com</a>
                &nbsp;&nbsp;|&nbsp;&nbsp;
                <a href="tel:+66818719866" style="color: #1E40AF; text-decoration: none;">📞 081-871-9866</a>
              </p>
              <p style="margin: 8px 0 0 0; color: #999999;">ทำด้วยความรักตั้งแต่ปี 2020</p>
            </td>
          </tr>
        </table>
`;

// Wrap HTML content in a complete email template structure if needed
function wrapHtmlInEmailTemplate(htmlContent: string, subject: string): string {
  // Check if HTML is already a complete document
  const isCompleteHtml = htmlContent.trim().toLowerCase().startsWith('<!doctype') || 
                         htmlContent.trim().toLowerCase().startsWith('<html');
  
  if (isCompleteHtml) {
    // For complete HTML documents, inject the standard header and footer
    let modifiedHtml = htmlContent;
    
    // Remove old footer patterns (Yens Thailand • Crafted with love, Facebook • LINE • Unsubscribe, etc.)
    const oldFooterPatterns = [
      /<table[^>]*>[\s\S]*?Yens Thailand[\s\S]*?Crafted with love[\s\S]*?<\/table>/gi,
      /<table[^>]*>[\s\S]*?Facebook[\s\S]*?LINE[\s\S]*?Unsubscribe[\s\S]*?<\/table>/gi,
      /<p[^>]*>[\s\S]*?Yens Thailand[\s\S]*?Crafted with love[\s\S]*?<\/p>/gi,
    ];
    
    for (const pattern of oldFooterPatterns) {
      modifiedHtml = modifiedHtml.replace(pattern, '');
    }
    
    // Remove old header patterns (ICE CREAM & DRINK, Member Rewards, blue Yens box)
    const oldHeaderPatterns = [
      /<table[^>]*>[\s\S]*?ICE CREAM & DRINK[\s\S]*?Member Rewards[\s\S]*?<\/table>/gi,
      /<div[^>]*>[\s\S]*?ICE CREAM & DRINK[\s\S]*?<\/div>/gi,
    ];
    
    for (const pattern of oldHeaderPatterns) {
      modifiedHtml = modifiedHtml.replace(pattern, '');
    }
    
    // Inject the standard header after <body> tag
    if (modifiedHtml.toLowerCase().includes('<body')) {
      modifiedHtml = modifiedHtml.replace(
        /(<body[^>]*>)/i,
        `$1\n<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td align="center" style="padding: 20px 10px 0 10px;">${STANDARD_EMAIL_HEADER}</td></tr></table>`
      );
    }
    
    // Inject the standard footer before </body>
    if (modifiedHtml.toLowerCase().includes('</body>')) {
      modifiedHtml = modifiedHtml.replace(
        /<\/body>/i,
        `${STANDARD_EMAIL_FOOTER}\n</body>`
      );
    }
    
    return modifiedHtml;
  }
  
  // Wrap the content in a professional email template
  return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
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
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        ${STANDARD_EMAIL_HEADER}
        <table role="presentation" class="container" width="600" cellspacing="0" cellpadding="0" border="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          <tr>
            <td style="padding: 30px 40px;">
              ${htmlContent}
            </td>
          </tr>
        </table>
        ${STANDARD_EMAIL_FOOTER}
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

// Send HTML email directly
export async function sendHtmlEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    console.log(`📧 Sending HTML email to ${to} with subject: ${subject}`);
    
    // Wrap HTML in complete email template if it's a fragment
    const wrappedHtml = wrapHtmlInEmailTemplate(html, subject);

    const result = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: subject,
      html: wrappedHtml,
    });

    console.log(`✅ HTML email sent successfully. ID: ${result.data?.id}`);

    return {
      success: true,
      messageId: result.data?.id || undefined,
    };
  } catch (error: any) {
    console.error('❌ Error sending HTML email:', error);
    return {
      success: false,
      error: error.message || 'Failed to send HTML email',
    };
  }
}
