// Cartographie + découpe 1 page -> 1 fichier HTML par onglet.
import fs from 'node:fs';
import path from 'node:path';
const base = new URL('../americana-dashboard.html', import.meta.url);
const html = fs.readFileSync(base, 'utf8');

const PAGES = [
  { file: 'dashboard.html',      section: 'dashboard',      nav: 'dashboard',      title: 'Vue d’ensemble' },
  { file: 'calendrier.html',     section: 'calendar',       nav: 'calendar',       title: 'Calendrier' },
  { file: 'activite.html',       section: 'records',        nav: null,             title: 'Activité récente' },
  { file: 'rapports.html',       section: 'reports',        nav: 'reports',        title: 'Rapports' },
  { file: 'equipe.html',         section: 'team',           nav: 'team',           title: 'Équipe' },
  { file: 'configuration.html',  section: 'configuration',  nav: 'configuration',  title: 'Configuration' },
  { file: 'administration.html', section: 'administration', nav: 'administration', title: 'Administration' },
];

const NAV = { dashboard: 0, calendar: 1, reports: 2, team: 3, configuration: 4, administration: 5 };

function navHtml(activeNav) {
  const links = [
    ['dashboard.html', 'dashboard', '▦', 'Vue d’ensemble', ''],
    ['calendrier.html', 'calendar', '▦', 'Calendrier', ''],
    ['rapports.html', 'reports', '▥', 'Rapports', ''],
    ['equipe.html', 'team', '♙', 'Équipe', 'manager-nav'],
    ['configuration.html', 'configuration', '⚙', 'Configuration', 'manager-nav'],
    ['administration.html', 'administration', '◆', 'Administration', 'admin-nav'],
  ];
  return '<nav class="side-nav" aria-label="Navigation principale">\n' + links.map(([href, key, icon, label, cls]) => {
    const clsAttr = ['side-nav-link', cls, key === activeNav ? 'active' : ''].filter(Boolean).join(' ');
    return `          <a class="${clsAttr}" href="${href}" data-nav="${key}"><span class="nav-icon">${icon}</span>${label}</a>`;
  }).join('\n') + '\n        </nav>';
}

// 1) Trouve la plage de chaque section (du <section id=X> jusqu'au </section> qui la ferme),
//    en tenant compte des <section> imbriquées.
function sectionRange(source, id) {
  const openRe = new RegExp(`<section[^>]*\\bid=["']${id}["'][^>]*>`, 'g');
  const m = openRe.exec(source);
  if (!m) throw new Error('section introuvable : ' + id);
  const start = m.index;
  const tagRe = /<\/?section\b[^>]*>/g;
  tagRe.lastIndex = start;
  let depth = 0, end = -1, t;
  while ((t = tagRe.exec(source))) {
    if (t[0][1] === '/') depth--; else depth++;
    if (depth === 0) { end = t.index + t[0].length; break; }
  }
  if (end < 0) throw new Error('fin de section introuvable : ' + id);
  return { start, end, html: source.slice(start, end) };
}

const sections = {};
for (const p of PAGES) sections[p.section] = sectionRange(html, p.section);


if (process.argv.includes('--map')) {
  console.log('sections : ' + Object.keys(sections).join(', '));
  for (const [k, v] of Object.entries(sections)) console.log(k, '->', v.html.length, 'caractères');
  const navStart = html.indexOf('<nav class="side-nav"');
  const navEnd = html.indexOf('</nav>', navStart) + '</nav>'.length;
  console.log('bloc nav :', navStart, '->', navEnd);
  process.exit(0);
}

// 2) Découpage du squelette de base (tout sauf les 7 sections).
const order = ['dashboard', 'calendar', 'records', 'reports', 'team', 'configuration', 'administration'];
const ranges = order.map(k => sections[k]).sort((a, b) => a.start - b.start);

let skeleton = '';
let cursor = 0;
for (const r of ranges) { skeleton += html.slice(cursor, r.start); cursor = r.end; }
skeleton += html.slice(cursor);
// Repères : on garde role-message + une ancre où injecter la section courante.
const anchor = '<div class="role-message" id="role-message" hidden></div>';
if (!skeleton.includes(anchor)) throw new Error('ancre role-message introuvable dans le squelette');
const CLEAN_NOTE = '<!-- page générée : section injectée ici -->';
skeleton = skeleton.replace(anchor, anchor + '\n' + CLEAN_NOTE);

