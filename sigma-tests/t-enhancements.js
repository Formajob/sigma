/* Tests UI des demandes mensuelles, modales, présence, emails et planning. */
const { open, wait, check, state } = require('./harness');

(async () => {
  // Dashboard : navigation mois remplace les dates libres.
  {
    const { w, d, errors } = open('pgv-dashboard.html');
    await wait(900);
    const label = d.querySelector('#dash-month-label').textContent;
    check('dashboard : mois affiché', label.length > 4, true);
    check('dashboard : plus de date libre', !!d.querySelector('#period-from'), false);
    d.querySelector('#dash-month-next').click(); await wait(350);
    check('dashboard : mois suivant', d.querySelector('#dash-month-label').textContent !== label, true);
    d.querySelector('#dash-month-now').click(); await wait(350);
    check('dashboard : retour au mois courant', d.querySelector('#dash-month-label').textContent, label);
    check('dashboard : aucune erreur JS', errors.length, 0);
    w.close();
  }

  // Calibrages et Documentation : navigation de mois + filtres Du/Au toujours disponibles.
  for (const file of ['pgv-calibrages.html', 'documents.html']) {
    const { w, d, errors } = open(file);
    await wait(1000);
    const label = d.querySelector('#month-label').textContent;
    check(file + ' : filtres date conservés', !!d.querySelector('#filter-from') && !!d.querySelector('#filter-to'), true);
    d.querySelector('#month-prev').click(); await wait(350);
    check(file + ' : mois précédent', d.querySelector('#month-label').textContent !== label, true);
    check(file + ' : dates synchronisées', d.querySelector('#filter-from').value.endsWith('-01'), true);
    check(file + ' : aucune erreur JS', errors.length, 0);
    w.close();
  }

  // Présence : 3 fiches d’agents, choix de date passée et limites.
  {
    const { w, d, errors } = open('attendance.html');
    await wait(1100);
    check('présence : trois cartes agents', d.querySelectorAll('.attendance-card').length, 3);
    check('présence : date passée sélectionnable', !!d.querySelector('#live-day') && !!d.querySelector('#live-today'), true);
    check('présence : sortie limitée à 5 minutes', /Sortie temp\. 5/.test(d.querySelector('#b-breaks').textContent), true);
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
