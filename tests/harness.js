/* Harnais de test jsdom pour les pages Sigma (faux Supabase en mémoire). */
const fs = require('fs');
const { JSDOM, ResourceLoader, VirtualConsole } = require('jsdom');
const ROOT = '/home/user/sigma-build';
const wait = ms => new Promise(r => setTimeout(r, ms));
const state = { fails: 0 };
const check = (label, actual, expected) => {
  const ok = actual === expected;
  if (!ok) state.fails++;
  console.log(`  ${ok ? 'OK  ' : 'ÉCHEC'} ${label}${ok ? '' : ` → attendu « ${expected} », obtenu « ${actual} »`}`);
};

class Local extends ResourceLoader {
  fetch(url, opts) { return url.startsWith('file://') ? super.fetch(url, opts) : null; }
}

function open(file, urlOverride, profileOverride) {
  const { MOCK } = require('./fixtures');
  let html = fs.readFileSync(ROOT + '/' + file, 'utf8');
  html = html.replace('<head>', '<head><script>HTMLElement.prototype.scrollIntoView=function(){};window.scrollTo=function(){};</script>');
  html = html.replace('<script src="js/i18n.js"></script>', '<script src="file:///home/user/sigma-repo/js/i18n.js"></script>');
  html = html.replace('<script src="js/supabase-config.js"></script>', '<script>/*mock*/</script>');
  html = html.replace('<script src="js/supabase-client.js"></script>', '<script>' + MOCK + '</script>');
  html = html.replace('<script src="scripts/app-shared.js"></script>', '<script>/*ready*/</script>');
  if (profileOverride) {
    const profileScript = '<script>window.__MOCK_PROFILE=' + JSON.stringify(profileOverride) + ';window.__SIGMA_READY=Promise.resolve(window.__MOCK_PROFILE);</script>';
    html = html.replace('<script>/*ready*/</script>', profileScript + '<script>/*ready*/</script>');
  }
  html = html.replace('<script src="js/support-widget.js" defer></script>', '');
  const errors = [];
  const vc = new VirtualConsole();
  vc.on('jsdomError', e => { if (!/scrollTo|Not implemented/.test(e.message)) errors.push(e.message); });
  const dom = new JSDOM(html, {
    url: urlOverride || ('file://' + ROOT + '/' + file),
    runScripts: 'dangerously', resources: new Local(), virtualConsole: vc, pretendToBeVisual: true,
    beforeParse(w) {
      const { TextEncoder, TextDecoder } = require('util');
      w.TextEncoder = TextEncoder; w.TextDecoder = TextDecoder;
      w.crypto = require('crypto').webcrypto;
    }
  });
  return { dom, w: dom.window, d: dom.window.document, errors };
}

module.exports = { open, wait, check, state, ROOT };
