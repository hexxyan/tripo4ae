import { readFileSync, writeFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const manifestPath = resolve(here, '..', 'dist', 'cep', 'CSXS', 'manifest.xml');

const before = readFileSync(manifestPath, 'utf8');
const after = before.replace(/\s*<Icons>[\s\S]*?<\/Icons>\s*/g, '\n        ');

if (before === after) {
  console.log('[sanitize-manifest] No <Icons> block found, nothing to do.');
  process.exit(0);
}

writeFileSync(manifestPath, after);
console.log('[sanitize-manifest] Stripped <Icons> block from manifest.xml');
