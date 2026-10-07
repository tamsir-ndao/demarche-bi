# Jënd-Jaay — règles du projet (Antigravity / Gemini)

> Fichier lu automatiquement par l'agent. Les mêmes règles sont dans `CLAUDE.md` et `.agent/rules/project.md`.
> Contexte détaillé : `docs/PRD.md`, `docs/ARCHITECTURE.md`, `docs/TASKS.md`, `docs/AI-PROMPTS.md`.

## Contexte

Jënd-Jaay est un assistant de sourcing alimentaire par IA pour les restaurateurs, boutiquiers et traiteurs du Sénégal. L'acheteur écrit ou dicte une demande, l'IA la structure, trouve les fournisseurs adaptés et compare leurs offres.

Projet du **Open Source × AI Hackathon 2026 (Galsen DEV)**. Dates butoirs : soumission **19 octobre 2026**, finale **24 octobre 2026**.

## Langue et marché

- Réponds en **français** par défaut. Le code, les noms de variables et les commits restent en anglais ou en français cohérent avec l'existant.
- Contexte Afrique de l'Ouest : montants en **FCFA** (entiers, sans décimales), villes Thiès, Dakar, Mbour, Rufisque, contact par **WhatsApp**.
- Textes d'interface : tutoiement, ton simple et direct.

## Stack

- Next.js (App Router) + TypeScript + Tailwind CSS
- Supabase (Postgres, Auth, RLS)
- Déploiement Vercel
- IA : modèle open-weight (Llama ou Qwen) via API compatible OpenAI ; Whisper pour la voix
- Licence **MIT**. Le dépôt est **public** : jamais de secret, de clé ou de donnée réelle dans le code.

## Règles de travail

1. **Validation avant modification** : pour tout changement qui touche plusieurs fichiers, le schéma SQL ou l'architecture, présente d'abord le plan et attends la validation.
2. **Next.js a des changements incompatibles** : lis le guide concerné dans `node_modules/next/dist/docs/` avant d'écrire du code Next.js, sans te fier à ta mémoire de l'API.
3. **Petits commits** : un commit par fonctionnalité, message clair. L'historique Git visible fait partie des critères du jury.
4. **Secrets** : uniquement dans `.env.local` (ignoré par Git). Tout nouvel usage est ajouté à `.env.example` sans valeur.
5. **Base de données** : toute modification passe par une nouvelle migration dans `supabase/migrations/` (jamais d'édition d'une migration déjà appliquée). Les tables ont la RLS activée.
6. **IA** : tout appel modèle passe par `src/lib/ai/` ; la sortie est toujours validée (schéma Zod) avant d'être utilisée. Tout nouveau modèle ou API est déclaré dans le README.
7. **Vérification** : avant de dire qu'une tâche est finie, exécute `npm run lint` et `npm run build`.
8. **Périmètre** : respecte le MVP défini dans `docs/PRD.md`. Pas de paiement, de livraison ni de messagerie interne avant que le reste soit terminé.

## Design

Minimaliste, lisible sur mobile et en connexion faible. Pas de polices distantes (polices système). Couleur principale : vert émeraude. Priorité à l'UX mobile-first.

## Commandes

```bash
npm run dev      # serveur local
npm run lint     # ESLint
npm run build    # build de production
```
