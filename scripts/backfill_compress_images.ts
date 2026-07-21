import fs from 'fs';
import path from 'path';
import sharp from 'sharp';
import pg from 'pg';
import crypto from 'crypto';

const DATABASE_URL = process.env.DATABASE_URL || "postgresql://postgres:pSVJIsYkqvRmYbSVnpfSxrTfrGBhgaqY@tokaido.proxy.rlwy.net:29751/railway";
const TARGET_MAX_BYTES = 200 * 1024; // 200 KB target
const MIN_QUALITY = 50;

const UPLOAD_DIRS = [
  "/data/uploads/product-images",
  path.join(process.cwd(), "server", "assets"),
];

async function compressBufferToWebP(inputBuffer: Buffer): Promise<{ buffer: Buffer; quality: number }> {
  let quality = 80;
  let outputBuffer = await sharp(inputBuffer)
    .resize(1200, 1200, {
      fit: 'inside',
      withoutEnlargement: true,
    })
    .webp({ quality })
    .toBuffer();

  while (outputBuffer.length > TARGET_MAX_BYTES && quality > MIN_QUALITY) {
    quality -= 5;
    outputBuffer = await sharp(inputBuffer)
      .resize(1200, 1200, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .webp({ quality })
      .toBuffer();
  }

  return { buffer: outputBuffer, quality };
}

async function runBackfill() {
  console.log("🚀 Starting Product Image Backfill & WebP Compression...\n");

  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1") ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  let totalFilesChecked = 0;
  let totalFilesCompressed = 0;
  let totalBytesBefore = 0;
  let totalBytesAfter = 0;
  let dbRowsUpdated = 0;

  const urlReplacements: Map<string, string> = new Map();

  for (const dirPath of UPLOAD_DIRS) {
    if (!fs.existsSync(dirPath)) {
      console.log(`📁 Directory does not exist, skipping: ${dirPath}`);
      continue;
    }

    console.log(`📂 Scanning directory: ${dirPath}`);
    const files = fs.readdirSync(dirPath);

    for (const filename of files) {
      const filePath = path.join(dirPath, filename);
      const stat = fs.statSync(filePath);

      if (!stat.isFile()) continue;

      const ext = path.extname(filename).toLowerCase();
      const isWebP = ext === '.webp';
      const sizeBytes = stat.size;
      const sizeKB = (sizeBytes / 1024).toFixed(1);

      totalFilesChecked++;

      // Skip if already webp AND <= 200KB
      if (isWebP && sizeBytes <= TARGET_MAX_BYTES) {
        console.log(`  ⏭️  [OK] ${filename} is WebP and ${sizeKB}KB (<= 200KB)`);
        totalBytesBefore += sizeBytes;
        totalBytesAfter += sizeBytes;
        continue;
      }

      // Check if file is an image
      const isImageExt = ['.jpg', '.jpeg', '.png', '.webp', '.bmp', '.tiff'].includes(ext);
      if (!isImageExt) {
        continue;
      }

      try {
        console.log(`  🔄 [Compressing] ${filename} (${sizeKB}KB)...`);
        const fileBuffer = fs.readFileSync(filePath);
        const { buffer: compressedBuffer, quality } = await compressBufferToWebP(fileBuffer);
        const newSizeBytes = compressedBuffer.length;
        const newSizeKB = (newSizeBytes / 1024).toFixed(1);

        totalBytesBefore += sizeBytes;
        totalBytesAfter += newSizeBytes;

        // Generate new filename with .webp extension
        const baseName = path.basename(filename, ext);
        const newFilename = isWebP ? filename : `${baseName}.webp`;
        const newFilePath = path.join(dirPath, newFilename);

        // Write compressed WebP
        fs.writeFileSync(newFilePath, compressedBuffer);

        // Remove old file if format changed (e.g. .jpg -> .webp)
        if (!isWebP && filename !== newFilename) {
          fs.unlinkSync(filePath);
          console.log(`  🗑️  Deleted old file: ${filename}`);
        }

        totalFilesCompressed++;
        console.log(`  ✅ [Compressed] ${filename} -> ${newFilename} | ${sizeKB}KB -> ${newSizeKB}KB (Q: ${quality}%)`);

        // Record URL replacement for DB updates
        const oldUrlSubstring = filename;
        const newUrlSubstring = newFilename;
        urlReplacements.set(oldUrlSubstring, newUrlSubstring);

      } catch (err: any) {
        console.error(`  ❌ Failed to process ${filename}:`, err.message);
        totalBytesBefore += sizeBytes;
        totalBytesAfter += sizeBytes;
      }
    }
  }

  // Database URL Update Migration
  if (urlReplacements.size > 0) {
    console.log(`\n🗄️  Updating Database records for ${urlReplacements.size} renamed images...`);

    try {
      // 1. Update products table
      const productsRes = await pool.query('SELECT id, image_url FROM products WHERE image_url IS NOT NULL');
      for (const row of productsRes.rows) {
        let url = row.image_url as string;
        let updated = false;

        for (const [oldName, newName] of urlReplacements.entries()) {
          if (url.includes(oldName)) {
            url = url.replace(oldName, newName);
            updated = true;
          }
        }

        if (updated) {
          await pool.query('UPDATE products SET image_url = $1 WHERE id = $2', [url, row.id]);
          dbRowsUpdated++;
        }
      }

      // 2. Update customer_app_promotions table
      const promoRes = await pool.query('SELECT id, artwork_url FROM customer_app_promotions WHERE artwork_url IS NOT NULL');
      for (const row of promoRes.rows) {
        let url = row.artwork_url as string;
        let updated = false;

        for (const [oldName, newName] of urlReplacements.entries()) {
          if (url.includes(oldName)) {
            url = url.replace(oldName, newName);
            updated = true;
          }
        }

        if (updated) {
          await pool.query('UPDATE customer_app_promotions SET artwork_url = $1 WHERE id = $2', [url, row.id]);
          dbRowsUpdated++;
        }
      }

      // 3. Update weekly_specials table
      const weeklyRes = await pool.query('SELECT id, image_url FROM weekly_specials WHERE image_url IS NOT NULL');
      for (const row of weeklyRes.rows) {
        let url = row.image_url as string;
        let updated = false;

        for (const [oldName, newName] of urlReplacements.entries()) {
          if (url.includes(oldName)) {
            url = url.replace(oldName, newName);
            updated = true;
          }
        }

        if (updated) {
          await pool.query('UPDATE weekly_specials SET image_url = $1 WHERE id = $2', [url, row.id]);
          dbRowsUpdated++;
        }
      }

    } catch (dbErr: any) {
      console.error("❌ Database update error during backfill:", dbErr.message);
    }
  }

  const savedBytes = totalBytesBefore - totalBytesAfter;
  const savedMB = (savedBytes / (1024 * 1024)).toFixed(2);
  const beforeMB = (totalBytesBefore / (1024 * 1024)).toFixed(2);
  const afterMB = (totalBytesAfter / (1024 * 1024)).toFixed(2);
  const percentReduction = totalBytesBefore > 0 ? ((savedBytes / totalBytesBefore) * 100).toFixed(1) : "0";

  console.log('\n========================================');
  console.log('🎉 BACKFILL & COMPRESSION COMPLETE:');
  console.log(`   - Total Files Checked: ${totalFilesChecked}`);
  console.log(`   - Total Files Compressed: ${totalFilesCompressed}`);
  console.log(`   - Size Before: ${beforeMB} MB`);
  console.log(`   - Size After: ${afterMB} MB`);
  console.log(`   - Storage Saved: ${savedMB} MB (${percentReduction}% reduction)`);
  console.log(`   - Database Rows Updated: ${dbRowsUpdated}`);
  console.log('========================================\n');

  await pool.end();
}

runBackfill();
