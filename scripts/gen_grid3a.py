import io

lines = []

nc = [
    ("NC-01","NC",0,1,False,False,"V.A.T.R.E — Volume","Volume audible et stable : ni voix étouffée, ni saturation, ni variation brutale."),
    ("NC-02","NC",0,1,False,False,"V.A.T.R.E — Articulation","Mots détachés, aucune syllabe avalée ; compréhension sans effort, même au téléphone."),
    ("NC-03","NC",0,1,False,False,"V.A.T.R.E — Ton","Ton professionnel et chaleureux, sourire audible ; aucune agressivité ni froideur."),
    ("NC-04","NC",0,1,False,False,"V.A.T.R.E — Rythme","Débit adapté au client, pauses respectées ; ni précipitation, ni lenteur qui fait attendre."),
    ("NC-05","NC",0,1,False,False,"V.A.T.R.E — Énergie","Dynamisme constant du décroché à la clôture, y compris en fin de journée et sur appel difficile."),
    ("NC-06","NC",0,2,False,False,"Professionnalisme","Vocabulaire soigné : pas d’argot, de familiarité, ni de tics de langage (« beh », « machin », « voilà »)."),
    ("NC-07","NC",0,2,False,False,"Écoute active","Signaux d’écoute, reprises, aucune interruption, réponse à ce qui n’est pas dit explicitement."),
    ("NC-08","NC",0,2,False,False,"Empathie","Émotion nommée et reconnue ; discours adapté au client inquiet, pressé ou agacé."),
    ("NC-09","NC",0,3,True,False,"Contrôle émotionnel","Reste calme face à l’agressivité : pas d’ironie, de ton sec, de soupir audible ni de riposte."),
    ("NC-10","NC",0,3,True,False,"Neutralité et respect","Aucun jugement, aucune discrimination, aucun commentaire personnel, politique ou religieux."),
    ("NC-11","NC",0,1,False,False,"Maîtrise de la langue du client","La langue choisie (français, arabe, darija) est tenue et comprise sans hésitation bloquante.")
]

with open("js/pgv-grid.js", "r", encoding="utf-8") as f:
    content = f.read()

old_ctc10 = "    { code:'CTC-10', cat:'CTC', step:0, weight:1, critical:false, na:false, label:'Nom du client utilisé', critere:'Nom employé au moins deux fois dans l’échange, correctement prononcé.' }"
new_ctc10 = old_ctc10 + ","
content = content.replace(old_ctc10, new_ctc10)

for i, (code, cat, step, weight, critical, na, label, critere) in enumerate(nc):
    is_last = (i == len(nc) - 1)
    comma = "" if is_last else ","
    lines.append("    { code:'%s', cat:'%s', step:%d, weight:%d, critical:%s, na:%s, label:'%s', critere:'%s' }%s" % (
        code, cat, step, weight, "true" if critical else "false", "true" if na else "false",
        label.replace("'", "\\'"), critere.replace("'", "\\'"), comma))

lines.append("  ];")
lines.append("")

content += "\n".join(lines)

with io.open("js/pgv-grid.js", "w", encoding="utf-8") as f:
    f.write(content)
print("Part 3a written: NC elements added")
