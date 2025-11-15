import { sendEmail } from './server/resend';

async function testResendEmail() {
  console.log('🧪 Testing Resend email integration...');
  console.log('📧 Sending test email to leonard@lefent.co.uk');
  
  const result = await sendEmail(
    'leonard@lefent.co.uk',
    'Test Email from Yens Thai Ice Cream',
    'This is a test email to verify that Resend is configured correctly. If you receive this, the integration is working!'
  );
  
  console.log('\n📊 Result:', result);
  
  if (result.success) {
    console.log('✅ SUCCESS! Email sent successfully!');
    console.log('📬 Message ID:', result.messageId);
    console.log('\n👉 Check your inbox at leonard@lefent.co.uk');
  } else {
    console.log('❌ FAILED! Error sending email');
    console.log('🔴 Error:', result.error);
  }
}

testResendEmail().catch(console.error);
