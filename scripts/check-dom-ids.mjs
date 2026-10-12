// Validation DOM réelle (jsdom) : tous les ids référencés par le script applicatif
// doivent survivre au parsing HTML de chaque page générée.
import fs from 'node:fs';

let JSDOM;
try {
  ({ JSDOM } = await import('jsdom'));
} catch {
  console.log('jsdom non installé : validation DOM ignorée (npm install --no-save jsdom)');
  process.exit(0);
}

const SRC = fs.readFileSync(new URL('../americana-dashboard.html', import.meta.url), 'utf8');
const PAGES = ['dashboard', 'calendrier', 'activite', 'rapports', 'equipe', 'configuration', 'administration'];

const ids = new Set();
for (const m of SRC.matchAll(/\$\('#([a-zA-Z0-9_-]+)'\)/g)) ids.add(m[1]);
for (const m of SRC.matchAll(/getElementById\(["']([a-zA-Z0-9_-]+)["']\)/g)) ids.add(m[1]);

let ok = true;
for (const p of PAGES) {
  const html = fs.readFileSync(new URL('../' + p + '.html', import.meta.url), 'utf8');
  const dom = new JSDOM(html);
  const missing = [...ids].filter(id => !dom.window.document.getElementById(id));
  if (missing.length) { ok = false; console.log(`${p}: MANQUANT (DOM) -> ${missing.join(', ')}`); }
  else console.log(`${p}: OK (${ids.size} ids présents dans le DOM)`);
}
console.log(ok ? 'DOM CHECK OK' : 'DOM CHECK KO');
process.exit(ok ? 0 : 1);
