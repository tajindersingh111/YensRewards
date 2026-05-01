import { neon } from "@neondatabase/serverless";
import fs from "fs";
import { v4 as uuidv4 } from "uuid";

const sql = neon(process.env.NEON_DATABASE_URL!);

function parseCSVLine(line: string): string[] {
  const result: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') { inQuotes = !inQuotes; }
    else if (ch === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
    else { current += ch; }
  }
  result.push(current.trim());
  return result;
}

function formatBirthday(raw: string): string | null {
  if (!raw) return null;
  const parts = raw.split('/');
  if (parts.length >= 2) return `${parts[1].padStart(2,'0')}-${parts[0].padStart(2,'0')}`;
  return null;
}

function formatTier(raw: string): string {
  const t = (raw || '').toLowerCase().trim();
  if (['gold','silver','bronze'].includes(t)) return t;
  return 'member';
}

function formatPhone(raw: string): string {
  let p = (raw || '').trim().replace(/\s+/g, '');
  if (p.startsWith('0')) p = '+66' + p.substring(1);
  return p;
}

function parseDate(raw: string): Date | null {
  if (!raw) return null;
  const datePart = raw.split(' ')[0].split('/');
  if (datePart.length === 3) {
    return new Date(`${datePart[2]}-${datePart[1].padStart(2,'0')}-${datePart[0].padStart(2,'0')}`);
  }
  return null;
}

async function run() {
  const lines = fs.readFileSync(
    '/home/runner/workspace/attached_assets/member-active-2026-01-16_1768629832619.csv',
    'utf-8'
  ).split('\n').filter(l => l.trim());

  const headers = parseCSVLine(lines[0]);
  console.log('Headers:', headers);
  console.log(`Total records in CSV: ${lines.length - 1}`);

  const existing = await sql`SELECT phone FROM customers`;
  const existingPhones = new Set(existing.map((r: any) => r.phone));
  console.log(`Existing in DB: ${existingPhones.size}`);

  let inserted = 0, skipped = 0, failed = 0;

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCSVLine(lines[i]);
    const get = (name: string) => cols[headers.indexOf(name)] || '';

    const phone = formatPhone(get('Phone Number'));
    if (!phone || phone.length < 5) { failed++; continue; }
    if (existingPhones.has(phone)) { skipped++; continue; }

    const id = uuidv4();
    const name = get('Crm Name').trim() || 'Unknown';
    const tier = formatTier(get('Membership Tier'));
    const email = get('Email').trim() || null;
    const gender = get('Gender').trim() || null;
    const birthday = formatBirthday(get('Birthdate'));
    const registerDate = parseDate(get('Register Date'));
    const registerBranch = get('Register Branch').trim() || null;
    const totalSpent = parseFloat(get('Total Spending') || '0') || 0;
    const points = parseInt(get('Point') || '0') || 0;
    const lastUse = parseDate(get('Last Use'));
    const tag = get('Tag').trim() || null;
    const lineUid = get('Line UID').trim() || null;
    const referralCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    try {
      await sql`
        INSERT INTO customers (
          id, name, phone, email, gender, birthday, points, tier,
          referral_code, total_spent, created_at, register_date, 
          register_branch, last_use, tag, line_uid
        ) VALUES (
          ${id}, ${name}, ${phone}, ${email}, ${gender}, ${birthday},
          ${points}, ${tier}, ${referralCode}, ${totalSpent},
          ${registerDate ?? new Date()},
          ${registerDate ?? null}, ${registerBranch},
          ${lastUse ?? null}, ${tag}, ${lineUid}
        )
      `;
      inserted++;
      if (inserted % 20 === 0) console.log(`Progress: ${inserted} inserted...`);
    } catch (err: any) {
      console.log(`Failed: ${name} (${phone}): ${err.message}`);
      failed++;
    }
  }

  const finalCount = await sql`SELECT COUNT(*) as c FROM customers`;
  console.log(`\n✅ Done: inserted=${inserted} skipped=${skipped} failed=${failed}`);
  console.log(`Total customers now: ${finalCount[0].c}`);
}

run().catch(console.error);
