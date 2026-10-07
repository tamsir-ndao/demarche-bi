# Guide de démarrage — Jënd-Jaay

Toutes les étapes pour passer de l'archive du projet à une application qui tourne, puis à la soumission du hackathon. Compte environ 45 minutes la première fois.

> Règle d'or : le dépôt est **public**. Les clés API vont uniquement dans `.env.local` (ignoré par Git) et dans les variables d'environnement de Vercel. Ne les colle jamais dans un fichier du dépôt, un commit ou un chat.

## Prérequis

- Node.js 20 ou plus récent, et Git
- Un compte GitHub, un compte Supabase, un compte Groq (tous gratuits, sans carte bancaire pour démarrer)
- Antigravity (ou tout autre éditeur) pour ouvrir le dossier

## Étape 1 — Ouvrir le projet

```bash
unzip jend-jaay.zip
cd jend-jaay
npm install
```

Ouvre ensuite le dossier `jend-jaay` dans Antigravity. L'agent lit automatiquement `GEMINI.md` et les règles de `.agent/`.

## Étape 2 — S'inscrire au hackathon

1. Ouvre https://tally.so/r/0Qp5rB et remplis le formulaire (participation individuelle).
2. Pour assister à l'événement du 24 octobre à l'Impact Hub Dakar, inscris-toi aussi ici : https://events.mlh.com/events/14896-hacktoberfest-hack-day-dakar-x-galsen-dev

## Étape 3 — Créer le dépôt GitHub public

1. Sur GitHub, crée un dépôt **public** nommé `jend-jaay`, sans README ni licence (ils existent déjà dans le projet).
2. Dans le dossier du projet :

```bash
git branch -M main
git remote add origin https://github.com/<ton-compte>/jend-jaay.git
git push -u origin main
```

L'historique Git visible fait partie des critères du jury : commite régulièrement, par petites fonctionnalités.

## Étape 4 — Créer la base Supabase

1. Sur supabase.com, crée un nouveau projet (choisis la région la plus proche disponible).
2. Ouvre l'éditeur SQL du projet.
3. Colle et exécute le contenu de `supabase/migrations/0001_init.sql`.
4. Colle et exécute ensuite `supabase/seed.sql` pour charger les données de démonstration (fictives).
5. Dans les paramètres du projet, section API, copie l'**URL du projet** et la clé **anon (publique)**. N'utilise jamais la clé `service_role` côté navigateur.

## Étape 5 — Créer la clé Groq (IA principale)

1. Sur console.groq.com, crée un compte et génère une clé API.
2. Modèle conseillé : `llama-3.3-70b-versatile` (extraction et comparaison). Pour les tests répétés, `llama-3.1-8b-instant` consomme moins de quota.
3. Voix : `whisper-large-v3-turbo`, avec la même clé.

Quotas gratuits indicatifs (à vérifier dans ta console, ils changent) : environ 30 requêtes par minute et 1 000 requêtes par jour sur Llama 3.3 70B. Le plafond de tokens par minute est souvent la vraie limite : évite les tests en boucle. Le quota est par organisation, créer plusieurs clés ne l'augmente pas.

## Étape 6 — (Optionnel) Clé OpenRouter de secours

Le gratuit n'a pas de garantie de disponibilité. Pour la finale, prévois un secours :

1. Sur openrouter.ai, crée un compte et une clé API.
2. Choisis un modèle gratuit dans leur liste et note son nom exact.
3. Renseigne les variables `AI_FALLBACK_*` à l'étape suivante.

Le client (`src/lib/ai/client.ts`) essaie Groq d'abord, puis OpenRouter automatiquement si Groq échoue. Sans clé de secours, seul Groq est utilisé.

## Étape 7 — Renseigner `.env.local`

```bash
cp .env.example .env.local
```

Ouvre `.env.local` et remplis :

| Variable | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL du projet Supabase (étape 4) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé anon Supabase (étape 4) |
| `AI_API_KEY` | clé Groq (étape 5) |
| `WHISPER_API_KEY` | la même clé Groq |
| `AI_FALLBACK_API_KEY` | clé OpenRouter (étape 6), ou laisse vide |

Les autres variables ont déjà des valeurs par défaut correctes.

## Étape 8 — Lancer et vérifier

```bash
npm run dev      # http://localhost:3000
npm run lint
npm run build
```

La page d'accueil doit s'afficher avec les boutons « Je suis acheteur » et « Je suis fournisseur ».

## Étape 9 — Déployer sur Vercel

1. Sur vercel.com, importe le dépôt GitHub `jend-jaay`.
2. Ajoute les mêmes variables d'environnement que dans `.env.local` (jamais dans le code).
3. Déploie. Chaque `git push` sur `main` redéploie automatiquement.
4. Mets l'URL publique dans le README, pour le jury.

## Étape 10 — Développer avec l'agent

Dans Antigravity, demande à l'agent de suivre `docs/TASKS.md`, tâche par tâche. Le workflow `nouvelle-fonctionnalite` (dans `.agent/workflows/`) décrit la boucle : plan, validation, code, `npm run lint` et `npm run build`, commit. Coche les tâches terminées.

## Étape 11 — Soumettre (avant le 19 octobre 2026)

Suis le workflow `preparer-soumission` : README final avec les modèles déclarés (Groq/Llama, Whisper, OpenRouter si utilisé, Claude et Antigravity pour le développement), vérification qu'aucun secret n'est dans l'historique, vidéo de démonstration de 3 minutes maximum, puis formulaire de soumission.

## Dépannage

| Problème | Piste |
|---|---|
| « Aucun fournisseur IA configuré » | `AI_API_KEY` manquante dans `.env.local` ; relance `npm run dev` après modification |
| HTTP 429 de Groq | Quota par minute ou par jour atteint : attends, passe sur `llama-3.1-8b-instant` ou active le secours OpenRouter |
| HTTP 401 | Clé invalide ou mal copiée, sans espace ni guillemets |
| Le build échoue sur les polices | Le projet utilise des polices système ; ne réintroduis pas `next/font/google` |
| Rien dans la base | Vérifie que `0001_init.sql` a été exécuté avant `seed.sql` |
