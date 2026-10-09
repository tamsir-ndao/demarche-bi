---
description: Ajouter une fonctionnalité de bout en bout (plan, code, vérification, commit)
---

1. Lire `docs/TASKS.md` et identifier la tâche à traiter.
2. Lire `docs/PRD.md` et `docs/ARCHITECTURE.md` pour respecter le périmètre et les garde-fous.
3. Présenter un plan court (fichiers touchés, changement de schéma éventuel) et attendre la validation.
4. Si Next.js est concerné : lire le guide correspondant dans `node_modules/next/dist/docs/`.
5. Si le schéma de la base change : créer une nouvelle migration dans `db/migrations/` et l'appliquer avec `npm run db:migrate`. L'application doit continuer à fonctionner sans base.
6. Implémenter la fonctionnalité en petits changements. Écrire un test quand la logique est déterministe (recherche, garde-fous).
7. Exécuter `npm run lint`, `npm run validate:fiches` et `npm run build`, et corriger les erreurs.
8. Cocher la tâche dans `docs/TASKS.md`.
9. Proposer un message de commit clair et attendre la validation avant de committer.
