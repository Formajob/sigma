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
    check('dashboard : liste des mois pour la saisie mensuelle', d.querySelectorAll('#calls-entry-month-select option').length >= 24, true);
    check('dashboard : mois de saisie indépendant sélectionnable', !!d.querySelector('#calls-entry-month-select') && d.querySelector('#calls-entry-month-select').value.length === 10, true);
    check('dashboard : typologie affiche les points critiques', d.querySelectorAll('#steps .p-step').length, 4);
    check('dashboard : intitulé explicite de conformité critique', /points critiques/i.test(d.querySelector('.p-grid2 .panel-head small').textContent), true);
    check('dashboard : menu admin sous planning', !!d.querySelector('#admin-nav-link'), true);
    check('dashboard : plus de date libre', !!d.querySelector('#period-from'), false);
    d.querySelector('#dash-month-next').click(); await wait(350);
    check('dashboard : mois suivant', d.querySelector('#dash-month-label').textContent !== label, true);
    d.querySelector('#dash-month-now').click(); await wait(350);
    check('dashboard : retour au mois courant', d.querySelector('#dash-month-label').textContent, label);
    check('dashboard : aucune erreur JS', errors.length, 0);
    w.close();
  }

  // Agent : planning hebdomadaire de l'équipe visible en consultation seule.
  {
    const profile = { displayName:'Agent Planning', email:'agent@acx.ma', role:'agent', agentId:'a1', agentName:'Amadou AliBa' };
    const { w, d, errors } = open('planning.html', null, profile);
    await wait(500);
    check('planning agent : trois lignes équipe', d.querySelectorAll('#grid tbody tr').length, 3);
    check('planning agent : toutes les cellules non modifiables', Array.from(d.querySelectorAll('#grid tbody select')).every(x => x.disabled), true);
    check('planning agent : message de consultation affiché', d.querySelector('#planning-readonly-note').hidden, false);
    check('planning agent : aucune erreur JS', errors.length, 0);
    w.close();
  }

  // Présence : matrice de période, clic vers l’historique et correction auditée.
  {
    const profile = { displayName:'Admin Test', email:'admin@acx.ma', role:'admin', agentId:'a1', agentName:'Amadou AliBa' };
    const { w, d, errors } = open('attendance.html', null, profile);
    await wait(350);
    const date = w.pgvData.iso();
    w.__DATA.attendance_events.push(
      { activity:'pgv', agent_id:'a2', work_date:date, event_type:'in', break_type:null, occurred_at:new Date(date+'T14:00:00').toISOString(), source:'agent' },
      { activity:'pgv', agent_id:'a2', work_date:date, event_type:'break_start', break_type:'pause', occurred_at:new Date(date+'T16:00:00').toISOString(), source:'agent' },
      { activity:'pgv', agent_id:'a2', work_date:date, event_type:'break_end', break_type:null, occurred_at:new Date(date+'T16:10:00').toISOString(), source:'agent' }
    );
    d.querySelector('.at-tab[data-tab="week"]').click(); await wait(200);
    d.querySelector('#week-from').value=date; d.querySelector('#week-to').value=date;
    d.querySelector('#week-load').click(); await wait(250);
    check('présence semaine : matrice pour tous les agents', d.querySelectorAll('#week-body .att-week-cell').length, 3);
    const zCell=Array.from(d.querySelectorAll('#week-body [data-week-cell]')).find(x=>x.dataset.agent==='a2');
    check('présence semaine : case Zineb indique Présent', zCell.textContent.includes('Présent'), true);
    const edit=d.querySelector('#week-body [data-edit-attendance][data-agent="a2"]');
    check('présence semaine : icône de correction visible admin', !!edit, true);
    edit.click();
    check('présence semaine : formulaire de correction ouvert', d.querySelector('#attendance-edit-modal').hidden, false);
    d.querySelector('#edit-status').value='PRESENT'; d.querySelector('#edit-late').value='7'; d.querySelector('#edit-reason').value='Correction validée';
    d.querySelector('#attendance-edit-save').click(); await wait(250);
    check('présence semaine : correction enregistrée séparément', w.__DATA.attendance_daily_overrides.some(x=>x.agent_id==='a2'&&x.late_minutes===7), true);
    d.querySelector('#week-body [data-week-cell][data-agent="a2"]').click(); await wait(250);
    check('présence historique : clic case ouvre la journée de l’agent', d.querySelector('#tab-history').hidden, false);
    check('présence historique : affiche les transitions de statut', d.querySelector('#history-body').textContent.includes('En poste'), true);
    check('présence historique : filtre sur l’agent choisi', d.querySelector('#history-agent').value, 'a2');
    check('présence semaine/historique : aucune erreur JS', errors.length, 0);
    w.close();
  }

  // Super admin : aperçu agent avec mutations bloquées.
  {
    const profile = { displayName:'Super Admin', email:'root@acx.ma', role:'super_admin', agentId:null, agentName:null };
    const url='file:///home/user/sigma-build/attendance.html?activity=pgv&agent_preview=1&agent_id=a2';
    const { w, d, errors } = open('attendance.html', url, profile);
    await wait(500);
    check('aperçu agent : rôle agent affiché', d.querySelector('#sidebar-role').textContent.startsWith('Agent'), true);
    check('aperçu agent : bannière d’écriture bloquée visible', d.querySelector('#ops-banner').textContent.includes('écritures et changements de mot de passe sont bloqués'), true);
    check('aperçu agent : navigation conserve le contexte de test', d.querySelector('.side-nav a[href*="agent_preview=1"][href*="agent_id=a2"]')!==null, true);
    const before=w.__DATA.attendance_events.length;
    d.querySelector('#b-in').click(); await wait(150);
    check('aperçu agent : aucun pointage réel créé', w.__DATA.attendance_events.length, before);
    check('aperçu agent : refus d’écriture expliqué', d.body.textContent.includes('Aperçu agent : cette action n’est pas enregistrée'), true);
    check('aperçu agent : aucune erreur JS', errors.length, 0);
    w.close();
  }

  // Agent : saisie des totaux quotidiens de toute l’équipe et correction d’historique.
  {
    const profile = { displayName:'Agent Emails', email:'agent@acx.ma', role:'agent', agentId:'a1', agentName:'Amadou AliBa' };
    const { w, d, errors } = open('emails.html', null, profile);
    await wait(500);
    check('emails agent : calendrier équipe affiché', d.querySelectorAll('#cal [data-date]').length > 0, true);
    check('emails agent : bouton Saisir la journée visible', d.querySelector('#btn-entry').style.display, '');
    d.querySelector('#btn-entry').click();
    check('emails agent : dialogue de saisie ouvert', d.querySelector('#dlg').hidden, false);
    check('emails agent : date et totaux équipe éditables', ['#d-date','#d-total','#d-team-treated'].every(sel => !d.querySelector(sel).disabled), true);
    check('emails agent : champs de responsable masqués', d.querySelector('#manager-email-details').style.display, 'none');
    check('emails agent : choix du responsable interdit', d.querySelector('#d-duty').disabled, true);
    check('emails agent : bouton Enregistrer visible', d.querySelector('#d-save').hidden, false);
    d.querySelector('#d-close').click();
    const day = d.querySelector('#cal [data-date]'); day.click();
    check('emails agent : clic sur une journée ouvre sa saisie historique', d.querySelector('#d-date').value, day.getAttribute('data-date'));
    check('emails agent : aucune erreur JS', errors.length, 0);
    w.close();
  }

  // Agent : page Présence mobile, chrono live, alertes de seuil et changement direct de statut.
  {
    const profile = { displayName:'Agent Mobile', email:'agent@acx.ma', role:'agent', agentId:'a1', agentName:'Amadou AliBa' };
    const { w, d, errors } = open('attendance.html', null, profile);
    await wait(500);
    check('présence agent : ouvre Ma journée', d.querySelector('#tab-me').hidden, false);
    check('présence agent : onglet équipe Temps réel accessible', d.querySelector('.at-tab[data-tab="live"]').hidden, false);
    check('présence agent : Ma journée reste l’onglet initial', d.querySelector('#tab-me').hidden, false);
    check('présence agent : quota pauses affiché sur 30 minutes', /0′ \/ 30′/.test(d.querySelector('#me-summary').textContent), true);
    check('présence agent : trois pauses maximum indiquées', /0 \/ 3 pauses/.test(d.querySelector('#b-breaks [data-break="pause"] small').textContent), true);
    d.querySelector('.at-tab[data-tab="live"]').click(); await wait(180);
    check('présence agent : vue temps réel affiche toute l’équipe', d.querySelectorAll('#agent-cards .attendance-card').length, 3);
    check('présence agent : statuts non pointés distingués d’un défaut de synchro', !/Données non synchronisées/.test(d.querySelector('#agent-cards').textContent), true);
    const liveToday = w.pgvData.iso();
    w.__DATA.attendance_events.push({ activity:'pgv', agent_id:'a2', work_date:liveToday, event_type:'in', break_type:null, occurred_at:new Date().toISOString(), source:'agent' });
    d.querySelector('.at-tab[data-tab="live"]').click(); await wait(180);
    const zinebCard = Array.from(d.querySelectorAll('#agent-cards .attendance-card')).find(x => x.textContent.includes('Elagbi Zineb'));
    check('présence agent : statut collègue synchronisé après pointage', !!zinebCard && zinebCard.classList.contains('status-online'), true);
    check('présence agent : affichage équipe sans sélecteur historique', d.querySelector('#live-day').hidden, true);
    d.querySelector('.at-tab[data-tab="me"]').click(); await wait(100);
    check('présence agent : chrono bien visible', !!d.querySelector('#me-status-timer'), true);
    check('présence agent : commandes tactiles pour statuts', d.querySelectorAll('#b-breaks button').length >= 5 && !!d.querySelector('#b-in') && !!d.querySelector('#b-out'), true);
    d.querySelector('#b-in').click(); await wait(180);
    check('présence agent : pointage démarre le statut', d.querySelector('#me-status-title').textContent, 'En poste');
    check('présence agent : le bouton de démarrage reste bloqué après pointage', d.querySelector('#b-in').disabled, true);
    const workTimer = d.querySelector('#me-status-timer').textContent;
    await wait(2300);
    check('présence agent : chrono du statut avance chaque seconde', d.querySelector('#me-status-timer').textContent !== workTimer, true);
    d.querySelector('#b-breaks [data-break="pause"]').click(); await wait(180);
    check('présence agent : passage en pause', d.querySelector('#me-status-title').textContent, 'Pause');
    const breakEvent = w.__DATA.attendance_events.filter(x => x.event_type === 'break_start').slice(-1)[0];
    const inEvent = w.__DATA.attendance_events.filter(x => x.event_type === 'in').slice(-1)[0];
    inEvent.occurred_at = new Date(Date.now() - 60 * 60000).toISOString();
    breakEvent.occurred_at = new Date(Date.now() - 29 * 60000).toISOString();
    d.querySelector('#live-today').click(); await wait(180);
    check('présence agent : alerte avant dépassement', d.querySelector('#me-status-alert').classList.contains('near') && /Limite bientôt/.test(d.querySelector('#me-status-alert').textContent), true);
    breakEvent.occurred_at = new Date(Date.now() - 31 * 60000).toISOString();
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
    check('présence : bouton de partage du résumé visible responsable', !!d.querySelector('#share-attendance-whatsapp') && !d.querySelector('#share-attendance-whatsapp').hidden, true);
    const shareDate = w.pgvData.iso();
    w.__DATA.planning_entries.push({ activity:'pgv', agent_id:'a1', work_date:shareDate, shift_code:'M' });
    w.__DATA.attendance_events.push({ activity:'pgv', agent_id:'a1', work_date:shareDate, event_type:'in', break_type:null, occurred_at:new Date(shareDate + 'T14:06:00').toISOString(), source:'agent' });
    d.querySelector('#live-today').click(); await wait(150);
    let waUrl = '';
    w.open = url => { waUrl = url; return {}; };
    d.querySelector('#share-attendance-whatsapp').click();
    const shareEditor = d.querySelector('#attendance-share-text');
    check('présence : éditeur de message ouvert avant partage', d.querySelector('#attendance-share-modal').hidden, false);
    check('présence : message prérempli avec vraies lignes et greeting', shareEditor.value.startsWith('Hello, good day!\n') && shareEditor.value.includes('\nLate: 1\n') && shareEditor.value.endsWith('Have a good day!'), true);
    shareEditor.value = shareEditor.value.replace('Have a good day!', 'Custom sign-off\nHave a good day!');
    d.querySelector('#attendance-share-send').click();
    const waText = new URL(waUrl).searchParams.get('text') || '';
    check('présence : résumé WhatsApp inclut les totaux', /Scheduled today: 1/.test(waText) && /Late: 1/.test(waText) && /Absent: 0/.test(waText), true);
    check('présence : résumé WhatsApp détaille le membre en retard', /Amadou AliBa.*6 min late/.test(waText), true);
    check('présence : modification manuelle conservée et greeting final', waText.includes('Custom sign-off') && waText.endsWith('Have a good day!'), true);
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
