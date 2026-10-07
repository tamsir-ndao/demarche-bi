# Règles du projet Jënd-Jaay

Applique les règles de `GEMINI.md` à la racine du dépôt. Résumé :

- Français par défaut, FCFA, contexte Sénégal, WhatsApp.
- Stack : Next.js App Router, TypeScript, Tailwind, Supabase, Vercel.
- Présente un plan et attends la validation avant une modification multi-fichiers ou du schéma SQL.
- Une migration SQL par changement de schéma, RLS toujours activée.
- Appels IA uniquement via `src/lib/ai/`, sortie validée par un schéma Zod.
- Aucun secret dans le dépôt public. Variables dans `.env.local`, documentées dans `.env.example`.
- Avant de conclure : `npm run lint` et `npm run build`.
- Mets à jour `docs/TASKS.md` après chaque tâche terminée.
