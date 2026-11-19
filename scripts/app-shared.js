/* ============================================================
   SIGMA — logique applicative partagée (générée depuis americana-dashboard.html)
   NE PAS ÉDITER À LA MAIN : source = americana-dashboard.html, tâche : npm run pages
   ============================================================ */

    // Garde prod : expose une promesse résolue avec le profil AVANT le script app.
    // Le script suivant fait await window.__SIGMA_READY : fini le "Bonjour Omar".
    window.__SIGMA_READY = (async () => {
      const unlock = () => { const g = document.getElementById("sigma-guard"); if (g) g.remove(); };
      // Filet anti page blanche : si Supabase ne repond pas, on sort.
      const bailout = setTimeout(() => {
        if (!window.__SIGMA_PROFILE) window.location.href = "login.html";
      }, 8000);
      try {
        const expectedActivity = window.__SIGMA_ACTIVITY || "americana";
        const profile = await window.sigmaSupabase.requireAuth("login.html", expectedActivity);
        if (!profile) return null;          // redirection en cours : on reste masque
        window.__SIGMA_PROFILE = profile;
        clearTimeout(bailout);
        unlock();                            // autorise : on affiche
        return profile;
      } catch (e) {
        clearTimeout(bailout);
        window.location.href = "login.html";
        return null;
      }
    })();
  