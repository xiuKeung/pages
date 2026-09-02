import { copyFile, cp, mkdir, rm } from 'node:fs/promises';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';

const appRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const webSourceRoot = resolve(appRoot, '..');
const outputDir = join(appRoot, 'www');
const bundleDir = join(appRoot, 'dist');
const websiteSharedDir = join(webSourceRoot, 'shared');
const siteDirectories = ['entrance', 'school', 'calculator', 'viewings', 'checklist'];
const bundles = ['native-store', 'checklist-page', 'backup-page'];
const sharedStaticFiles = ['theme.css', 'theme.js', 'mobile-inputs.css'];

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
await rm(websiteSharedDir, { recursive: true, force: true });
await cp(bundleDir, websiteSharedDir, { recursive: true });
await Promise.all(sharedStaticFiles.map(name => copyFile(join(appRoot, 'src', name), join(websiteSharedDir, name))));
await rm(outputDir, { recursive: true, force: true });
await mkdir(outputDir, { recursive: true });
await cp(join(appRoot, 'index.html'), join(outputDir, 'index.html'));
await cp(bundleDir, join(outputDir, 'shared'), { recursive: true });
await Promise.all(sharedStaticFiles.map(name => copyFile(join(appRoot, 'src', name), join(outputDir, 'shared', name))));

for (const directory of siteDirectories) {
  await cp(join(webSourceRoot, directory), join(outputDir, directory), { recursive: true });
}

console.log(`Bundled ${bundles.length} shared scripts for the website and copied ${siteDirectories.length} pages to ${outputDir}`);
