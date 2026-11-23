/* Tests UI des demandes mensuelles, modales, présence, emails et planning. */
const { open, wait, check, state } = require('./harness');

(async () => {
  // Dashboard : navigation mois remplace les dates libres.
  {
    const { w, d, errors } = open('pgv-dashboard.html');
    await wait(900);
    const label = d.querySelector('#dash-month-label').textContent;
    check('dashboard : mois affiché', label.length > 4, true);
    check('dashboard : statistiques appels/emails', !!d.querySelector('#volume-body'), true);
    check('dashboard : KPI appels reçus', !!d.querySelector('#volume-calls-received'), true);
    check('dashboard : saisie mensuelle managers', !!d.querySelector('#calls-entry-save'), true);
    check('dashboard : helper OPS disponible pour l’enregistrement', !!w.OPS && typeof w.OPS.toast === 'function', true);
    check('dashboard : saisie mensuelle en bas de page', !!d.querySelector('#calls-month-entry + p'), true);
    check('dashboard : menu admin sous planning', !!d.querySelector('#admin-nav-link'), true);
    check('dashboard : plus de date libre', !!d.querySelector('#period-from'), false);
    d.querySelector('#dash-month-next').click(); await wait(350);
    check('dashboard : mois suivant', d.querySelector('#dash-month-label').textContent !== label, true);
    d.querySelector('#dash-month-now').click(); await wait(350);
    check('dashboard : retour au mois courant', d.querySelector('#dash-month-label').textContent, label);
    check('dashboard : aucune erreur JS', errors.length, 0);
    w.close();
  }

  // Agent : page Présence mobile, chrono live, alertes de seuil et changement direct de statut.
  {
    const profile = { displayName:'Agent Mobile', email:'agent@acx.ma', role:'agent', agentId:'a1', agentName:'Amadou AliBa' };
    const { w, d, errors } = open('attendance.html', null, profile);
    await wait(500);
    check('présence agent : ouvre Ma journée', d.querySelector('#tab-me').hidden, false);
    check('présence agent : vue équipe temps réel masquée', d.querySelector('.at-tab[data-tab="live"]').hidden, true);
    check('présence agent : chrono bien visible', !!d.querySelector('#me-status-timer'), true);
    check('présence agent : commandes tactiles pour statuts', d.querySelectorAll('#b-breaks button').length >= 5 && !!d.querySelector('#b-in') && !!d.querySelector('#b-out'), true);
    d.querySelector('#b-in').click(); await wait(180);
    check('présence agent : pointage démarre le statut', d.querySelector('#me-status-title').textContent, 'En poste');
    const workTimer = d.querySelector('#me-status-timer').textContent;
    await wait(2300);
    check('présence agent : chrono du statut avance chaque seconde', d.querySelector('#me-status-timer').textContent !== workTimer, true);
    d.querySelector('#b-breaks [data-break="pause"]').click(); await wait(180);
    check('présence agent : passage en pause', d.querySelector('#me-status-title').textContent, 'Pause');
    const breakEvent = w.__DATA.attendance_events.filter(x => x.event_type === 'break_start').slice(-1)[0];
    breakEvent.occurred_at = new Date(Date.now() - 14 * 60000).toISOString();
    d.querySelector('#live-today').click(); await wait(180);
    check('présence agent : alerte avant dépassement', d.querySelector('#me-status-alert').classList.contains('near') && /Limite bientôt/.test(d.querySelector('#me-status-alert').textContent), true);
    breakEvent.occurred_at = new Date(Date.now() - 16 * 60000).toISOString();
    d.querySelector('#live-today').click(); await wait(180);
    check('présence agent : alerte au dépassement', d.querySelector('#me-status-alert').classList.contains('over') && /Dépassement commencé/.test(d.querySelector('#me-status-alert').textContent), true);
    d.querySelector('#b-breaks [data-break="lunch"]').click(); await wait(180);
    check('présence agent : changement direct de pause à lunch', d.querySelector('#me-status-title').textContent, 'Lunch');
    check('présence agent : aucune erreur JS', errors.length, 0);
    w.close();
  }

  // Invitation PGV avec marqueur explicite : présenter le formulaire de choix de mot de passe.
  {
    const { w, d, errors } = open('login.html', 'https://sigma.acx.ma/login.html?client=pgv&flow=invite');
    await wait(100);
    check('invitation : formulaire de nouveau mot de passe visible', d.querySelector('#password-recovery-form').hidden, false);
    check('invitation : formulaire de connexion normal masqué', d.querySelector('#credentials-form').hidden, true);
    check('invitation : les champs mot de passe existent', !!d.querySelector('#new-password') && !!d.querySelector('#confirm-password'), true);
    check('invitation : aucune erreur JS', errors.length, 0);
    w.close();
  }

  // Les anciennes pages sont désormais de simples redirections vers Calendrier.
  for (const file of ['pgv-calibrages.html', 'documents.html']) {
    const { w, d, errors } = open(file);
    check(file + ' : ne contient plus de page de données', !!d.querySelector('#month-label,#filter-from,#filter-to'), false);
    check(file + ' : lien de retour calendrier', !!d.querySelector('a[href="calendrier.html?activity=pgv"]'), true);
    check(file + ' : aucune erreur JS', errors.length, 0);
    w.close();
  }

  // Présence : 3 fiches d’agents, choix de date passée et limites.
  {
    const { w, d, errors } = open('attendance.html');
    await wait(1100);
    check('présence : trois cartes agents', d.querySelectorAll('.attendance-card').length, 3);
    check('présence : saisie appels reçus', !!d.querySelector('#act-calls-received'), true);
    check('présence : plus de saisie quotidienne des appels traités', !!d.querySelector('#act-calls'), false);
    check('présence : durée par statut affichée', d.querySelectorAll('[data-state-duration]').length, 3);
    check('présence : date passée sélectionnable', !!d.querySelector('#live-day') && !!d.querySelector('#live-today'), true);
    check('présence : sortie limitée à 5 minutes', /Sortie temporaire\s*5 min max/.test(d.querySelector('#b-breaks').textContent), true);
    const prev = new Date(d.querySelector('#live-day').value + 'T00:00:00');
    prev.setDate(prev.getDate() - 1);
    d.querySelector('#live-day').value = prev.toISOString().slice(0,10);
    d.querySelector('#live-day').dispatchEvent(new w.Event('change', { bubbles: true }));
    await wait(300);
    check('présence : filtre historique appliqué', d.querySelector('#live-day').value, prev.toISOString().slice(0,10));
    check('présence : aucune erreur JS', errors.length, 0);
    w.close();
  }

  // Emails : le rôle de service est modifiable par date dans la fenêtre de saisie.
  {
    const { w, d, errors } = open('emails.html');
    await wait(1000);
    const day = d.querySelector('#cal [data-date]');
    day.click(); await wait(100);
    check('emails : dialogue du tour ouvert', d.querySelector('#dlg').hidden, false);
    check('emails : anciennes catégories non saisies', !!d.querySelector('#d-spam,#d-pub,#d-autre'), false);
    check('emails : liste d’agents pour le tour', d.querySelectorAll('#d-duty option').length, 3);
    check('emails : choix du tour activé manager', d.querySelector('#d-duty').disabled, false);
    check('emails : aucune erreur JS', errors.length, 0);
    w.close();
  }

  // Planning : codes et plages horaires obligatoires.
  {
    const { w, d, errors } = open('planning.html');
    await wait(900);
    check('planning : code samedi présent', /SAT/.test(d.querySelector('#grid select').innerHTML), true);
    check('planning : rotation samedi documentée', /14h–18h/.test(d.querySelector('#rotation-note').textContent), true);
    check('planning : aucune erreur JS', errors.length, 0);
    w.close();
  }

  console.log(state.fails ? state.fails + ' ÉCHEC(S)' : 'ENHANCEMENTS OK');
  process.exit(state.fails ? 1 : 0);
})();
