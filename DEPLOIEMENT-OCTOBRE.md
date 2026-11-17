# Sigma · livraison du 17/11 — mode opératoire

Cette livraison ajoute, dans l'ordre où il faut les brancher :

1. la saisie d'activité de l'agent (appels + emails) depuis la page **Présence** ;
2. le bandeau **Mon espace** du dashboard (pointage, appels, emails, calibrages, présence) ;
3. la page **Administration** (comptes, rôles, rattachement agent, mots de passe) ;
4. l'onglet **Rapports** (PDF avec logo Sigma + Excel à 9 feuilles) ;
5. les **données d'octobre 2026** pour les trois agents.

---

## 1. Base de données — scripts à exécuter dans cet ordre

À exécuter dans **Supabase → SQL Editor**, l'un après l'autre. `ops-install.sql` est le script d'installation de base à la racine du dossier de livraison ; le reste est dans `sigma-build/`.

| Ordre | Fichier | Ce qu'il fait |
|---|---|---|
| 1 | `ops-install.sql` | schéma de base et objets opérationnels |
| 2 | `sql-grille-pgv-v2.sql` | grille PGV v2.0 |
| 3 | `sql-activite-agent.sql` | crée `agent_daily_activity` (appels), ajoute la note par agent sur les emails, crée la vue `v_agent_day`, réinsère l'équipe PGV si besoin |
| 4 | `sql-admin-utilisateurs.sql` | crée les fonctions d'administration (lecture des comptes, rôle, fiche agent, activation, reset) |
| 5 | `sql-docs-pgv.sql` | ouvre les types de document (Feedback, Rapport de fait, Plan d'action) et remet à plat la lecture des documents |
| 6 | `sql-planning-presence-pgv.sql` | fixe les shifts à 14h–23h et samedi 14h–18h, définit les limites de pauses et planifie octobre |
| 7 | `sql-seed-octobre-2026.sql` | remplit octobre 2026 : planning, pointages, pauses, appels, rotation emails, 12 calibrages, 8 documents |

Chaque script est rejouable : le seed supprime d'abord ses propres lignes du mois avant de les réécrire.

### Vérification rapide (SQL Editor)

```sql
select count(*) as calibrages from public.calibrations
 where activity = 'pgv' and calibration_date between '2026-10-01' and '2026-10-31';
-- attendu : 12

select count(*) as pointages from public.attendance_events
 where activity = 'pgv' and work_date between '2026-10-01' and '2026-10-31';
-- attendu : 23 jours ouvrés × 3 agents × 8 événements (moins les samedis)

select * from public.v_agent_day
 where work_date = '2026-10-15' order by agent_id;
-- attendu : 3 lignes avec appels, emails SAC, autres, net_min

select count(*) as comptes from public.admin_users();
-- attendu : autant de comptes que dans l'authentification Supabase
```

---

## 2. Fichiers à déployer

Ce sont **exactement** les fichiers du dossier `sigma-build/` :

```
administration.html          ← nouveau
rapports.html                ← nouveau
attendance.html              ← modifié (onglet Activité)
emails.html                  ← modifié (colonnes Autres / Total)
pgv-dashboard.html           ← modifié (bandeau Mon espace)
css/ops.css                  ← modifié (blocs activité, mon espace, admin, rapports)
js/ops-common.js             ← modifié (Rapports, Administration selon le rôle)
js/pgv-data.js               ← modifié (activité, emails par agent)
js/sigma-report.js           ← modifié (logo intégré, mise en page)
js/xlsx.js                   ← générateur Excel (déjà validé)
vendor/jspdf.umd.min.js      ← bibliothèque PDF locale (365 Ko, aucun CDN)
assets/acx-sigma-logo-light.svg ← logo clair du bandeau latéral
js/i18n.js, js/support-widget.js, js/supabase-client.js,
js/supabase-config.js, scripts/app-shared.js  ← dépendances des pages
```

Le logo du rapport PDF est **embarqué en base64 dans `js/sigma-report.js`** : aucune requête réseau, aucun fichier image à déployer pour le PDF.

Dossier de livraison prêt à copier : `sigma-livraison-octobre.zip`.

---

## 3. Ce que voit chaque rôle

| Page | Agent | Superviseur | Admin |
|---|---|---|---|
| Présence → Temps réel / Semaine | lecture | toutes les lignes, alertes | idem |
| Présence → Ma journée | son pointage | pointage pour un agent | idem |
| Présence → Activité | ses appels et emails | saisie pour un agent | idem |
| Vue d'ensemble → Mon espace | visible | visible si fiche liée | visible |
| Calibrages / Documentation / Emails / Rapports | lecture | saisie + validation | idem |
| Administration | — | — | visible dans la nav |

Le menu affiche **8 entrées** pour un agent, **9** pour un administrateur. Un superviseur ne voit pas Administration : c'est le rôle `admin` ou `super_admin` qui l'ouvre.

---

## 4. Ce qu'il faut vérifier après déploiement

1. **Connexion agent** → Présence → onglet **Activité** : saisir 3 chiffres, enregistrer, recharger : les valeurs reviennent et la ligne du jour apparaît dans le tableau 30 jours.
2. **Vue d'ensemble** : le bandeau *Mon espace* affiche l'heure, l'état du pointage, le nombre d'appels et d'emails du jour, les calibrages du mois.
3. **Rapports** : choisir octobre 2026 → *Télécharger le PDF*. Onze pages attendues, logo en tête, sections lisibles. Puis *Télécharger l'Excel* : neuf feuilles.
4. **Administration** (compte admin) : la liste des comptes s'affiche, un changement de rôle se répercute après rechargement, le bouton *Réinitialiser* envoie un lien.
5. Vider le cache du navigateur (**Ctrl+Shift+R**) après la mise en ligne.

---

## 5. Points de vigilance

- **`vendor/jspdf.umd.min.js`** doit être déployé, sinon le bouton PDF bascule automatiquement sur l'aperçu avant impression (aucune erreur, mais pas de fichier téléchargé).
- **Le reset de mot de passe** passe par l'e-mail Supabase. Si le service d'e-mail n'est pas configuré côté projet, le bouton affichera une erreur explicite ; c'est un réglage Supabase, pas Sigma.
- **Planning d'octobre** : shifts 14h–23h en semaine, samedi 14h–18h ; Hind en repos le lundi 5/10, samedi 10 Hind, 17 Amadou, 24 Zineb. Les tours emails tournent par jour ouvré et peuvent être modifiés en ouvrant le jour concerné dans la page Emails.
- **Codes de la grille** : `js/pgv-grid.js` est maintenant aligné sur les codes déjà présents dans `qa_elements` (sans modifier les lignes ni les identifiants de base). Déployer cette version du fichier avec les pages. Le seed a été ajusté en conséquence (N/A du critère de note = `CTB-12`). Il n'est pas nécessaire de réexécuter `sql-grille-pgv-v2.sql` si cette migration a déjà réussi.

---

## 6. Invitation d’agents depuis Sigma Administration

La page Administration permet désormais de saisir le nom, l’adresse email et la fiche agent, puis d’envoyer une invitation depuis Sigma. L’agent choisit lui-même son mot de passe via le lien email. Le mot de passe n’est jamais enregistré dans `profiles` ni transmis à la page.

Cette action utilise la Supabase Edge Function `supabase/functions/admin-invite-user/index.ts`. Déploie-la depuis la racine du dépôt (après avoir copié le dossier `supabase/functions/`) :

```powershell
supabase secrets set APP_ORIGIN="https://TON-DOMAINE" AUTH_REDIRECT_URL="https://TON-DOMAINE/login.html" --project-ref TON_PROJECT_REF
supabase functions deploy admin-invite-user --project-ref TON_PROJECT_REF
```

Remplace les deux valeurs par le domaine Sigma et la référence du projet. Ajoute aussi l’URL de redirection à la liste des Redirect URLs autorisées dans les réglages Auth du projet. Les variables Supabase de runtime sont fournies à la fonction; la clé `service_role` doit rester exclusivement dans l’environnement Edge Function et ne doit jamais être copiée dans les fichiers du navigateur.

La fonction vérifie le JWT de l’appelant et revalide côté serveur que le profil actif est `admin` ou `super_admin`, puis vérifie la fiche agent PGV. Une adresse déjà inscrite n’est pas invitée à nouveau : rattache le compte existant dans la table de Sigma, puis utilise le bouton de réinitialisation pour que son titulaire définisse son mot de passe.

Après déploiement, vérifie dans Sigma Administration qu’un administrateur peut inviter une adresse de test, que le profil `agent` reçoit bien la fiche sélectionnée et que l’email d’invitation permet de définir le mot de passe. Un déploiement local du fichier Edge Function n’est pas une exécution : la fonction doit être publiée sur le projet Supabase pour que le formulaire fonctionne.
