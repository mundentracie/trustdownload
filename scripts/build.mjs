// Build script: bundle background.js + popup.js (each is a single IIFE, no external
// imports) so the "zero network requests" guarantee holds by construction.
// Copy manifest, css, popup.html, icons into dist/.
import { build } from 'esbuild';
import { copyFileSync, mkdirSync, existsSync } from 'fs';

mkdirSync('dist/src', { recursive: true });

for (const entry of ['src/background.js', 'src/popup.js']) {
  await build({
    entryPoints: [entry],
    bundle: true,
    outfile: `dist/${entry}`,
    format: 'iife',
    minify: false,
  });
}

copyFileSync('src/popup.html', 'dist/src/popup.html');
copyFileSync('src/popup.css', 'dist/src/popup.css');
copyFileSync('manifest.json', 'dist/manifest.json');

if (existsSync('src/icons/icon128.png')) {
  mkdirSync('dist/icons', { recursive: true });
  copyFileSync('src/icons/icon128.png', 'dist/icons/icon128.png');
}

console.log('built -> dist/ (load-unpacked ready)');
