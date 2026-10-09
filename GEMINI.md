# Démarche-Bi — règles du projet (Antigravity / Gemini)

> Fichier lu automatiquement par l'agent. Les mêmes règles sont dans `CLAUDE.md` et `.agent/rules/project.md`.
> Contexte détaillé : `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `docs/AI-PROMPTS.md`, `docs/FICHES-A-PRODUIRE.md`, `docs/SETUP.md`.

## Contexte

Démarche-Bi est un assistant open source qui répond aux questions sur les démarches administratives au Sénégal, **uniquement à partir de fiches vérifiées**, en citant toujours ses sources officielles.

Projet de l'**Open Source × AI Hackathon 2026 (Galsen DEV)**, track Civic Tech & services publics. Dates : soumission **19 octobre 2026** (viser le 18), présélection le 21, finale **24 octobre 2026**.

## Règle n°1 : aucune information inventée

- Les informations administratives (pièces, coûts, délais, lieux) viennent exclusivement de fiches dans `content/demarches/`, chacune avec des sources officielles et une date de vérification.
- Ne jamais écrire ni « compléter de mémoire » une fiche. Si une information manque ou est incertaine, mets `null`.
- L'assistant répond uniquement à partir des fiches retrouvées ; sinon il dit qu'il ne sait pas.
- Les sources affichées sont produites par le code à partir des métadonnées de la fiche, jamais par le modèle.
- Seules les fiches `statut: verifie` répondent en production. Les brouillons ne servent qu'en développement (`DEMARCHE_INCLUDE_DRAFTS=true`).
- Toute réponse s'accompagne de l'avertissement : information indicative, à confirmer auprès de l'administration.

## Langue et marché

- Réponds en **français** par défaut. Le code et les noms de variables restent cohérents avec l'existant.
- Contexte Sénégal : montants en **FCFA** (entiers), villes Thiès, Dakar, etc.
- Textes d'interface : tutoiement, ton simple et direct, phrases courtes.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Contenu : Markdown + en-tête YAML validé par Zod (`src/lib/fiches/`)
- Recherche lexicale écrite en code, sans embeddings
- IA : Groq (Llama 3.3 70B) via API compatible OpenAI, secours OpenRouter ; Whisper (Groq) pour la voix. Client dans `src/lib/ai/client.ts`
- Neon (Postgres) **optionnel** : journal anonyme et avis. L'application doit fonctionner sans `DATABASE_URL`
- Déploiement Vercel. Licence **MIT**. Le dépôt est **public** : jamais de secret ni de donnée personnelle
- Guide d'installation et de déploiement : `docs/SETUP.md`

## Règles de travail

1. **Validation avant modification** : pour tout changement qui touche plusieurs fichiers, le schéma SQL ou l'architecture, présente d'abord le plan et attends la validation.
2. **Next.js a des changements incompatibles** : lis le guide concerné dans `node_modules/next/dist/docs/` avant d'écrire du code Next.js, sans te fier à ta mémoire de l'API.
3. **Petits commits** : un commit par fonctionnalité, message clair. L'historique Git visible fait partie des critères du jury.
4. **Secrets** : uniquement dans `.env.local` (ignoré par Git). Tout nouvel usage est ajouté à `.env.example` sans valeur.
5. **Base de données** : optionnelle. Toute modification passe par une nouvelle migration dans `db/migrations/` (jamais d'édition d'une migration déjà appliquée), exécutée par `npm run db:migrate`. Aucune donnée personnelle : pas d'adresse IP, pas d'identifiant, question tronquée à 500 caractères. `DATABASE_URL` ne doit jamais atteindre le navigateur.
6. **IA** : tout appel modèle passe par `src/lib/ai/`. La sortie est validée par un schéma Zod, puis par les garde-fous (`src/lib/ai/guardrails.ts`), qui ne doivent jamais être contournés. Tout nouveau modèle ou API est déclaré dans le README.
7. **Contenu** : `npm run validate:fiches` doit passer. Aucune fiche n'est rédigée sans source officielle.
8. **Vérification** : avant de dire qu'une tâche est finie, exécute `npm run lint`, `npm run validate:fiches` et `npm run build`.
9. **Périmètre** : respecte le MVP défini dans `docs/PRD.md`. Pas de comptes, de paiement ni de dépôt de dossier.

## Design

Minimaliste, lisible sur mobile et en connexion faible. Pas de polices distantes (polices système). Couleur principale : vert émeraude. Priorité à l'UX mobile-first. La date de vérification et les sources sont toujours visibles.

## Commandes

```bash
npm run dev              # serveur local
npm run lint             # ESLint
npm run validate:fiches  # validation des fiches
npm run build            # build de production
npm run db:migrate       # migrations Neon (optionnel)
```
