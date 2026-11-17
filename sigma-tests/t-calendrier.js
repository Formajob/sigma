const {open, wait, check, state} = require('./harness');
(async () => {
  const {w,d,errors} = open('calendrier.html');
  await wait(1300);
  check('nav 8 entrées (Rapports ajouté)', d.querySelectorAll('.side-nav a').length, 8);
  check('onglet Calendrier actif', d.querySelector('.side-nav a.active').getAttribute('href'), 'calendrier.html?activity=pgv');
  check('en-tête des jours', d.querySelectorAll('.cal-dow').length, 7);
  const cells = d.querySelectorAll('#cal .cal-cell:not(.muted)');
  check('cases du mois', cells.length >= 28, true);
  check('compteur du mois', /calibrage/.test(d.querySelector('#month-counts').textContent), true);
  console.log('   ', d.querySelector('#month-counts').textContent.trim());

  // les 2 documents de démo doivent apparaître comme puces
  check('3 puces au total', d.querySelectorAll('#cal .cal-chip').length, 3);
  check('1 puce calibrage', d.querySelectorAll('#cal .cal-chip.cal').length, 1);

  // clic direct sur une puce -> détail en pop-up (plus de panneau sous le calendrier)
  const chip = d.querySelector('#cal .cal-chip');
  chip.click(); await wait(200);
  check('pop-up ouvert', d.querySelector('#event-modal').hidden, false);
  check('détail de l’événement rempli', d.querySelectorAll('#event-body .cal-dayitem').length, 1);
  const eventHtml = d.querySelector('#event-body').innerHTML;
  check('lien de l’événement', /(documents|pgv-calibrages)\.html/.test(eventHtml), true);
  d.querySelector('#event-close').click();
  check('pop-up fermé', d.querySelector('#event-modal').hidden, true);

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
