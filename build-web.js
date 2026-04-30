const fs = require('fs');
const path = require('path');

const root = __dirname;
const outDir = path.join(root, 'www');
const files = [
  'index.html',
  'style.css',
  'app.js',
  'data.js',
  'manifest.json',
  'icon-192.png',
  'icon-512.png',
];

fs.rmSync(outDir, { recursive: true, force: true });
fs.mkdirSync(outDir, { recursive: true });

for (const file of files) {
  const source = path.join(root, file);
  if (!fs.existsSync(source)) continue;
  
  const dest = path.join(outDir, file);
  const destDir = path.dirname(dest);
  if (!fs.existsSync(destDir)) fs.mkdirSync(destDir, { recursive: true });
  
  fs.copyFileSync(source, dest);
}

// Copiar Logo U&M especificamente se não estiver na lista
const logoPath = 'FORM_117 (1).xlsx~1/resources/image_1069608006_0.jpg';
const logoSource = path.join(root, logoPath);
if (fs.existsSync(logoSource)) {
  const logoDest = path.join(outDir, logoPath);
  const logoDestDir = path.dirname(logoDest);
  if (!fs.existsSync(logoDestDir)) fs.mkdirSync(logoDestDir, { recursive: true });
  fs.copyFileSync(logoSource, logoDest);
}

console.log(`Arquivos web copiados para ${outDir}`);
