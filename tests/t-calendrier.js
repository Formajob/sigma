const {open, wait, check, state} = require('./harness');
(async () => {
  const {w,d,errors} = open('calendrier.html');
  await wait(1300);
  check('nav 6 entrées après centralisation au calendrier', d.querySelectorAll('.side-nav a').length, 6);
  check('onglet Calendrier actif', d.querySelector('.side-nav a.active').getAttribute('href'), 'calendrier.html?activity=pgv');
  check('en-tête des jours', d.querySelectorAll('.cal-dow').length, 7);
  const cells = d.querySelectorAll('#cal .cal-cell:not(.muted)');
  check('cases du mois', cells.length >= 28, true);
  check('compteur du mois', /calibrage/.test(d.querySelector('#month-counts').textContent), true);
  check('grille synthétisée : 11 critères et 57 points', w.PGV_GRID.length === 11 && w.PGV_GRID.reduce((sum, g) => sum + g.weight, 0) === 57, true);
  check('grille synthétisée : trois typologies', Object.keys(w.PGV_FAMILIES).length, 3);
  console.log('   ', d.querySelector('#month-counts').textContent.trim());

  // les 2 documents de démo doivent apparaître comme puces
  check('3 puces au total', d.querySelectorAll('#cal .cal-chip').length, 3);
  check('1 puce calibrage', d.querySelectorAll('#cal .cal-chip.cal').length, 1);

  // clic direct sur une puce -> détail en pop-up (plus de panneau sous le calendrier)
  const chip = d.querySelector('#cal .cal-chip');
  chip.click(); await wait(200);
  check('pop-up ouvert', d.querySelector('#event-modal').hidden, false);
  check('détail de l’événement rempli', d.querySelectorAll('#event-body .cal-dayitem').length, 1);
  check('bouton Modifier visible superviseur', !!d.querySelector('#event-edit'), true);
  d.querySelector('#event-modal').dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  check('clic extérieur ne ferme pas la modale', d.querySelector('#event-modal').hidden, false);
  d.querySelector('#event-edit').click(); await wait(100);
  check('formulaire de modification calibrage', !!d.querySelector('#ec-call') && d.querySelectorAll('[data-cal-result]').length, 11);
  check('calibrage : score cumulatif latéral', !!d.querySelector('#ec-score') && !!d.querySelector('#ec-family-scores'), true);
  check('calibrage : typologies sans codes', Array.from(d.querySelectorAll('.cal-question-family-title')).map(x => x.textContent).join('|'), 'Accueil & compréhension|Traitement & résolution|Communication & posture');
  check('calibrage : codes techniques absents des questions', /\b(?:CTB|CTC|NC)-\d{2}\b/.test(d.querySelector('#event-body').textContent), false);
  check('calibrage : quatre questions critiques visibles', d.querySelectorAll('.cal-editor-question.critical').length, 4);
  check('calibrage : N/A disponible pour une réclamation non applicable', d.querySelector('[data-cal-answer="6"][data-value="N/A"]').disabled, false);
  d.querySelector('[data-cal-answer="6"][data-value="N/A"]').click();
  check('calibrage : N/A sélectionné pour la question applicable', d.querySelector('[data-cal-result="6"]').getAttribute('data-selected'), 'N/A');
  check('calibrage : trois boutons Oui/Non/N/A par question', d.querySelectorAll('[data-cal-answer]').length, 33);
  d.querySelector('[data-cal-answer="5"][data-value="Non"]').click();
  check('calibrage : bouton sélectionné avec état accessible', d.querySelector('[data-cal-answer="5"][data-value="Non"]').getAttribute('aria-pressed'), 'true');
  check('calibrage : motif affiché pour Non', d.querySelector('[data-cal-reason-wrap="5"]').hidden, false);
  d.querySelector('[data-cal-answer="5"][data-value="N/A"]').click();
  check('calibrage : motif masqué pour N/A', d.querySelector('[data-cal-reason-wrap="5"]').hidden, true);
  check('calibrage : N/A désactivé si non autorisé', d.querySelector('[data-cal-answer="0"][data-value="N/A"]').disabled, true);
  const progressBefore = parseInt(d.querySelector('#ec-progress').textContent, 10);
  d.querySelector('[data-cal-answer="4"][data-value="Oui"]').click();
  check('calibrage : score/progression recalculés immédiatement', parseInt(d.querySelector('#ec-progress').textContent, 10) > progressBefore, true);
  d.querySelector('#event-edit-cancel').click();
  check('Annuler ferme la modale', d.querySelector('#event-modal').hidden, true);
  chip.click(); await wait(100);
  const eventHtml = d.querySelector('#event-body').innerHTML;
  check('détail sans lien vers les anciennes pages', /(documents|pgv-calibrages)\.html/.test(eventHtml), false);
  check('détail calibrage : trois typologies, sans codes', /Accueil &amp; compréhension/.test(eventHtml) && /Traitement &amp; résolution/.test(eventHtml) && /Communication &amp; posture/.test(eventHtml) && !/\b(?:CTB|CTC|NC)-\d{2}\b/.test(eventHtml), true);
  d.querySelector('#event-close').click();
  check('pop-up fermé', d.querySelector('#event-modal').hidden, true);

  const docChip = d.querySelector('#cal [data-event-kind="doc"]');
  docChip.click(); await wait(150);
  check('document : popup détail', d.querySelector('#event-modal').hidden, false);
  check('document : actions Modifier/Supprimer', !!d.querySelector('#event-edit') && !!d.querySelector('#event-delete'), true);
  check('document partagé : bouton Envoyer à l’agent', !!d.querySelector('#event-send-agent'), true);
  d.querySelector('#event-modal').dispatchEvent(new w.MouseEvent('click', { bubbles:true }));
  check('document : clic extérieur conserve la modale', d.querySelector('#event-modal').hidden, false);
  d.querySelector('#event-edit').click(); await wait(100);
  check('document : FISS modifiable', !!d.querySelector('#ed-facts') && !!d.querySelector('#ed-solutions'), true);
  d.querySelector('#event-edit-cancel').click();
  check('document : Annuler ferme la modale', d.querySelector('#event-modal').hidden, true);

  // navigation mois
  const label = d.querySelector('#month-label').textContent;
  d.querySelector('#btn-next').click(); await wait(600);
  check('mois suivant', d.querySelector('#month-label').textContent !== label, true);
  d.querySelector('#btn-today').click(); await wait(600);
  check('retour au mois courant', d.querySelector('#month-label').textContent, label);

  // filtre « calibrages seulement » -> plus de puces doc
  d.querySelector('#filter-category').value = 'cal';
  d.querySelector('#filter-category').dispatchEvent(new w.Event('change'));
  await wait(300);
  check('filtre calibrages : 1 puce', d.querySelectorAll('#cal .cal-chip').length, 1);

  check('aucune erreur JS', errors.length, 0);
  if (errors.length) console.log('   ', errors.slice(0,3));
  console.log(state.fails ? `${state.fails} ÉCHEC(S)` : 'CALENDRIER OK');
  process.exit(state.fails?1:0);
})();
