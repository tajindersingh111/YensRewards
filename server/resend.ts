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

// Send HTML email directly
export async function sendHtmlEmail(
  to: string,
  subject: string,
  html: string
): Promise<{ success: boolean; messageId?: string; error?: string }> {
  try {
    const { client, fromEmail } = await getUncachableResendClient();

    console.log(`📧 Sending HTML email to ${to} with subject: ${subject}`);

    const result = await client.emails.send({
      from: fromEmail,
      to: [to],
      subject: subject,
      html: html,
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
