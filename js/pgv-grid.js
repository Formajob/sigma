/* ============================================================
   Sigma — Grille PGV synthétisée
   11 critères · 3 typologies · total historique préservé : 57 points
   legacyCodes liste les anciens critères fusionnés; sert à l'audit/migration.
   ============================================================ */
(function () {
  'use strict';

  var PGV_FAMILIES = {
    accueil: { name:'Accueil & compréhension', short:'Accueil & compréhension', note:'Accueil, écoute, compréhension et sécurisation de l’échange.' },
    traitement: { name:'Traitement & résolution', short:'Traitement & résolution', note:'Exactitude, conformité, traitement, traçabilité et résolution de la demande.' },
    posture: { name:'Communication & posture', short:'Communication & posture', note:'Qualité de communication, posture professionnelle et respect du client.' }
  };

  var PGV_GRID = [
    // Accueil & compréhension — 14 points
    { code:'PGV-01', legacyCodes:['CTC-01','CTC-10'], cat:'accueil', step:1, weight:2, critical:false, na:false,
      label:'Accueil personnalisé',
      critere:'Décroché dans le délai attendu, formule d’accueil complète et professionnelle; le nom du client est utilisé à bon escient.' },
    { code:'PGV-02', legacyCodes:['CTC-02','CTC-03','NC-07'], cat:'accueil', step:1, weight:6, critical:false, na:false,
      label:'Écoute active et reformulation',
      critere:'Laisser le client exposer sa demande sans l’interrompre, montrer une écoute active, reformuler ou synthétiser puis faire confirmer la compréhension.' },
    { code:'PGV-03', legacyCodes:['CTB-01','CTB-11'], cat:'accueil', step:1, weight:6, critical:true, na:false,
      label:'Identification et confidentialité',
      critere:'Vérifier l’identité avant d’accéder au dossier ou de communiquer une donnée; protéger les informations et ne rien révéler à un tiers non authentifié.' },

    // Traitement & résolution — 32 points
    { code:'PGV-04', legacyCodes:['CTB-04','CTC-04','CTC-05'], cat:'traitement', step:2, weight:7, critical:true, na:false,
      label:'Réponse exacte, pertinente et claire',
      critere:'Répondre à la demande avec une information vérifiée et conforme à la procédure, de façon claire, sans jargon ni digression.' },
    { code:'PGV-05', legacyCodes:['CTB-05','CTB-06'], cat:'traitement', step:2, weight:6, critical:true, na:false,
      label:'Procédure respectée et engagement autorisé',
      critere:'Appliquer toutes les étapes de la procédure, sans laisser un traitement partiel au client ni promettre un geste, délai ou exception hors mandat.' },
    { code:'PGV-06', legacyCodes:['CTB-07','CTB-12','CTB-10'], cat:'traitement', step:2, weight:5, critical:false, na:true,
      label:'Dossier tracé et mis à jour',
      critere:'Saisir les actions et le statut dans l’outil pendant l’appel; ajouter une note utile au dossier et clôturer correctement. N/A si aucune mise à jour ni note n’est requise.' },
    { code:'PGV-07', legacyCodes:['CTC-06','NC-08'], cat:'traitement', step:2, weight:5, critical:false, na:false,
      label:'Réclamation traitée avec empathie',
      critere:'Reconnaître la gêne ou l’émotion du client sans posture défensive, reformuler le problème et proposer une solution ou une alternative adaptée.' },
    { code:'PGV-08', legacyCodes:['CTB-08','CTC-07','CTC-08'], cat:'traitement', step:2, weight:5, critical:false, na:true,
      label:'Attente, transfert et escalade maîtrisés',
      critere:'Demander l’accord et expliquer une mise en attente; annoncer et présenter tout transfert; escalader au bon service avec un motif explicite. N/A si aucun de ces cas ne se présente.' },
    { code:'PGV-09', legacyCodes:['CTB-09','CTC-09'], cat:'traitement', step:2, weight:4, critical:false, na:false,
      label:'Suite annoncée et clôture complète',
      critere:'Récapituler le résultat, préciser la prochaine étape, son délai et son canal, vérifier si le client a une autre demande puis conclure avec une formule de politesse.' },

    // Communication & posture — 11 points
    { code:'PGV-10', legacyCodes:['NC-01','NC-06'], cat:'posture', step:3, weight:5, critical:false, na:false,
      label:'Communication orale professionnelle',
      critere:'Voix audible et stable, articulation et rythme adaptés, ton chaleureux et professionnel, vocabulaire soigné sans argot ni tics de langage.' },
    { code:'PGV-11', legacyCodes:['NC-09','NC-10'], cat:'posture', step:3, weight:6, critical:true, na:false,
      label:'Maîtrise de soi, neutralité et respect',
      critere:'Rester calme face à la tension; ne pas ironiser, juger ou discriminer; respecter le client et garder une posture neutre.' }
  ];

  var PGV_OBJECTIFS = {
    scoreCible:85,
    conformiteExigee:true,
    calibragesParMois:4,
    ecoutesCroiseesParMois:1,
    progressionCible:3
  };

  var PGV_STEPS = {
    0:'Transverse',
    1:'Accueil & compréhension',
    2:'Traitement & résolution',
    3:'Communication & posture'
  };

  function pgvScore(values) {
    var oui = 0, evalue = 0, repondu = 0, critKO = [];
    var fam = {}, steps = {};
    Object.keys(PGV_FAMILIES).forEach(function (k) { fam[k] = { oui:0, evalue:0, pct:null }; });
    for (var s = 0; s <= 3; s++) steps[s] = { oui:0, evalue:0, pct:null };

    PGV_GRID.forEach(function (g, i) {
      var v = values[i], w = g.weight;
      if (v === 'Oui') {
        oui += w; evalue += w; repondu++;
        fam[g.cat].oui += w; fam[g.cat].evalue += w;
        steps[g.step].oui += w; steps[g.step].evalue += w;
      } else if (v === 'Non') {
        evalue += w; repondu++;
        fam[g.cat].evalue += w; steps[g.step].evalue += w;
        if (g.critical) critKO.push(g.code);
      } else if (v === 'N/A') {
        repondu++;
      }
    });

    Object.keys(fam).forEach(function (k) {
      var f = fam[k]; f.pct = f.evalue ? Math.round(f.oui / f.evalue * 100) : null;
    });
    for (var i = 0; i <= 3; i++) {
      var st = steps[i]; st.pct = st.evalue ? Math.round(st.oui / st.evalue * 100) : null;
    }

    var pct = evalue ? Math.round(oui / evalue * 100) : 0;
    var complet = repondu === PGV_GRID.length;
    var niveau =
      !complet ? 'incomplet' :
      critKO.length ? 'nc' :
      pct >= 90 ? 'excellent' :
      pct >= 85 ? 'conforme' :
      pct >= 70 ? 'consolider' : 'critique';

    return {
      pct:pct, fam:fam, steps:steps, complet:complet,
      critKO:critKO, nonConforme:critKO.length > 0, niveau:niveau,
      totalPoints:evalue, obtenuPoints:oui, restants:PGV_GRID.length - repondu
    };
  }

  window.PGV_GRID = PGV_GRID;
  window.PGV_FAMILIES = PGV_FAMILIES;
  window.PGV_OBJECTIFS = PGV_OBJECTIFS;
  window.PGV_STEPS = PGV_STEPS;
  window.pgvScore = pgvScore;
  window.pgvElementCountByFamily = function () {
    var c = {}; Object.keys(PGV_FAMILIES).forEach(function (k) { c[k] = 0; });
    PGV_GRID.forEach(function (g) { c[g.cat]++; }); return c;
  };
  window.pgvElementCountByStep = function () {
    var c = {}; Object.keys(PGV_STEPS).forEach(function (k) { c[k] = 0; });
    PGV_GRID.forEach(function (g) { c[g.step] = (c[g.step] || 0) + 1; }); return c;
  };
})();
