---
description: Ajouter une fonctionnalité de bout en bout (plan, code, vérification, commit)
---

1. Lire `docs/TASKS.md` et identifier la tâche à traiter.
2. Lire `docs/PRD.md` et `docs/ARCHITECTURE.md` pour respecter le périmètre.
3. Présenter un plan court (fichiers touchés, changements de schéma éventuels) et attendre la validation.
4. Si le schéma change : créer une nouvelle migration dans `db/migrations/` et l'appliquer avec `npm run db:migrate`.
5. Si Next.js est concerné : lire le guide correspondant dans `node_modules/next/dist/docs/`.
6. Implémenter la fonctionnalité en petits changements.
7. Exécuter `npm run lint` puis `npm run build` et corriger les erreurs.
8. Cocher la tâche dans `docs/TASKS.md`.
9. Proposer un message de commit clair et attendre la validation avant de committer.
