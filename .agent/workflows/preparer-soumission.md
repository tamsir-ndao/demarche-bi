---
description: Vérifier que le projet est prêt pour le dossier du hackathon (prêt le 18 octobre 2026, soumission MLH le 24)
---

1. Vérifier que le dépôt est public, avec la licence MIT et un historique Git visible.
2. Vérifier que le README contient : problème, solution, rôle de l'IA, modèles/APIs/outils utilisés, installation, chiffres d'évaluation.
3. Exécuter `npm run eval` et reporter les chiffres tels que mesurés dans le README, même imparfaits.
4. Vérifier qu'aucun secret n'est présent : rechercher les clés, URLs privées et fichiers `.env` dans l'historique Git.
5. Exécuter `npm run lint`, `npm run validate:fiches` et `npm run build`.
6. Vérifier que chaque fiche utilisée en production est `verifie`, avec sources, date et auteur de vérification.
7. Vérifier le parcours de démonstration de bout en bout, avec un plan B si le réseau ou l'API tombe.
8. Préparer la vidéo de 3 minutes maximum (voir `docs/PRD.md`, parcours de démonstration).
9. Rédiger la description du problème et de la solution, et l'explication de l'usage de l'IA, pour le dossier de présélection et la soumission MLH.
