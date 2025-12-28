import { storage } from "./storage";
import { sendHtmlEmail } from "./resend";
import { sendSMS } from "./twilio";
import { sendLineMessage } from "./line";

let schedulerInterval: NodeJS.Timeout | null = null;
let isProcessing = false;

async function processScheduledMessage(message: any) {
  console.log(`⏰ Processing scheduled message ${message.id}`);
  
  try {
    const marked = await storage.markScheduledMessageProcessing(message.id);
    if (!marked) {
      console.log(`⏭️ Message ${message.id} already being processed`);
      return;
    }

    let targetCustomers: any[] = [];
    const allCustomers = await storage.getAllCustomers();

    if (message.recipientType === 'all') {
      targetCustomers = allCustomers;
    } else if (message.recipientType === 'tier' && message.recipientTier) {
      targetCustomers = allCustomers.filter(c => c.tier === message.recipientTier);
    } else if (message.recipientType === 'individual' && message.recipientIds) {
      targetCustomers = await Promise.all(
        message.recipientIds.map((id: string) => storage.getCustomer(id))
      );
      targetCustomers = targetCustomers.filter(c => c !== undefined);
    } else if (message.recipientType === 'birthday_today' || message.recipientType === 'birthday_week') {
      const today = new Date();
      const todayMonth = today.getMonth() + 1;
      const todayDay = today.getDate();
      const dayOfWeek = today.getDay();
      const weekStart = new Date(today);
      weekStart.setDate(today.getDate() - dayOfWeek);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekStart.getDate() + 6);

      targetCustomers = allCustomers.filter(customer => {
        if (!customer.birthday) return false;
        try {
          let birthMonth = 0, birthDay = 0;
          const birthdayStr = customer.birthday.toString().trim();
          
          if (birthdayStr.includes('-')) {
            const parts = birthdayStr.split('-');
            if (parts.length === 2) {
              birthMonth = parseInt(parts[0], 10);
              birthDay = parseInt(parts[1], 10);
            } else if (parts.length === 3) {
              birthMonth = parseInt(parts[1], 10);
              birthDay = parseInt(parts[2], 10);
            }
          } else if (birthdayStr.includes('/')) {
            const parts = birthdayStr.split('/');
            if (parts.length >= 2) {
              birthMonth = parseInt(parts[0], 10);
              birthDay = parseInt(parts[1], 10);
            }
          }

          if (!birthMonth || !birthDay) return false;

          if (message.recipientType === 'birthday_today') {
            return birthMonth === todayMonth && birthDay === todayDay;
          } else {
            const thisYearBirthday = new Date(today.getFullYear(), birthMonth - 1, birthDay);
            return thisYearBirthday >= weekStart && thisYearBirthday <= weekEnd;
          }
        } catch {
          return false;
        }
      });
    }

    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const customer of targetCustomers) {
      if (!customer) continue;

      try {
        if (message.channel === 'email') {
          if (!customer.email) {
            failedCount++;
            continue;
          }

          const result = await sendHtmlEmail(
            customer.email,
            message.subject || 'Message from Yens',
            message.message
          );

          await storage.createMessageLog({
            customerId: customer.id,
            templateId: message.templateId,
            channel: 'email',
            recipient: customer.email,
            subject: message.subject,
            message: message.message,
            status: result.success ? 'sent' : 'failed',
            externalId: result.messageId || null,
            errorMessage: result.error || null,
          });

          if (result.success) {
            sentCount++;
          } else {
            failedCount++;
            if (result.error) errors.push(result.error);
          }
        } else if (message.channel === 'sms') {
          if (!customer.phone) {
            failedCount++;
            continue;
          }

          const result = await sendSMS(customer.phone, message.message);

          await storage.createMessageLog({
            customerId: customer.id,
            templateId: message.templateId,
            channel: 'sms',
            recipient: customer.phone,
            subject: null,
            message: message.message,
            status: result.success ? 'sent' : 'failed',
            externalId: result.messageId || null,
            errorMessage: result.error || null,
          });

          if (result.success) {
            sentCount++;
          } else {
            failedCount++;
            if (result.error) errors.push(result.error);
          }
        } else if (message.channel === 'line') {
          if (!customer.lineUid) {
            failedCount++;
            continue;
          }

          const result = await sendLineMessage(customer.lineUid, message.message);

          await storage.createMessageLog({
            customerId: customer.id,
            templateId: message.templateId,
            channel: 'line',
            recipient: customer.lineUid,
            subject: null,
            message: message.message,
            status: result.success ? 'sent' : 'failed',
            externalId: result.messageId || null,
            errorMessage: result.error || null,
          });

          if (result.success) {
            sentCount++;
          } else {
            failedCount++;
            if (result.error) errors.push(result.error);
          }
        }
      } catch (error) {
        console.error(`Error sending to customer ${customer.id}:`, error);
        failedCount++;
        errors.push(error instanceof Error ? error.message : 'Unknown error');
      }
    }

    const errorMessage = errors.length > 0 ? errors.slice(0, 5).join('; ') : undefined;
    await storage.completeScheduledMessage(message.id, sentCount, failedCount, errorMessage);
    
    console.log(`✅ Scheduled message ${message.id} completed: ${sentCount} sent, ${failedCount} failed`);
  } catch (error) {
    console.error(`❌ Error processing scheduled message ${message.id}:`, error);
    await storage.completeScheduledMessage(
      message.id, 
      0, 
      0, 
      error instanceof Error ? error.message : 'Processing error'
    );
  }
}

async function checkScheduledMessages() {
  if (isProcessing) {
    return;
  }

  isProcessing = true;
  
  try {
    const pendingMessages = await storage.getPendingScheduledMessages();
    
    if (pendingMessages.length > 0) {
      console.log(`⏰ Found ${pendingMessages.length} scheduled messages to process`);
    }

    for (const message of pendingMessages) {
      await processScheduledMessage(message);
    }
  } catch (error) {
    console.error('Error checking scheduled messages:', error);
  } finally {
    isProcessing = false;
  }
}

export function startScheduler() {
  if (schedulerInterval) {
    console.log('Scheduler already running');
    return;
  }

  console.log('⏰ Starting message scheduler (checks every 60 seconds)');
  
  checkScheduledMessages();
  
  schedulerInterval = setInterval(checkScheduledMessages, 60 * 1000);
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('⏰ Message scheduler stopped');
  }
}
