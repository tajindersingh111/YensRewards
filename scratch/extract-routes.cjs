const fs = require('fs');
const path = require('path');

const files = [
  { name: 'server/auth.ts', path: path.join(__dirname, '../server/auth.ts') },
  { name: 'server/routes.ts', path: path.join(__dirname, '../server/routes.ts') }
];

const outputPath = "C:/Users/Admin/.gemini/antigravity-ide/brain/2d551978-8c3f-4df2-ab9d-f214a20a476b/api_routes_documentation.md";

let mdContent = `# YensRewards: Complete API Routes Reference

This document lists all the API endpoints defined in the YensRewards server application.

---

## Auth & Account Routes (server/auth.ts)

| Method | Endpoint | Line Number |
| :--- | :--- | :--- |
`;

// Parse server/auth.ts first
const authFile = files[0];
if (fs.existsSync(authFile.path)) {
  const content = fs.readFileSync(authFile.path, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    let match;
    const regex = /app\.(get|post|patch|put|delete)\(\s*['"`]([^'"`]+)['"`]/i;
    if (match = regex.exec(line)) {
      const method = match[1].toUpperCase();
      const endpoint = match[2];
      const lineNum = idx + 1;
      mdContent += `| **${method}** | \`${endpoint}\` | [Line ${lineNum}](file:///c:/Users/Admin/Downloads/yenscode/YensRewards/${authFile.name}#L${lineNum}) |\n`;
    }
  });
}

mdContent += `
---

## Application & Administration Routes (server/routes.ts)

| Method | Endpoint | Line Number |
| :--- | :--- | :--- |
`;

// Parse server/routes.ts next
const routesFile = files[1];
if (fs.existsSync(routesFile.path)) {
  const content = fs.readFileSync(routesFile.path, 'utf8');
  const lines = content.split('\n');
  lines.forEach((line, idx) => {
    let match;
    const regex = /app\.(get|post|patch|put|delete)\(\s*['"`]([^'"`]+)['"`]/i;
    if (match = regex.exec(line)) {
      const method = match[1].toUpperCase();
      const endpoint = match[2];
      const lineNum = idx + 1;
      mdContent += `| **${method}** | \`${endpoint}\` | [Line ${lineNum}](file:///c:/Users/Admin/Downloads/yenscode/YensRewards/${routesFile.name}#L${lineNum}) |\n`;
    }
  });
}

fs.writeFileSync(outputPath, mdContent, 'utf8');
console.log(`Successfully generated documentation at: ${outputPath}`);
