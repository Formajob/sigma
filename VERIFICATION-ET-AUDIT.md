# Sigma — vérification et audit (2026-10-07)

## Résultats vérifiés dans le workspace

- Navigation mensuelle : Dashboard, Calibrages et Documentation. Pour Calibrages/Documentation, les champs « Du/Au » restent disponibles et suivent le mois choisi.
- Calendrier : le clic sur une puce ouvre la modale détaillée.
- Présence : le test DOM rend les trois cartes de démonstration, laisse choisir une date historique, affiche les limites et filtre la journée demandée. Les opérations d’action restent destinées à aujourd’hui.
- Emails : le dialogue du tour est ouvrable et expose le choix d’agent dans la session superviseur simulée.
- Dashboard / droits : masquage de « Mon espace » et des raccourcis agent pour les rôles non-agent; normalisation du rôle Sigma récupéré depuis `profiles`. Le lien Administration reste visible uniquement si `profiles.role` vaut `admin` ou `super_admin`.
- Administration : le RPC `admin_users()` conserve les rôles `admin`/`super_admin` et ne retourne les autres comptes que si leur fiche agent est PGV; agents/superviseurs liés à Americana sont ainsi exclus. Un rôle non-admin sans fiche PGV est également exclu faute de portée PGV explicite. Ajout aussi d’un formulaire d’invitation d’agent dans Sigma, via la fonction Edge `supabase/functions/admin-invite-user/index.ts`; elle vérifie le JWT et le rôle admin, invite par email et rattache le profil. Aucun mot de passe n’est saisi/conservé. Fonction Edge mise à jour pour répondre au preflight CORS (HTTP 200, en-têtes explicites); elle n’est pas encore redéployée. Elle doit être publiée avec `--no-verify-jwt` car elle valide elle-même le JWT via Supabase Auth, puis le rôle admin côté serveur. Aucune invitation réelle envoyée.
- Planning demandé : ajout de `sql-planning-nov-dec-2026.sql`. Il inscrit la semaine du 16 au 22 novembre, Hind OFF le 16 et de service le 21, puis Amadou le 28 novembre et Zineb le 5 décembre; les deux autres agents sont OFF les samedis. Le fichier utilise les IDs d’employés présents dans les seeds du dépôt et les shifts `M`, `SAT`, `OFF`.

## Tests exécutés

Les tests Node suivants ont tous terminé avec succès :

- `t-calibrage.js` — `PAGE CALIBRAGES OK`
- `t-nouveautes.js` — `NOUVEAUTÉS OK`
- `t-autrepages.js` — `AUTRES PAGES OK`
- `t-documents.js` — `DOCUMENTATION OK`
- `t-calendrier.js` — `CALENDRIER OK`
- `t-nouvelles-pages.js` — `NOUVELLES PAGES OK`
- `t-enhancements.js` — `ENHANCEMENTS OK`
- `test-rapport.js` — le PDF/XLSX de test a été généré.

`pglast` a analysé sans erreur de syntaxe les 7 fichiers SQL présents dans `sigma-build`, y compris les seeds octobre, les migrations, et le nouveau planning novembre/décembre.

Après les corrections d’accès, `t-nouvelles-pages.js`, `t-autrepages.js` et `t-enhancements.js` passent; le test couvre le bandeau agent masqué au superviseur, le lien Administration visible pour le profil admin, le formulaire d’invitation chargé et les critères de filtre du RPC PGV. Le SQL `sql-admin-utilisateurs.sql` passe l’analyse de syntaxe `pglast`. Les scripts inline du dashboard/administration compilent. Le test ne réalise pas d’invitation réseau réelle. Les tests reposent sur le harness DOM (`sigma-tests`), pas sur un navigateur réel. L’analyse SQL est une vérification de syntaxe, pas une exécution SQL. La fonction Edge a été bundlée pour vérifier sa syntaxe, mais n’est pas déployée; aucun utilisateur de test ne s’est connecté.

## Points de sécurité / inconnues à traiter avant déploiement

1. Les sélecteurs cachés et filtres ajoutés en JavaScript ne sont pas des contrôles d’accès. Un agent peut appeler les endpoints Supabase directement. Le dépôt contient une politique RLS de documents, mais je n’ai pas pu inspecter les politiques actuellement installées sur le projet Supabase; les scripts locaux ne démontrent pas à eux seuls que calibrages, planning, présence, agents et données d’emails sont isolés par rôle/agent. Vérifier ces policies dans Supabase avant de considérer l’isolation comme sécurisée.
2. Le script d’administration fait des contrôles de rôle dans les RPC; toutefois, les permissions effectives, triggers et politiques sur `profiles` doivent être vérifiés sur la base active.
3. `supabase-config.js` contient une clé `anon` (clé publique attendue côté navigateur), pas une clé `service_role` repérée. Ne jamais remplacer par une clé service-role dans les fichiers front-end.
4. Le reset mot de passe dépend de l’URL de redirection `location.origin + '/login.html'` autorisée dans Supabase Auth. À confirmer pour le domaine de production.
5. Le rattachement Zineb est préparé pour l’adresse fournie précédemment (`Elagbi.Zineb@Morocco.xceedcc.com`), mais l’existence de son utilisateur Auth et son rattachement réel ne sont pas confirmés. Aucun compte ni mot de passe n’a été créé.

## À exécuter manuellement / non confirmé

1. Copier l’archive avec les chemins racine adaptés vers `C:\Users\User18\Desktop\SIGMA\sigma`; examiner `git status` avant tout commit.
2. Déployer la Edge Function depuis la racine du dépôt avec `supabase functions deploy admin-invite-user`, après avoir configuré `APP_ORIGIN` et `AUTH_REDIRECT_URL`. La clé service-role doit rester dans les secrets d’exécution, jamais dans le client.
3. Dans Supabase, réexécuter `sql-admin-utilisateurs.sql` pour que le RPC filtre la liste Americana/PGV; examiner et tester les RLS avec un compte superviseur puis un compte agent; appliquer les autres migrations nécessaires dans l’ordre documenté.
4. Exécuter `sql-planning-presence-pgv.sql`, puis `sql-planning-nov-dec-2026.sql` dans Supabase SQL Editor; vérifier ensuite le planning avec la requête commentée à la fin du second fichier.
5. Une fois la fonction déployée, inviter Zineb depuis Administration, vérifier qu’elle reçoit le lien, puis faire un test de session agent. Aucun mot de passe initial ne doit être saisi/partagé par Sigma; l’agente en définit un via le lien sécurisé.
6. Tester visuellement dans un vrai navigateur le sélecteur de date, les cartes, le passage en statut de pause, les alertes et la vue agent.
