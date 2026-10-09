// Smoke test i18n : exécute le moteur avec un DOM minimal et valide t() + setLang
import fs from 'node:fs';
const src = fs.readFileSync(new URL('../js/i18n.js', import.meta.url), 'utf8');

global.window = global;
global.localStorage = { _s: {}, getItem(k) { return this._s[k] ?? null; }, setItem(k, v) { this._s[k] = String(v); } };
global.document = {
  readyState: 'loading',
  title: 'Sigma — Suivi d’équipe',
  documentElement: { lang: 'fr' },
  head: { appendChild() {} },
  body: null,
  addEventListener() {},
  querySelector() { return null; },
  createElement() { return { type: '', className: '', setAttribute() {}, addEventListener() {}, children: [{}, {}], innerHTML: '', parentNode: null }; }
};

new Function(src)();

const t = global.window.t;
const assert = (cond, msg) => { if (!cond) { console.error('KO : ' + msg); process.exitCode = 1; } else console.log('OK  ' + msg); };

assert(typeof t === 'function', 't() exposé');
assert(t('Terminé') === 'Terminé', 'FR inchangé avant setLang');

global.window.SIGMA_I18N.setLang('en');
assert(global.window.SIGMA_I18N.getLang() === 'en', 'setLang(en)');
assert(t('Terminé') === 'Completed', "t('Terminé') → Completed");
assert(t('La date de début doit précéder la date de fin.') === 'The start date must precede the end date.', 'phrase complète');
assert(t('{name} supprimé de l’équipe.', { name: 'Youssef' }) === 'Youssef removed from the team.', 'vars {name}');
assert(t('Envoyer un email de réinitialisation à ' + 'omar@x.ma' + ' ?') === 'Send a reset email to omar@x.ma?', 'wildcard concat');
assert(t('Écriture Supabase refusée : ' + 'RLS') === 'Supabase write denied: RLS', 'wildcard toast');
assert(global.sigmaLocale === 'en-GB', 'sigmaLocale en-GB');
assert(document.documentElement.lang === 'en', 'html lang');

global.window.SIGMA_I18N.setLang('fr');
assert(t('Terminé') === 'Terminé', 'retour FR');
assert(global.sigmaLocale === 'fr-MA', 'sigmaLocale fr-MA');

console.log(process.exitCode ? 'SMOKE KO' : 'SMOKE OK');
