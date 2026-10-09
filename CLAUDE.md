# Démarche-Bi — instructions pour Claude

Les règles complètes du projet sont dans **`GEMINI.md`** (source de vérité, partagée avec Antigravity). Lis-le en premier.

Contexte détaillé :

- `docs/PRD.md` : produit, périmètre du MVP, critères du hackathon, risques
- `docs/ARCHITECTURE.md` : structure du code, flux, garde-fous
- `docs/TASKS.md` : planning jusqu'au 19 octobre, à tenir à jour
- `docs/AI-PROMPTS.md` : prompts et schémas des appels IA
- `docs/FICHES-A-PRODUIRE.md` : démarches à documenter et méthode

Rappels essentiels :

- Réponds en français ; montants en FCFA ; contexte Sénégal.
- **Aucune information administrative inventée** : tout vient d'une fiche sourcée, sinon `null`.
- Présente le plan et attends la validation avant toute modification multi-fichiers ou du schéma SQL.
- Lis le guide Next.js concerné dans `node_modules/next/dist/docs/` avant d'écrire du code Next.js.
- Dépôt public sous licence MIT : aucun secret, aucune donnée personnelle.
- Termine chaque tâche par `npm run lint`, `npm run validate:fiches` puis `npm run build`.
- Coche la tâche correspondante dans `docs/TASKS.md` quand elle est terminée.
