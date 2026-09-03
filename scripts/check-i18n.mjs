import fs from 'node:fs';
import path from 'node:path';

const roots = [
  'src/app/(app)',
  'src/app/(auth)',
  'src/app/(marketing)',
  'src/components',
];

const extensions = new Set(['.tsx', '.ts']);
const ignore = [
  'node_modules',
  'generated',
  'src/components/ui',
  'src/data/ai-tools.ts',
  'src/lib/product-messages.ts',
  'src/lib/i18n.ts',
];

const suspicious = /\b(Settings|Save|Cancel|Delete|Create|Search|Profile|Security|Billing|Notifications|Support|Files|History|Favorites|Loading|Error|Success|Submit|Back|Next|Previous|Dashboard|Workspace)\b/g;

const hits = [];

function walk(current) {
  if (!fs.existsSync(current)) return;

  for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
    const full = path.join(current, entry.name);
    const normalized = full.replaceAll('\\', '/');

    if (ignore.some((item) => normalized.includes(item))) continue;

    if (entry.isDirectory()) {
      walk(full);
      continue;
    }

    if (!extensions.has(path.extname(entry.name))) continue;

    const content = fs.readFileSync(full, 'utf8');
    const lines = content.split('\n');

    lines.forEach((line, index) => {
      const matches = [...line.matchAll(suspicious)];
      if (!matches.length) return;

      if (
        line.includes('import ') ||
        line.includes('export ') ||
        line.includes('type ') ||
        line.includes('interface ')
      ) return;

      hits.push({
        file: normalized,
        line: index + 1,
        words: [...new Set(matches.map((match) => match[0]))].join(', '),
      });
    });
  }
}

roots.forEach(walk);

if (!hits.length) {
  console.log('✓ i18n guard: no obvious untranslated UI strings found.');
  process.exit(0);
}

console.log(`i18n guard: ${hits.length} possible untranslated UI lines found.`);
console.log('This is a reporting guard for V5 foundation; it does not fail the build yet.\n');

hits.slice(0, 120).forEach((hit) => {
  console.log(`${hit.file}:${hit.line}  [${hit.words}]`);
});

if (hits.length > 120) {
  console.log(`\n...and ${hits.length - 120} more.`);
}
