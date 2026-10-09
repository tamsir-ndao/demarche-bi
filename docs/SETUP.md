# Guide de démarrage — Démarche-Bi

Toutes les étapes pour passer de l'archive du projet à une application qui tourne, puis à la soumission du hackathon. Compte une trentaine de minutes la première fois.

> Règle d'or : le dépôt est **public**. Les clés API vont uniquement dans `.env.local` (ignoré par Git) et dans les variables d'environnement de Vercel. Ne les colle jamais dans un fichier du dépôt, un commit ou un chat.

## Prérequis

- Node.js 22 (LTS) recommandé, et Git
- Un compte GitHub et un compte Groq (gratuits, sans carte bancaire pour démarrer)
- Optionnel : un compte Neon (journal anonyme et avis) et un compte Vercel (déploiement)
- Antigravity (ou tout autre éditeur) pour ouvrir le dossier

## Étape 1 — Ouvrir le projet

```bash
unzip demarche-bi.zip
cd demarche-bi
npm install
```

Ouvre le dossier `demarche-bi` dans Antigravity. L'agent lit automatiquement `GEMINI.md` et les règles de `.agent/`.

## Étape 2 — Mettre à jour ton inscription au hackathon

1. Si tu as déjà envoyé le formulaire avec l'ancien projet, préviens les organisateurs ou renvoie-le avec Démarche-Bi : https://tally.so/r/0Qp5rB
2. Track à choisir : **Civic Tech & services publics**.
3. Pour assister à l'événement du 24 octobre à l'Impact Hub Dakar, l'inscription MLH est séparée : https://events.mlh.com/events/14896-hacktoberfest-hack-day-dakar-x-galsen-dev

## Étape 3 — Créer le dépôt GitHub public

1. Sur GitHub, crée un dépôt **public** nommé `demarche-bi`, sans README ni licence (ils existent déjà).
2. Dans le dossier du projet :

```bash
git branch -M main
git remote add origin https://github.com/tamsir-ndao/demarche-bi.git
git push -u origin main
```

La CI GitHub (fiches, lint, build) se lance seule à chaque push et à chaque pull request. L'historique Git visible compte pour le jury : commite régulièrement, par petites fonctionnalités.

## Étape 4 — Créer la clé Groq

1. Sur console.groq.com, crée un compte et génère une clé API.
2. Modèle conseillé : `llama-3.3-70b-versatile`. Pour les tests répétés, `llama-3.1-8b-instant` consomme moins de quota.
3. Voix : `whisper-large-v3-turbo`, avec la même clé.

Quotas gratuits indicatifs, à vérifier dans ta console car ils changent : environ 30 requêtes par minute et 1 000 par jour sur Llama 3.3 70B. Le plafond de tokens par minute est souvent la vraie limite : évite les tests en boucle. Le quota est par organisation, créer plusieurs clés ne l'augmente pas.

## Étape 5 — (Optionnel) Clé OpenRouter de secours

Le gratuit n'a pas de garantie de disponibilité. Pour la finale, prévois un secours : crée un compte sur openrouter.ai, une clé API, et note le nom exact d'un modèle gratuit dans leur liste. Le client essaie Groq d'abord, puis OpenRouter si Groq échoue.

## Étape 6 — Renseigner `.env.local`

```bash
cp .env.example .env.local
```

| Variable | Valeur |
|---|---|
| `AI_API_KEY` | clé Groq (étape 4) |
| `WHISPER_API_KEY` | la même clé Groq |
| `AI_FALLBACK_API_KEY` | clé OpenRouter (étape 5), ou laisse vide |
| `DATABASE_URL` | chaîne de connexion Neon (étape 8), ou laisse vide |
| `DEMARCHE_INCLUDE_DRAFTS` | `true` seulement en développement, pour tester avec des fiches brouillon |

Les autres variables ont déjà des valeurs par défaut correctes.

## Étape 7 — Lancer et vérifier

```bash
npm run dev               # http://localhost:3000
npm run validate:fiches   # valide les fiches de content/demarches/
npm run lint
npm run build
```

## Étape 8 — (Optionnel) Base Neon

L'application fonctionne sans base. Neon sert au journal anonyme des questions et aux avis des utilisateurs.

1. Sur neon.com, crée un projet. Dans la fenêtre de connexion (bouton « Connect »), copie la chaîne de connexion (elle commence par `postgresql://`).
2. Mets-la dans `.env.local` : `DATABASE_URL=...`. Elle contient ton mot de passe : ne la partage pas et ne la committe jamais.
3. Crée les tables : `npm run db:migrate`. La commande peut être relancée sans risque, les migrations déjà appliquées sont ignorées.

## Étape 9 — (Optionnel) Déployer sur Vercel

1. Sur vercel.com, importe le dépôt GitHub `demarche-bi`.
2. Ajoute les mêmes variables d'environnement que dans `.env.local` (jamais dans le code). Laisse `DEMARCHE_INCLUDE_DRAFTS` à `false` ou absente.
3. Déploie. Chaque `git push` sur `main` redéploie.
4. Mets l'URL publique dans le README, pour le jury.

## Étape 10 — Développer avec l'agent

Dans Antigravity, demande à l'agent de suivre `docs/TASKS.md`, tâche par tâche. Les workflows de `.agent/workflows/` décrivent les boucles : `nouvelle-fonctionnalite` (plan, validation, code, vérifications, commit), `ajouter-une-fiche` et `preparer-soumission`. Coche les tâches terminées.

## Étape 11 — Soumettre (avant le 19 octobre 2026)

Suis le workflow `preparer-soumission` : README final avec les chiffres d'évaluation et les modèles déclarés, vérification qu'aucun secret n'est dans l'historique, vidéo de démonstration de 3 minutes maximum, puis formulaire de soumission.

## Dépannage

| Problème | Piste |
|---|---|
| « Aucun fournisseur IA configuré » | `AI_API_KEY` manquante dans `.env.local` ; relance `npm run dev` après modification |
| HTTP 429 de Groq | Quota par minute ou par jour atteint : attends, passe sur `llama-3.1-8b-instant` ou active le secours OpenRouter |
| HTTP 401 | Clé invalide ou mal copiée, sans espace ni guillemets |
| `validate:fiches` échoue | Lis le message : il indique le fichier et le champ. Compare avec `content/demarches/_modele.md` |
| Le build échoue sur les polices | Le projet utilise des polices système ; ne réintroduis pas `next/font/google` |
| « DATABASE_URL manquante » | La variable n'est pas dans `.env.local`, ou le fichier n'est pas à la racine du projet. Elle n'est nécessaire que pour `db:migrate` |
| Erreur de connexion SSL ou mot de passe | Recopie la chaîne de connexion complète depuis Neon (avec `sslmode=require`) |
