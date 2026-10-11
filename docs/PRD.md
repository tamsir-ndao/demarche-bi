# PRD — Démarche-Bi

## Vision

Qu'un citoyen puisse poser sa question sur une démarche administrative, en français (texte ou voix), et obtenir une réponse claire, **fondée uniquement sur des fiches vérifiées et accompagnée de ses sources officielles**. Quand l'information n'existe pas, l'assistant le dit.

## Problème

- Pièces à fournir, lieu, coût, délais : l'information est dispersée entre sites, affiches et bouche-à-oreille.
- Les réponses trouvées en ligne ou dans les groupes de discussion citent rarement une source et peuvent être périmées.
- Un assistant généraliste peut inventer une procédure ou un montant avec assurance. Pour une démarche administrative, c'est grave : le citoyen se déplace pour rien ou paie à tort.

## Utilisateurs

| Rôle | Besoin |
|---|---|
| Citoyen | Savoir quoi apporter, où aller, combien ça coûte et en combien de temps, sans se déplacer pour rien |
| Contributeur | Ajouter ou corriger une fiche simplement, avec une validation automatique |
| Développeur | Réutiliser le kit (fiches, recherche, garde-fous) pour un autre pays, une autre langue ou un autre domaine |

## Principes

1. **Aucune information inventée** : tout vient d'une fiche sourcée.
2. **« Je ne sais pas » est une réponse valide.**
3. **Les sources sont affichées par le code**, jamais écrites par le modèle.
4. **Le contenu est ouvert** : une fiche est un fichier Markdown que n'importe qui peut améliorer par pull request, avec contrôle automatique.
5. **Aucune base de données obligatoire** : cloner le dépôt, ajouter une clé IA, lancer.

## Parcours de démonstration (3 minutes)

1. L'utilisateur pose une question à la voix (« Qu'est-ce qu'il faut pour faire un passeport ? »). La transcription s'affiche et reste modifiable.
2. La réponse donne étapes, pièces, coût, délai et lieu, avec les sources cliquables et la date de vérification.
3. Une question hors fiches reçoit « Je ne sais pas » et une invitation à contribuer.
4. Une question vague (« Je veux un papier ») déclenche une question de précision.
5. On montre la fiche Markdown, la validation automatique (CI) et la pull request : le contenu est ouvert.
6. On affiche les chiffres du jeu d'évaluation, tels que mesurés.

## Périmètre du MVP (à tenir)

Inclus :
- Environ 15 fiches vérifiées, issues de sources officielles.
- Question en texte, puis en voix (Whisper).
- Compréhension de la question par l'IA, recherche lexicale dans les fiches, réponse ancrée dans les fiches, garde-fous, sources générées par le code.
- Message d'avertissement permanent (information indicative).
- Pages de consultation des fiches et page « Contribuer ».
- Avis utilisateur (utile / pas utile).
- Jeu d'évaluation de 52 questions et commande `npm run eval`.
- CI GitHub : validation des fiches, lint, build.
- Journal anonyme dans Neon (optionnel).
- Déploiement Vercel.

Exclus (après le hackathon) : comptes utilisateurs, paiement, rendez-vous ou dépôt de dossier en ligne, application mobile native, wolof complet (compréhension partielle en bonus seulement), autres pays.

## Rôle de l'IA

1. **Comprendre** : lire une question informelle (français, parfois mêlé de wolof ou d'abréviations) et choisir la ou les démarches concernées dans la liste des fiches.
2. **Répondre de façon ancrée** : écrire une introduction courte qui répond à la question, à partir de la seule fiche choisie.
3. **Clarifier** : poser une question de précision quand la demande est trop vague ou peut viser plusieurs démarches.
4. **Transcrire** : convertir la voix en texte avec Whisper.

Ce que l'IA ne fait pas : elle ne fournit aucun fait administratif de sa propre connaissance, elle n'écrit ni les pièces, ni les étapes, ni les chiffres, ni les sources (tout cela vient de la fiche), et le code contrôle son introduction avant de la montrer.

## Qualité et évaluation

Jeu de 52 questions (`eval/questions.jsonl`) répartis en trois familles : questions couvertes par une fiche, questions hors périmètre (refus attendu) et questions vagues (précision attendue). Dix d'entre elles sont en wolof ou mêlées de wolof (champ `langue`), pour mesurer la compréhension partielle du wolof sans la mélanger aux chiffres en français.

Mesures : la bonne fiche répond-elle, le refus est-il correct, la précision est-elle demandée quand la question est vague, combien d'introductions sont refusées par les garde-fous. Les chiffres sont publiés dans le README tels que mesurés, même imparfaits.

## Critères du hackathon et réponse du projet

| Critère | Poids | Réponse |
|---|---|---|
| Pertinence du problème et utilité | 25 % | Une question que tout le monde se pose, avec une réponse sourcée au lieu d'une rumeur |
| Pertinence de l'IA | 20 % | Compréhension d'une question informelle, réponse ancrée, clarification, voix, avec garde-fous mesurés |
| Qualité technique / prototype | 20 % | Démo de bout en bout, sorties IA validées par Zod, jeu d'évaluation chiffré |
| Démarche open source | 20 % | Contenu ouvert (fiches Markdown), validation automatique, CONTRIBUTING, issues « good first issue », licence MIT |
| Présentation, UX et potentiel | 15 % | Parcours en 3 minutes, mobile-first, réutilisable pour d'autres pays ou domaines |

## Risques et réponses

| Risque | Réponse |
|---|---|
| Fiche inexacte | Sources obligatoires, date et auteur de vérification, statut brouillon/vérifié, `null` pour l'inconnu, relecture |
| Fiche périmée | Date de vérification affichée, alerte au-delà de 12 mois, modèle d'issue « fiche obsolète » |
| Le modèle invente | Réponse limitée aux fiches, citations produites par le code, garde-fou sur les chiffres, refus quand rien n'est trouvé |
| Utilisateur qui se fie à une information fausse | Avertissement permanent, date de vérification, lien vers la source officielle |
| Quota ou panne Groq (gratuit : 200 000 tokens par jour et par modèle, soit 80 à 100 questions) | Second modèle Groq (plafonds séparés), offre payante à l'usage ou autre fournisseur pour la démo, mémoire des questions, limite par visiteur, repli sans IA ; pas de test en boucle |
| Vie privée | Aucun compte, aucune adresse IP stockée, questions tronquées, journal optionnel et purgeable |
| Pas assez de fiches fiables à temps | Viser 15 fiches, accepter 10 vérifiées plutôt que 15 douteuses |

## Livrables (dossier prêt le 18 octobre 2026)

- Dépôt public, licence MIT, historique Git visible
- README : problème, solution, rôle de l'IA, modèles, installation, chiffres d'évaluation
- Vidéo de démonstration de 3 minutes maximum
- Description du problème, de la solution et de l'usage de l'IA

Les modalités de transmission pour la présélection ne sont pas encore connues : les organisateurs les communiqueront (mail du 11 octobre). La soumission sur la plateforme MLH (Organizer HQ) se fait uniquement le 24 octobre, pour les 5 finalistes.

## Calendrier

- 7 octobre : lancement du hackathon
- 18 octobre : dossier prêt (date interne)
- 21 octobre : présélection des 5 finalistes (modalités de transmission à confirmer)
- 24 octobre : finale à l'Impact Hub Dakar. Check-in sur place, soumission sur MLH Organizer HQ (section Challenges) pour les 5 finalistes, puis 7 min de pitch + 3 min de questions
