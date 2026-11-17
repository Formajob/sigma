/* Nouvelles pages : Activité (Présence), Rapports, Administration + Mon espace */
const fs = require('fs');
const { open, wait, check, state } = require('./harness');

(async () => {
  /* ---------- Activité dans Présence ---------- */
  {
    const { w, d, errors } = open('attendance.html');
    await wait(1500);

    check('onglet Activité présent', !!d.querySelector('.at-tab[data-tab="activity"]'), true);
    d.querySelector('.at-tab[data-tab="activity"]').click();
    await wait(700);

    check('section Activité visible', d.querySelector('#tab-activity').hidden, false);
    check('champ appels', !!d.querySelector('#act-calls'), true);
    check('champ emails SAC', !!d.querySelector('#act-sac'), true);
    check('champ autres emails', !!d.querySelector('#act-other'), true);
    check('libellé de saisie', d.querySelector('#act-hint').textContent.length > 5, true);

    // saisie puis enregistrement
    d.querySelector('#act-calls').value = '42';
    d.querySelector('#act-sac').value = '63';
    d.querySelector('#act-other').value = '11';
    d.querySelector('#act-note').value = 'Test de saisie.';
    d.querySelector('#act-save').click();
    await wait(900);

    const calls = w.__DATA.agent_daily_activity || [];
    const mails = w.__DATA.email_agent_daily || [];
    check('appels enregistrés', calls.some(r => r.calls_treated === 42), true);
    check('emails SAC enregistrés', mails.some(r => r.treated_sac === 63), true);
    check('autres emails enregistrés', mails.some(r => r.treated_other === 11), true);
    check('ligne du jour dans le tableau', d.querySelectorAll('#act-body tr').length >= 1, true);
    check('activité : aucune erreur JS', errors.length ? errors[0] : 0, 0);
    w.close();
  }

  /* ---------- Mon espace du dashboard ---------- */
  {
    const { w, d, errors } = open('pgv-dashboard.html');
    await wait(1200);
    check('Mon espace masqué au superviseur', d.querySelector('#me-banner').hidden, true);
    check('lien Administration masqué pour un superviseur', d.querySelector('#admin-link').hidden, true);
    check('horloge renseignée', /\d\d:\d\d/.test(d.querySelector('#me-clock').textContent), true);
    check('dashboard : aucune erreur JS', errors.length ? errors[0] : 0, 0);
    w.close();
  }

  /* ---------- Rapports ---------- */
  {
    const { w, d, errors } = open('rapports.html');
    await wait(1600);
    check('huit sections proposées', d.querySelectorAll('#rep-checks input').length, 8);
    check('aperçu rempli', d.querySelectorAll('.rep-summary div').length, 4);
    check('période affichée', d.querySelector('#period-label').textContent.length > 4, true);

    // décocher une section, l'aperçu doit se recalculer sans casser
    const box = d.querySelector('#rep-checks input[data-sec="detail"]');
    box.checked = false;
    box.dispatchEvent(new w.Event('change', { bubbles: true }));
    await wait(400);
    check('aperçu après décochage', d.querySelectorAll('.rep-summary div').length, 4);

    check('rapports : aucune erreur JS', errors.length ? errors[0] : 0, 0);
    w.close();
  }

  /* ---------- Administration ---------- */
  {
    const { w, d, errors } = open('administration.html');
    await wait(900);
    // le profil de test est superviseur : la page doit refuser poliment
    check('message de refus affiché', d.querySelector('#denied').hidden, false);
    check('zone admin masquée', d.querySelector('#admin-main').hidden, true);
    check('administration : aucune erreur JS', errors.length ? errors[0] : 0, 0);
    w.close();
  }

  /* ---------- Accès admin Sigma ---------- */
  {
    const fixtures = require('./fixtures');
    const original = fixtures.MOCK;
    fixtures.MOCK = original.replace("role:'superviseur'", "role:'admin'");
    const { w, d, errors } = open('pgv-dashboard.html');
    await wait(1000);
    check('dashboard : lien Administration visible pour admin', d.querySelector('#admin-link').hidden, false);
    check('dashboard : espace agent absent pour admin', d.querySelector('#me-banner').hidden, true);
    w.close();
    const adminPage = open('administration.html');
    await wait(400);
    check('administration : formulaire invitation visible pour admin', adminPage.d.querySelector('#adm-invite-form') !== null, true);
    check('administration : fiches agent chargées', adminPage.d.querySelectorAll('#adm-invite-agent option').length, 4);
    check('administration admin : aucune erreur JS', adminPage.errors.length, 0);
    adminPage.w.close();
    fixtures.MOCK = original;
  }

  console.log(state.fails ? state.fails + ' ÉCHEC(S)' : 'NOUVELLES PAGES OK');
  process.exit(state.fails ? 1 : 0);
})();
