import { storage } from "./storage";
import { sendHtmlEmail } from "./resend";
import { sendSMS } from "./twilio";
import { sendLineMessage } from "./line";
import { runDailyBackup } from "./backup";

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
          if (!customer.lineUid || customer.isLineActive === false) {
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

// ── Automation helpers ──────────────────────────────────────────────────────

/**
 * Calculate the next run time for an automation in Bangkok timezone (UTC+7).
 */
export function calculateNextRunAt(triggerType: string, triggerConfig: any): Date | null {
  const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
  const now = new Date();
  // "now" in Bangkok wall-clock as a UTC Date (so we can do simple date math)
  const bangkokNow = new Date(now.getTime() + BANGKOK_OFFSET_MS);

  const bYear = bangkokNow.getUTCFullYear();
  const bMonth = bangkokNow.getUTCMonth(); // 0-indexed
  const bDay = bangkokNow.getUTCDate();
  const bDayOfWeek = bangkokNow.getUTCDay(); // 0 = Sunday
  const bMinutes = bangkokNow.getUTCHours() * 60 + bangkokNow.getUTCMinutes();

  function parseTime(timeStr: string): number {
    const [h, m] = (timeStr || '09:00').split(':').map(Number);
    return (h || 9) * 60 + (m || 0);
  }

  /** Convert Bangkok wall-clock date+time to a real UTC Date */
  function bangkokToUTC(year: number, month: number, day: number, timeStr: string): Date {
    const [h, m] = (timeStr || '09:00').split(':').map(Number);
    return new Date(Date.UTC(year, month, day, (h || 9) - 7, m || 0));
  }

  if (triggerType === 'one_time') {
    if (!triggerConfig?.date) return null;
    const [y, mo, d] = triggerConfig.date.split('-').map(Number);
    return bangkokToUTC(y, mo - 1, d, triggerConfig.time || '09:00');
  }

  const time: string = triggerConfig?.time || '09:00';
  const targetMinutes = parseTime(time);

  if (triggerType === 'recurring_daily') {
    if (targetMinutes > bMinutes) {
      return bangkokToUTC(bYear, bMonth, bDay, time);
    }
    // Tomorrow
    const tomorrow = new Date(Date.UTC(bYear, bMonth, bDay + 1));
    return bangkokToUTC(tomorrow.getUTCFullYear(), tomorrow.getUTCMonth(), tomorrow.getUTCDate(), time);
  }

  if (triggerType === 'recurring_weekly') {
    const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    const targetDay = dayNames.indexOf((triggerConfig?.dayOfWeek || 'monday').toLowerCase());
    let daysAhead = (targetDay - bDayOfWeek + 7) % 7;
    if (daysAhead === 0 && targetMinutes <= bMinutes) daysAhead = 7;
    const targetDate = new Date(Date.UTC(bYear, bMonth, bDay + daysAhead));
    return bangkokToUTC(targetDate.getUTCFullYear(), targetDate.getUTCMonth(), targetDate.getUTCDate(), time);
  }

  if (triggerType === 'recurring_monthly') {
    const dom: number = triggerConfig?.dayOfMonth ?? 1;
    const candidate = bangkokToUTC(bYear, bMonth, dom, time);
    if (candidate > now) return candidate;
    // Next month
    const nm = new Date(Date.UTC(bYear, bMonth + 1, dom));
    return bangkokToUTC(nm.getUTCFullYear(), nm.getUTCMonth(), nm.getUTCDate(), time);
  }

  return null;
}

/**
 * Filter customers based on automation customerFilter value.
 */
async function filterCustomers(customerFilter: string): Promise<any[]> {
  const all = await storage.getAllCustomers();
  if (customerFilter === 'all') return all;

  if (customerFilter.startsWith('tier_')) {
    const tier = customerFilter.replace('tier_', '');
    return all.filter(c => c.tier === tier);
  }

  if (customerFilter === 'birthday_today') {
    const now = new Date();
    const todayMonth = now.getMonth() + 1;
    const todayDay = now.getDate();
    return all.filter(c => {
      if (!c.birthday) return false;
      const str = String(c.birthday).trim();
      let bm = 0, bd = 0;
      if (str.includes('-')) {
        const p = str.split('-');
        if (p.length === 2) { bm = +p[0]; bd = +p[1]; }
        else if (p.length === 3) { bm = +p[1]; bd = +p[2]; }
      } else if (str.includes('/')) {
        const p = str.split('/');
        if (p.length >= 2) { bm = +p[0]; bd = +p[1]; }
      }
      return bm === todayMonth && bd === todayDay;
    });
  }

  if (customerFilter === 'inactive_30d' || customerFilter === 'inactive_60d') {
    const days = customerFilter === 'inactive_30d' ? 30 : 60;
    const cutoff = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    return all.filter(c => {
      if (!c.lastUse) return true; // never used = inactive
      return new Date(c.lastUse) < cutoff;
    });
  }

  return all;
}

export async function processAutomation(automation: any) {
  console.log(`🤖 Processing automation "${automation.name}" (${automation.id})`);
  const run = await storage.createAutomationRun({ automationId: automation.id });

  try {
    const customers = await filterCustomers(automation.customerFilter);
    let sentCount = 0;
    let failedCount = 0;
    const errors: string[] = [];

    for (const customer of customers) {
      if (!customer) continue;
      try {
        // Personalise message — support both {{name}} and {name} placeholder formats
        const personalise = (text: string) => text
          .replace(/\{\{name\}\}/g, customer.name || '')
          .replace(/\{name\}/g, customer.name || '')
          .replace(/\{\{customerName\}\}/g, customer.name || '')
          .replace(/\{customerName\}/g, customer.name || '')
          .replace(/\{\{points\}\}/g, (customer.points ?? 0).toString())
          .replace(/\{points\}/g, (customer.points ?? 0).toString())
          .replace(/\{\{customerPoints\}\}/g, (customer.points ?? 0).toString())
          .replace(/\{customerPoints\}/g, (customer.points ?? 0).toString())
          .replace(/\{\{tier\}\}/g, customer.tier || '')
          .replace(/\{tier\}/g, customer.tier || '')
          .replace(/\{\{customerTier\}\}/g, customer.tier || '')
          .replace(/\{customerTier\}/g, customer.tier || '');

        const msg: string = personalise(automation.message);
        const subj: string = personalise(automation.subject || 'Message from Yens');

        if (automation.channel === 'email') {
          if (!customer.email) { failedCount++; continue; }
          const result = await sendHtmlEmail(customer.email, subj, msg);
          await storage.createMessageLog({
            customerId: customer.id,
            templateId: automation.templateId ?? null,
            channel: 'email',
            recipient: customer.email,
            subject: subj,
            message: msg,
            status: result.success ? 'sent' : 'failed',
            externalId: result.messageId ?? null,
            errorMessage: result.error ?? null,
          });
          result.success ? sentCount++ : (failedCount++, result.error && errors.push(result.error));
        } else if (automation.channel === 'sms') {
          if (!customer.phone) { failedCount++; continue; }
          const result = await sendSMS(customer.phone, msg);
          await storage.createMessageLog({
            customerId: customer.id,
            templateId: automation.templateId ?? null,
            channel: 'sms',
            recipient: customer.phone,
            subject: null,
            message: msg,
            status: result.success ? 'sent' : 'failed',
            externalId: result.messageId ?? null,
            errorMessage: result.error ?? null,
          });
          result.success ? sentCount++ : (failedCount++, result.error && errors.push(result.error));
        } else if (automation.channel === 'line') {
          if (!customer.lineUid || customer.isLineActive === false) { failedCount++; continue; }
          const result = await sendLineMessage(customer.lineUid, msg);
          await storage.createMessageLog({
            customerId: customer.id,
            templateId: automation.templateId ?? null,
            channel: 'line',
            recipient: customer.lineUid,
            subject: null,
            message: msg,
            status: result.success ? 'sent' : 'failed',
            externalId: result.messageId ?? null,
            errorMessage: result.error ?? null,
          });
          result.success ? sentCount++ : (failedCount++, result.error && errors.push(result.error));
        } else {
          // 'app' channel — logged only
          await storage.createMessageLog({
            customerId: customer.id,
            templateId: automation.templateId ?? null,
            channel: 'app',
            recipient: customer.id,
            subject: subj,
            message: msg,
            status: 'sent',
            externalId: null,
            errorMessage: null,
          });
          sentCount++;
        }
      } catch (err) {
        failedCount++;
        errors.push(err instanceof Error ? err.message : 'Unknown error');
      }
    }

    await storage.completeAutomationRun(run.id, sentCount, failedCount, errors.slice(0, 5).join('; ') || undefined);

    // Compute next run and update automation
    const nextRunAt = calculateNextRunAt(automation.triggerType, automation.triggerConfig);
    const isOneTime = automation.triggerType === 'one_time';

    await storage.updateAutomation(automation.id, {
      lastRunAt: new Date(),
      nextRunAt: isOneTime ? null : nextRunAt,
      runCount: (automation.runCount ?? 0) + 1,
      // Disable one-time automations after firing
      isActive: isOneTime ? false : automation.isActive,
    });

    console.log(`✅ Automation "${automation.name}" done: ${sentCount} sent, ${failedCount} failed`);
  } catch (error) {
    console.error(`❌ Automation "${automation.name}" failed:`, error);
    await storage.completeAutomationRun(run.id, 0, 0, error instanceof Error ? error.message : 'Processing error');
  }
}

async function checkAutomations() {
  try {
    const due = await storage.getDueAutomations();
    if (due.length > 0) {
      console.log(`🤖 Found ${due.length} automation(s) due`);
    }
    for (const automation of due) {
      await processAutomation(automation);
    }
  } catch (error) {
    console.error('Error checking automations:', error);
  }
}

// ── Daily backup ─────────────────────────────────────────────────────────────

const BANGKOK_OFFSET_MS = 7 * 60 * 60 * 1000;
let lastBackupDate = ""; // YYYY-MM-DD in Bangkok time

async function checkDailyBackup() {
  try {
    const now = new Date();
    const bangkokNow = new Date(now.getTime() + BANGKOK_OFFSET_MS);
    const bangkokDate = bangkokNow.toISOString().split("T")[0];
    const bangkokHour = bangkokNow.getUTCHours();

    // Run once per day at 02:00 Bangkok time
    if (bangkokHour >= 2 && lastBackupDate !== bangkokDate) {
      lastBackupDate = bangkokDate;
      console.log("💾 Starting daily data backup to GitHub...");
      const result = await runDailyBackup();
      if (result.success) {
        console.log(`💾 ${result.message}`);
      } else {
        console.error(`💾 ${result.message}`);
      }
    }
  } catch (err) {
    console.error("💾 Backup check error:", err);
  }
}

export async function triggerBackupNow(): Promise<{ success: boolean; message: string }> {
  console.log("💾 Manual backup triggered...");
  const result = await runDailyBackup();
  if (result.success) {
    // Update last backup date so scheduled backup won't duplicate today
    const bangkokNow = new Date(new Date().getTime() + BANGKOK_OFFSET_MS);
    lastBackupDate = bangkokNow.toISOString().split("T")[0];
  }
  return result;
}

export function startScheduler() {
  if (schedulerInterval) {
    console.log('Scheduler already running');
    return;
  }

  console.log('⏰ Starting message scheduler (checks every 60 seconds)');
  
  checkScheduledMessages();
  checkAutomations();
  checkDailyBackup();
  
  schedulerInterval = setInterval(async () => {
    await checkScheduledMessages();
    await checkAutomations();
    await checkDailyBackup();
  }, 60 * 1000);
}

export function stopScheduler() {
  if (schedulerInterval) {
    clearInterval(schedulerInterval);
    schedulerInterval = null;
    console.log('⏰ Message scheduler stopped');
  }
}
