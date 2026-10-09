# Règles du projet Démarche-Bi

Applique les règles de `GEMINI.md` à la racine du dépôt. Résumé :

- Français par défaut, FCFA, contexte Sénégal.
- **Aucune information administrative inventée** : tout vient d'une fiche sourcée (`content/demarches/`), sinon `null`. L'assistant répond uniquement à partir des fiches ; les sources sont ajoutées par le code.
- Stack : Next.js App Router, TypeScript, Tailwind, Zod, Markdown + YAML ; Neon (Postgres) optionnel ; Vercel.
- Présente un plan et attends la validation avant une modification multi-fichiers ou du schéma SQL.
- Une migration SQL par changement de schéma (`db/migrations/`). Aucune donnée personnelle dans les journaux.
- Appels IA uniquement via `src/lib/ai/`, sortie validée par Zod puis par les garde-fous.
- Aucun secret dans le dépôt public. Variables dans `.env.local`, documentées dans `.env.example`.
- Avant de conclure : `npm run lint`, `npm run validate:fiches` et `npm run build`.
- Mets à jour `docs/TASKS.md` après chaque tâche terminée.
