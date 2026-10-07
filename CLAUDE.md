# Jënd-Jaay — instructions pour Claude

Les règles complètes du projet sont dans **`GEMINI.md`** (source de vérité, partagée avec Antigravity). Lis-le en premier.

Contexte détaillé :

- `docs/PRD.md` : produit, périmètre du MVP, critères du hackathon
- `docs/ARCHITECTURE.md` : structure du code, flux de données, modèle IA
- `docs/TASKS.md` : feuille de route J3-J12, à tenir à jour
- `docs/AI-PROMPTS.md` : prompts et schémas JSON des appels IA

Rappels essentiels :

- Réponds en français ; montants en FCFA ; contexte Sénégal.
- Présente le plan et attends la validation avant toute modification multi-fichiers ou du schéma SQL.
- Lis le guide Next.js concerné dans `node_modules/next/dist/docs/` avant d'écrire du code Next.js.
- Dépôt public sous licence MIT : aucun secret dans le code.
- Termine chaque tâche par `npm run lint` puis `npm run build`.
- Coche la tâche correspondante dans `docs/TASKS.md` quand elle est terminée.
