// Vérifie la couverture i18n : littéraux JS + textes HTML vs dictionnaire (outillage)
import fs from 'node:fs';
const root = new URL('../', import.meta.url);

// 1) Charger le dictionnaire EN depuis i18n.js
const i18n = fs.readFileSync(new URL('../js/i18n.js', import.meta.url), 'utf8');
const m = i18n.match(/var EN = \{([\s\S]*?)\n  \};/);
if (!m) { console.error('Dict introuvable'); process.exit(1); }
const EN = new Function('return ({' + m[1] + '\n})')();
const keys = new Set(Object.keys(EN));
console.log('Clés dictionnaire :', keys.size);

const FR_MARK = /[À-ÿ’«»]/;
const FR_WORDS = /\b(le |la |les |des |une |votre |pour |avec |dans |par |sur |aux |est |qui |que |n’est |n’a )/i;

// 2) Littéraux des scripts inline
const jsFr = new Set();
for (const f of ['americana-dashboard.html', 'login.html', 'index.html']) {
  const h = fs.readFileSync(new URL(f, root), 'utf8');
  const scripts = [...h.matchAll(/<script(?![^>]*src)[^>]*>([\s\S]*?)<\/script>/g)].map(x => x[1]).join('\n');
  const re = /'([^'\n]{2,200})'|"([^"\n]{2,200})"|`([^`]{2,240})`/g;
  let r;
  while ((r = re.exec(scripts))) {
    const s = (r[1] || r[2] || r[3] || '').trim();
    if (!s) continue;
    if (FR_MARK.test(s) || (s.includes('\\u2019'))) jsFr.add(s);
  }
}

// 3) Textes HTML (hors script/style)
const htmlFr = new Set();
for (const f of ['americana-dashboard.html', 'login.html', 'index.html']) {
  let h = fs.readFileSync(new URL(f, root), 'utf8');
  h = h.replace(/<script[\s\S]*?<\/script>/g, ' ').replace(/<style[\s\S]*?<\/style>/g, ' ');
  const text = h.replace(/<[^>]+>/g, '\n');
  for (const line of text.split('\n')) {
    const s = line.trim();
    if (!s || s.length < 3) continue;
    if (FR_MARK.test(s) || FR_WORDS.test(s)) htmlFr.add(s);
  }
}

function covered(s) {
  if (keys.has(s)) return true;
  if (EN[s] !== undefined) return true;
  // wildcard
  for (const k of keys) {
    if (!k.includes('*')) continue;
    const re = new RegExp('^' + k.split('*').map(p => p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('[\\s\\S]*?') + '$');
    if (re.test(s)) return true;
  }
  return false;
}

let miss = 0;
for (const [label, set] of [['JS', jsFr], ['HTML', htmlFr]]) {
  const list = [...set].filter(s => !covered(s) && !/^(console|sigma|http|KFC-|Ex\.|AM-)/.test(s)).sort();
  console.log(`\n=== ${label} non couvert (${list.length}) ===`);
  list.slice(0, 60).forEach(s => console.log(' · ' + s.slice(0, 110)));
  miss += list.length;
}
console.log(miss ? `\n${miss} à traiter` : '\nCOUVERTURE COMPLÈTE');
