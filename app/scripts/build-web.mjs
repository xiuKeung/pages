import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const webSourceRoot = resolve(appRoot, '..');
const outputDir = join(appRoot, 'www');
const bundleDir = join(appRoot, 'dist');
const siteDirectories = ['entrance', 'school', 'calculator', 'viewings', 'checklist'];
const bundles = ['native-store', 'checklist-page', 'backup-page'];

await rm(bundleDir, { recursive: true, force: true });
await mkdir(bundleDir, { recursive: true });
await build({
  entryPoints: bundles.map(name => join(appRoot, 'src', `${name}.js`)),
  outdir: bundleDir,
  bundle: true,
  format: 'iife',
  target: ['es2020'],
  minify: false
});
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(join(appRoot, 'index.html'), join(outputDir, 'index.html'));
await cp(bundleDir, join(outputDir, 'shared'), { recursive: true });

for (const directory of siteDirectories) {
  await cp(join(webSourceRoot, directory), join(outputDir, directory), { recursive: true });
}

for (const page of ['checklist', 'calculator', 'school', 'viewings']) {
  const pagePath = join(outputDir, page, 'index.html');
  const pageHtml = await readFile(pagePath, 'utf8');
  await writeFile(
    pagePath,
    pageHtml
      .replaceAll('../app/dist/native-store.js', '../shared/native-store.js')
      .replaceAll('../app/dist/checklist-page.js', '../shared/checklist-page.js')
      .replaceAll('../app/dist/backup-page.js', '../shared/backup-page.js')
  );
}

console.log(`Bundled ${bundles.length} native scripts and copied ${siteDirectories.length} static page directories to ${outputDir}`);
