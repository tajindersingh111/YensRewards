import { Resend } from 'resend';
import { generateEmailTemplate, EmailTemplateType } from './email-templates';
import * as cheerio from 'cheerio';

let connectionSettings: any;
let cachedCredentials: { apiKey: string; fromEmail: string; cachedAt: number } | null = null;
const CREDENTIAL_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getCredentials(useCache: boolean = false) {
  if (useCache && cachedCredentials && (Date.now() - cachedCredentials.cachedAt) < CREDENTIAL_CACHE_TTL) {
    return { apiKey: cachedCredentials.apiKey, fromEmail: cachedCredentials.fromEmail };
  }

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

  const creds = { apiKey: connectionSettings.settings.api_key, fromEmail: connectionSettings.settings.from_email };
  cachedCredentials = { ...creds, cachedAt: Date.now() };
  return creds;
}

// For single sends - always gets fresh credentials
export async function getUncachableResendClient() {
  const credentials = await getCredentials(false);
  return {
    client: new Resend(credentials.apiKey),
    fromEmail: credentials.fromEmail
  };
}

// For batch sends - caches credentials for 5 minutes to avoid hammering the connector
export async function getCachedResendClient() {
  const credentials = await getCredentials(true);
  return {
    client: new Resend(credentials.apiKey),
    fromEmail: credentials.fromEmail
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
              <a href="https://line.me/R/ti/p/@752afsdq" target="_blank" style="display: inline-block; padding: 10px 24px; background-color: #06C755; color: #ffffff; text-decoration: none; font-weight: 600; font-size: 14px; border-radius: 24px;">
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

// Helper to add delay between API calls
function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Send multiple HTML emails sequentially with rate limiting
export async function sendHtmlEmailsSequentially(
  emails: Array<{ to: string; subject: string; html: string }>
): Promise<Array<{ to: string; success: boolean; messageId?: string; error?: string }>> {
  const results: Array<{ to: string; success: boolean; messageId?: string; error?: string }> = [];
  
  for (let i = 0; i < emails.length; i++) {
    const email = emails[i];
    
    if (i > 0) {
      await delay(250);
    }
    
    const result = await sendHtmlEmail(email.to, email.subject, email.html);
    results.push({
      to: email.to,
      ...result
    });
  }
  
  return results;
}

// Send a single email using a pre-fetched client (for batch operations)
async function sendSingleEmailWithClient(
  client: Resend,
  fromEmail: string,
  to: string,
  subject: string,
  html: string,
  maxRetries: number = 3
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const result = await client.emails.send({
        from: fromEmail,
        to: [to],
        subject: subject,
        html: html,
      });

      if (result.error) {
        const errorMsg = result.error.message || 'Resend API error';
        if (attempt < maxRetries && (errorMsg.includes('rate') || errorMsg.includes('429') || errorMsg.includes('timeout'))) {
          console.log(`Resend rate limited for ${to}, retry ${attempt}/${maxRetries} after ${attempt * 2}s`);
          await delay(attempt * 2000);
          continue;
        }
        return { success: false, error: errorMsg };
      }

      return { success: true, messageId: result.data?.id || undefined };
    } catch (error: any) {
      const errorMsg = error.message || 'Failed to send email';
      if (attempt < maxRetries && (errorMsg.includes('rate') || errorMsg.includes('429') || errorMsg.includes('timeout') || errorMsg.includes('fetch') || errorMsg.includes('ECONNRESET'))) {
        console.log(`Email send error for ${to}, retry ${attempt}/${maxRetries}: ${errorMsg}`);
        await delay(attempt * 2000);
        continue;
      }
      return { success: false, error: errorMsg };
    }
  }
  return { success: false, error: 'Max retries exceeded' };
}

