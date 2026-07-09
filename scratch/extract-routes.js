const fs = require('fs');
const path = require('path');

const files = [
  { name: 'server/auth.ts', path: path.join(__dirname, '../server/auth.ts') },
  { name: 'server/routes.ts', path: path.join(__dirname, '../server/routes.ts') }
];

const routeRegex = /app\.(get|post|patch|put|delete)\(\s*['"`]([^'"`]+)['"`]/g;

console.log("# API Routes Documentation\n");
console.log("| Method | Endpoint | File | Line |");
console.log("| :--- | :--- | :--- | :--- |");

files.forEach(f => {
  if (!fs.existsSync(f.path)) {
    console.error(`File not found: ${f.path}`);
    return;
  }
  const content = fs.readFileSync(f.path, 'utf8');
  const lines = content.split('\n');
  
  lines.forEach((line, idx) => {
    let match;
    // reset regex state for reuse
    const regex = /app\.(get|post|patch|put|delete)\(\s*['"`]([^'"`]+)['"`]/i;
    if (match = regex.exec(line)) {
      const method = match[1].toUpperCase();
      const endpoint = match[2];
      const lineNum = idx + 1;
      console.log(`| **${method}** | \`${endpoint}\` | [${f.name}](file:///c:/Users/Admin/Downloads/yenscode/YensRewards/${f.name}#L${lineNum}) | L${lineNum} |`);
    }
  });
});
