#!/usr/bin/env tsx

/**
 * Birthday Data Migration Script
 * 
 * This script normalizes all existing customer birthdays to the canonical MM-DD format.
 * It handles:
 * - DD/MM/YYYY format (Thai format with /)
 * - YYYY-MM-DD format (ISO format with -)
 * - MM-DD format (already normalized)
 * - Thai Buddhist Era (B.E.) years (converts to Gregorian)
 * - Invalid or future dates (sets to null)
 */

import { db } from "../server/db";
import { customers } from "../shared/schema";
import { eq } from "drizzle-orm";

function normalizeBirthday(birthday: string | null): string | null {
  if (!birthday || !birthday.trim()) {
    return null;
  }

  try {
    const birthdayStr = birthday.trim();
    let month: number;
    let day: number;
    let year: number | null = null;

    // Handle DD/MM/YYYY format (Thai format with /)
    if (birthdayStr.includes('/')) {
      const parts = birthdayStr.split('/');
      if (parts.length === 3) {
        day = parseInt(parts[0]);
        month = parseInt(parts[1]);
        year = parseInt(parts[2]);
      } else {
        throw new Error(`Invalid birthday format: ${birthdayStr}`);
      }
    }
    // Handle MM-DD or YYYY-MM-DD format (with -)
    else if (birthdayStr.includes('-')) {
      const parts = birthdayStr.split('-');
      if (parts.length === 2) {
        // MM-DD format - already normalized
        month = parseInt(parts[0]);
        day = parseInt(parts[1]);
      } else if (parts.length === 3) {
        // YYYY-MM-DD format
        year = parseInt(parts[0]);
        month = parseInt(parts[1]);
        day = parseInt(parts[2]);
      } else {
        throw new Error(`Invalid birthday format: ${birthdayStr}`);
      }
    } else {
      throw new Error(`Invalid birthday format: ${birthdayStr}`);
    }

    // Validate month and day ranges
    if (isNaN(month) || isNaN(day) || month < 1 || month > 12 || day < 1 || day > 31) {
      throw new Error(`Invalid month/day values: ${birthdayStr}`);
    }

    // Handle Thai Buddhist Era (B.E.) years - convert to Gregorian
    const currentYear = new Date().getFullYear();
    if (year !== null && !isNaN(year) && year > currentYear + 100) {
      // Likely Buddhist Era year (B.E. = C.E. + 543)
      console.log(`  Converting B.E. year ${year} to Gregorian ${year - 543}`);
      year = year - 543;
    }

    // Filter out future dates (invalid birthdays from CSV import errors)
    if (year !== null && !isNaN(year)) {
      const birthDate = new Date(year, month - 1, day);
      const today = new Date();
      if (birthDate > today) {
        throw new Error(`Birthday cannot be in the future: ${birthdayStr}`);
      }
    }

    // Normalize to MM-DD format (zero-padded)
    const monthStr = month.toString().padStart(2, '0');
    const dayStr = day.toString().padStart(2, '0');
    return `${monthStr}-${dayStr}`;
  } catch (e: any) {
    console.warn(`  ❌ Invalid birthday: ${birthday} - ${e.message}`);
    return null; // Invalid birthday - will be set to null
  }
}

async function migrateBirthdays() {
  console.log('🎂 Starting Birthday Data Migration...\n');

  try {
    // Fetch all customers with birthdays
    const allCustomers = await db.select().from(customers);
    const customersWithBirthdays = allCustomers.filter(c => c.birthday);

    console.log(`📊 Found ${customersWithBirthdays.length} customers with birthdays\n`);

    let normalized = 0;
    let invalidated = 0;
    let alreadyNormalized = 0;

    for (const customer of customersWithBirthdays) {
      const original = customer.birthday;
      const normalized_birthday = normalizeBirthday(original);

      if (normalized_birthday === original) {
        // Already in MM-DD format
        alreadyNormalized++;
        console.log(`  ✓ ${customer.name} (${customer.phone}): Already normalized (${original})`);
      } else if (normalized_birthday === null) {
        // Invalid birthday - set to null
        await db.update(customers)
          .set({ birthday: null })
          .where(eq(customers.id, customer.id));
        invalidated++;
        console.log(`  ⚠️  ${customer.name} (${customer.phone}): Invalidated "${original}" → null`);
      } else {
        // Normalized successfully
        await db.update(customers)
          .set({ birthday: normalized_birthday })
          .where(eq(customers.id, customer.id));
        normalized++;
        console.log(`  ✅ ${customer.name} (${customer.phone}): "${original}" → "${normalized_birthday}"`);
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`  ✅ Normalized: ${normalized}`);
    console.log(`  ✓ Already correct: ${alreadyNormalized}`);
    console.log(`  ⚠️  Invalidated (set to null): ${invalidated}`);
    console.log(`  📊 Total processed: ${customersWithBirthdays.length}`);
    console.log('\n✨ Birthday migration complete!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateBirthdays();
