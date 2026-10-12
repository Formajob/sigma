// Extrait le <script> applicatif principal (sans src) d'une page HTML
// et génère scripts/app-shared.js à partir d'americana-dashboard.html.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

// Chemin absolu du projet (c:\Users\User18\Desktop\SIGMA\sigma)
const ROOT = path.resolve(fileURLToPath(import.meta.url), '..', '..');
const srcPath = path.join(ROOT, 'americana-dashboard.html');
if (!fs.existsSync(srcPath)) {
  console.error('ERREUR: fichier introuvable :', srcPath);
  process.exit(1);
}
const src = fs.readFileSync(srcPath, 'utf8');

// Capture tous les <script> inline (sans attribut src) et filtre les briques
// système : définition de la page (__SIGMA_PAGE) et Cloudflare Analytics.
const inlineRe = /<script(?![^>]*\bsrc\b)[^>]*>([\s\S]*?)<\/script>/g;
const blocks = [];
for (let m = inlineRe.exec(src); m !== null; m = inlineRe.exec(src)) {
  const content = m[1];
  // Ignorer le script de routeur de page
  if (/window\.__SIGMA_PAGE/.test(content)) continue;
  // Ignorer Cloudflare Analytics
  if (/__CF\$cv\$params/.test(content)) continue;
  blocks.push(content);
}
if (!blocks.length) { console.error('aucun script applicatif inline trouvé'); process.exit(1); }
const main = blocks[blocks.length - 1]; // le script applicatif (dernier reste)

fs.writeFileSync(path.join(ROOT, 'scripts', 'app-shared.js'),
  '/* ============================================================\n' +
  '   SIGMA — logique applicative partagée (générée depuis americana-dashboard.html)\n' +
  '   NE PAS ÉDITER À LA MAIN : source = americana-dashboard.html, tâche : npm run pages\n' +
  '   ============================================================ */\n' + main, 'utf8');
console.log('app-shared.js :', main.length, 'caractères');
