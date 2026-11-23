/* ============================================================
   Sigma · rapports
   - SigmaReport.pdf(doc)  : construit un PDF A4 avec en-tête logo
   - SigmaReport.print(doc): même rapport, imprimé par le navigateur
   window.SigmaReport.open(doc) → PDF si la librairie est là, sinon impression.
   ============================================================ */
(function () {
  'use strict';

  /* logo ACX Sigma, PNG sur fond encre — embarqué pour ne dépendre d'aucun réseau */
  window.SIGMA_LOGO_DATA = 'data:image/png;base64,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';


  /* thème du rapport : PGV (SAC) ou VDM (marchandise) */
  var THEME = 'pgv';
  function sub(txt) {
    if (txt == null) return '';
    var t = String(txt);
    if (THEME === 'vdm') {
      t = t.replace(/\bPGV\b/g, 'VDM')
           .replace(/Protégez-Vous · Service après-vente/g, 'Vérification des marchandises')
           .replace(/Protégez-Vous/g, 'Vérification des marchandises')
           .replace(/Service après-vente/g, 'SAC marchandises');
    }
    return t;
  }

  var C = {
    ink: [23, 36, 45],
    copper: [192, 98, 45],
    muted: [122, 134, 139],
    line: [224, 220, 212],
    soft: [247, 245, 241],
    ok: [47, 107, 79],
    bad: [158, 59, 52]
  };

  function hex(rgb) { return '#' + rgb.map(function (v) { return v.toString(16).padStart(2, '0'); }).join(''); }

  /* ---------- mise en page simple ---------- */
  function layout(doc, W, H, M) {
    return { doc: doc, W: W, H: H, M: M, y: M, page: 0, pages: [] };
  }
  function newPage(L) {
    L.page++;
    // la première page existe déjà dans jsPDF
    if (L.page > 1) L.doc.addPage([L.W, L.H]);
    L.y = L.M;
    header(L);
    return L;
  }
  function header(L) {
    var d = L.doc;
    d.setFillColor(C.ink[0], C.ink[1], C.ink[2]); d.rect(0, 0, L.W, 64, 'F');
    d.setFillColor(C.copper[0], C.copper[1], C.copper[2]); d.rect(0, 64, L.W, 3, 'F');
    // logo ACX Sigma, déjà rendu sur fond encre
    var logoW = 96, logoH = logoW * 118 / 549;
    try { d.addImage(window.SIGMA_LOGO_DATA, 'PNG', L.M, 14, logoW, logoH, undefined, 'FAST'); } catch (e) {}
    d.setFont('helvetica', 'normal'); d.setFontSize(7.5);
    d.setTextColor(176, 187, 190);
    d.text(sub('Protégez-Vous · Service après-vente'), L.M, 52);
    d.setTextColor(255, 255, 255);
    d.setFont('helvetica', 'bold'); d.setFontSize(8);
    d.text((L.doc._sigmaTitle || '').toUpperCase(), L.W - L.M, 36, { align: 'right' });
    d.setFont('helvetica', 'normal'); d.setFontSize(8);
    d.setTextColor(196, 204, 207);
    d.text(L.doc._sigmaPeriod || '', L.W - L.M, 49, { align: 'right' });
    L.y = 96;
  }
  function footer(L) {
    var d = L.doc, i;
    for (i = 0; i < L.page; i++) {
      d.setPage(i + 1);
      d.setDrawColor(C.line[0], C.line[1], C.line[2]); d.setLineWidth(0.4);
      d.line(L.M, L.H - 42, L.W - L.M, L.H - 42);
      d.setFont('helvetica', 'normal'); d.setFontSize(7); d.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
      d.text('Généré par Sigma le ' + new Date().toLocaleString('fr-MA'), L.M, L.H - 32);
      d.text('Page ' + (i + 1) + ' / ' + L.page, L.W - L.M, L.H - 32, { align: 'right' });
    }
    d.setPage(L.page);
  }
  function ensure(L, need) {
    if (L.y + need > L.H - 60) newPage(L);
  }

  /* On mesure la hauteur d'une section avant de la poser : si elle ne tient pas
     sur la page courante, elle commence sur une nouvelle page ; si elle dépasse
     une page entière, elle est découpée (tableaux) ou posée telle quelle. */
  function sectionHeight(L, sec) {
    if (sec.type === 'table') {
      var rows = sec.rows || [];
      var totalW = L.W - L.M * 2;
      var weights = sec.columns.map(function (c) { return c.w || 1; });
      var sum = weights.reduce(function (a, b) { return a + b; }, 0);
      var widths = weights.map(function (w) { return (w / sum) * totalW; });
      var h = (sec.title ? 18 : 0) + (sec.note ? 14 : 0) + 18 /* en-tête */ + 8;
      rows.forEach(function (r) {
        L.doc.setFont('helvetica', 'normal'); L.doc.setFontSize(7.4);
        var maxL = 1;
        sec.columns.forEach(function (c, i) {
          var str = r[c.key] == null || r[c.key] === '' ? '—' : String(r[c.key]);
          maxL = Math.max(maxL, L.doc.splitTextToSize(str, widths[i] - 7).length);
        });
        h += Math.max(16, maxL * 8.6 + 4);
      });
      return h;
    }
    if (sec.type === 'bars') return (sec.title ? 18 : 0) + (sec.items || []).length * 15 + 8;
    if (sec.type === 'kpis') return (sec.title ? 18 : 0) + 62;
    if (sec.type === 'text') return (sec.title ? 18 : 0) + 30;
    if (sec.type === 'signature') return 62;
    return 24;
  }

  function h1(L, txt) {
    ensure(L, 26);
    L.doc.setFont('helvetica', 'bold'); L.doc.setFontSize(15); L.doc.setTextColor(C.ink[0], C.ink[1], C.ink[2]);
    L.doc.text(txt, L.M, L.y + 8);
    L.y += 22;
  }
  function h2(L, txt, need) {
    // un titre ne doit jamais rester seul en bas de page
    ensure(L, 20 + (need || 46));
    if (L.y > L.M + 30) L.y += 10;                 // air entre deux sections
    L.doc.setFont('helvetica', 'bold'); L.doc.setFontSize(10); L.doc.setTextColor(C.copper[0], C.copper[1], C.copper[2]);
    L.doc.text(String(txt).toUpperCase(), L.M, L.y + 6);
    L.doc.setDrawColor(C.line[0], C.line[1], C.line[2]); L.doc.setLineWidth(0.4);
    L.doc.line(L.M, L.y + 10, L.W - L.M, L.y + 10);
    L.y += 18;
  }
  function para(L, txt, opts) {
    opts = opts || {};
    L.doc.setFont('helvetica', opts.bold ? 'bold' : 'normal');
    L.doc.setFontSize(opts.size || 9);
    var pc = opts.color || C.ink; L.doc.setTextColor(pc[0], pc[1], pc[2]);
    var maxW = L.W - L.M * 2;
    var lines = L.doc.splitTextToSize(String(txt || ''), maxW);
    var lh = (opts.size || 9) * 1.45;
    lines.forEach(function (line) {
      if (L.y + lh > L.H - 60) newPage(L);
      L.doc.text(line, L.M, L.y + lh - 3);
      L.y += lh;
    });
    L.y += opts.space == null ? 4 : opts.space;
  }

  /* ---------- KPI ---------- */
  function kpis(L, items) {
    var perRow = 4, gap = 8;
    var w = (L.W - L.M * 2 - gap * (perRow - 1)) / perRow;
    var h = 46;
    items.forEach(function (it, i) {
      var col = i % perRow;
      if (col === 0) { ensure(L, h + 10); }
      var x = L.M + col * (w + gap);
      var top = L.y;
      L.doc.setFillColor(C.soft[0], C.soft[1], C.soft[2]); L.doc.rect(x, top, w, h, 'F');
      L.doc.setFillColor(C.copper[0], C.copper[1], C.copper[2]); L.doc.rect(x, top, 2, h, 'F');
      L.doc.setFont('helvetica', 'normal'); L.doc.setFontSize(6.5); L.doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
      L.doc.text(String(it.label).toUpperCase(), x + 8, top + 13, { maxWidth: w - 12 });
      L.doc.setFont('helvetica', 'bold'); L.doc.setFontSize(15); L.doc.setTextColor(C.ink[0], C.ink[1], C.ink[2]);
      L.doc.text(String(it.value), x + 8, top + 31);
      if (it.foot) {
        L.doc.setFont('helvetica', 'normal'); L.doc.setFontSize(6);
        L.doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
        L.doc.text(String(it.foot), x + 8, top + 40, { maxWidth: w - 12 });
      }
      if (col === perRow - 1 || i === items.length - 1) L.y = top + h + gap;
    });
    L.y += 4;
  }

  /* ---------- tableau ---------- */
  function table(L, opts) {
    var cols = opts.columns, rows = opts.rows || [];
    var totalW = L.W - L.M * 2;
    var weights = cols.map(function (c) { return c.w || 1; });
    var sum = weights.reduce(function (a, b) { return a + b; }, 0);
    var widths = weights.map(function (w) { return (w / sum) * totalW; });
    var headH = 18, baseH = 16, lineH = 8.6;

    function head() {
      // chaque en-tête reste d'un seul mot : on ajuste la taille de police
      // plutôt que de couper un mot en deux
      var heads = cols.map(function (c, i) {
        var label = String(c.label).toUpperCase();
        var fs = 6.6;
        L.doc.setFont('helvetica', 'bold');
        while (fs > 4.8) {
          L.doc.setFontSize(fs);
          if (L.doc.getTextWidth(label) <= widths[i] - 5) break;
          fs -= 0.2;
        }
        L.doc.setFontSize(fs);
        return { lines: L.doc.splitTextToSize(label, widths[i] - 5), fs: fs, label: label };
      });
      var hLines = heads.reduce(function (m, x) { return Math.max(m, x.lines.length); }, 1);
      var h = Math.max(headH, hLines * 7.8 + 8);

      ensure(L, h + baseH);
      var x = L.M;
      L.doc.setFillColor(C.ink[0], C.ink[1], C.ink[2]); L.doc.rect(L.M, L.y, totalW, h, 'F');
      cols.forEach(function (c, i) {
        L.doc.setFont('helvetica', 'bold'); L.doc.setFontSize(heads[i].fs);
        L.doc.setTextColor(255, 255, 255);
        var al = c.align || 'left';
        var tx = al === 'right' ? x + widths[i] - 3 : x + 3;
        for (var li = 0; li < heads[i].lines.length; li++) {
          L.doc.text(heads[i].lines[li], tx, L.y + 10 + li * 7.4, { align: al });
        }
        x += widths[i];
      });
      L.y += h;
    }

    head();
    rows.forEach(function (r, ri) {
      // mesure : la hauteur de la ligne est celle de la colonne la plus bavarde
      var cells = cols.map(function (c, i) {
        var str = r[c.key] == null || r[c.key] === '' ? '—' : String(r[c.key]);
        L.doc.setFont('helvetica', c.bold ? 'bold' : 'normal');
        L.doc.setFontSize(7.4);
        return { c: c, i: i, str: str, lines: L.doc.splitTextToSize(str, widths[i] - 7) };
      });
      var maxLines = cells.reduce(function (m, x) { return Math.max(m, x.lines.length); }, 1);
      var rowH = Math.max(baseH, maxLines * lineH + 4);

      if (L.y + rowH > L.H - 60) { newPage(L); head(); }
      if (ri % 2 === 0) { L.doc.setFillColor(252, 251, 249); L.doc.rect(L.M, L.y, totalW, rowH, 'F'); }

      cells.forEach(function (x) {
        var c = x.c, i = x.i;
        var al = c.align || 'left';
        var tx = al === 'right' ? L.M + widths.slice(0, i + 1).reduce(function (a, b) { return a + b; }, 0) - 4
                                : L.M + widths.slice(0, i).reduce(function (a, b) { return a + b; }, 0) + 4;
        L.doc.setFont('helvetica', c.bold ? 'bold' : 'normal');
        L.doc.setFontSize(7.4);
        var col = C.ink;
        if (typeof c.color === 'function') { var cc = c.color(r[c.key], r); if (cc) col = cc; }
        L.doc.setTextColor(col[0], col[1], col[2]);
        for (var li = 0; li < x.lines.length; li++) {
          L.doc.text(x.lines[li], tx, L.y + 10.5 + li * lineH, { align: al });
        }
      });

      L.doc.setDrawColor(C.line[0], C.line[1], C.line[2]); L.doc.setLineWidth(0.3);
      L.doc.line(L.M, L.y + rowH, L.W - L.M, L.y + rowH);
      L.y += rowH;
    });
    L.y += 8;
  }
  /* ---------- barres ---------- */
  function bars(L, items, opts) {
    opts = opts || {};
    var max = opts.max || 100;
    var rowH = 15;
    items.forEach(function (it) {
      ensure(L, rowH + 2);
      var labelW = 150, barW = L.W - L.M * 2 - labelW - 70;
      L.doc.setFont('helvetica', 'normal'); L.doc.setFontSize(7.5); L.doc.setTextColor(C.ink[0], C.ink[1], C.ink[2]);
      L.doc.text(String(it.label), L.M, L.y + 9, { maxWidth: labelW - 6 });
      var x0 = L.M + labelW;
      L.doc.setFillColor(238, 235, 229);
      L.doc.rect(x0, L.y + 3, barW, 7, 'F');
      var pct = Math.max(0, Math.min(1, (it.value || 0) / max));
      var ic = it.color || C.copper; L.doc.setFillColor(ic[0], ic[1], ic[2]);
      L.doc.rect(x0, L.y + 3, barW * pct, 7, 'F');
      L.doc.setFont('helvetica', 'bold'); L.doc.setFontSize(7.5); L.doc.setTextColor(C.ink[0], C.ink[1], C.ink[2]);
      L.doc.text(String(it.display != null ? it.display : it.value), L.W - L.M, L.y + 9, { align: 'right' });
      L.y += rowH;
    });
    L.y += 6;
  }

  /* ---------- API ---------- */
  function buildPdf(doc) {
    THEME = (doc && doc.theme) || 'pgv';
    var jsPDF = (window.jspdf && window.jspdf.jsPDF) || window.jsPDF;
    if (!jsPDF) return null;
    var W = 595.28, H = 841.89, M = 44;
    var pdf = new jsPDF({ unit: 'pt', format: 'a4', compress: true });
    pdf._sigmaTitle = sub(doc.title || 'Rapport');
    pdf._sigmaPeriod = sub(doc.period || '');
    var L = layout(pdf, W, H, M);
    L.page = 0;
    newPage(L);
    if (doc.period) {
      L.doc.setFont('helvetica', 'bold'); L.doc.setFontSize(9);
      L.doc.setTextColor(C.copper[0], C.copper[1], C.copper[2]);
      var tTitle = sub(doc.title || 'Rapport');
      L.doc.text(tTitle, L.M, L.y + 10);
      var tW = L.doc.getTextWidth(tTitle);
      L.doc.setFont('helvetica', 'normal'); L.doc.setFontSize(8);
      L.doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
      L.doc.text(sub(doc.period), L.M + tW + 9, L.y + 10);
      L.y += 18;
    } else {
      L.doc.setFont('helvetica', 'bold'); L.doc.setFontSize(11);
      L.doc.setTextColor(C.ink[0], C.ink[1], C.ink[2]);
      L.doc.text(sub(doc.title || 'Rapport'), L.M, L.y + 11);
      L.y += 20;
    }
    if (doc.intro) { para(L, sub(doc.intro), { size: 8.5, color: C.muted }); L.y += 4; }
    (doc.sections || []).forEach(function (sec) {
      // une section courte ne se coupe pas : on l'envoie sur la page suivante
      var need = sectionHeight(L, sec);
      var usable = L.H - 60 - (L.M + 22);        // hauteur utile hors bandeau
      if (need <= usable && L.y + need > L.H - 60) newPage(L);
      if (sec.type === 'kpis') {
        if (sec.title) h2(L, sub(sec.title));
        kpis(L, sec.items || []);
      } else if (sec.type === 'table') {
        var estH = 24 + Math.min(4, (sec.rows || []).length) * 16 + (sec.note ? 14 : 0);
        if (sec.title) h2(L, sub(sec.title), estH);
        // le titre est déjà posé : on mesure le reste de la section
        if (sec.note) para(L, sec.note, { size: 7.5, color: C.muted, space: 6 });
        table(L, sec);
      } else if (sec.type === 'bars') {
        if (sec.title) h2(L, sub(sec.title), 20 + Math.min(6, (sec.items || []).length) * 15);
        bars(L, sec.items || [], sec);
      } else if (sec.type === 'text') {
        if (sec.title) h2(L, sub(sec.title), 50);
        para(L, sec.text, { size: 8.5 });
      } else if (sec.type === 'signature') {
        ensure(L, 70);
        L.y += 14;
        var half = (L.W - L.M * 2 - 24) / 2;
        [['Le superviseur', sec.left || ''], ['L’agent', sec.right || '']].forEach(function (s, i) {
          var x = L.M + i * (half + 24);
          L.doc.setDrawColor(C.line[0], C.line[1], C.line[2]); L.doc.setLineWidth(0.5);
          L.doc.line(x, L.y, x + half, L.y);
          L.doc.setFont('helvetica', 'normal'); L.doc.setFontSize(7); L.doc.setTextColor(C.muted[0], C.muted[1], C.muted[2]);
          L.doc.text(s[0], x, L.y + 10);
          if (s[1]) L.doc.text(s[1], x, L.y + 19);
        });
        L.y += 40;
      }
    });
    footer(L);
    return pdf;
  }

  function buildPrint(doc) {
    THEME = (doc && doc.theme) || 'pgv';
    var body = '';
    (doc.sections || []).forEach(function (sec) {
      if (sec.title) body += '<h2>' + esc(sub(sec.title)) + '</h2>';
      if (sec.type === 'kpis') {
        body += '<div class="kpis">' + (sec.items || []).map(function (it) {
          return '<div class="kpi"><small>' + esc(it.label) + '</small><b>' + esc(it.value) + '</b>' +
            (it.foot ? '<em>' + esc(it.foot) + '</em>' : '') + '</div>';
        }).join('') + '</div>';
      } else if (sec.type === 'table') {
        body += '<table><thead><tr>' + sec.columns.map(function (c) {
          return '<th' + (c.align === 'right' ? ' class="r"' : '') + '>' + esc(c.label) + '</th>';
        }).join('') + '</tr></thead><tbody>' + (sec.rows || []).map(function (r) {
          return '<tr>' + sec.columns.map(function (c) {
            return '<td' + (c.align === 'right' ? ' class="r"' : '') + '>' + esc(r[c.key] == null ? '—' : r[c.key]) + '</td>';
          }).join('') + '</tr>';
        }).join('') + '</tbody></table>';
      } else if (sec.type === 'bars') {
        body += '<div class="bars">' + (sec.items || []).map(function (it) {
          return '<div class="bar"><span>' + esc(it.label) + '</span>' +
            '<i><b style="width:' + Math.max(0, Math.min(100, it.value || 0)) + '%"></b></i>' +
            '<strong>' + esc(it.display != null ? it.display : it.value) + '</strong></div>';
        }).join('') + '</div>';
      } else if (sec.type === 'text') {
        body += '<p>' + esc(sec.text) + '</p>';
      } else if (sec.type === 'signature') {
        body += '<div class="sig"><div><span>Le superviseur</span><em>' + esc(sec.left || '') + '</em></div>' +
          '<div><span>L’agent</span><em>' + esc(sec.right || '') + '</em></div></div>';
      }
    });
    var logo = window.SIGMA_LOGO_DATA || '';
    return '<!doctype html><html lang="fr"><head><meta charset="utf-8"><title>' + esc(doc.title) + '</title>' +
      '<style>@page{size:A4;margin:14mm}body{font:10px/1.5 "Helvetica Neue",Arial,sans-serif;color:#17242D;margin:0}' +
      'header{display:flex;justify-content:space-between;align-items:flex-end;border-bottom:2px solid #C0622D;padding-bottom:8px;margin-bottom:18px}' +
      'header img{height:26px}header .r{text-align:right;font-size:8px;color:#7A868B}' +
      'header .r b{display:block;color:#17242D;font-size:10px;letter-spacing:.06em}h1{font:700 19px Georgia,serif;margin:0 0 4px}' +
      'h2{font:700 8.5px Arial;letter-spacing:.1em;text-transform:uppercase;color:#C0622D;border-bottom:1px solid #E0DCD4;padding-bottom:3px;margin:16px 0 8px}' +
      '.intro{color:#7A868B;font-size:9px;margin-bottom:10px}' +
      '.kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:7px}.kpi{background:#F7F5F1;border-left:2px solid #C0622D;padding:6px 8px}' +
      '.kpi small{display:block;font-size:6.5px;letter-spacing:.08em;text-transform:uppercase;color:#7A868B}' +
      '.kpi b{font-size:15px}.kpi em{display:block;font-size:6.5px;color:#7A868B;font-style:normal}' +
      'table{width:100%;border-collapse:collapse;font-size:8.5px;margin:6px 0 4px}th{background:#17242D;color:#fff;text-align:left;padding:5px 6px;font-size:7px;letter-spacing:.05em;text-transform:uppercase}' +
      'td{padding:4px 6px;border-bottom:1px solid #EFECE6}tr:nth-child(even) td{background:#FCFBF9}.r{text-align:right}' +
      '.bars .bar{display:grid;grid-template-columns:170px 1fr 46px;align-items:center;gap:8px;margin-bottom:4px;font-size:8.5px}' +
      '.bars i{background:#EEEBE5;height:7px;display:block;border-radius:2px;overflow:hidden}.bars i b{display:block;height:100%;background:#C0622D}' +
      '.sig{display:grid;grid-template-columns:1fr 1fr;gap:24px;margin-top:26px}.sig div{border-top:1px solid #C9C2B6;padding-top:5px;font-size:7.5px;color:#7A868B}' +
      '.sig em{display:block;font-style:normal;color:#17242D}' +
      'footer{position:fixed;bottom:0;left:0;right:0;border-top:1px solid #E0DCD4;padding-top:4px;font-size:7px;color:#7A868B;display:flex;justify-content:space-between}' +
      '@media print{footer{position:fixed}}</style></head><body>' +
      '<header><img src="' + logo + '" alt="ACX Sigma"><div class="r"><b>' + esc(sub(doc.title)) + '</b>' + esc(sub(doc.period || '')) + '</div></header>' +
      '<h1>' + esc(sub(doc.title)) + '</h1>' + (doc.intro ? '<p class="intro">' + esc(sub(doc.intro)) + '</p>' : '') +
      body +
      '<footer><span>Sigma · ' + (THEME === 'vdm' ? 'VDM' : 'PGV') + ' — généré le ' + new Date().toLocaleString('fr-MA') + '</span><span>Document interne</span></footer>' +
      '</body></html>';
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"]/g, function (c) {
      return ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c];
    });
  }

  function open(doc) {
    var pdf = buildPdf(doc);
    if (pdf) {
      pdf.save(doc.filename || 'sigma-rapport.pdf');
      return 'pdf';
    }
    // repli : impression directe dans une iframe, sans dépendance réseau
    var w = window.open('', '_blank');
    if (!w) { alert('Autorise les fenêtres pop-up pour générer le rapport.'); return null; }
    w.document.write(buildPrint(doc));
    w.document.close();
    setTimeout(function () { w.focus(); w.print(); }, 350);
    return 'print';
  }

  window.SigmaReport = { open: open, buildPdf: buildPdf, printDoc: buildPrint, hasPdf: function () {
    return !!((window.jspdf && window.jspdf.jsPDF) || window.jsPDF);
  } };
})();
