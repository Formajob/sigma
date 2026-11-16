/* ============================================================
   Sigma — Grille d'évaluation PGV (Protégez-Vous)
   32 éléments · 3 familles · pondérés 1 à 3 · 6 critiques
   Compatible qa_category (CTB / CTC / NC) — n'exécute rien, expose window.*
   ============================================================ */
(function () {
  'use strict';

  var PGV_GRID = [
    /* ---------------- CTB · Traitement & conformité (11) ---------------- */
    { code:'CTB-01', cat:'CTB', step:2, weight:3, critical:true,  na:false,
      label:'Identité vérifiée avant le dossier',
      critere:'Nom du client + un second élément (n° d’abonné, adresse, date de naissance ou e-mail) contrôlés avant d’ouvrir le dossier ou de communiquer une donnée.' },
    { code:'CTB-02', cat:'CTB', step:2, weight:2, critical:false, na:false,
      label:'Dossier consulté dans Darwin pendant l’appel',
      critere:'Dossier ouvert et lu en séance ; pas de « je vérifie et je vous rappelle » quand l’information est disponible.' },
    { code:'CTB-03', cat:'CTB', step:3, weight:2, critical:false, na:false,
      label:'Demande qualifiée dans la bonne typologie',
      critere:'Rattachement à l’une des cinq familles : abonnement, commande, accès numérique, information, réclamation.' },
    { code:'CTB-04', cat:'CTB', step:4, weight:3, critical:true,  na:false,
      label:'Information exacte et vérifiée',
      critere:'Réponse conforme à Darwin ou à la procédure écrite ; aucune information donnée de mémoire.' },
    { code:'CTB-05', cat:'CTB', step:4, weight:3, critical:false, na:false,
      label:'Procédure appliquée jusqu’au bout',
      critere:'Toutes les étapes de la procédure sont exécutées ; aucun traitement partiel laissé à la charge du client.' },
    { code:'CTB-06', cat:'CTB', step:4, weight:3, critical:true,  na:false,
      label:'Aucun engagement hors mandat',
      critere:'Aucun geste commercial, remboursement, délai ou exception promis sans autorisation ni base procédurale.' },
    { code:'CTB-07', cat:'CTB', step:4, weight:2, critical:false, na:false,
      label:'Actions saisies dans Darwin en direct',
      critere:'Mise à jour, note, modification ou commande enregistrées pendant l’appel, pas après.' },
    { code:'CTB-08', cat:'CTB', step:5, weight:2, critical:false, na:true,
      label:'Escalade déclenchée à bon escient',
      critere:'Cas transmis quand il le faut, au bon service, avec un motif explicite et vérifiable.' },
    { code:'CTB-09', cat:'CTB', step:5, weight:2, critical:false, na:false,
      label:'Suite et délai communiqués',
      critere:'Le client sait ce qui se passe ensuite, quand, et par quel canal ; l’engagement est tracé.' },
    { code:'CTB-10', cat:'CTB', step:6, weight:1, critical:false, na:false,
      label:'Dossier clôturé et statut à jour',
      critere:'Statut finalisé dans Darwin ; note de suivi créée si un suivi est nécessaire.' },
    { code:'CTB-11', cat:'CTB', step:0, weight:3, critical:true,  na:false,
      label:'Confidentialité respectée',
      critere:'Aucune donnée communiquée à un tiers non authentifié ; aucune donnée sensible énoncée à voix haute sans nécessité.' },

    /* ---------------- CTC · Relation client (10) ---------------- */
    { code:'CTC-01', cat:'CTC', step:1, weight:1, critical:false, na:false,
      label:'Décroché et formule d’accueil',
      critere:'Décroché en trois sonneries maximum ; formule complète : entreprise, bonjour, prénom de l’agent.' },
    { code:'CTC-02', cat:'CTC', step:1, weight:2, critical:false, na:false,
      label:'Client écouté jusqu’au bout',
      critere:'Le client expose sa demande en entier avant toute réponse, relance ou interruption.' },
    { code:'CTC-03', cat:'CTC', step:3, weight:2, critical:false, na:false,
      label:'Reformulation de la demande',
      critere:'La demande est reformulée ou synthétisée, puis validée par le client avant traitement.' },
    { code:'CTC-04', cat:'CTC', step:4, weight:2, critical:false, na:false,
      label:'Réponse à la question posée',
      critere:'Réponse exacte à ce qui est demandé : ni réponse à côté, ni digression, ni question évitée.' },
    { code:'CTC-05', cat:'CTC', step:4, weight:2, critical:false, na:false,
      label:'Explication claire et sans jargon',
      critere:'Vocabulaire du client ; aucun terme interne (Darwin, back-office, SAC) employé sans être traduit.' },
    { code:'CTC-06', cat:'CTC', step:4, weight:3, critical:false, na:true,
      label:'Gestion de la réclamation',
      critere:'La gêne est reconnue sans justification défensive ; le problème est reformulé ; une solution ou une alternative datée est proposée.' },
    { code:'CTC-07', cat:'CTC', step:4, weight:2, critical:false, na:true,
      label:'Mise en attente conforme',
      critere:'Accord demandé, raison donnée, retour dans le délai annoncé, remerciement au retour.' },
    { code:'CTC-08', cat:'CTC', step:5, weight:1, critical:false, na:true,
      label:'Transfert annoncé et présenté',
      critere:'Transfert annoncé, raison expliquée, service ou nom du destinataire donné au client.' },
    { code:'CTC-09', cat:'CTC', step:6, weight:2, critical:false, na:false,
      label:'Clôture complète',
      critere:'Récapitulatif, prochaine étape, ouverture à une autre demande, formule de politesse ; le client raccroche le premier.' },
    { code:'CTC-10', cat:'CTC', step:0, weight:1, critical:false, na:false,
      label:'Nom du client utilisé',
      critere:'Nom employé au moins deux fois dans l’échange, correctement prononcé.' },

    /* ---------------- NC · Savoir être (11) ---------------- */
    { code:'NC-01', cat:'NC', step:0, weight:1, critical:false, na:false,
      label:'V.A.T.R.E — Volume',
      critere:'Volume audible et stable : ni voix étouffée, ni saturation, ni variation brutale.' },
    { code:'NC-02', cat:'NC', step:0, weight:1, critical:false, na:false,
      label:'V.A.T.R.E — Articulation',
      critere:'Mots détachés, aucune syllabe avalée : compréhension sans effort, même au téléphone.' },
    { code:'NC-03', cat:'NC', step:0, weight:1, critical:false, na:false,
      label:'V.A.T.R.E — Ton',
      critere:'Ton professionnel et chaleureux, sourire audible ; aucune agressivité ni froideur.' },
    { code:'NC-04', cat:'NC', step:0, weight:1, critical:false, na:false,
      label:'V.A.T.R.E — Rythme',
      critere:'Débit adapté au client, pauses respectées : ni précipitation, ni lenteur qui fait attendre.' },
    { code:'NC-05', cat:'NC', step:0, weight:1, critical:false, na:false,
      label:'V.A.T.R.E — Énergie',
      critere:'Dynamisme constant du décroché à la clôture, y compris en fin de journée et sur un appel difficile.' },
    { code:'NC-06', cat:'NC', step:0, weight:2, critical:false, na:false,
      label:'Professionnalisme',
      critere:'Vocabulaire soigné : pas d’argot, de familiarité, ni de tics de langage (« beh », « machin », « voilà »).' },
    { code:'NC-07', cat:'NC', step:0, weight:2, critical:false, na:false,
      label:'Écoute active',
      critere:'Signaux d’écoute, reprises, aucune interruption, réponse à ce qui n’est pas dit explicitement.' },
    { code:'NC-08', cat:'NC', step:0, weight:2, critical:false, na:false,
      label:'Empathie',
      critere:'L’émotion est nommée et reconnue ; le discours s’adapte au client inquiet, pressé ou agacé.' },
    { code:'NC-09', cat:'NC', step:0, weight:3, critical:true,  na:false,
      label:'Contrôle émotionnel',
      critere:'Reste calme face à l’agressivité : pas d’ironie, de ton sec, de soupir audible ni de riposte.' },
    { code:'NC-10', cat:'NC', step:0, weight:3, critical:true,  na:false,
      label:'Neutralité et respect',
      critere:'Aucun jugement, aucune discrimination, aucun commentaire personnel, politique ou religieux.' },
    { code:'NC-11', cat:'NC', step:0, weight:1, critical:false, na:false,
      label:'Maîtrise de la langue du client',
      critere:'La langue choisie par le client (français, arabe, darija) est tenue et comprise sans hésitation bloquante.' }
  ];

  var PGV_FAMILIES = {
    CTB: { name:'CTB · Traitement & conformité', short:'Traitement',  note:'Le parcours SAC : identification, qualification, traitement, escalade, clôture — et les règles qu’on ne transige pas.' },
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
    var oui = 0, evalue = 0, repondu = 0, critKO = [];
    var fam = {}, steps = {};
    Object.keys(PGV_FAMILIES).forEach(function (k) { fam[k] = { oui:0, evalue:0, pct:null }; });
    for (var s = 0; s <= 6; s++) steps[s] = { oui:0, evalue:0, pct:null };

    PGV_GRID.forEach(function (g, i) {
      var v = values[i], w = g.weight;
      if (v === 'Oui') {
        oui += w; evalue += w; repondu++;
        fam[g.cat].oui += w; fam[g.cat].evalue += w;
        steps[g.step].oui += w; steps[g.step].evalue += w;
      } else if (v === 'Non') {
        evalue += w; repondu++;
        fam[g.cat].evalue += w;
        steps[g.step].evalue += w;
        if (g.critical) critKO.push(g.code);
      } else if (v === 'N/A') {
        repondu++;
      }
    });

    Object.keys(fam).forEach(function (k) {
      var f = fam[k]; f.pct = f.evalue ? Math.round(f.oui / f.evalue * 100) : null;
    });
    for (var i = 0; i <= 6; i++) {
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
      pct: pct, fam: fam, steps: steps, complet: complet,
      critKO: critKO, nonConforme: critKO.length > 0, niveau: niveau,
      totalPoints: evalue, obtenuPoints: oui, restants: PGV_GRID.length - repondu
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
    var c = {}; for (var s = 0; s <= 6; s++) c[s] = 0;
    PGV_GRID.forEach(function (g) { c[g.step]++; }); return c;
  };
  window.pgvWeightByFamily = function () {
    var w = {}; Object.keys(PGV_FAMILIES).forEach(function (k) { w[k] = 0; });
    PGV_GRID.forEach(function (g) { w[g.cat] += g.weight; }); return w;
  };
  window.pgvWeightByStep = function () {
    var w = {}; for (var s = 0; s <= 6; s++) w[s] = 0;
    PGV_GRID.forEach(function (g) { w[g.step] += g.weight; }); return w;
  };
})();
