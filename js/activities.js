/* ============================================================
 * Sigma — Configuration des activités
 * Module unique, paramétré par activité (americana / pgv / vdm).
 * Jamais modifié en dur dans les pages : lu par planning.html,
 * attendance.html, emails.html.
 * ============================================================ */
(function () {
  'use strict';

  // Module activé par activité
  window.SIGMA_ACTIVITIES = {
    americana: {
      label: 'Americana',
      modules: {
        calibration: true,
        documents: true,
        planning: false,
        attendance: false,
        emails: false
      }
    },

    pgv: {
      label: 'PGV',
      modules: {
        calibration: true,
        documents: true,
        planning: true,
        attendance: true,
        emails: true
      }
    },

    vdm: {
      label: 'VDM',
      modules: {
        calibration: false,
        documents: true,
        planning: true,
        attendance: true,
        emails: false
      }
    }
  };

  // Résolution de l'activité courante
  window.SIGMA_CURRENT_ACTIVITY = (function () {
    var params = new URLSearchParams(location.search);
    var activity = params.get('activity');
    if (activity && window.SIGMA_ACTIVITIES[activity]) return activity;

    // Sinon, essayer depuis le profil côté client (si dispo)
    if (window.__SIGMA_PROFILE && window.__SIGMA_PROFILE.activities) {
      var profActs = window.__SIGMA_PROFILE.activities;
      for (var i = 0; i < profActs.length; i++) {
        if (window.SIGMA_ACTIVITIES[profActs[i]]) return profActs[i];
      }
    }

    // Sinon, retour par défaut : la première activée
    for (var key in window.SIGMA_ACTIVITIES) {
      if (window.SIGMA_ACTIVITIES[key].modules.planning) return key;
    }
    return 'americana';
  })();

  // Helper : un module est-il actif pour l'activité courante ?
  window.isActivityModule = function (moduleName) {
    var act = window.SIGMA_CURRENT_ACTIVITY;
    return !!(window.SIGMA_ACTIVITIES[act] && window.SIGMA_ACTIVITIES[act].modules[moduleName]);
  };

  // Helper : label de l'activité courante
  window.getActivityLabel = function () {
    return window.SIGMA_ACTIVITIES[window.SIGMA_CURRENT_ACTIVITY] ? 
      window.SIGMA_ACTIVITIES[window.SIGMA_CURRENT_ACTIVITY].label : 'Americana';
  };
})();