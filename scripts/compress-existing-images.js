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

async function compressBufferToWebP(inputBuffer) {
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
  console.log("==========================================");
  console.log("🚀 Starting Existing Images Compression & Backfill Script...");
  console.log("==========================================\n");

  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: DATABASE_URL.includes("localhost") || DATABASE_URL.includes("127.0.0.1") ? false : { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  let totalImagesFound = 0;
  let processedCount = 0;
  let skippedCount = 0;
  let failedCount = 0;
  let totalBytesBefore = 0;
  let totalBytesAfter = 0;

  try {
    // 1. Query DB for all products with non-empty image_url
    const productsRes = await pool.query('SELECT id, name, image_url FROM products WHERE image_url IS NOT NULL AND image_url != \'\'');
    totalImagesFound = productsRes.rows.length;
    console.log(`📦 Found ${totalImagesFound} products with image_url records in database.\n`);

    for (let i = 0; i < productsRes.rows.length; i++) {
      const product = productsRes.rows[i];
      const origUrl = product.image_url.trim();

      // Extract filename from URL
      let filename = "";
      try {
        if (origUrl.startsWith("http")) {
          const parsed = new URL(origUrl);
          filename = path.basename(parsed.pathname);
        } else {
          filename = path.basename(origUrl);
        }
        // Decode URI component if percent-encoded
        filename = decodeURIComponent(filename);
      } catch (_) {
        filename = path.basename(origUrl);
      }

      if (!filename) {
        console.log(`[${i + 1}/${totalImagesFound}] ⚠️ Skipping product "${product.name}": Invalid URL "${origUrl}"`);
        skippedCount++;
        continue;
      }

      // Locate file on disk across upload directories
      let foundFilePath = null;
      let foundDir = null;

      for (const dirPath of UPLOAD_DIRS) {
        if (!fs.existsSync(dirPath)) continue;
        
        // 1) Direct file check
        const candidate = path.join(dirPath, filename);
        if (fs.existsSync(candidate)) {
          foundFilePath = candidate;
          foundDir = dirPath;
          break;
        }

        // 2) UUID prefix match fallback
        const uuidPrefix = filename.split('-')[0];
        if (uuidPrefix && uuidPrefix.length >= 8) {
          try {
            const files = fs.readdirSync(dirPath);
            const match = files.find(f => f.startsWith(uuidPrefix));
            if (match) {
              foundFilePath = path.join(dirPath, match);
              foundDir = dirPath;
              filename = match;
              break;
            }
          } catch (_) {}
        }
      }

      if (!foundFilePath || !fs.existsSync(foundFilePath)) {
        console.log(`[${i + 1}/${totalImagesFound}] ⚠️ Skipped "${product.name}": Local file not found on disk (${filename})`);
        skippedCount++;
        continue;
      }

      const stat = fs.statSync(foundFilePath);
      const ext = path.extname(filename).toLowerCase();
      const isWebP = ext === '.webp';
      const sizeBytes = stat.size;
      const sizeKB = (sizeBytes / 1024).toFixed(1);

      totalBytesBefore += sizeBytes;

      // 2. IDEMPOTENT CHECK: If already WebP and <= 200KB, skip!
      if (isWebP && sizeBytes <= TARGET_MAX_BYTES) {
        console.log(`[${i + 1}/${totalImagesFound}] ⏭️  Skipped "${product.name}": Already WebP (${sizeKB}KB <= 200KB)`);
        totalBytesAfter += sizeBytes;
        skippedCount++;
        continue;
      }

      // 3. Compress & convert using sharp
      try {
        console.log(`[${i + 1}/${totalImagesFound}] 🔄 Processing "${product.name}" (${sizeKB}KB)...`);
        const fileBuffer = fs.readFileSync(foundFilePath);
        const { buffer: compressedBuffer, quality } = await compressBufferToWebP(fileBuffer);
        
        const newSizeBytes = compressedBuffer.length;
        const newSizeKB = (newSizeBytes / 1024).toFixed(1);

        // Validation check: Non-zero size & valid buffer
        if (!compressedBuffer || newSizeBytes === 0) {
          throw new Error("Compressed buffer is empty or 0 bytes.");
        }

        // Generate new unique .webp filename
        const newFilename = `${crypto.randomUUID()}.webp`;
        const newFilePath = path.join(foundDir, newFilename);

        // Save new compressed file
        fs.writeFileSync(newFilePath, compressedBuffer);

        // Verify written file is readable & non-empty
        const newStat = fs.statSync(newFilePath);
        if (newStat.size === 0) {
          throw new Error("Written WebP file on disk is 0 bytes.");
        }

        // Generate public URL for database
        const baseUrl = origUrl.startsWith("http")
          ? origUrl.substring(0, origUrl.indexOf("/uploads/product-images"))
          : "";
        const newPublicUrl = `${baseUrl}/uploads/product-images/${newFilename}`;

        // Update database record
        await pool.query('UPDATE products SET image_url = $1 WHERE id = $2', [newPublicUrl, product.id]);

        // Delete old original file ONLY AFTER successful DB update
        if (foundFilePath !== newFilePath && fs.existsSync(foundFilePath)) {
          fs.unlinkSync(foundFilePath);
          console.log(`   🗑️  Deleted old original file: ${path.basename(foundFilePath)}`);
        }

        totalBytesAfter += newSizeBytes;
        processedCount++;
        console.log(`   ✅ Successfully compressed & updated "${product.name}" | ${sizeKB}KB -> ${newSizeKB}KB (Quality: ${quality}%)`);

      } catch (err) {
        console.error(`   ❌ Failed to process "${product.name}": ${err.message}`);
        totalBytesAfter += sizeBytes;
        failedCount++;
      }
    }

  } catch (dbErr) {
    console.error("❌ Fatal Database error during backfill:", dbErr.message);
  } finally {
    const savedBytes = totalBytesBefore - totalBytesAfter;
    const savedMB = (savedBytes / (1024 * 1024)).toFixed(2);
    const beforeMB = (totalBytesBefore / (1024 * 1024)).toFixed(2);
    const afterMB = (totalBytesAfter / (1024 * 1024)).toFixed(2);
    const percentReduction = totalBytesBefore > 0 ? ((savedBytes / totalBytesBefore) * 100).toFixed(1) : "0";

    console.log('\n========================================');
    console.log('🎉 BACKFILL & COMPRESSION SUMMARY:');
    console.log(`   - Total Images Found in DB: ${totalImagesFound}`);
    console.log(`   - Processed & Converted:    ${processedCount}`);
    console.log(`   - Skipped (Already WebP/Small): ${skippedCount}`);
    console.log(`   - Failed:                   ${failedCount}`);
    console.log(`   - Storage Before:           ${beforeMB} MB`);
    console.log(`   - Storage After:            ${afterMB} MB`);
    console.log(`   - Total Space Saved:        ${savedMB} MB (${percentReduction}% reduction)`);
    console.log('========================================\n');

    await pool.end();
  }
}

runBackfill();
