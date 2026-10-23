import { copyFileSync } from 'node:fs';

const folder = 'dist/yes-for-two/browser';

copyFileSync(`${folder}/index.html`, `${folder}/404.html`);

console.log('404.html created for GitHub Pages.');
