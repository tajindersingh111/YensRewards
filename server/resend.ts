import { Resend } from 'resend';
import { generateEmailTemplate, EmailTemplateType } from './email-templates';
import * as cheerio from 'cheerio';

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

    const result = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: subject,
      html: `<p>${message.replace(/\n/g, '<br>')}</p>`,
    });

    if (result.error) {
      console.error('Resend API error:', result.error);
      return {
        success: false,
        error: result.error.message || 'Resend API error',
      };
    }

    return {
      success: true,
      messageId: result.data?.id || undefined,
    };
  } catch (error: any) {
    console.error('Error sending email:', error);
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
    const htmlContent = generateEmailTemplate(templateType, { ...params, subject });

    const result = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: subject,
      html: htmlContent,
    });

    return {
      success: true,
      messageId: result.data?.id || undefined,
    };
  } catch (error: any) {
    console.error('Error sending templated email:', error);
    return {
      success: false,
      error: error.message || 'Failed to send templated email',
    };
  }
}

// Dynamic logo URL - will be set on server initialization
let YENS_LOGO_URL = ''; // Will be populated with the email-assets URL

// Function to set the logo URL after upload
export function setEmailLogoUrl(url: string) {
  // ALWAYS use the production domain for email assets so they're accessible to recipients
  const baseUrl = 'https://app.yensthai.com';
  
  if (url.startsWith('/')) {
    YENS_LOGO_URL = `${baseUrl}${url}`;
  } else {
    YENS_LOGO_URL = url;
  }
}

// Generate the standard email header with logo
function getStandardEmailHeader(): string {
  // Proportionate logo size (160px) for balanced email layout
  const logoSection = YENS_LOGO_URL 
    ? `<img src="${YENS_LOGO_URL}" alt="Yens Thai Ice Cream" width="160" style="max-width: 160px; width: 160px; height: auto; margin-bottom: 10px; display: block;" />`
    : `<div style="background-color: #1E3A5F; color: #ffffff; font-size: 24px; font-weight: 700; padding: 10px 24px; border-radius: 8px; display: inline-block; font-family: 'Sarabun', Arial, sans-serif; margin-bottom: 8px;">Yens</div>`;
  
  return `
        <!-- Email Header with Yens Branding -->
        <table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="margin: 0 auto 20px auto; background-color: #FCD34D; border-radius: 12px; overflow: hidden;">
          <tr>
            <td align="center" style="padding: 20px 20px;">
              ${logoSection}
              <p style="margin: 0; color: #1E3A5F; font-size: 14px; font-weight: 600; font-family: 'Sarabun', Arial, sans-serif;">
                รสชาติแห่งสวรรค์ • สิทธิพิเศษสมาชิก
              </p>
            </td>
          </tr>
        </table>
`;
}

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

// Strip legacy header elements - CONSERVATIVE approach to preserve email body content
function stripLegacyHeader(bodyContent: string): string {
  const hasLegacyKeywords = 
    bodyContent.includes('ICE CREAM & DRINK') || 
    bodyContent.includes('Member Rewards');
  
  if (!hasLegacyKeywords) {
    return bodyContent.trim();
  }
  
  const wrappedContent = `<div id="__cheerio_root__">${bodyContent}</div>`;
  const $ = cheerio.load(wrappedContent, { xmlMode: false });
  const $root = $('#__cheerio_root__');
  
  $root.find('td, div, span, p').each(function() {
    const text = $(this).text().trim();
    if (text === 'ICE CREAM & DRINK' || text === 'Member Rewards') {
      $(this).remove();
    }
  });
  
  return ($root.html() || '').trim();
}

// Wrap HTML content in a complete email template structure if needed
function wrapHtmlInEmailTemplate(htmlContent: string, subject: string): string {
  // Check if HTML is already a complete document
  const isCompleteHtml = htmlContent.trim().toLowerCase().startsWith('<!doctype') || 
                         htmlContent.trim().toLowerCase().startsWith('<html');
  
  if (isCompleteHtml) {
    // Extract body content from complete HTML document
    const bodyMatch = htmlContent.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
    let bodyContent = bodyMatch ? bodyMatch[1] : htmlContent;
    
    // Strip the old "Yens ICE CREAM & DRINK Member Rewards" header pattern
    // This is the blue badge + text header that appears in templates
    bodyContent = bodyContent.replace(
      /<table[^>]*>[\s\S]*?Yens[\s\S]*?ICE CREAM[\s\S]*?Member Rewards[\s\S]*?<\/table>/gi,
      ''
    );
    
    // Also try to remove just the header row if nested differently
    bodyContent = bodyContent.replace(
      /<tr[^>]*>[\s\S]*?<td[^>]*>[\s\S]*?Yens[\s\S]*?<\/td>[\s\S]*?<td[^>]*>[\s\S]*?ICE CREAM[\s\S]*?Member Rewards[\s\S]*?<\/td>[\s\S]*?<\/tr>/gi,
      ''
    );
    
    // Build email with our NEW header + cleaned content + footer
    return `
<!DOCTYPE html>
<html lang="th">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <title>${subject}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Sarabun:wght@400;500;600;700&display=swap');
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Sarabun', 'Inter', Arial, sans-serif; background-color: #f5f5f5; }
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: #f5f5f5; font-family: 'Sarabun', 'Inter', Arial, sans-serif;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="background-color: #f5f5f5;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        ${getStandardEmailHeader()}
        <!-- User's Content (with old header stripped) -->
        ${bodyContent}
        ${STANDARD_EMAIL_FOOTER}
      </td>
    </tr>
  </table>
</body>
</html>
    `.trim();
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
        ${getStandardEmailHeader()}
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
    const wrappedHtml = wrapHtmlInEmailTemplate(html, subject);

    const result = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: subject,
      html: wrappedHtml,
    });

    return {
      success: true,
      messageId: result.data?.id || undefined,
    };
  } catch (error: any) {
    console.error('Error sending HTML email:', error);
    return {
      success: false,
      error: error.message || 'Failed to send HTML email',
    };
  }
}
