// Diagnostic : ids référencés par le script partagé mais absents de chaque page générée.
import fs from 'node:fs';
const SRC = fs.readFileSync(new URL('../americana-dashboard.html', import.meta.url), 'utf8');
const PAGES = ['dashboard', 'calendrier', 'activite', 'rapports', 'equipe', 'configuration', 'administration'];

// 1) ids construits dynamiquement dans les <script> (risque de doublon de placeholder)
const scriptIds = new Set();
for (const m of SRC.matchAll(/<script[\s\S]*?<\/script>/g)) {
  for (const id of m[0].matchAll(/id=["']([a-zA-Z0-9_-]+)["']/g)) scriptIds.add(id[1]);
}
console.log('ids présents dans des templates de script :', [...scriptIds].join(', ') || '(aucun)');

// 2) ids référencés par le script applicatif
const ids = new Set();
for (const m of SRC.matchAll(/\$\('#([a-zA-Z0-9_-]+)'\)/g)) ids.add(m[1]);
for (const m of SRC.matchAll(/getElementById\(["']([a-zA-Z0-9_-]+)["']\)/g)) ids.add(m[1]);
console.log('ids référencés :', ids.size);

// 2b) tags d'origine des ids référencés (les tags de tableau sont ignorés hors <table>)
const tagOf = new Map();
for (const id of ids) {
  const m = new RegExp(`<([a-z][a-z0-9]*)\\b[^>]*?\\sid=["']${id}["']`, 'i').exec(SRC);
  tagOf.set(id, m ? m[1].toLowerCase() : 'div');
}
const tableTags = new Set(['table', 'thead', 'tbody', 'tfoot', 'tr', 'td', 'th', 'caption', 'colgroup', 'col']);
console.log('ids en tag de tableau :', [...tagOf].filter(([, t]) => tableTags.has(t)).map(([id, t]) => `${id}(${t})`).join(', ') || '(aucun)');

// 3) manquants par page (éléments réels : on ignore les <script>/<style>)
for (const p of PAGES) {
  const html = fs.readFileSync(new URL('../' + p + '.html', import.meta.url), 'utf8');
  const noScript = html.replace(/<script[\s\S]*?<\/script>/g, '');
  const missing = [...ids].filter(id => !new RegExp(`id=["']${id}["']`).test(noScript));

  // doublons d'id (placeholder + élément réel)
  const seen = new Map();
  for (const m of noScript.matchAll(/\sid=["']([a-zA-Z0-9_-]+)["']/g)) seen.set(m[1], (seen.get(m[1]) || 0) + 1);
  const dupes = [...seen].filter(([, n]) => n > 1).map(([id, n]) => `${id}(${n})`);

  console.log(`${p}: ${missing.length} manquants, ${dupes.length} doublons${missing.length ? ' -> ' + missing.join(', ') : ''}${dupes.length ? ' DOUBLONS: ' + dupes.join(', ') : ''}`);
}