// Batch email sender - gets credentials once, reuses for all emails, with retry logic
export async function sendBatchEmails(
  emails: Array<{ to: string; subject: string; html: string; isHtml: boolean }>,
  onProgress?: (sent: number, failed: number, total: number) => void
): Promise<{ sent: number; failed: number; skipped: number; results: Array<{ to: string; success: boolean; error?: string }>; errorBreakdown: Record<string, number> }> {
  let sent = 0;
  let failed = 0;
  const results: Array<{ to: string; success: boolean; error?: string }> = [];
  const BATCH_SIZE = 50;
  const DELAY_BETWEEN_EMAILS = 350;
  const DELAY_BETWEEN_BATCHES = 3000;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  const validEmails = emails.filter(e => {
    if (!emailRegex.test(e.to.trim())) {
      console.log(`Skipping invalid email address: "${e.to}"`);
      results.push({ to: e.to, success: false, error: 'Invalid email address format' });
      failed++;
      return false;
    }
    return true;
  });

  if (validEmails.length === 0) {
    console.log('No valid emails to send');
    return { sent: 0, failed, skipped: emails.length - validEmails.length, results, errorBreakdown: {} };
  }

  // Get client ONCE for the entire batch - use let so we can refresh
  let currentClient = await getCachedResendClient();

  for (let batchStart = 0; batchStart < validEmails.length; batchStart += BATCH_SIZE) {
    const batch = validEmails.slice(batchStart, batchStart + BATCH_SIZE);

    if (batchStart > 0) {
      await delay(DELAY_BETWEEN_BATCHES);
      // Refresh credentials every 200 emails in case token is expiring
      if (batchStart % 200 === 0) {
        try {
          cachedCredentials = null; // Force fresh fetch
          currentClient = await getCachedResendClient();
          console.log(`Refreshed Resend credentials at email ${batchStart}`);
        } catch (e) {
          console.log('Credential refresh failed, continuing with existing client');
        }
      }
    }

    for (let i = 0; i < batch.length; i++) {
      const email = batch[i];
      if (i > 0) {
        await delay(DELAY_BETWEEN_EMAILS);
      }

      let htmlContent: string;
      if (email.isHtml) {
        htmlContent = wrapHtmlInEmailTemplate(email.html, email.subject);
      } else {
        htmlContent = wrapHtmlInEmailTemplate(`<p>${email.html.replace(/\n/g, '<br>')}</p>`, email.subject);
      }

      const result = await sendSingleEmailWithClient(currentClient.client, currentClient.fromEmail, email.to, email.subject, htmlContent);
      
      // If auth error, try refreshing credentials and retrying once
      if (!result.success && result.error && (result.error.includes('auth') || result.error.includes('401') || result.error.includes('403') || result.error.includes('API key'))) {
        console.log(`Auth error detected, refreshing credentials and retrying for ${email.to}`);
        try {
          cachedCredentials = null;
          currentClient = await getCachedResendClient();
          const retryResult = await sendSingleEmailWithClient(currentClient.client, currentClient.fromEmail, email.to, email.subject, htmlContent);
          results.push({ to: email.to, success: retryResult.success, error: retryResult.error });
          if (retryResult.success) { sent++; } else { failed++; console.error(`Failed after auth refresh for ${email.to}: ${retryResult.error}`); }
          continue;
        } catch (refreshErr) {
          console.error(`Credential refresh failed:`, refreshErr);
        }
      }

      results.push({ to: email.to, success: result.success, error: result.error });

      if (result.success) {
        sent++;
      } else {
        failed++;
        console.error(`Failed to send email to ${email.to}: ${result.error}`);
      }
    }

    const processed = Math.min(batchStart + BATCH_SIZE, validEmails.length);
    console.log(`Email batch ${Math.floor(batchStart / BATCH_SIZE) + 1}: ${processed}/${validEmails.length} processed (${sent} sent, ${failed} failed)`);
    if (onProgress) {
      onProgress(sent, failed, emails.length);
    }
  }

  const skippedCount = emails.length - validEmails.length;
  const errorBreakdown: Record<string, number> = {};
  for (const r of results) {
    if (!r.success && r.error) {
      const key = r.error.length > 80 ? r.error.substring(0, 80) + '...' : r.error;
      errorBreakdown[key] = (errorBreakdown[key] || 0) + 1;
    }
  }

  console.log(`\n${'='.repeat(60)}`);
  console.log(`  EMAIL SEND REPORT`);
  console.log(`${'='.repeat(60)}`);
  console.log(`  Total requested:    ${emails.length}`);
  console.log(`  Invalid (skipped):  ${skippedCount}`);
  console.log(`  Attempted:          ${validEmails.length}`);
  console.log(`  Sent successfully:  ${sent}`);
  console.log(`  Failed:             ${failed}`);
  console.log(`  Success rate:       ${validEmails.length > 0 ? ((sent / validEmails.length) * 100).toFixed(1) : 0}%`);
  if (Object.keys(errorBreakdown).length > 0) {
    console.log(`${'─'.repeat(60)}`);
    console.log(`  ERRORS:`);
    for (const [error, count] of Object.entries(errorBreakdown).sort((a, b) => b[1] - a[1])) {
      console.log(`    ${count}x - ${error}`);
    }
  }
  console.log(`${'='.repeat(60)}\n`);

  return { sent, failed, skipped: skippedCount, results, errorBreakdown };
}
