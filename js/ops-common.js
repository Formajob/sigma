/* ============================================================
   Sigma · socle commun des pages opérationnelles PGV
   Authentification, activité, navigation, helpers, toast.
   Chargé après js/supabase-client.js et scripts/app-shared.js.
   ============================================================ */
(function () {
  'use strict';

  var OPS = {};

  /* ---------- helpers ---------- */
  OPS.$ = function (s, r) { return (r || document).querySelector(s); };
  OPS.$$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  OPS.esc = function (s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c];
    });
  };
  // Date locale → 'YYYY-MM-DD' (jamais toISOString : décalage UTC)
  OPS.iso = function (d) {
    var x = d || new Date();
    var m = x.getMonth() + 1, j = x.getDate();
    return x.getFullYear() + '-' + (m < 10 ? '0' + m : m) + '-' + (j < 10 ? '0' + j : j);
  };
  OPS.parseISO = function (s) { return new Date(s + 'T00:00:00'); };
  OPS.addDays = function (iso, n) { var d = OPS.parseISO(iso); d.setDate(d.getDate() + n); return OPS.iso(d); };
  OPS.fmtDate = function (iso) { if (!iso) return '—'; var p = String(iso).slice(0, 10).split('-'); return p[2] + '/' + p[1]; };
  OPS.fmtDateLong = function (iso) {
    if (!iso) return '—';
    return OPS.parseISO(iso).toLocaleDateString('fr-MA', { weekday: 'long', day: 'numeric', month: 'long' });
  };
  OPS.fmtTime = function (d) {
    var x = (d instanceof Date) ? d : new Date(d);
    var h = x.getHours(), m = x.getMinutes();
    return (h < 10 ? '0' + h : h) + ':' + (m < 10 ? '0' + m : m);
  };
  OPS.minutes = function (n) {
    n = Math.max(0, Math.round(n || 0));
    var h = Math.floor(n / 60), m = n % 60;
    if (!h) return m + ' min';
    return h + ' h' + (m ? ' ' + (m < 10 ? '0' + m : m) : '');
  };
  OPS.pct = function (a, b) { return b ? Math.round(a / b * 100) : null; };
  OPS.mondayOf = function (iso) {
    var d = OPS.parseISO(iso), day = d.getDay();
    var diff = (day === 0 ? -6 : 1 - day);
    d.setDate(d.getDate() + diff);
    return OPS.iso(d);
  };
  OPS.weekNumber = function (iso) {
    var d = OPS.parseISO(iso);
    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
    var week1 = new Date(d.getFullYear(), 0, 4);
    return 1 + Math.round(((d - week1) / 864e5 - 3 + (week1.getDay() + 6) % 7) / 7);
  };

  /* ---------- toast ---------- */
  OPS.toast = function (msg, kind) {
    var t = document.getElementById('ops-toast');
    if (!t) {
      t = document.createElement('div');
      t.id = 'ops-toast';
      t.style.cssText = 'position:fixed;left:50%;bottom:26px;transform:translateX(-50%);z-index:9999;' +
        'max-width:min(92vw,460px);padding:11px 16px;border-radius:7px;font:700 11px Inter,system-ui,sans-serif;' +
        'box-shadow:0 12px 30px rgba(23,36,45,.22);opacity:0;transition:opacity .18s,transform .18s;pointer-events:none;';
      document.body.appendChild(t);
    }
    t.textContent = msg;
    t.style.background = kind === 'error' ? '#B4514A' : kind === 'warn' ? '#8A6414' : '#17242D';
    t.style.color = '#fff';
    t.style.opacity = '1';
    t.style.transform = 'translateX(-50%) translateY(0)';
    clearTimeout(OPS._tt);
    OPS._tt = setTimeout(function () {
      t.style.opacity = '0';
      t.style.transform = 'translateX(-50%) translateY(8px)';
    }, 2800);
  };

  /* ---------- bannière d'état ---------- */
  OPS.banner = function (title, html, kind) {
    var host = document.getElementById('ops-banner');
    if (!host) return;
    if (!title) { host.hidden = true; host.innerHTML = ''; return; }
    host.hidden = false;
    host.style.background = kind === 'error' ? '#FBE9E7' : '#FBF3E4';
    host.style.borderColor = kind === 'error' ? '#EBC6C1' : '#E7CFA8';
    host.style.color = kind === 'error' ? '#8F3129' : '#7A5A18';
    host.innerHTML = '<span aria-hidden="true">⚠</span><div><strong style="display:block;margin-bottom:2px">' +
      OPS.esc(title) + '</strong>' + html + '</div>';
  };

  OPS.MIGRATION_MSG = 'La migration <code>sql/ops-install.sql</code> n’a pas été exécutée sur Supabase. ' +
    'La table <code>{t}</code> est introuvable : cette page ne peut rien afficher.';

  OPS.isMissing = function (err) {
    var m = (err && (err.message || err.hint || err.details)) || '';
    return /does not exist|undefined table|schema cache|Could not find the table|relation .* does not exist/i.test(m);
  };

  var PREVIEW_BLOCK_MESSAGE = 'Aperçu agent : cette action n’est pas enregistrée dans les données réelles.';
  var PREVIEW_READ_RPCS = ['pgv_get_attendance_self_day','pgv_get_team_presence_live','pgv_get_team_attendance_events'];
  function blockedBuilder() {
    var result={data:null,error:{message:PREVIEW_BLOCK_MESSAGE}};
    var b={select:function(){return b;},eq:function(){return b;},in:function(){return b;},gte:function(){return b;},lte:function(){return b;},order:function(){return b;},limit:function(){return b;},single:function(){return Promise.resolve(result);},maybeSingle:function(){return Promise.resolve(result);},then:function(resolve,reject){return Promise.resolve(result).then(resolve,reject);}};
    return b;
  }
  function previewQuery(builder) {
    if (!builder || typeof builder!=='object') return builder;
    return new Proxy(builder,{get:function(target,prop){
      if (['insert','upsert','update','delete'].indexOf(String(prop))>=0) return function(){return blockedBuilder();};
      if (prop==='then') return function(resolve,reject){return target.then(resolve,reject);};
      var value=Reflect.get(target,prop,target);
      if (typeof value!=='function') return value;
      return function(){var result=value.apply(target,arguments);return result&&typeof result==='object'?previewQuery(result):result;};
    }});
  }
  function previewDatabase(db) {
    if (!db || typeof Proxy==='undefined') return db;
    return new Proxy(db,{get:function(target,prop){
      if (prop==='from') return function(table){return previewQuery(target.from(table));};
      if (prop==='rpc') return function(name,args){
        if (PREVIEW_READ_RPCS.indexOf(name)<0) return Promise.resolve({data:null,error:{message:PREVIEW_BLOCK_MESSAGE}});
        return target.rpc(name,args);
      };
      if (prop==='auth') {
        var auth=target.auth;
        return new Proxy(auth,{get:function(a,k){
          if (['updateUser','signInWithPassword','resetPasswordForEmail'].indexOf(String(k))>=0) return function(){return Promise.resolve({data:null,error:{message:PREVIEW_BLOCK_MESSAGE}});};
          var fn=Reflect.get(a,k,a); return typeof fn==='function'?fn.bind(a):fn;
        }});
      }
      var value=Reflect.get(target,prop,target); return typeof value==='function'?value.bind(target):value;
    }});
  }

  /* ---------- navigation ---------- */
  var NAV = [
    { key: 'dashboard', href: 'pgv-dashboard.html', icon: '▦', label: 'Vue d’ensemble' },
    { key: 'calendrier', href: 'calendrier.html?activity=pgv', icon: '▤', label: 'Calendrier' },
    { key: 'emails', href: 'emails.html?activity=pgv', icon: '✉', label: 'Emails' },
    { key: 'rapports', href: 'rapports.html?activity=pgv', icon: '⇩', label: 'Rapports' },
    { key: 'attendance', href: 'attendance.html?activity=pgv', icon: '◔', label: 'Présence' },
    { key: 'planning', href: 'planning.html?activity=pgv', icon: '◷', label: 'Planning' },
    { key: 'account', href: 'mon-compte.html', icon: '◎', label: 'Mon compte', roles: ['agent'] },
    { key: 'administration', href: 'administration.html', icon: '⚙', label: 'Administration',
      roles: ['admin', 'super_admin'] },
    { key: 'agent-preview', href: 'agent-preview.html', icon: '▷', label: 'Tester vue agent', roles: ['super_admin'] }
  ];

  OPS.renderShell = function (opts) {
    var active = opts.active;
    var profile = opts.profile || {};
    var initials = (profile.displayName || profile.email || 'PG').replace(/[^A-Za-zÀ-ÿ]/g, '').slice(0, 2).toUpperCase() || 'PG';
    var role = profile.role || 'agent';
    var roleLabel = { superviseur: 'Superviseur', admin: 'Admin', super_admin: 'Super admin', qualite: 'Qualité', agent: 'Agent' }[role] || role;

    var aside = document.querySelector('.sidebar');
    if (aside) {
      aside.innerHTML =
        '<a class="brand" href="index.html" aria-label="ACX Sigma, accueil"><img class="brand-logo" src="assets/acx-sigma-logo-light.svg" alt="ACX Sigma"></a>' +
        '<div class="workspace"><span class="workspace-label">Espace client</span>' +
          '<div class="workspace-name"><span class="workspace-icon">P</span><span>PGV</span></div>' +
          '<span class="workspace-sub">Protégez-Vous · SAC</span></div>' +
        '<span class="nav-label">Espace de travail</span>' +
        '<nav class="side-nav" aria-label="Navigation principale">' +
          NAV.filter(function (n) { return (!n.roles || n.roles.indexOf(role) >= 0) && !(profile.isAgentPreview && n.key === 'account'); }).map(function (n) {
            var href=n.href;
            if(profile.isAgentPreview){
              var u=new URL(href,window.location.href);u.searchParams.set('activity','pgv');u.searchParams.set('agent_preview','1');u.searchParams.set('agent_id',profile.agentId);href=u.pathname.split('/').pop()+u.search;
            }
            return '<a class="' + (n.key === active ? 'active' : '') + '" href="' + href + '">' +
              '<span class="nav-icon">' + n.icon + '</span>' + n.label + '</a>';
          }).join('') +
        '</nav>' +
        '<div class="sidebar-bottom">' +
          '<div class="sidebar-user"><span class="avatar">' + OPS.esc(initials) + '</span>' +
            '<span class="user-meta"><strong id="sidebar-name">' + OPS.esc(profile.displayName || 'Utilisateur') + '</strong>' +
            '<small id="sidebar-role">' + OPS.esc(roleLabel) + ' · PGV</small></span></div>' +
          '<a class="top-link" id="logout-link" href="login.html" style="display:block;margin-top:10px;font-size:9px;color:#B9C3C5">Quitter l’espace</a>' +
        '</div>';
    }

    var top = document.querySelector('.topbar');
    if (top) {
      top.innerHTML =
        '<div class="mobile-brand"><img class="brand-logo brand-logo--compact" src="assets/acx-sigma-logo.svg" alt="ACX Sigma"></div>' +
        '<div class="crumbs"><span>PGV</span><span class="crumb-dot">/</span><strong>' + OPS.esc(opts.title || '') + '</strong></div>' +
        '<div class="top-actions" id="top-actions">' + (opts.actions || '') + '</div>';
    }

    var lo = document.getElementById('logout-link');
    if (lo) lo.addEventListener('click', function (e) {
      e.preventDefault();
      Promise.resolve(window.sigmaSupabase && window.sigmaSupabase.signOut()).catch(function () {})
        .then(function () { location.href = 'login.html'; });
    });
  };

  /* ---------- démarrage ---------- */
  OPS.boot = function (opts) {
    return (async function () {
      var realProfile = null;
      try { realProfile = await window.__SIGMA_READY; } catch (e) { realProfile = null; }
      if (!realProfile) return null;                       // redirection déjà faite
      var db = null;
      try { db = await window.sigmaSupabase.getClient(); } catch (e) {}
      var profile=realProfile, isPreview=false;
      var params=new URLSearchParams(window.location.search);
      if(realProfile.role==='super_admin' && params.get('agent_preview')==='1'){
        var agentId=params.get('agent_id');
        try{
          var result=await db.from('agents').select('id,full_name,staff_id,activity,active').eq('id',agentId).eq('activity','pgv').maybeSingle();
          if(result.error||!result.data||result.data.active===false) throw new Error('Agent PGV actif introuvable.');
          profile=Object.assign({},realProfile,{role:'agent',activity:'pgv',agentId:result.data.id,agentName:result.data.full_name,
            displayName:result.data.full_name,isAgentPreview:true,realRole:'super_admin'});
          db=previewDatabase(db);
          var originalGetClient=window.sigmaSupabase.getClient;
          window.sigmaSupabase.getClient=function(){return Promise.resolve(originalGetClient()).then(previewDatabase);};
          isPreview=true;
        }catch(error){
          OPS.renderShell({active:opts.active,title:opts.title,profile:realProfile,actions:opts.actions});
          OPS.banner('Aperçu agent indisponible',OPS.esc(error.message||error),'error');
          return null;
        }
      }
      var isManager = !isPreview && ['superviseur', 'admin', 'super_admin'].indexOf(profile.role) >= 0;
      OPS.renderShell({ active: opts.active, title: opts.title, profile: profile, actions: opts.actions });
      if(isPreview) OPS.banner('Mode test · vue agent',
        'Tu consultes Sigma comme <b>'+OPS.esc(profile.displayName)+'</b>. Les écritures et changements de mot de passe sont bloqués; aucune donnée réelle ne sera modifiée. <a href="agent-preview.html" style="font-weight:800;color:inherit">Quitter l’aperçu</a>.','warn');
      return { profile: profile, db: db, isManager: isManager, isAgent: profile.role === 'agent', isPreview:isPreview };
    })();
  };

  OPS.navFor = function (role) {
    return NAV.filter(function (n) { return !n.roles || n.roles.indexOf(role) >= 0; });
  };

  window.OPS = OPS;
})();
