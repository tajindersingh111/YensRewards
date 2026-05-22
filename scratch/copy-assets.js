const fs = require('fs');
const path = require('path');

const srcDir = path.resolve(__dirname, '..', 'attached_assets');
const clientAssetsDest = path.resolve(__dirname, '..', 'client', 'src', 'assets');
const serverAssetsDest = path.resolve(__dirname, '..', 'server', 'assets');

// List of copies
const copies = [
  // Client assets
  {
    src: path.join(srcDir, 'yens logo_1760702216221.png'),
    dest: path.join(clientAssetsDest, 'yens logo_1760702216221.png')
  },
  {
    src: path.join(srcDir, 'Yens_logo_high_res_1766925576641.png'),
    dest: path.join(clientAssetsDest, 'Yens_logo_high_res_1766925576641.png')
  },
  {
    src: path.join(srcDir, 'Screenshot_2026-01-27_at_22.41.34_1769521341373.png'),
    dest: path.join(clientAssetsDest, 'Screenshot_2026-01-27_at_22.41.34_1769521341373.png')
  },
  {
    src: path.join(srcDir, 'generated_images', 'Option_1_Instagram_Grid_807fc242.png'),
    dest: path.join(clientAssetsDest, 'generated_images', 'Option_1_Instagram_Grid_807fc242.png')
  },
  {
    src: path.join(srcDir, 'generated_images', 'Option_2_Blog_Cards_b1406940.png'),
    dest: path.join(clientAssetsDest, 'generated_images', 'Option_2_Blog_Cards_b1406940.png')
  },
  {
    src: path.join(srcDir, 'generated_images', 'Option_3_Masonry_Grid_97e234ed.png'),
    dest: path.join(clientAssetsDest, 'generated_images', 'Option_3_Masonry_Grid_97e234ed.png')
  },
  // Server assets
  {
    src: path.join(srcDir, 'Yens_logo_high_res_1766925576641.png'),
    dest: path.join(serverAssetsDest, 'Yens_logo_high_res_1766925576641.png')
  },
  {
    src: path.join(srcDir, 'WhatsApp_Image_2026-01-20_at_12.12.50_1768965601005.jpeg'),
    dest: path.join(serverAssetsDest, 'WhatsApp_Image_2026-01-20_at_12.12.50_1768965601005.jpeg')
  },
  {
    src: path.join(srcDir, 'member-active-2026-01-16_1768629832619.csv'),
    dest: path.join(serverAssetsDest, 'member-active-2026-01-16_1768629832619.csv')
  }
];

function ensureDirectoryExistence(filePath) {
  const dirname = path.dirname(filePath);
  if (fs.existsSync(dirname)) {
    return true;
  }
  ensureDirectoryExistence(dirname);
  fs.mkdirSync(dirname);
}

console.log('Starting assets copy operation...');
let successCount = 0;
let failCount = 0;

for (const item of copies) {
  try {
    if (fs.existsSync(item.src)) {
      ensureDirectoryExistence(item.dest);
      fs.copyFileSync(item.src, item.dest);
      console.log(`Copied: ${path.relative(path.join(__dirname, '..'), item.src)} -> ${path.relative(path.join(__dirname, '..'), item.dest)}`);
      successCount++;
    } else {
      console.warn(`Source not found: ${path.relative(path.join(__dirname, '..'), item.src)}`);
      failCount++;
    }
  } catch (err) {
    console.error(`Error copying ${item.src} to ${item.dest}:`, err);
    failCount++;
  }
}

console.log(`Copy operation finished. Success: ${successCount}, Failures/Skips: ${failCount}`);
