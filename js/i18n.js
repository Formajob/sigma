/* ============================================================
   Sigma i18n — FR / EN (vanilla, zéro dépendance)
   · t('texte FR', {vars})  → traduit si langue = en
   · walker DOM : traduit statique + dynamique (MutationObserver)
   · toggle FR/EN auto-injecté (localStorage : sigma-lang)
   ============================================================ */
(function () {
  'use strict';

  /* ================= DICT FR → EN ================= */
  var EN = {
    /* ---------- Titres de pages ---------- */
    'Sigma — Suivi d’équipe': 'Sigma — Team tracking',
    'Sigma — Accès client': 'Sigma — Client access',
    'Americana · Sigma': 'Americana · Sigma',

    /* ---------- index.html ---------- */
    'Sigma, accueil': 'Sigma, home',
    'ACX Sigma, accueil': 'ACX Sigma, home',
    'Navigation principale': 'Main navigation',
    'Fonctionnalités': 'Features',
    'Pour qui': 'Who it’s for',
    'Contact': 'Contact',
    'Contact ACX': 'ACX Contact',
    'Contacter la startup ACX : contact@acx.ma': 'Contact ACX startup: contact@acx.ma',
    'Accéder à votre espace client': 'Access your client area',
    'Accès client': 'Client access',
    'Connexion': 'Sign in',
    'Demander un devis / une démo': 'Request a quote / demo',
    'Devis / démo': 'Quote / demo',
    'Sigma · Suivi d’équipe': 'Sigma · Team tracking',
    'Un suivi clair.': 'Clear tracking.',
    'Une équipe': 'One team',
    'alignée.': 'aligned.',
    'Sigma réunit évaluations, rencontres et prochaines étapes': 'Sigma brings evaluations, meetings and next steps together',
    ' dans un calendrier partagé. Chacun retrouve les repères utiles selon son rôle, et l’équipe suit l’évolution par période.': ' in a shared calendar. Everyone finds the cues that matter for their role, and the team tracks progress period by period.',
    'Découvrir Sigma': 'Discover Sigma',
    'Voir l’essentiel': 'See the essentials',
    'Chaque acte, chaque suivi.': 'Every action, every follow-up.',
    'Pensé pour plusieurs rôles d’équipe': 'Designed for multiple team roles',
    'Supervision': 'Supervision',
    'Qualité': 'Quality',
    'Équipe': 'Team',
    'Administration': 'Administration',
    'Aperçu visuel de Sigma': 'Visual preview of Sigma',
    'Calendrier partagé': 'Shared calendar',
    'Vue d’ensemble': 'Overview',
    'Suivi d’activité': 'Activity tracking',
    'CALENDRIER': 'CALENDAR',
    'Évaluations & suivis': 'Evaluations & follow-ups',
    'OBJECTIFS': 'GOALS',
    'Repères mesurables': 'Measurable cues',
    'ÉQUIPE': 'TEAM',
    'Accès par rôle': 'Role-based access',
    'Prochaines étapes': 'Next steps',
    'Rencontre de suivi': 'Follow-up meeting',
    'Membre · Planifié': 'Member · Scheduled',
    'Planifié': 'Scheduled',
    'Évaluation qualité': 'Quality evaluation',
    'Membre · Terminé': 'Member · Completed',
    'Terminé': 'Completed',
    'Point d’alignement': 'Alignment check-in',
    'Membre · Suivi lié': 'Member · Linked follow-up',
    'À suivre': 'To follow up',
    'Plusieurs rôles': 'Multiple roles',
    'Une équipe · des accès adaptés': 'One team · tailored access',
    'Objectifs suivis': 'Goals tracked',
    'Résultats par période.': 'Results by period.',
    'Ce que Sigma relie': 'What Sigma connects',
    'Un calendrier unique': 'One calendar',
    'Évaluations et suivis réunis.': 'Evaluations and follow-ups together.',
    'Des accès par rôle': 'Role-based access',
    'Les repères utiles, partagés avec soin.': 'Useful cues, shared with care.',
    'Des résultats lisibles': 'Readable results',
    'Rapports et objectifs par période.': 'Reports and goals by period.',
    'Sigma, en bref': 'Sigma at a glance',
    'Les bonnes étapes.': 'The right steps.',
    'Au même endroit.': 'In one place.',
    'Planifiez, documentez et suivez les actions de l’équipe avec une vue partagée et des repères adaptés à chaque rôle.': 'Plan, document and track team actions with a shared view and cues tailored to each role.',
    'Planifier': 'Plan',
    'Réunissez évaluations, rencontres et prochaines étapes dans un calendrier filtrable.': 'Bring evaluations, meetings and next steps together in a filterable calendar.',
    'Documenter': 'Document',
    'Structurez les faits, impacts, solutions et prochaines étapes avec le cadre FISS.': 'Structure facts, impacts, solutions and next steps with the FISS framework.',
    'Suivre l’évolution': 'Track progress',
    'Consultez les volumes saisis, les objectifs et les rapports par agent et par période.': 'Review entered volumes, goals and reports by agent and period.',
    'À votre rythme': 'At your pace',
    'Votre activité change.': 'Your business changes.',
    'Sigma s’adapte.': 'Sigma adapts.',
    'Organisez les informations de l’équipe, les objectifs et les périodes de suivi selon vos besoins — tout en gardant un fil de documentation cohérent.': 'Organize team information, goals and tracking periods to your needs — while keeping a consistent documentation thread.',
    'Les repères de suivi': 'Tracking cues',
    'Dans un seul espace': 'In a single space',
    'Évaluations': 'Evaluations',
    'Rencontres': 'Meetings',
    'Observations': 'Observations',
    'Objectifs': 'Goals',
    'Calendrier': 'Calendar',
    'Rapports': 'Reports',
    'Le cœur Sigma reste simple': 'The Sigma core stays simple',
    'Une personne': 'One person',
    'Une date': 'One date',
    'Un acte': 'One action',
    'Un texte FISS': 'One FISS text',
    'Un suivi': 'One follow-up',
    'Les dates, les documents et les prochaines étapes restent reliés.': 'Dates, documents and next steps stay connected.',
    'Des repères pour chacun': 'Cues for everyone',
    'Chaque rôle retrouve': 'Every role finds',
    'l’essentiel.': 'what matters.',
    'Chacun accède à ses propres éléments, aux informations partagées et aux outils liés à son rôle.': 'Everyone accesses their own items, shared information and role-related tools.',
    'Créer les évaluations et organiser les suivis de l’équipe.': 'Create evaluations and organize team follow-ups.',
    'Accéder aux évaluations et consulter les suivis autorisés.': 'Access evaluations and view permitted follow-ups.',
    'Membres de l’équipe': 'Team members',
    'Retrouver leurs évaluations et les suivis partagés.': 'Find their evaluations and shared follow-ups.',
    'Gérer les objectifs, les volumes et les rapports.': 'Manage goals, volumes and reports.',
    'Une visibilité adaptée aux rôles.': 'Visibility tailored to roles.',
    ' Les données et les documents suivent les règles de partage de l’équipe.': ' Data and documents follow the team’s sharing rules.',
    'Espaces': 'Spaces',
    'Vos espaces clients': 'Your client spaces',
    'Deux activités,': 'Two activities,',
    'un même standard.': 'one standard.',
    'Chaque activité garde sa grille d’évaluation, ses documents et son équipe. L’accès reste nominatif et séparé.': 'Each activity keeps its own evaluation grid, documents and team. Access stays personal and separate.',
    'En service': 'Live',
    'Le suivi des calibrages d’appels et des accompagnements de l’équipe support.': 'Call calibration and coaching follow-up for the support team.',
    'Grille qualité de 19 éléments — CTB, CTC, NC': '19-element quality grid — CTB, CTC, NC',
    'Documents de suivi au format FISS': 'Follow-up documents in FISS format',
    'Objectifs, volumes et rapports par période': 'Goals, volumes and reports by period',
    'Accéder à Americana': 'Open Americana',
    'Espace en préparation': 'Space in preparation',
    'Le suivi des calibrages PGV sur sa propre grille, avec sa documentation et ses options dédiées.': 'PGV calibration follow-up on its own grid, with its documentation and dedicated options.',
    'Grille d’évaluation propre à PGV': 'Evaluation grid specific to PGV',
    'Documentation de suivi': 'Follow-up documentation',
    'Nouvelles options à venir': 'New options to come',
    'Accéder à PGV': 'Open PGV',
    'Un fil simple': 'One simple thread',
    'De l’évaluation à la prochaine étape.': 'From evaluation to next step.',
    'Étapes du suivi Sigma': 'Sigma tracking steps',
    'Évaluer': 'Evaluate',
    'Partager': 'Share',
    'Suivre': 'Track',
    'Demande de devis ou de démo': 'Quote or demo request',
    'Voyons comment Sigma': 'Let’s see how Sigma',
    's’adapte à votre activité.': 'fits your business.',
    'Parlez-nous de votre besoin. Nous vous présenterons le calendrier, les rôles et les repères de Sigma autour de votre activité.': 'Tell us what you need. We’ll walk you through Sigma’s calendar, roles and cues around your business.',
    'Votre demande': 'Your request',
    'Nom et prénom': 'Full name',
    'Organisation': 'Organization',
    'Email ou WhatsApp': 'Email or WhatsApp',
    'Choisir': 'Choose',
    'Demander une démo': 'Request a demo',
    'Demander un devis': 'Request a quote',
    'Démo et devis': 'Demo and quote',
    'Votre activité ou votre besoin': 'Your business or needs',
    '(facultatif)': '(optional)',
    'Envoyer ma demande': 'Send my request',
    'Votre message s’ouvrira dans WhatsApp pour être envoyé.': 'Your message will open in WhatsApp to be sent.',
    'Échangeons directement.': 'Let’s talk directly.',
    'Un produit ACX Maroc · sigma.acx.ma': 'An ACX Maroc product · sigma.acx.ma',
    'Un produit ACX Maroc ·': 'An ACX Maroc product ·',
    'Un produit ACX Maroc': 'An ACX Maroc product',
    'Sigma, retour en haut': 'Sigma, back to top',
    'ACX Sigma, retour en haut': 'ACX Sigma, back to top',

    /* ---------- login.html ---------- */
    'Sigma, retour à la présentation': 'Sigma, back to the homepage',
    'ACX Sigma, retour à la présentation': 'ACX Sigma, back to the homepage',
    'Connexion à Sigma': 'Sign in to Sigma',
    'Chaque acte.': 'Every action.',
    'Chaque suivi.': 'Every follow-up.',
    'Retrouvez les évaluations, les décisions et les prochaines étapes dans un espace clair, adapté à votre équipe.': 'Find evaluations, decisions and next steps in a clear space tailored to your team.',
    'Fonctionnalités Sigma': 'Sigma features',
    'Rapports par période': 'Reports by period',
    'Besoin d’aide ?': 'Need help?',
    '← Retour à la présentation': '← Back to the homepage',
    'Accès client · démonstration': 'Client access · demo',
    'Bienvenue.': 'Welcome.',
    'Choisissez votre espace client pour accéder à sa maquette.': 'Choose your client area to open your workspace.',
    'Votre espace client': 'Your client area',
    'Sélectionnez votre espace': 'Select your area',
    'Connexion de démonstration': 'Demo sign-in',
    'Adresse email': 'Email address',
    'nom@entreprise.ma': 'name@company.ma',
    'Mot de passe': 'Password',
    'Votre mot de passe': 'Your password',
    'Voir': 'Show',
    'Masquer': 'Hide',
    'Afficher le mot de passe': 'Show password',
    'Masquer le mot de passe': 'Hide password',
    'Se connecter': 'Sign in',
    'Mode maquette :': 'Demo mode:',
    ' les identifiants de test sont vérifiés dans cette page statique. Ce contrôle n’est pas une authentification sécurisée; n’utilisez pas de mot de passe réel.': ' test credentials are checked in this static page. This is not secure authentication; do not use a real password.',
    'Connectez-vous avec votre compte Sigma (Supabase).': 'Sign in with your Sigma account (Supabase).',
    'Compte sans profil Sigma. Demandez à un superviseur de créer votre accès.': 'Sigma account without a profile. Ask a supervisor to create your access.',
    'Identifiants incorrects ou compte inactif. Réessayez.': 'Wrong credentials or inactive account. Try again.',
    'Connexion…': 'Signing in…',
    'Chargement…': 'Loading…',
    'L’accès * n’est pas encore branché.': 'The * access is not connected yet.',
    /* ---------- americana-dashboard : structure ---------- */
    'suivi d’équipe': 'team tracking',
    'Espace client': 'Client area',
    'Support application · KFC Maroc': 'Application support · KFC Maroc',
    'Espace de travail': 'Workspace',
    'Calendrier': 'Calendar',
    'Équipe': 'Team',
    'Configuration': 'Settings',
    'Superviseur · Americana': 'Supervisor · Americana',
    'Agent · Americana': 'Agent · Americana',
    'Qualité · Americana': 'Quality · Americana',
    'Admin · Americana': 'Admin · Americana',
    'Super admin · Americana': 'Super admin · Americana',
    'Aperçu rôle': 'Preview role',
    'Choisir le rôle de démonstration': 'Choose the demo role',
    'Superviseur': 'Supervisor',
    'Agent': 'Agent',
    'Qualité': 'Quality',
    'Super admin': 'Super admin',
    'Déconnexion': 'Sign out',
    'Bonjour *': 'Hello *',
    'Suivi des calibrages, des accompagnements et des prochaines étapes.': 'Tracking calibrations, coaching and next steps.',
    '＋ Nouveau calibrage': '＋ New calibration',
    'Période du tableau de bord': 'Dashboard period',
    'Du': 'From',
    'Au': 'To',
    'Appliquer': 'Apply',
    'Objectifs & volumes →': 'Goals & volumes →',
    'Score global': 'Overall score',
    'Score global · N/A exclus du total': 'Overall score · N/A excluded from total',
    'Appels calibrés': 'Calibrated calls',
    'Appels écoutés sur la période': 'Calls reviewed in the period',
    'Appels pris': 'Calls taken',
    'Saisie par agent et période': 'Entered by agent and period',
    'Gérer': 'Manage',
    'Suivis planifiés': 'Planned follow-ups',
    'Rencontres et prochaines étapes': 'Meetings and next steps',
    'Respect des éléments déterminants': 'Compliance with key elements',
    'Calcul sur les calibrages terminés ; les éléments N/A sont exclus du total.': 'Computed on completed calibrations; N/A elements are excluded from the total.',
    'Score = éléments respectés ÷ total évalué × 100': 'Score = compliant elements ÷ evaluated total × 100',
    'Respecté (Oui)': 'Compliant (Yes)',
    'N/A exclu du calcul': 'N/A excluded from calculation',
    'Scores par agent': 'Scores by agent',
    'Score global et détail par élément déterminant, sur les calibrages terminés.': 'Overall score and breakdown by key element, on completed calibrations.',
    'Voir le calendrier →': 'View calendar →',
    'Écoutés': 'Reviewed',
    'Score': 'Score',
    'Évolution du score · mois en cours': 'Score trend · current month',
    'Score hebdomadaire des calibrages terminés, comparé à la cible.': 'Weekly score of completed calibrations, compared to the target.',
    'Progression vers les objectifs': 'Progress toward goals',
    'Les objectifs configurés sont comparés aux résultats de la période.': 'Configured goals compared with period results.',
    'Configurer les objectifs →': 'Configure goals →',
    'Calendrier de suivi': 'Tracking calendar',
    'Calibrages et documents placés à la date concernée.': 'Calibrations and documents placed on their date.',
    '＋ Document de suivi': '＋ Follow-up document',
    'Mois précédent': 'Previous month',
    'Mois suivant': 'Next month',
    'Afficher calibrages et suivis': 'Show calibrations and follow-ups',
    'Filtrer par type': 'Filter by type',
    'Filtrer par agent': 'Filter by agent',
    'Rechercher dans le calendrier': 'Search the calendar',
    'Aujourd’hui': 'Today',
    'Calibrages + suivis': 'Calibrations + follow-ups',
    'Calibrages seulement': 'Calibrations only',
    'Documents de suivi seulement': 'Follow-up documents only',
    'Tous les types': 'All types',
    'Tous les agents': 'All agents',
    'Calibrage': 'Calibration',
    'Rencontre': 'Meeting',
    'Disciplinaire': 'Disciplinary',
    'Observation': 'Observation',
    'Agent, objet, ID d’appel…': 'Agent, subject, call ID…',
    'Lun': 'Mon', 'Mar': 'Tue', 'Mer': 'Wed', 'Jeu': 'Thu', 'Ven': 'Fri', 'Sam': 'Sat', 'Dim': 'Sun',
    'Annulé': 'Cancelled',
    'Pointillé : suivi lié': 'Dashed: linked follow-up',
    'Activité récente': 'Recent activity',
    'Derniers calibrages et documents de suivi enregistrés.': 'Latest saved calibrations and follow-up documents.',
    '＋ Ajouter un suivi': '＋ Add a follow-up',
    'Objet / appel': 'Subject / call',
    'Statut': 'Status',
    'Générez une synthèse selon la période, l’agent et le type de suivi.': 'Generate a summary by period, agent and follow-up type.',
    'Rapport': 'Report',
    'Appels & calibrages': 'Calls & calibrations',
    'Suivis par agent': 'Follow-ups by agent',
    'Suivis par objet': 'Follow-ups by subject',
    'Respect & objectifs': 'Compliance & goals',
    'Générer le rapport': 'Generate report',
    'Exporter CSV': 'Export CSV',
    'Imprimer / PDF': 'Print / PDF',
    'Rapport · Appels & calibrages': 'Report · Calls & calibrations',
    'Suivi d’équipe & qualité': 'Team tracking & quality',
    'Espace client · Americana': 'Client area · Americana',
    'Sigma · Document généré automatiquement · Diffusion restreinte · sigma.acx.ma': 'Sigma · Automatically generated document · Restricted distribution · sigma.acx.ma',
    'Gestion de l’équipe': 'Team management',
    'Ajoutez, modifiez ou désactivez les agents et leurs informations.': 'Add, edit or deactivate agents and their information.',
    '＋ Ajouter un agent': '＋ Add an agent',
    'Matricule': 'Staff ID',
    'Rôle': 'Role',
    'Équipe / service': 'Team / service',
    'État': 'Status',
    'Actions': 'Actions',
    'Actif': 'Active',
    'Inactif': 'Inactive',
    'Modifier': 'Edit',
    'Activer': 'Enable',
    'Désactiver': 'Disable',
    'Lecture seule': 'Read-only',
    'Alimentez les volumes d’appels et les objectifs affichés sur le tableau de bord.': 'Feed call volumes and goals shown on the dashboard.',
    'Valeurs par agent et par période, modifiables pour le client.': 'Per-agent, per-period values, editable by the client.',
    'Appels pris par agent': 'Calls taken per agent',
    'Calibrages terminés par agent': 'Completed calibrations per agent',
    'Seuil de respect des éléments (%)': 'Compliance threshold (%)',
    'Le taux de respect est calculé sur les éléments terminés applicables. « Non appliqué » est exclu.': 'The compliance rate is computed on applicable completed elements. “Not applied” is excluded.',
    'Enregistrer les objectifs': 'Save goals',
    'Volumes d’appels pris': 'Call volumes taken',
    'Import groupé par période (écrase les données existantes de la période).': 'Batch import by period (overwrites existing data for the period).',
    '⇪ Importer un fichier': '⇪ Import a file',
    '＋ Saisir un volume': '＋ Enter a volume',
    'Période': 'Period',
    'Gérez les accès à Sigma : rôle, rattachement à une fiche agent, suspension et réinitialisation du mot de passe.': 'Manage Sigma access: role, agent record link, suspension and password reset.',
    'Actualiser': 'Refresh',
    'Utilisateur': 'User',
    'Fiche agent': 'Agent record',
    'Dernière connexion': 'Last sign-in',
    'Ajouter un utilisateur': 'Add a user',
    /* ---------- Dialogues ---------- */
    'Nouveau calibrage': 'New calibration',
    'Documentez l’appel puis notez chaque élément déterminant.': 'Document the call, then rate each key element.',
    'Fermer': 'Close',
    'Agent et appel': 'Agent and call',
    'Date de l’appel': 'Call date',
    'Date du calibrage': 'Calibration date',
    'Agent concerné': 'Agent concerned',
    'Statut du calibrage': 'Calibration status',
    'Sélectionnez un agent pour afficher sa fiche.': 'Select an agent to show their record.',
    'Identifiant de l’appel': 'Call ID',
    'Évaluateur': 'Evaluator',
    'Qualiticien': 'Quality analyst',
    'Autre': 'Other',
    'Langue de l’appel': 'Call language',
    'Arabe classique': 'Classical Arabic',
    'Arabe local': 'Local Arabic',
    'Français': 'French',
    'Anglais': 'English',
    'Éléments déterminants': 'Key elements',
    'Chaque question se note ': 'Each question is rated ',
    'Oui': 'Yes',
    'Non': 'No',
    '. Un score est calculé pour chacun des trois éléments déterminants (CTB, CTC, NC) et pour l’ensemble : éléments respectés ÷ éléments évalués × 100. Les N/A sont retirés du total.': '. A score is computed for each of the three key elements (CTB, CTC, NC) and overall: compliant elements ÷ evaluated elements × 100. N/A are removed from the total.',
    'Notes du superviseur': 'Supervisor notes',
    'Notes': 'Notes',
    'Ajouter un contexte ou une note sur l’appel…': 'Add context or a note about the call…',
    'Annuler': 'Cancel',
    'Enregistrer le calibrage': 'Save calibration',
    'Document et personne concernée': 'Document and person concerned',
    'Type de document': 'Document type',
    'Objet': 'Subject',
    'Date de rencontre': 'Meeting date',
    'Date de suivi': 'Follow-up date',
    'ID d’appel': 'Call ID',
    '(si lié à un calibrage)': '(if linked to a calibration)',
    'Visibilité': 'Visibility',
    'Superviseur seulement': 'Supervisor only',
    'Superviseur + agent concerné': 'Supervisor + agent concerned',
    'Corps de la documentation · FISS': 'Documentation body · FISS',
    'Faits': 'Facts',
    'Impacts': 'Impacts',
    'Solutions': 'Solutions',
    'Suivi': 'Follow-up',
    'Faits observés…': 'Observed facts…',
    'Impacts constatés…': 'Recorded impacts…',
    'Solutions ou actions convenues…': 'Agreed solutions or actions…',
    'Prochaine étape…': 'Next step…',
    'Enregistrer le document': 'Save document',
    'Saisir les appels pris': 'Enter calls taken',
    'Volume saisi manuellement pour un agent et une période personnalisée.': 'Volume entered manually for an agent and a custom period.',
    'Nombre d’appels pris': 'Number of calls taken',
    'Début de période': 'Period start',
    'Fin de période': 'Period end',
    'Enregistrer le volume': 'Save volume',
    'Importer les appels pris': 'Import calls taken',
    'Un fichier CSV/Excel pour toute l’équipe sur une période. Les données existantes de cette période seront remplacées.': 'A CSV/Excel file for the whole team for a period. Existing data for that period will be replaced.',
    'Fichier CSV : ': 'CSV file: ',
    ' ou ': ' or ',
    ' (l’en-tête est ignorée)': ' (the header row is ignored)',
    'Exemple : ': 'Example: ',
    ' — le matricule doit exister dans Équipe. Séparateur « ; » ou « , ».': ' — the ID must exist in Team. Separator “;” or “,”.',
    'Importer et remplacer la période': 'Import and replace the period',
    'Détail': 'Detail',
    'Ajouter un agent': 'Add an agent',
    'Modifier un agent': 'Edit an agent',
    'Informations de la fiche agent Americana.': 'Americana agent record information.',
    'Informations principales': 'Main information',
    'Nom complet': 'Full name',
    'Équipe': 'Team',
    'Numéro de poste': 'Station number',
    "Date d'embauche": 'Hire date',
    'Service / activité': 'Service / activity',
    'Coordonnées': 'Contact details',
    'Téléphone': 'Phone',
    'Agent actif': 'Active agent',
    "Supprimer l'agent": 'Delete agent',
    'Questions non notées': 'Unrated questions',
    'Certaines questions n’ont pas été notées. Choisissez la valeur par défaut à leur appliquer avant l’enregistrement.': 'Some questions were not rated. Choose the default value to apply before saving.',
    ' question(s) sans réponse :': ' question(s) unanswered:',
    'Retour au formulaire': 'Back to the form',
    'Noter en Oui': 'Rate as Yes',
    'Noter en N/A': 'Rate as N/A',
    /* ---------- JS dynamique : messages ---------- */
    'La date de début doit précéder la date de fin.': 'The start date must precede the end date.',
    'La gestion de l’équipe est réservée à la supervision et à l’admin.': 'Team management is reserved for supervisors and admins.',
    'La vue agent est en consultation.': 'The agent view is read-only.',
    'Cette vue ne peut pas créer de calibrage.': 'This view cannot create calibrations.',
    'Cette vue ne peut pas créer de document.': 'This view cannot create documents.',
    'Cette vue ne peut pas créer ce type de document.': 'This view cannot create this type of document.',
    'Aucun agent sélectionné. Ajoute d’abord un agent dans Équipe.': 'No agent selected. Add an agent in Team first.',
    'Grille qualité non chargée (qa_elements). Recharge la page.': 'Quality grid not loaded (qa_elements). Reload the page.',
    'Document enregistré et ajouté au calendrier.': 'Document saved and added to the calendar.',
    'Accès non autorisé.': 'Access denied.',
    'Objectifs enregistrés.': 'Goals saved.',
    'Générez un rapport avant l’export.': 'Generate a report before exporting.',
    'Volume d’appels enregistré pour la période.': 'Call volume saved for the period.',
    'Aucune ligne reconnue dans le fichier.': 'No recognized line in the file.',
    'Sélectionne d’abord un fichier valide.': 'Select a valid file first.',
    'Aucun matricule ne correspond à un agent de l’équipe.': 'No staff ID matches a team agent.',
    'Aucune adresse email sur ce compte.': 'No email address on this account.',
    'Écriture Supabase refusée : *': 'Supabase write denied: *',
    'Suppression refusée : *': 'Deletion denied: *',
    'Refusé : *': 'Denied: *',
    'Agent ajouté à l’équipe.': 'Agent added to the team.',
    'Fiche agent mise à jour.': 'Agent record updated.',
    '{name} supprimé de l’équipe.': '{name} removed from the team.',
    '{name} {state}.': '{name} {state}.',
    'activé': 'enabled',
    'désactivé': 'disabled',
    'Supprimer définitivement {name} de l’équipe ?': 'Permanently delete {name} from the team?',
    'Ses calibrages, documents et volumes déjà enregistrés resteront en base mais ne seront plus rattachés à un agent actif.': 'Their saved calibrations, documents and volumes will stay in the database but will no longer be linked to an active agent.',
    'Import terminé · {n} agents · {c} appels (période remplacée).': 'Import complete · {n} agents · {c} calls (period replaced).',
    'Calibrage enregistré · score {pct}% ({ok}/{total}).': 'Calibration saved · score {pct}% ({ok}/{total}).',
    'Accès réactivé.': 'Access re-enabled.',
    'Accès suspendu.': 'Access suspended.',
    'Rattachement mis à jour.': 'Record link updated.',
    'Rôle mis à jour.': 'Role updated.',
    'Envoyer un email de réinitialisation à * ?': 'Send a reset email to *?',
    'Email de réinitialisation envoyé à *': 'Reset email sent to *',
    'Agents Supabase injoignables, cache local utilisé : *': 'Supabase agents unreachable, local cache used: *',
    'Calibrages Supabase injoignables, cache local utilisé : *': 'Supabase calibrations unreachable, local cache used: *',
    'Documents Supabase injoignables, cache local utilisé : *': 'Supabase documents unreachable, local cache used: *',
    'Volumes Supabase injoignables, cache local utilisé : *': 'Supabase volumes unreachable, local cache used: *',
    /* ---------- Rôles (messages d’en-tête) ---------- */
    'Vue admin :': 'Admin view:',
    ' accès à l’espace Americana.': ' full access to the Americana area.',
    'Vue agent :': 'Agent view:',
    ' vos propres calibrages et les documents partagés avec vous.': ' your own calibrations and documents shared with you.',
    'Vue qualité :': 'Quality view:',
    ' calibrages et documents de suivi visibles, sans documents disciplinaires.': ' calibrations and follow-up documents visible, no disciplinary documents.',
    'Vue super admin (ACX) :': 'Super admin view (ACX):',
    ' accès complet à l’espace Americana.': ' full access to the Americana area.',
    'Vue superviseur :': 'Supervisor view:',
    /* ---------- Rapports (dynamique) ---------- */
    'Agents': 'Agents',
    'Calibrages terminés': 'Completed calibrations',
    'Score moyen': 'Average score',
    'Conformité vs cible': 'Compliance vs target',
    'cible * %': 'target * %',
    'Total': 'Total',
    'Moyenne': 'Average',
    'Taux écouté': 'Listen rate',
    'Respect': 'Compliance',
    'Planifiés': 'Planned',
    'Terminés': 'Completed',
    'Annulés': 'Cancelled',
    'Nombre': 'Count',
    'Part des suivis': 'Share of follow-ups',
    'Appels pris / objectif': 'Calls taken / goal',
    'Calibrages / objectif': 'Calibrations / goal',
    'Respect / cible': 'Compliance / target',
    'Aucun résultat pour les critères sélectionnés.': 'No results for the selected criteria.',
    '* agent(s) · * · Volumes manuels dont la période est incluse dans le filtre.': '* agent(s) · * · Manual volumes whose period falls within the filter.',
    'Période : *': 'Period: *',
    'Généré le *': 'Generated on *',
    'Édité par : *': 'Prepared by: *',
    /* ---------- Objectifs / alertes / calendrier ---------- */
    'Objectif * sur la période': 'Goal * for the period',
    'Objectif * par agent · terminés': 'Goal * per agent · completed',
    'Objectif *% · « Non appliqué » exclu': 'Goal *% · “Not applied” excluded',
    'Aucun calibrage terminé ce mois-ci : le suivi du score démarrera dès le premier calibrage enregistré.': 'No completed calibration this month: score tracking starts with the first saved calibration.',
    ' n’a aucun calibrage terminé ce mois-ci.': ' has no completed calibration this month.',
    'Score global du mois à ': 'Overall score this month at ',
    '%, au-dessus de la cible de ': '%, above the target of ',
    '%, sous la cible de ': '%, below the target of ',
    '%.': '%.',
    ' à ': ' at ',
    ' sur ': ' on ',
    ' calibrage(s) : sous la cible de ': ' calibration(s): below the target of ',
    'Ajouter une entrée le *': 'Add an entry on *',
    'Ajouter à cette date': 'Add on this date',
    'Aucun événement ce jour.': 'No event on this day.',
    /* ---------- Administration ---------- */
    "* compte(s). Un compte suspendu conserve son rôle mais n'accède plus à aucune donnée.": "* account(s). A suspended account keeps its role but no longer sees any data.",
    'Suspendre l’accès de {name} ?': 'Suspend access for {name}?',
    'Le compte existe toujours mais ne verra plus aucune donnée.': 'The account still exists but will no longer see any data.',
    'Exécutez ': 'Run ',
    ' dans Supabase → SQL Editor, puis cliquez sur Actualiser.': ' in Supabase → SQL Editor, then click Refresh.',
    /* ---------- Grille qualité (labels affichés) ---------- */
    'Contrôle des appels': 'Call controls',
    'Matrice d’escalade appropriée utilisée en cas de suivi (TL, superviseur)': 'Escalation matrix used appropriately when follow-up is needed (TL, supervisor)',
    'Matrice d’escalade TL/superviseur': 'TL/supervisor escalation matrix',
    'Informations correctement enregistrées dans le système (CRM/SDM)': 'Information correctly recorded in the system (CRM/SDM)',
    'Informations CRM/SDM': 'CRM/SDM information',
    'Notes claires et succinctes pour décrire la situation': 'Clear and concise notes describing the situation',
    'Notes claires et succinctes': 'Clear and concise notes',
    'Courtoisie pendant l’appel': 'Courtesy during the call',
    'Volonté d’aider': 'Willingness to help',
    'Écoute active': 'Active listening',
    'Compétences en communication': 'Communication skills',
    'Confidentialité des données clients respectée': 'Customer data confidentiality respected',
    'Confidentialité des données': 'Data confidentiality',
    'Aucun raccrochage inapproprié ni interaction évitée': 'No inappropriate hang-up or avoided interaction',
    'Aucun raccrochage inapproprié': 'No inappropriate hang-up',
    'Ouverture de l’appel rapide et claire': 'Fast and clear call opening',
    'Ouverture rapide et claire': 'Fast and clear opening',
    'Protocoles de mise en attente et de transfert respectés': 'Hold and transfer protocols respected',
    'Mise en attente et transfert': 'Hold and transfer',
    'Processus de gestion des rappels et plaintes respecté': 'Complaints and call-back process respected',
    'Rappels et plaintes': 'Call-backs and complaints',
    'Empathie': 'Empathy',
    'Questions approfondies': 'In-depth questions',
    'Connaissance produit': 'Product knowledge',
    'Professionnalisme': 'Professionalism',
    'Utilisation du nom du client': 'Using the customer’s name',
    'V.A.T.R.E': 'V.A.T.R.E',
    'Communication': 'Communication',
    'CTB · Éléments déterminants business': 'CTB · Business key elements',
    'CTC · Éléments déterminants client': 'CTC · Customer key elements',
    'NC · Éléments déterminants non conformes': 'NC · Non-compliant key elements',
    'CTB · ': 'CTB · ',
    'CTC · ': 'CTC · ',
    'NC · ': 'NC · ',
    'Éléments déterminants business': 'Business key elements',
    'Éléments déterminants client': 'Customer key elements',
    'Éléments déterminants non conformes': 'Non-compliant key elements',
    'Respect des éléments': 'Element compliance',
    'éléments': 'elements',
    'respectés': 'compliant',
    'non respectés': 'not compliant',
    'N/A exclus': 'N/A excluded',
    /* ---------- Motifs / suggestions ---------- */
    'Escalade vers le TL non effectuée.': 'Escalation to the TL not carried out.',
    'Hésitation sur une référence produit.': 'Hesitation on a product reference.',
    'Saisie CRM incomplète.': 'Incomplete CRM entry.',
    'Étapes V.A.T.R.E partiellement suivies.': 'V.A.T.R.E steps partially followed.',
    'Le nom du client n’a pas été utilisé.': 'The customer’s name was not used.',
    'L’adresse de livraison n’a pas été reformulée.': 'The delivery address was not repeated back.',
    'Bon accueil. La confirmation de l’adresse est à retravailler.': 'Good welcome. Address confirmation needs work.',
    'Bonne écoute, prochaine étape à confirmer.': 'Good listening, next step to confirm.',
    'Prévoir un rappel sur la clôture de l’échange.': 'Schedule a call-back to close the conversation.',
    'Résolution claire.': 'Clear resolution.',
    'Réécouter un appel et vérifier la reformulation.': 'Re-listen to a call and check the summary.',
    'À reprendre en suivi individuel.': 'To revisit in one-to-one follow-up.',
    'Échange fluide et résolution au premier contact.': 'Smooth conversation and first-contact resolution.',
    'Félicitation': 'Recognition',
    'Calibrage réalisé sur l’appel KFC-MA-104281.': 'Calibration carried out on call KFC-MA-104281.',
    'Email non confirmé': 'Email not confirmed',
    /* ---------- Objets de document ---------- */
    'Performance': 'Performance',
    'Calibrage': 'Calibration',
    'Alignement': 'Alignment',
    'Retard': 'Lateness',
    'Absence': 'Absence',
    'Comportement': 'Behavior',
    'Savoir-faire': 'Hard skills',
    'Savoir-être': 'Soft skills',
    /* ---------- Note admin ---------- */
    "La création d'un compte se fait dans ": 'Accounts are created in ',
    ', en cochant ': ' with ',
    '*Renseignez le champ *': '*Fill in the *',
    ' pour attribuer directement le rôle :': ' to directly assign the role:',
    '{ "full_name": "Prénom Nom", "role": "agent" }': '{ "full_name": "First Last", "role": "agent" }',
    'Le profil est ensuite créé automatiquement et apparaît dans ce tableau. Revenez ici pour le rattacher à une fiche agent.': 'The profile is then created automatically and appears in this table. Come back here to link it to an agent record.',
    /* ---------- Divers ---------- */
    'Oui, tous': 'Yes, all',
    'Sans agent': 'No agent',
    'Mois': 'Month',
    'Semaine': 'Week',
    'à': 'at',
    'sur': 'on',
    'Cette période ⌄': 'This period ⌄',
    'Dans le calendrier  →': 'In the calendar  →',
    '* éléments': '* elements',
    '* respectés · * non respectés': '* compliant · * not compliant',
    '* N/A exclus': '* N/A excluded',
    'Créez une rencontre, une observation ou un document disciplinaire.': 'Create a meeting, an observation or a disciplinary document.',
    'Prise en charge complète et ton professionnel.': 'Full handling and a professional tone.',
    'Réactiver': 'Reactivate',
    'Suspendre': 'Suspend',
    'Enregistrer la fiche': 'Save record',
    'Activité / besoin :': 'Activity / need:',
    'Bonjour, je souhaite contacter Sigma.': 'Hello, I would like to contact Sigma.',
    'Nom : ': 'Name: ',
    'Organisation : ': 'Organization: ',
    'Contact : ': 'Contact: ',
    'Demande : ': 'Request: ',
    'Membres de l’équipe': 'Team members',
    '⚠️ Matricules introuvables dans Équipe (ignorés) : *': '⚠️ Staff IDs not found in Team (ignored): *',
    '* · Terminé': '* · Completed',
    '* · Planifié': '* · Scheduled',
    '* · Annulé': '* · Cancelled',
    'Envoi impossible : *': 'Sending failed: *',
    '— Aucune —': '— None —',
    'Jamais': 'Never',
    'Suspendu': 'Suspended',
    'Mot de passe': 'Password',
    'Chargement…': 'Loading…',
    'Accès suspendu. Contactez votre superviseur pour réactiver votre compte.': 'Access suspended. Contact your supervisor to reactivate your account.',
    'Métadonnées à coller dans Supabase': 'Metadata to paste in Supabase',
    'Copier le JSON': 'Copy JSON',
    'Ouvrir Supabase → Add user': 'Open Supabase → Add user',
    'Métadonnées copiées.': 'Metadata copied.',
    'Copie impossible : sélectionnez le champ et Ctrl+C.': 'Copy failed: select the field and press Ctrl+C.',
    'Prénom Nom': 'First Name Last Name',
    'Étapes : 1) copiez le JSON ci-dessus · 2) dans Supabase, Add user, cochez ': 'Steps: 1) copy the JSON above · 2) in Supabase, Add user, check ',
    ' et collez le JSON dans ': ' and paste the JSON in ',
    ' · 3) le profil apparaît automatiquement dans ce tableau — rattachez-lui une fiche agent.': ' · 3) the profile appears automatically in this table — link it to an agent record.',
    /* @@DICT-APPEND@@ */
  };

  /* ================= MOTEUR ================= */
  var lang = 'fr';
  var ATTRS = [['placeholder', 'Placeholder'], ['title', 'Title'], ['aria-label', 'AriaLabel'], ['alt', 'Alt']];
  var WK = [], WKR = [];
  (function buildWild() {
    for (var k in EN) {
      if (EN.hasOwnProperty(k) && k.indexOf('*') !== -1) {
        WK.push(k);
        WKR.push(new RegExp('^' + k.split('*').map(function (p) {
          return p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        }).join('([\\s\\S]*?)') + '$'));
      }
    }
  })();

  function trCore(core) {
    if (EN.hasOwnProperty(core)) return EN[core];
    for (var i = 0; i < WK.length; i++) {
      var m = core.match(WKR[i]);
      if (m) {
        var out = EN[WK[i]].split('*'), res = out[0];
        for (var j = 1; j < out.length; j++) res += (m[j] || '') + out[j];
        return res;
      }
    }
    return null;
  }

  function lookupDict(n, core) {
    if (EN.hasOwnProperty(n)) return EN[n];
    if (core !== n && EN.hasOwnProperty(core)) return EN[core];
    for (var i = 0; i < WK.length; i++) {
      var m = n.match(WKR[i]) || (core !== n ? core.match(WKR[i]) : null);
      if (m) {
        var out = EN[WK[i]].split('*'), res = out[0];
        for (var j = 1; j < out.length; j++) res += (m[j] || '') + out[j];
        return res;
      }
    }
    return null;
  }

  function tr(s) {
    if (lang !== 'en' || !s) return null;
    var n = String(s).replace(/\u00A0/g, ' ');
    var lead = (n.match(/^\s*/) || [''])[0];
    var trail = (n.match(/\s*$/) || [''])[0];
    var core = n.substring(lead.length, n.length - trail.length);
    var out = lookupDict(n, core);
    return out === null ? null : out;
  }

  function walkText(node) {
    if (node.__i18nFr === undefined) node.__i18nFr = node.data;
    var src = node.__i18nFr;
    if (lang === 'en') {
      var out = tr(src);
      if (out !== null && out !== node.data) node.data = out;
    } else if (node.data !== src) {
      node.data = src;
    }
  }

  function walkEl(el) {
    if (!el.getAttribute || !el.dataset) return;
    for (var i = 0; i < ATTRS.length; i++) {
      var a = ATTRS[i][0], dk = 'fr' + ATTRS[i][1];
      var v = el.getAttribute(a);
      if (v === null || v === undefined) continue;
      if (el.dataset[dk] === undefined) el.dataset[dk] = v;
      var src = el.dataset[dk];
      if (lang === 'en') {
        var out = tr(src);
        if (out !== null && out !== v) el.setAttribute(a, out);
      } else if (v !== src) {
        el.setAttribute(a, src);
      }
    }
  }

  function walk(node) {
    if (node.nodeType === 3) { walkText(node); return; }
    if (node.nodeType !== 1) return;
    var tag = node.tagName;
    if (tag === 'SCRIPT' || tag === 'STYLE' || tag === 'NOSCRIPT') return;
    walkEl(node);
    var c = node.firstChild;
    while (c) { walk(c); c = c.nextSibling; }
  }

  function translateDOM() {
    if (document.body) walk(document.body);
  }

  var pending = false;
  function schedule() {
    if (pending) return;
    pending = true;
    setTimeout(function () { pending = false; translateDOM(); }, 60);
  }

  var titleFr = null;
  function setLang(next) {
    if (next !== 'en' && next !== 'fr') next = 'fr';
    lang = next;
    try { localStorage.setItem('sigma-lang', lang); } catch (e) {}
    document.documentElement.lang = lang === 'en' ? 'en' : 'fr';
    window.sigmaLocale = lang === 'en' ? 'en-GB' : 'fr-MA';
    if (titleFr) document.title = (lang === 'en' && EN[titleFr]) ? EN[titleFr] : titleFr;
    translateDOM();
    paintToggle();
    try { window.dispatchEvent(new CustomEvent('sigma:langchange', { detail: { lang: lang } })); } catch (e) {}
  }

  window.t = function (s, vars) {
    if (s === null || s === undefined) return s;
    var out = String(s);
    if (lang === 'en') { var e = tr(out); if (e !== null) out = e; }
    if (vars) for (var k in vars) out = out.split('{' + k + '}').join(vars[k]);
    return out;
  };

  /* ================= TOGGLE FR / EN ================= */
  function buildToggle() {
    var b = document.createElement('button');
    b.type = 'button';
    b.className = 'sigma-lang';
    b.setAttribute('aria-label', 'Changer de langue / Switch language');
    b.innerHTML = '<span>FR</span><span>EN</span>';
    b.addEventListener('click', function () { setLang(lang === 'fr' ? 'en' : 'fr'); });
    return b;
  }

  function paintToggle() {
    var b = document.querySelector('.sigma-lang');
    if (!b || !b.children.length) return;
    b.children[0].className = lang === 'fr' ? 'on' : '';
    b.children[1].className = lang === 'en' ? 'on' : '';
  }

  function mount() {
    var btn = buildToggle();
    var slots = ['.top-actions', '.nav-row', '.access-top'];
    for (var i = 0; i < slots.length; i++) {
      var el = document.querySelector(slots[i]);
      if (el) { el.appendChild(btn); break; }
    }
    if (!btn.parentNode) document.body.appendChild(btn);
    paintToggle();
  }

  function injectStyle() {
    var st = document.createElement('style');
    st.textContent = '.sigma-lang{display:inline-flex;gap:2px;padding:3px;border:1px solid #E0DCD5;border-radius:20px;background:#fff;cursor:pointer;vertical-align:middle}' +
      '.sigma-lang span{padding:3px 7px;border-radius:14px;font-size:10px;font-weight:800;color:#7A8588;letter-spacing:.05em;transition:background .15s,color .15s}' +
      '.sigma-lang span.on{color:#fff;background:#C0622D}' +
      '.sigma-lang:hover{border-color:#C98A67}';
    document.head.appendChild(st);
  }

  /* ================= INIT ================= */
  try { lang = localStorage.getItem('sigma-lang') === 'en' ? 'en' : 'fr'; } catch (e) { lang = 'fr'; }
  window.sigmaLocale = lang === 'en' ? 'en-GB' : 'fr-MA';

  function init() {
    titleFr = document.title;
    document.documentElement.lang = lang === 'en' ? 'en' : 'fr';
    if (lang === 'en' && EN[titleFr]) document.title = EN[titleFr];
    injectStyle();
    translateDOM();
    mount();
    if (window.MutationObserver) {
      new MutationObserver(schedule).observe(document.documentElement, {
        childList: true, subtree: true, characterData: true,
        attributes: true, attributeFilter: ['placeholder', 'title', 'aria-label', 'alt']
      });
    }
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();

  window.SIGMA_I18N = {
    t: window.t,
    setLang: setLang,
    getLang: function () { return lang; },
    translateDOM: translateDOM
  };
})();
/* @@DICT-END@@ */

