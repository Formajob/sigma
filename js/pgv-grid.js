(function () {
  'use strict';

  var PGV_GRID = [
    { code:'CTB-01', cat:'CTB', step:2, weight:3, critical:true,  na:false },
    { code:'CTB-02', cat:'CTB', step:2, weight:2, critical:false, na:false },
    { code:'CTB-03', cat:'CTB', step:3, weight:2, critical:false, na:false },
    { code:'CTB-04', cat:'CTB', step:4, weight:3, critical:true,  na:false },
    { code:'CTB-05', cat:'CTB', step:4, weight:3, critical:false, na:false },
    { code:'CTB-06', cat:'CTB', step:4, weight:3, critical:true,  na:false },
    { code:'CTB-07', cat:'CTB', step:4, weight:2, critical:false, na:false },
    { code:'CTB-08', cat:'CTB', step:5, weight:2, critical:false, na:true  },
    { code:'CTB-09', cat:'CTB', step:5, weight:2, critical:false, na:false },
    { code:'CTB-10', cat:'CTB', step:6, weight:1, critical:false, na:false },
    { code:'CTC-01', cat:'CTC', step:1, weight:1, critical:false, na:false },
    { code:'CTC-02', cat:'CTC', step:1, weight:2, critical:false, na:false },
    { code:'CTC-03', cat:'CTC', step:3, weight:2, critical:false, na:false },
    { code:'CTC-04', cat:'CTC', step:4, weight:2, critical:false, na:false },
    { code:'CTC-05', cat:'CTC', step:4, weight:2, critical:false, na:false },
    { code:'CTC-06', cat:'CTC', step:4, weight:3, critical:false, na:true  },
    { code:'CTC-07', cat:'CTC', step:4, weight:2, critical:false, na:true  },
    { code:'CTC-08', cat:'CTC', step:5, weight:1, critical:false, na:true  },
    { code:'CTC-09', cat:'CTC', step:6, weight:2, critical:false, na:false },
    { code:'CTC-10', cat:'CTC', step:0, weight:1, critical:false, na:false }
   ,
    { code:'NC-01', cat:'NC', step:0, weight:1, critical:false, na:false },
    { code:'NC-02', cat:'NC', step:0, weight:1, critical:false, na:false },
    { code:'NC-03', cat:'NC', step:0, weight:1, critical:false, na:false },
    { code:'NC-04', cat:'NC', step:0, weight:1, critical:false, na:false },
    { code:'NC-05', cat:'NC', step:0, weight:1, critical:false, na:false },
    { code:'NC-06', cat:'NC', step:0, weight:2, critical:false, na:false },
    { code:'NC-07', cat:'NC', step:0, weight:2, critical:false, na:false },
    { code:'NC-08', cat:'NC', step:0, weight:2, critical:false, na:false },
    { code:'NC-09', cat:'NC', step:0, weight:3, critical:true,  na:false },
    { code:'NC-10', cat:'NC', step:0, weight:3, critical:true,  na:false },
    { code:'NC-11', cat:'NC', step:0, weight:1, critical:false, na:false }
  ];

  var PGV_FAMILIES = {
    CTB: { name:'CTB · Traitement & conformité', short:'Traitement',  note:'Le parcours SAC et les règles qu\'on ne transige pas.' },
    CTC: { name:'CTC · Relation client',         short:'Relation',    note:'Ce que le client vit et comprend : accueil, reformulation, clarté, réclamation, clôture.' },
    NC:  { name:'NC · Savoir être',              short:'Savoir être', note:'La manière de le dire : V.A.T.R.E, professionnalisme, écoute active, empathie, maîtrise de soi.' }
  };

  var PGV_OBJECTIFS = {
    scoreCible: 85,
    conformiteExigee: true,
    calibragesParMois: 4,
    ecoutesCroiseesParMois: 1,
    progressionCible: 3
  };

  var PGV_STEPS = {
    0: 'Transverse',
    1: '1 · Réception',
    2: '2 · Identification',
    3: '3 · Qualification',
    4: '4 · Traitement',
    5: '5 · Escalade',
    6: '6 · Clôture'
  };

  function pgvScore(values) {
    var oui = 0, evalue = 0, repondu = 0;
    var critKO = [];
    var fam = {};
    Object.keys(PGV_FAMILIES).forEach(function (k) { fam[k] = { oui: 0, evalue: 0, pct: null }; });

    PGV_GRID.forEach(function (g, i) {
      var v = values[i], w = g.weight;
      if (v === 'Oui') {
        oui += w; evalue += w;
        fam[g.cat].oui += w; fam[g.cat].evalue += w;
        repondu++;
      } else if (v === 'Non') {
        evalue += w;
        fam[g.cat].evalue += w;
        repondu++;
        if (g.critical) critKO.push(g.code);
      } else if (v === 'N/A') {
        repondu++;
      }
    });

    Object.keys(fam).forEach(function (k) {
      var f = fam[k];
      f.pct = f.evalue ? Math.round(f.oui / f.evalue * 100) : null;
    });

    var pct = evalue ? Math.round(oui / evalue * 100) : 0;
    var complet = repondu === PGV_GRID.length;

    var niveau;
    if (!complet) niveau = 'incomplet';
    else if (critKO.length > 0) niveau = 'nc';
    else if (pct >= 90) niveau = 'excellent';
    else if (pct >= 85) niveau = 'conforme';
    else if (pct >= 70) niveau = 'consolider';
    else niveau = 'critique';

    return {
      pct: pct,
      fam: fam,
      complet: complet,
      critKO: critKO,
      nonConforme: critKO.length > 0,
      niveau: niveau,
      totalPoints: evalue,
      obtenuPoints: oui
    };
  }

  window.PGV_GRID = PGV_GRID;
  window.PGV_FAMILIES = PGV_FAMILIES;
  window.PGV_OBJECTIFS = PGV_OBJECTIFS;
  window.PGV_STEPS = PGV_STEPS;
  window.pgvScore = pgvScore;

  window.pgvElementCountByFamily = function () {
    var c = {};
    Object.keys(PGV_FAMILIES).forEach(function (k) { c[k] = 0; });
    PGV_GRID.forEach(function (g) { c[g.cat]++; });
    return c;
  };

  window.pgvElementCountByStep = function () {
    var c = {};
    for (var s = 0; s <= 6; s++) c[s] = 0;
    PGV_GRID.forEach(function (g) { c[g.step]++; });
    return c;
  };

  window.pgvWeightByFamily = function () {
    var w = {};
    Object.keys(PGV_FAMILIES).forEach(function (k) { w[k] = 0; });
    PGV_GRID.forEach(function (g) { w[g.cat] += g.weight; });
    return w;
  };

  window.pgvWeightByStep = function () {
    var w = {};
    for (var s = 0; s <= 6; s++) w[s] = 0;
    PGV_GRID.forEach(function (g) { w[g.step] += g.weight; });
    return w;
  };

})();