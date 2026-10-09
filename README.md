# Sigma

Application web de **suivi d'équipe** éditée par **ACX Maroc**.
Calendrier partagé, calibrages qualité, documents de suivi au format FISS, objectifs, rapports et accès par rôle.

**Production :** https://sigma.acx.ma

> Sigma n'est pas un SIRH, ni un outil de paie ou de pointage, ni un enregistreur d'appels, ni une application de la méthode Six Sigma. L'utilisateur saisit ses constats ; Sigma les structure, les conserve et les restitue.

---

## État du projet

Maquette statique fonctionnelle, en ligne. **Pas encore connectée à la base de données.**

| Élément | État |
|---|---|
| Pages publiques | En ligne |
| Maquette Americana | En ligne, données fictives en `localStorage` |
| Base Supabase | Schéma créé, **non branché** |
| Authentification | **Factice** — identifiants en clair dans le JavaScript |

⚠️ Tant que l'authentification réelle n'est pas en place, **aucune donnée réelle de collaborateur** ne doit être saisie dans l'application.

---

## Structure

```
sigma/
├── index.html                  # Page de présentation publique
├── login.html                  # Accès client (Americana uniquement)
├── americana-demo.html         # Maquette applicative complète
├── sql/
│   └── supabase-americana.sql  # Schéma PostgreSQL (déjà exécuté)
├── archive/
│   ├── pgv-demo.html           # Autres clients, mis de côté
│   └── vd-demo.html
├── .gitignore
└── README.md
```

---

## Lancer en local

Aucune installation n'est nécessaire : le projet est en HTML, CSS et JavaScript natifs, sans framework ni dépendance.

1. Ouvrir le dossier dans VS Code
2. Installer l'extension **Live Server** (Ritwick Dey)
3. Clic droit sur `index.html` → **Open with Live Server**
4. Le site s'ouvre sur `http://127.0.0.1:5500`

> Ne pas ouvrir les fichiers par double-clic (`file://`) : le navigateur y bloque une partie des fonctionnalités nécessaires par la suite.

**Accès à la maquette :** `omar@americana.com` / `omar123`

**Prévisualiser un rôle directement :** `americana-demo.html?role=superviseur` (ou `agent`, `qualite`, `admin`)

---

## Le métier en bref

Un **calibrage** est l'évaluation d'un appel écouté. La grille compte **19 questions** en trois familles, les *éléments déterminants* :

| Code | Famille | Questions |
|---|---|---|
| **CTB** | Business | 4 |
| **CTC** | Client | 9 |
| **NC** | Soft skills | 6 |

Chaque question se note **Oui / Non / N/A**. Une raison est obligatoire pour tout « Non » si le calibrage est Terminé.

**Formule de score, à respecter partout :**

```
score = respectés (Oui) ÷ évalués (Oui + Non) × 100
```

Les **N/A sont exclus du dénominateur**. Un score est calculé par famille et pour l'ensemble.

Les documents de suivi utilisent le format **FISS** : Faits, Impacts, Solutions, Suivi.

---

## Déploiement

Hébergement **Vercel**, DNS chez **Nindohost**, domaine `sigma.acx.ma`.

Tout push sur `main` déclenche un déploiement automatique en production.
Tout push sur une autre branche génère une URL de prévisualisation.

```bash
git checkout -b feature/ma-modification
# ... développement et test en local ...
git add .
git commit -m "Description claire du changement"
git push -u origin feature/ma-modification
```

**Règle :** `main` est toujours la version qui fonctionne. On n'y travaille jamais directement.

Revenir en arrière en cas de problème en production :

```bash
git revert HEAD
git push
```

---

## Feuille de route

- [ ] **Phase 1** — Fondations : projet en local, boucle de déploiement validée
- [ ] **Phase 2** — Base : premier compte Supabase, agents réels saisis
- [ ] **Phase 3** — Découpage : extraire le CSS puis les modules JS d'`americana-demo.html`
- [ ] **Phase 4** — Authentification Supabase réelle et protection des pages
- [ ] **Phase 5** — Branchement des données : agents → calibrages → documents → volumes → scores
- [ ] **Phase 6** — Finitions, puis réintégration de PGV et VD comme données en base

---

## Base de données

8 tables et 4 vues dans le schéma `public` de Supabase.

`agents` · `profiles` · `qa_elements` · `calibrations` · `calibration_results` · `documents` · `call_volumes` · `goals`

Les résultats de grille sont stockés **une ligne par question** dans `calibration_results`, et non en 19 colonnes : la grille peut évoluer sans modifier la structure des tables.

Vues de calcul : `v_calibration_scores`, `v_calibration_category_scores`, `v_agent_monthly_scores`, `v_weekly_trend`.

Les politiques **RLS** sont actives : un compte sans ligne correspondante dans `profiles` ne verra aucune donnée.
