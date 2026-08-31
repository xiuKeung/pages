import { cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const webSourceRoot = resolve(appRoot, '..');
const outputDir = join(appRoot, 'www');
const siteDirectories = ['entrance', 'school', 'calculator', 'viewings', 'checklist'];

await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(join(appRoot, 'index.html'), join(outputDir, 'index.html'));

for (const directory of siteDirectories) {
  await cp(join(webSourceRoot, directory), join(outputDir, directory), { recursive: true });
}

console.log(`Copied ${siteDirectories.length} static page directories to ${outputDir}`);
