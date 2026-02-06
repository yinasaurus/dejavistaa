// Build script to copy manifest.json and icons to dist
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync, readdirSync, statSync, renameSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Copy manifest.json to dist
const distDir = resolve(__dirname, 'dist');
if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

const manifestPath = resolve(__dirname, 'src/manifest.json');
const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8'));

writeFileSync(
  resolve(distDir, 'manifest.json'),
  JSON.stringify(manifest, null, 2)
);

// Move sidepanel.html to root of dist (manifest expects it there)
const sidepanelHtmlSrc = resolve(distDir, 'src/sidepanel/sidepanel.html');
const sidepanelHtmlDest = resolve(distDir, 'sidepanel.html');
if (existsSync(sidepanelHtmlSrc)) {
  copyFileSync(sidepanelHtmlSrc, sidepanelHtmlDest);
  console.log('✓ sidepanel.html moved to dist/');
}

// Copy icons if they exist
const publicIconsDir = resolve(__dirname, 'public/icons');
const distIconsDir = resolve(distDir, 'icons');

if (existsSync(publicIconsDir)) {
  if (!existsSync(distIconsDir)) {
    mkdirSync(distIconsDir, { recursive: true });
  }
  
  const files = readdirSync(publicIconsDir);
  files.forEach(file => {
    if (file.endsWith('.png')) {
      copyFileSync(
        join(publicIconsDir, file),
        join(distIconsDir, file)
      );
    }
  });
  console.log('✓ Icons copied to dist/icons/');
} else {
  console.warn('⚠ Icons directory not found. Extension will work but may show default icon.');
  console.warn('  Create PNG files at: public/icons/icon16.png, icon32.png, icon48.png, icon128.png');
}

console.log('✓ Manifest copied to dist/');
