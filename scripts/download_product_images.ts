import fs from 'fs';
import path from 'path';
import https from 'https';
import http from 'http';
import pg from 'pg';

const DATABASE_URL = "postgresql://postgres:pSVJIsYkqvRmYbSVnpfSxrTfrGBhgaqY@tokaido.proxy.rlwy.net:29751/railway";
const OUTPUT_DIR = path.join(process.env.USERPROFILE || 'C:\\Users\\Admin', 'Downloads', 'yens_downloaded_product_images');
const PUBLIC_BASE_URL = 'https://application.yensthai.com';

if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

function downloadFile(url: string, destPath: string): Promise<boolean> {
  return new Promise((resolve) => {
    // Encode spaces and Thai characters properly
    let finalUrl = url;
    try {
      finalUrl = encodeURI(decodeURIComponent(url));
    } catch (_) {
      finalUrl = encodeURI(url);
    }

    const isHttps = finalUrl.startsWith('https');
    const client = isHttps ? https : http;

    const request = client.get(finalUrl, (response) => {
      if (response.statusCode && response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
        let redirectUrl = response.headers.location;
        if (!redirectUrl.startsWith('http')) {
          redirectUrl = new URL(redirectUrl, finalUrl).toString();
        }
        return downloadFile(redirectUrl, destPath).then(resolve);
      }

      if (response.statusCode !== 200) {
        console.error(`❌ Status ${response.statusCode} for URL: ${finalUrl}`);
        resolve(false);
        return;
      }

      const fileStream = fs.createWriteStream(destPath);
      response.pipe(fileStream);

      fileStream.on('finish', () => {
        fileStream.close();
        resolve(true);
      });

      fileStream.on('error', (err) => {
        console.error(`❌ File stream error for ${destPath}: ${err.message}`);
        fs.unlink(destPath, () => {});
        resolve(false);
      });
    });

    request.on('error', (err) => {
      console.error(`❌ Request error for ${url}: ${err.message}`);
      resolve(false);
    });

    request.setTimeout(15000, () => {
      request.destroy();
      console.error(`❌ Request timeout for ${url}`);
      resolve(false);
    });
  });
}

async function run() {
  console.log("🔌 Connecting to Railway PostgreSQL Database...");
  const pool = new pg.Pool({
    connectionString: DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 10000,
  });

  try {
    const res = await pool.query('SELECT id, product_code, name, category, image_url FROM products ORDER BY name ASC');
    console.log(`📦 Found ${res.rows.length} total products in Railway Database.\n`);

    let downloadedCount = 0;
    let skippedCount = 0;
    let failedCount = 0;

    for (let i = 0; i < res.rows.length; i++) {
      const row = res.rows[i];
      let imgUrl = row.image_url ? row.image_url.trim() : '';
      const name = row.name || 'product';
      const code = row.product_code || `prod_${i + 1}`;

      if (!imgUrl) {
        console.log(`[${i + 1}/${res.rows.length}] ⚠️ No image URL for product "${name}" (${code})`);
        skippedCount++;
        continue;
      }

      if (!imgUrl.startsWith('http')) {
        if (!imgUrl.startsWith('/')) {
          imgUrl = '/' + imgUrl;
        }
        imgUrl = `${PUBLIC_BASE_URL}${imgUrl}`;
      }

      let ext = '.png';
      const cleanUrl = imgUrl.split('?')[0];
      if (cleanUrl.endsWith('.jpg') || cleanUrl.endsWith('.jpeg')) ext = '.jpg';
      else if (cleanUrl.endsWith('.webp')) ext = '.webp';
      else if (cleanUrl.endsWith('.png')) ext = '.png';

      const sanitizedName = name.replace(/[/\\?%*:|"<>]/g, '_').substring(0, 40);
      const filename = `${code}_${sanitizedName}${ext}`;
      const destPath = path.join(OUTPUT_DIR, filename);

      console.log(`[${i + 1}/${res.rows.length}] 📥 Downloading "${name}"...`);
      const success = await downloadFile(imgUrl, destPath);
      if (success) {
        downloadedCount++;
        console.log(`   ✅ Saved: ${filename}`);
      } else {
        failedCount++;
      }
    }

    console.log('\n========================================');
    console.log(`🎉 ALL PRODUCTS DOWNLOAD COMPLETE:`);
    console.log(`   - Total Products in DB: ${res.rows.length}`);
    console.log(`   - Successfully Downloaded: ${downloadedCount}`);
    console.log(`   - Skipped (No URL): ${skippedCount}`);
    console.log(`   - Failed: ${failedCount}`);
    console.log(`📁 Download Folder: ${OUTPUT_DIR}`);
    console.log('========================================\n');

  } catch (err: any) {
    console.error("❌ Database query error:", err);
  } finally {
    await pool.end();
  }
}

run();
