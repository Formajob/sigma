/* ============================================================
   SIGMA — Widget Support ACX (vanilla, autonome)
   S'injecte sur toutes les pages. Aucune dépendance externe.
   Profil lu depuis window.__SIGMA_PROFILE (rempli par la garde prod).
   Envoi du ticket via Web3Forms. Support urgent via WhatsApp.
   ============================================================ */
(function () {
  'use strict';
  if (window.__SIGMA_SUPPORT_WIDGET__) return;
  window.__SIGMA_SUPPORT_WIDGET__ = true;

  var ACCESS_KEY = 'a037a697-b706-4e18-a945-3a1b664ea8e2'; // clé Web3Forms (remplace par la tienne)
  var WHATSAPP = '212634232006';
  var SUPPORT_EMAIL = 'support@acx.ma';
  var BRAND = 'Support ACX Sigma';

  var BUG_TYPES = [
    { value: 'bug',        label: 'Bug / erreur',       icon: '🐛' },
    { value: 'affichage',  label: 'Affichage',          icon: '👁️' },
    { value: 'lenteur',    label: 'Lenteur',            icon: '🐢' },
    { value: 'donnees',    label: 'Données / scores',   icon: '📊' },
    { value: 'connexion',  label: 'Connexion',          icon: '🔌' },
    { value: 'export',     label: 'Export PDF / CSV',   icon: '📄' },
    { value: 'calibrage',  label: 'Calibrage / suivi',  icon: '📋' },
    { value: 'suggestion', label: 'Suggestion',         icon: '💡' },
    { value: 'autre',      label: 'Autre',              icon: '⋯' }
  ];

  var PAGES = [
    'Tableau de bord', 'Calendrier', 'Rapports', 'Équipe',
    'Configuration', 'Administration', 'Espace Marketing', 'Connexion', 'Autre'
  ];

  var ROLE_LABELS = {
    superviseur: 'Superviseur', agent: 'Agent', qualite: 'Qualité',
    admin: 'Admin', super_admin: 'Super Admin'
  };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function getUser() {
    var p = window.__SIGMA_PROFILE || null;
    if (!p) return null;
    var name = p.displayName || p.agentName || (p.email || '').split('@')[0] || null;
    return { full_name: name, email: p.email || null, role: p.role || null };
  }

  function roleLabel(r) { return r ? (ROLE_LABELS[r] || r) : '—'; }

  function currentPage() {
    var path = (window.location.pathname || '').toLowerCase();
    if (path.indexOf('calendrier') > -1) return 'Calendrier';
    if (path.indexOf('rapport') > -1) return 'Rapports';
    if (path.indexOf('equipe') > -1) return 'Équipe';
    if (path.indexOf('configuration') > -1) return 'Configuration';
    if (path.indexOf('administration') > -1) return 'Administration';
    if (path.indexOf('marketing') > -1) return 'Espace Marketing';
    if (path.indexOf('login') > -1) return 'Connexion';
    if (path.indexOf('dashboard') > -1 || path.indexOf('activite') > -1) return 'Tableau de bord';
    return 'Autre';
  }

  var state = { open: false, step: 'menu', sending: false, user: null, page: 'Autre',
    form: { bug_type: '', page: '', description: '', urgent: false } };


  var CSS = ''
    + '.acxsw-fab{position:fixed;bottom:24px;right:24px;width:52px;height:52px;border:0;border-radius:50%;'
    + 'background:#C0622D;color:#fff;cursor:pointer;font-size:22px;display:flex;align-items:center;justify-content:center;'
    + 'box-shadow:0 6px 24px rgba(192,98,45,.45);z-index:9998;transition:all .25s ease;line-height:1}'
    + '.acxsw-fab:hover{transform:translateY(-2px);background:#A95025}'
    + '.acxsw-fab.is-open{background:#17242D;box-shadow:0 6px 24px rgba(23,36,45,.45)}'
    + '.acxsw-panel{position:fixed;bottom:86px;right:24px;width:340px;max-width:calc(100vw - 32px);background:#fff;'
    + 'border-radius:16px;box-shadow:0 20px 60px rgba(0,0,0,.2);z-index:9999;overflow:hidden;font-family:Inter,ui-sans-serif,'
    + 'system-ui,-apple-system,"Segoe UI",sans-serif;animation:acxswIn .22s cubic-bezier(.22,1,.36,1);transform-origin:bottom right;color:#1E293B}'
    + '@keyframes acxswIn{from{opacity:0;transform:translateY(14px) scale(.97)}to{opacity:1;transform:none}}'
    + '@keyframes acxswSpin{to{transform:rotate(360deg)}}'
    + '.acxsw-panel *{box-sizing:border-box}'
    + '.acxsw-head{background:linear-gradient(135deg,#17242D,#243741);padding:15px 18px;display:flex;align-items:center;gap:11px}'
    + '.acxsw-head-ic{width:38px;height:38px;border-radius:10px;background:rgba(192,98,45,.9);color:#fff;display:flex;'
    + 'align-items:center;justify-content:center;font-size:19px;flex-shrink:0}'
    + '.acxsw-head-t{font-size:14px;font-weight:700;color:#fff;line-height:1.2}'
    + '.acxsw-head-s{font-size:11px;color:#B7C2C6;margin-top:2px}'
    + '.acxsw-body{padding:16px;max-height:60vh;overflow-y:auto}'
    + '.acxsw-tile{display:flex;align-items:center;gap:12px;width:100%;padding:12px 14px;border-radius:12px;'
    + 'text-decoration:none;margin-bottom:10px;cursor:pointer;text-align:left;border:1px solid;font-family:inherit}'
    + '.acxsw-tile-ic{width:38px;height:38px;border-radius:9px;display:flex;align-items:center;justify-content:center;font-size:18px;flex-shrink:0}'
    + '.acxsw-tile-t{font-size:13px;font-weight:700;line-height:1.2}'
    + '.acxsw-tile-s{font-size:11px;margin-top:2px}'
    + '.acxsw-tile .acxsw-arrow{margin-left:auto;font-size:13px;opacity:.7}'
    + '.acxsw-wa{background:#F0FDF4;border-color:#86EFAC}.acxsw-wa .acxsw-tile-ic{background:#25D366;color:#fff}'
    + '.acxsw-wa .acxsw-tile-t{color:#166534}.acxsw-wa .acxsw-tile-s{color:#16A34A}'
    + '.acxsw-tk{background:#FDF1EA;border-color:#E7C3AE}.acxsw-tk .acxsw-tile-ic{background:#C0622D;color:#fff}'
    + '.acxsw-tk .acxsw-tile-t{color:#8A4321}.acxsw-tk .acxsw-tile-s{color:#C0622D}'
    + '.acxsw-em{background:#F8FAFC;border-color:#E2E8F0}.acxsw-em .acxsw-tile-ic{background:#EEF1F4;color:#475569}'
    + '.acxsw-em .acxsw-tile-t{color:#1E293B}.acxsw-em .acxsw-tile-s{color:#64748B}'
    + '.acxsw-lbl{font-size:11px;font-weight:600;color:#64748B;display:block;margin-bottom:6px;text-transform:uppercase;letter-spacing:.4px}'
    + '.acxsw-grid2{display:grid;grid-template-columns:1fr 1fr;gap:5px}'
    + '.acxsw-bug{display:flex;align-items:center;gap:6px;padding:7px 9px;border:1px solid #E2E8F0;border-radius:7px;'
    + 'background:#fff;cursor:pointer;text-align:left;font-size:11px;color:#475569;font-family:inherit;line-height:1.25}'
    + '.acxsw-bug.sel{border-color:#C0622D;background:#FDF1EA;color:#8A4321;font-weight:600}'
    + '.acxsw-in{width:100%;padding:9px 12px;border:1px solid #E2E8F0;border-radius:8px;font-size:13px;font-family:inherit;'
    + 'outline:none;color:#1E293B;background:#fff}'
    + '.acxsw-in:focus{border-color:#C0622D;box-shadow:0 0 0 3px rgba(192,98,45,.12)}'
    + '.acxsw-chk{display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #E2E8F0;border-radius:8px;'
    + 'background:#F8FAFC;cursor:pointer}'
    + '.acxsw-chk.on{border-color:#FCA5A5;background:#FEF2F2}'
    + '.acxsw-box{width:20px;height:20px;border-radius:4px;border:2px solid #CBD5E1;flex-shrink:0;display:flex;'
    + 'align-items:center;justify-content:center;font-size:12px;color:#fff}'
    + '.acxsw-chk.on .acxsw-box{background:#EF4444;border-color:#EF4444}'
    + '.acxsw-auto{background:#F8FAFC;border-radius:8px;padding:10px 12px;font-size:11px;color:#94A3B8;line-height:1.7}'
    + '.acxsw-send{width:100%;padding:11px;border:0;border-radius:9px;background:#C0622D;color:#fff;font-size:14px;'
    + 'font-weight:600;cursor:pointer;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:7px}'
    + '.acxsw-send.urgent{background:#EF4444}.acxsw-send:disabled{opacity:.6;cursor:not-allowed}'
    + '.acxsw-back{background:none;border:0;color:#64748B;cursor:pointer;font-size:12px;margin-bottom:12px;padding:0;font-family:inherit}'
    + '.acxsw-foot{padding:8px 16px;background:#F8FAFC;border-top:1px solid #E2E8F0;font-size:10px;color:#94A3B8;text-align:center}'
    + '.acxsw-ok{text-align:center;padding:8px 4px}'
    + '.acxsw-ok-ic{width:60px;height:60px;border-radius:50%;background:#DCFCE7;color:#16A34A;display:flex;align-items:center;'
    + 'justify-content:center;font-size:28px;margin:0 auto 14px}'
    + '.acxsw-hint{font-size:12px;color:#94A3B8;text-align:center;padding:8px}'
    + '.acxsw-close{background:none;border:0;color:#94A3B8;cursor:pointer;font-size:12px;font-family:inherit}'
    + '.acxsw-spin{animation:acxswSpin .9s linear infinite;display:inline-block}'
    + '.acxsw-err{background:#FEF2F2;border:1px solid #FCA5A5;color:#B91C1C;border-radius:8px;padding:10px 12px;font-size:12px;line-height:1.5}';
  var styleEl = document.createElement('style');
  styleEl.textContent = CSS;
  document.head.appendChild(styleEl);


  var fab = document.createElement('button');
  fab.className = 'acxsw-fab';
  fab.type = 'button';
  fab.title = BRAND;
  fab.setAttribute('aria-label', BRAND);
  fab.innerHTML = '🎧';

  var panel = document.createElement('div');
  panel.className = 'acxsw-panel';
  panel.hidden = true;
  document.body.appendChild(fab);
  document.body.appendChild(panel);

  var waSvg = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884z"/></svg>';

  function head() {
    var u = state.user;
    return '<div class="acxsw-head">'
      + '<div class="acxsw-head-ic">🎧</div>'
      + '<div><div class="acxsw-head-t">' + esc(BRAND) + '</div>'
      + '<div class="acxsw-head-s">' + esc(u && u.full_name ? u.full_name : 'Invité') + (u && u.role ? ' · ' + esc(roleLabel(u.role)) : '') + '</div></div>'
      + '</div>';
  }

  function foot() {
    return '<div class="acxsw-foot">' + esc(BRAND) + ' · ' + esc(SUPPORT_EMAIL) + ' · +' + esc(WHATSAPP) + '</div>';
  }


  function renderMenu() {
    var u = state.user;
    var waText = 'Bonjour ACX Sigma, j\'ai besoin d\'un support urgent' + (u && u.full_name ? ' (' + u.full_name + ')' : '') + ' · page : ' + state.page;
    return head() + '<div class="acxsw-body">'
      + '<a class="acxsw-tile acxsw-wa" href="https://wa.me/' + WHATSAPP + '?text=' + encodeURIComponent(waText) + '" target="_blank" rel="noopener noreferrer">'
      + '<span class="acxsw-tile-ic">' + waSvg + '</span><span><span class="acxsw-tile-t">Support urgent WhatsApp</span><br><span class="acxsw-tile-s">+' + WHATSAPP.slice(0, 3) + ' ' + WHATSAPP.slice(3) + ' · Réponse rapide</span></span><span class="acxsw-arrow">↗</span></a>'
      + '<button type="button" class="acxsw-tile acxsw-tk" data-go="ticket">'
      + '<span class="acxsw-tile-ic">🎫</span><span><span class="acxsw-tile-t">Créer un ticket</span><br><span class="acxsw-tile-s">Signaler un problème · réponse sous 24h</span></span><span class="acxsw-arrow">›</span></button>'
      + '<a class="acxsw-tile acxsw-em" href="mailto:' + SUPPORT_EMAIL + '">'
      + '<span class="acxsw-tile-ic">✉️</span><span><span class="acxsw-tile-t">Email support</span><br><span class="acxsw-tile-s">' + esc(SUPPORT_EMAIL) + '</span></span><span class="acxsw-arrow">↗</span></a>'
      + (u ? '<div class="acxsw-auto" style="margin-top:12px">👤 Connecté : <b style="color:#64748B">' + esc(u.full_name || '—') + '</b> · ' + esc(roleLabel(u.role)) + '</div>' : '')
      + '</div>' + foot();
  }

  function renderSent() {
    return head() + '<div class="acxsw-body"><div class="acxsw-ok">'
      + '<div class="acxsw-ok-ic">✓</div>'
      + '<div style="font-size:16px;font-weight:700;color:#0F172A;margin-bottom:8px">Ticket envoyé !</div>'
      + '<div style="font-size:13px;color:#64748B;line-height:1.6;margin-bottom:16px">Notre équipe a reçu votre signalement et vous répondra au plus vite.<br>Pour un problème urgent, contactez-nous sur WhatsApp.</div>'
      + '<a href="https://wa.me/' + WHATSAPP + '" target="_blank" rel="noopener noreferrer" style="display:inline-flex;align-items:center;gap:6px;padding:9px 16px;background:#25D366;color:#fff;border-radius:8px;text-decoration:none;font-size:13px;font-weight:600;margin-bottom:10px">' + waSvg + ' WhatsApp</a><br>'
      + '<button type="button" class="acxsw-close" data-go="close">Fermer</button>'
      + '</div></div>' + foot();
  }


  function renderTicket() {
    var f = state.form;
    var bugBtns = BUG_TYPES.map(function (b) {
      return '<button type="button" class="acxsw-bug' + (f.bug_type === b.value ? ' sel' : '') + '" data-bug="' + b.value + '">'
        + '<span>' + b.icon + '</span>' + esc(b.label) + '</button>';
    }).join('');
    var pageOpts = PAGES.map(function (p) {
      return '<option value="' + esc(p) + '"' + ((f.page || state.page) === p ? ' selected' : '') + '>' + esc(p) + '</option>';
    }).join('');
    var u = state.user;
    var ready = f.bug_type && f.description.trim();
    return head() + '<div class="acxsw-body">'
      + '<button type="button" class="acxsw-back" data-go="menu">← Retour</button>'
      + '<div style="font-size:14px;font-weight:700;color:#0F172A;margin-bottom:14px">🎫 Nouveau ticket</div>'
      + '<div style="display:flex;flex-direction:column;gap:12px">'
      + '<div><label class="acxsw-lbl">Type de problème *</label><div class="acxsw-grid2">' + bugBtns + '</div></div>'
      + '<div><label class="acxsw-lbl">Page concernée</label><select class="acxsw-in" id="acxsw-page">' + pageOpts + '</select></div>'
      + '<div><label class="acxsw-lbl">Description *</label><textarea class="acxsw-in" id="acxsw-desc" rows="4" placeholder="Décrivez le problème : ce que vous faisiez, ce qui s\'est passé, le message d\'erreur…">' + esc(f.description) + '</textarea></div>'
      + '<div class="acxsw-chk' + (f.urgent ? ' on' : '') + '" id="acxsw-urgent" role="checkbox" aria-checked="' + (f.urgent ? 'true' : 'false') + '">'
      + '<span class="acxsw-box">' + (f.urgent ? '✓' : '') + '</span><span><span style="font-size:12px;font-weight:600;color:' + (f.urgent ? '#DC2626' : '#475569') + '">⚠️ Marquer comme urgent</span><br><span style="font-size:10px;color:#94A3B8">Bloque l\'utilisation de la plateforme</span></span></div>'
      + '<div class="acxsw-auto"><div style="font-weight:600;color:#64748B;margin-bottom:4px">Informations ajoutées automatiquement :</div>'
      + '<div>👤 ' + esc(u && u.full_name ? u.full_name : 'Non connecté') + ' · ' + esc(roleLabel(u && u.role)) + '</div>'
      + '<div>📍 ' + esc(f.page || state.page) + '</div><div>🕐 ' + esc(new Date().toLocaleString('fr-MA')) + '</div></div>'
      + (ready
        ? (state.sendError ? '<div class="acxsw-err">⚠️ ' + esc(state.sendError) + '</div>' : '') + '<button type="button" class="acxsw-send' + (f.urgent ? ' urgent' : '') + '" id="acxsw-send">' + (state.sending ? '<span class="acxsw-spin">⏳</span> Envoi…' : (f.urgent ? '🚨 Envoyer ticket URGENT' : 'Envoyer le ticket')) + '</button>'
        : '<div class="acxsw-hint">Sélectionnez un type et décrivez le problème pour envoyer.</div>')
      + '</div></div>' + foot();
  }

  function render() {
    panel.innerHTML = state.step === 'ticket' ? renderTicket() : (state.step === 'sent' ? renderSent() : renderMenu());
  }


  function bugLabel(v) {
    var b = BUG_TYPES.filter(function (x) { return x.value === v; })[0];
    return b ? b.label : v;
  }

  function sendTicket() {
    var f = state.form, u = state.user;
    if (!f.bug_type || !f.description.trim() || state.sending) return;
    state.sending = true;
    render();
    var page = (document.getElementById('acxsw-page') || {}).value || f.page || state.page;
    var desc = (document.getElementById('acxsw-desc') || {}).value || f.description;
    var message = [
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'URGENCE : ' + (f.urgent ? 'OUI' : 'Non'),
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'UTILISATEUR',
      'Nom   : ' + (u && u.full_name ? u.full_name : 'Non connecté'),
      'Email : ' + (u && u.email ? u.email : '—'),
      'Rôle  : ' + roleLabel(u && u.role),
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'PROBLÈME',
      'Type : ' + bugLabel(f.bug_type),
      'Page : ' + page,
      'URL  : ' + window.location.href,
      'Date : ' + new Date().toLocaleString('fr-MA'),
      '',
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━',
      'DESCRIPTION',
      desc,
      '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━'
    ].join('\n');
    var payload = {
      access_key: ACCESS_KEY,
      subject: '[ACX Sigma' + (f.urgent ? ' URGENT' : '') + '] ' + bugLabel(f.bug_type) + ' — ' + page,
      from_name: (u && u.full_name) ? u.full_name : 'Utilisateur Sigma',
      replyto: (u && u.email) ? u.email : 'no-reply@acx.ma',
      message: message
    };
    fetch('https://api.web3forms.com/submit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      body: JSON.stringify(payload)
    }).then(function (r) { return r.json(); }).then(function (res) {
      state.sending = false;
      // Sécurité : on ne confirme l'envoi que si le serveur l'a accepté.
      // En cas d'échec, on reste sur le formulaire avec un message d'erreur.
      if (res && res.success) { state.step = 'sent'; state.sendError = ''; }
      else { state.sendError = 'Envoi refusé par le serveur. Réessayez ou utilisez WhatsApp.'; }
      render();
    }).catch(function () {
      state.sending = false;
      state.sendError = 'Erreur de connexion. Vérifiez votre internet ou utilisez WhatsApp.';
      render();
    });
  }

  function setOpen(next) {
    state.open = next;
    fab.classList.toggle('is-open', next);
    fab.innerHTML = next ? '✕' : '🎧';
    panel.hidden = !next;
    if (next) {
      state.user = getUser();
      state.page = currentPage();
      if (!state.form.page) state.form.page = state.page;
      state.step = 'menu';
      render();
    }
  }

  fab.addEventListener('click', function () { setOpen(!state.open); });

  panel.addEventListener('click', function (e) {
    var go = e.target.closest('[data-go]');
    if (go) {
      var action = go.getAttribute('data-go');
      if (action === 'ticket') { state.form.page = state.page; state.step = 'ticket'; render(); return; }
      if (action === 'menu') { state.step = 'menu'; render(); return; }
      if (action === 'close') { setOpen(false); return; }
    }
    var bug = e.target.closest('[data-bug]');
    if (bug) {
      state.form.bug_type = bug.getAttribute('data-bug');
      var d = document.getElementById('acxsw-desc');
      if (d) state.form.description = d.value;
      render();
      var nd = document.getElementById('acxsw-desc');
      if (nd) { nd.focus(); nd.setSelectionRange(nd.value.length, nd.value.length); }
      return;
    }
    if (e.target.closest('#acxsw-urgent')) {
      state.form.urgent = !state.form.urgent;
      var d2 = document.getElementById('acxsw-desc');
      if (d2) state.form.description = d2.value;
      render();
      return;
    }
    if (e.target.closest('#acxsw-send')) { sendTicket(); return; }
  });

  panel.addEventListener('input', function (e) {
    if (e.target && e.target.id === 'acxsw-desc') state.form.description = e.target.value;
  });
  panel.addEventListener('change', function (e) {
    if (e.target && e.target.id === 'acxsw-page') state.form.page = e.target.value;
  });

  document.addEventListener('keydown', function (e) {
    if (e.key === 'Escape' && state.open) setOpen(false);
  });
})();
