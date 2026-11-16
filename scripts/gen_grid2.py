import io

lines = []

# CTC elements
ctc = [
    ("CTC-01","CTC",1,1,False,False,"Décroché et formule d’accueil","Décroché en 3 sonneries maximum ; formule complète : entreprise, bonjour, prénom."),
    ("CTC-02","CTC",1,2,False,False,"Client écouté jusqu’au bout","Le client expose sa demande en entier avant toute réponse, relance ou interruption."),
    ("CTC-03","CTC",3,2,False,False,"Reformulation de la demande","Demande reformulée ou synthétisée, puis validée par le client avant traitement."),
    ("CTC-04","CTC",4,2,False,False,"Réponse à la question posée","Réponse exacte à ce qui est demandé : ni à côté, ni digression, ni question évitée."),
    ("CTC-05","CTC",4,2,False,False,"Explication claire et sans jargon","Vocabulaire du client ; aucun terme interne (Darwin, back-office, SAC) employé sans être traduit."),
    ("CTC-06","CTC",4,3,False,True,"Gestion de la réclamation","Gêne reconnue sans justification défensive ; problème reformulé ; solution ou alternative datée proposée."),
    ("CTC-07","CTC",4,2,False,True,"Mise en attente conforme","Accord demandé, raison donnée, retour dans le délai annoncé, remerciement au retour."),
    ("CTC-08","CTC",5,1,False,True,"Transfert annoncé et présenté","Transfert annoncé, raison expliquée, service ou nom du destinataire donné au client."),
    ("CTC-09","CTC",6,2,False,False,"Clôture complète","Récapitulatif, prochaine étape, ouverture à une autre demande, politesse ; le client raccroche le premier."),
    ("CTC-10","CTC",0,1,False,False,"Nom du client utilisé","Nom employé au moins deux fois dans l’échange, correctement prononcé.")
]

with open("js/pgv-grid.js", "r", encoding="utf-8") as f:
    content = f.read()

# Replace CTB-11 closing (no comma) with comma version
old_ctb11 = "    { code:'CTB-11', cat:'CTB', step:0, weight:3, critical:true,  na:false, label:'Confidentialité respectée', critere:'Aucune donnée communiquée à un tiers non authentifié ; rien de sensible énoncé à voix haute sans nécessité.' }"
new_ctb11 = old_ctb11 + ","
content = content.replace(old_ctb11, new_ctb11)

for i, (code, cat, step, weight, critical, na, label, critere) in enumerate(ctc):
    is_last = (i == len(ctc) - 1)
    comma = "" if is_last else ","
    lines.append("    { code:'%s', cat:'%s', step:%d, weight:%d, critical:%s, na:%s, label:'%s', critere:'%s' }%s" % (
        code, cat, step, weight, "true" if critical else "false", "true" if na else "false",
        label.replace("'", "\\'"), critere.replace("'", "\\'"), comma))

lines.append("  ];")
lines.append("")

content += "\n".join(lines)

with io.open("js/pgv-grid.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Part 2 written: CTC elements added")
