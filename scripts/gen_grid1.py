import io

lines = []
lines.append("/* ============================================================")
lines.append(" * Sigma — Grille d'évaluation PGV (Protégez-Vous)")
lines.append(" * 32 éléments, 3 familles, pondérés. Compatible qa_category.")
lines.append(" * ============================================================ */")
lines.append("(function () {")
lines.append("  'use strict';")
lines.append("")
lines.append("  var PGV_GRID = [")

# CTB elements
ctb = [
    ("CTB-01","CTB",2,3,True,False,"Identité vérifiée avant le dossier","Nom + un second élément (n° abonné, adresse, date de naissance ou e-mail) contrôlés avant d’ouvrir le dossier ou de communiquer une donnée."),
    ("CTB-02","CTB",2,2,False,False,"Dossier consulté dans Darwin pendant l’appel","Dossier ouvert et lu en séance ; pas de « je vérifie et je vous rappelle » quand l’information est disponible."),
    ("CTB-03","CTB",3,2,False,False,"Demande qualifiée dans la bonne typologie","Rattachement à l’une des cinq familles : abonnement, commande, accès numérique, information, réclamation."),
    ("CTB-04","CTB",4,3,True,False,"Information exacte et vérifiée","Réponse conforme à Darwin ou à la procédure écrite ; aucune information donnée de mémoire."),
    ("CTB-05","CTB",4,3,False,False,"Procédure appliquée jusqu’au bout","Toutes les étapes exécutées ; aucun traitement partiel laissé à la charge du client."),
    ("CTB-06","CTB",4,3,True,False,"Aucun engagement hors mandat","Aucun geste commercial, remboursement, délai ou exception promis sans autorisation ni base procédurale."),
    ("CTB-07","CTB",4,2,False,False,"Actions saisies dans Darwin en direct","Mise à jour, note, modification ou commande enregistrées pendant l’appel, pas après."),
    ("CTB-08","CTB",5,2,False,True,"Escalade déclenchée à bon escient","Cas transmis quand il le faut, au bon service, avec un motif explicite et vérifiable."),
    ("CTB-09","CTB",5,2,False,False,"Suite et délai communiqués","Le client sait ce qui se passe ensuite, quand, et par quel canal ; l’engagement est tracé."),
    ("CTB-10","CTB",6,1,False,False,"Dossier clôturé et statut à jour","Statut finalisé dans Darwin ; note de suivi créée si un suivi est nécessaire."),
    ("CTB-11","CTB",0,3,True,False,"Confidentialité respectée","Aucune donnée communiquée à un tiers non authentifié ; rien de sensible énoncé à voix haute sans nécessité.")
]

for i, (code, cat, step, weight, critical, na, label, critere) in enumerate(ctb):
    comma = "," if i < len(ctb) - 1 else ""
    lines.append("    { code:'%s', cat:'%s', step:%d, weight:%d, critical:%s, na:%s, label:'%s', critere:'%s' }%s" % (
        code, cat, step, weight, "true" if critical else "false", "true" if na else "false",
        label.replace("'", "\\'"), critere.replace("'", "\\'"), comma))

with io.open("js/pgv-grid.js", "w", encoding="utf-8") as f:
    f.write("\n".join(lines))
print("Part 1 written: %d lines" % len(lines))
