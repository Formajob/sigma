$ErrorActionPreference = 'Stop'

# À lancer depuis la racine du dépôt Sigma après extraction de l'archive.
$repo = (git rev-parse --show-toplevel 2>$null)
if (-not $repo) { throw 'Dépôt Git introuvable. Lance ce script depuis la racine du dépôt Sigma.' }
Set-Location $repo

$branch = (git branch --show-current).Trim()
if (-not $branch) { throw 'Branche Git indéterminée (HEAD détachée). Bascule sur une branche avant de pousser.' }

# Évite d'inclure par accident des changements déjà indexés par l'utilisateur.
$stagedBefore = @(git diff --cached --name-only)
if ($stagedBefore.Count -gt 0) {
  throw 'Il existe déjà des fichiers indexés. Examine `git diff --cached`, valide ou désindexe-les, puis relance le script.'
}

$files = @(
  'attendance.html',
  'emails.html',
  'pgv-dashboard.html',
  'calendrier.html',
  'administration.html',
  'login.html',
  'documents.html',
  'planning.html',
  'rapports.html',
  'pgv-calibrages.html',
  'js/pgv-data.js',
  'js/pgv-grid.js',
  'js/ops-common.js',
  'css/ops.css',
  'assets/acx-sigma-logo-light.svg',
  'js/supabase-client.js',
  'scripts/app-shared.js',
  'sql-fix-isolation-pgv.sql',
  'sql-appels-recus.sql',
  'sql-appels-mensuels.sql',
  'sql-grille-pgv-v2.sql',
  'sql-grille-pgv-synthese-enum.sql',
  'sql-grille-pgv-synthese.sql',
  'sql-agent-sac-pgv.sql',
  'sql-auth-trigger-agent-pgv.sql',
  'supabase/functions/admin-invite-user/index.ts',
  'supabase/functions/pgv-send-agent-document/index.ts'
)
foreach ($file in $files) {
  if (-not (Test-Path (Join-Path $repo $file))) { throw "Fichier absent après extraction : $file" }
}

git add -- $files
if ($LASTEXITCODE -ne 0) { throw 'git add a échoué.' }
if (git diff --cached --quiet) {
  Write-Host 'Aucun changement de ces fichiers à committer.'
  exit 0
}

git diff --cached --stat
$answer = Read-Host "Créer le commit et pousser la branche '$branch' vers origin ? (o/N)"
if ($answer -notin @('o','O','oui','Oui','y','Y')) {
  Write-Host 'Annulé. Les changements restent indexés; rien n’a été poussé.'
  exit 0
}

git commit -m 'Mise à jour PGV : activité, calendrier et accès agents'
if ($LASTEXITCODE -ne 0) { throw 'git commit a échoué.' }
git push origin $branch
if ($LASTEXITCODE -ne 0) { throw 'git push a échoué. Le commit local existe; corrige la connexion/branche puis relance git push.' }
Write-Host "Push terminé vers origin/$branch. Vérifie le déploiement automatique de l’hébergeur."