// 3) Placeholders : le script partagé référence des ids qui vivent dans d'autres
//    sections (ex. #welcome-title sur calendrier.html). Sans eux, le script plante
//    sur "Cannot set properties of null". On injecte un doublon dans un conteneur
//    hidden (jamais démasqué par le script) avec la bonne balise d'origine.
const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
// Le parseur HTML ignore tbody/thead/tr/td hors <table> : sans ce gabarit, le
// placeholder serait vidé et $('#id') resterait null.
const TABLE_SCAFFOLD = {
  thead: '<table>__</table>',
  tbody: '<table>__</table>',
  tfoot: '<table>__</table>',
  tr: '<table><tbody>__</tbody></table>',
  td: '<table><tbody><tr>__</tr></tbody></table>',
  th: '<table><tbody><tr>__</tr></tbody></table>',
};
const htmlNoScript = html.replace(/<script[\s\S]*?<\/script>/g, '');

function placeholderMarkup(id) {
  const m = new RegExp(`<([a-z][a-z0-9]*)\\b[^>]*?\\sid=["']${id}["']`, 'i').exec(htmlNoScript);
  const tag = m ? m[1].toLowerCase() : 'div';
  let el = VOID_TAGS.has(tag) ? `<${tag} id="${id}">` : `<${tag} id="${id}"></${tag}>`;
  const scaffold = TABLE_SCAFFOLD[tag];
  if (scaffold) el = scaffold.replace('__', el);
  return `<div hidden data-sigma-ph>${el}</div>`;
}

// Ids référencés par le script applicatif ($('#id') / getElementById).
const referencedIds = new Set();
for (const m of html.matchAll(/\$\('#([a-zA-Z0-9_-]+)'\)/g)) referencedIds.add(m[1]);
for (const m of html.matchAll(/getElementById\(["']([a-zA-Z0-9_-]+)["']\)/g)) referencedIds.add(m[1]);

const NAV_CRUMB = {
  dashboard: 'Vue d’ensemble', calendar: 'Calendrier', reports: 'Rapports',
  team: 'Équipe', configuration: 'Configuration', administration: 'Administration',
};
function pageHtml(p) {
  let out = skeleton;
  // a) nav : liens vers les pages, onglet actif
  const navStart = out.indexOf('<nav class="side-nav"');
  const navEnd = out.indexOf('</nav>', navStart) + '</nav>'.length;
  if (navStart < 0) throw new Error('nav introuvable');
  out = out.slice(0, navStart) + navHtml(p.nav) + out.slice(navEnd);
  // b) fil d'ariane
  out = out.replace('<strong id="crumb-page">Vue d’ensemble</strong>',
    `<strong id="crumb-page">${p.title}</strong>`);
  // c) section de la page
  out = out.replace(CLEAN_NOTE, sections[p.section].html);
  // c2) placeholders : ids référencés par le script mais absents de cette page
  {
    const outNoScript = out.replace(/<script[\s\S]*?<\/script>/g, '');
    const missing = [...referencedIds].filter(id => !new RegExp(`[<\\s]id=["']${id}["']`).test(outNoScript));
    if (missing.length) out = out.replace(anchor, anchor + '\n      ' + missing.map(placeholderMarkup).join('\n      '));
  }
  // d) JS : page courante exposée AVANT le script applicatif (pilote le routage léger)
  out = out.replace('<script src="js/supabase-config.js"></script>',
    `<script>window.__SIGMA_PAGE='${p.section}';</script>\n  <script src="js/supabase-config.js"></script>`);
  // e) Charge le JS partagé (démarrage, garde, __SIGMA_READY) AVANT le script applicatif
  out = out.replace('<script src="js/supabase-client.js"></script>',
    `<script src="js/supabase-client.js"></script>\n  <script src="scripts/app-shared.js"></script>`);
  // f) liens internes #section -> pages (raccourcis existants)
  const links = {
    '#configuration': 'configuration.html', '#calendar': 'calendrier.html',
    '#reports': 'rapports.html', '#team': 'equipe.html',
  };
  for (const [h, f] of Object.entries(links)) out = out.split(`href="${h}"`).join(`href="${f}"`);
  // g) plus aucune référence à l'ancienne page monolithique (rôle sélecteur, etc.)
  out = out.split('americana-dashboard.html').join('dashboard.html');
  return out;
}

if (process.argv.includes('--build')) {
  for (const p of PAGES) {
    fs.writeFileSync(new URL('../' + p.file, import.meta.url), pageHtml(p), 'utf8');
    console.log('OK', p.file);
  }
}

