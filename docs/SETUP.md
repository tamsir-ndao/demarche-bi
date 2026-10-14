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
3. Pour l'événement du 24 octobre à l'Impact Hub Dakar, l'inscription MLH est séparée et demandée à chaque membre de l'équipe, dès maintenant : https://events.mlh.com/events/14896-hacktoberfest-hack-day-dakar-x-galsen-dev

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
2. Modèles : `openai/gpt-oss-120b` en principal, puis `qwen/qwen3.8-27b` et `openai/gpt-oss-20b` en secours, avec la même clé. Chacun a son propre quota journalier : quand l'un est épuisé, le suivant prend le relais. Ce sont les valeurs par défaut : rien à régler.
3. Voix : `whisper-large-v3-turbo`, avec la même clé. Ses plafonds sont séparés de ceux du chat (en secondes d'audio, pas en tokens : de l'ordre de 7 200 secondes par heure et 28 800 par jour en gratuit, à vérifier dans ta console) ; une question dite dure quelques secondes.

Quotas gratuits constatés le 11 octobre 2026, à vérifier dans ta console car ils changent : 8 000 tokens par minute, **200 000 tokens par jour** (chacun par modèle) et 1 000 requêtes par jour. Une question coûte deux appels (comprendre, puis répondre), soit de l'ordre de 2 000 à 3 000 tokens : compte **80 à 100 questions par jour et par modèle**, un peu moins quand il y a plus de fiches (la liste des fiches est envoyée à chaque question). Quand le premier modèle atteint un plafond, le second prend le relais avec la même clé ; quand les deux l'atteignent, la page montre la fiche sans introduction, avec la note « L'assistant est très sollicité ». Évite donc les tests en boucle : `npm run eval -- --ia` (52 questions, une centaine d'appels) peut à lui seul épuiser la journée. Le quota est par organisation, créer plusieurs clés ne l'augmente pas. Pour la démo ou un vrai lancement, passe sur l'offre payante à l'usage de Groq (vérifie les tarifs sur console.groq.com : ils sont très bas pour ce volume) ou ajoute un secours chez un autre fournisseur (étape 5).

## Étape 5 — (Optionnel) Un secours chez un autre fournisseur

Le gratuit n'a pas de garantie de disponibilité. Par défaut, le secours est un second modèle de Groq avec la même clé : rien à faire. Pour la finale, tu peux ajouter un fournisseur indépendant compatible OpenAI, par exemple OpenRouter : crée un compte et une clé API, et note le nom exact d'un modèle gratuit dans leur liste (les noms changent souvent, c'est pourquoi le modèle est obligatoire). Le client essaie Groq d'abord, puis ce fournisseur, qui remplace alors le second modèle de Groq. Si tous échouent, le site montre la fiche sans introduction, avec une note.

## Étape 6 — Renseigner `.env.local`

```bash
cp .env.example .env.local
```

| Variable | Valeur |
|---|---|
| `AI_API_KEY` | clé Groq (étape 4) |
| `WHISPER_API_KEY` | la même clé Groq |
| `AI_FALLBACK_API_KEY` et `AI_FALLBACK_MODEL` | clé et nom du modèle d'un autre fournisseur (étape 5), ou laisse vide |
| `DATABASE_URL` | chaîne de connexion Neon (étape 8), ou laisse vide |
| `CRON_SECRET` | une longue valeur au hasard, seulement en production avec une base : elle protège la purge automatique du journal (étape 8, point 6) |
| `DEMARCHE_INCLUDE_DRAFTS` | `true` seulement en développement, pour tester avec des fiches brouillon |

Les autres variables ont déjà des valeurs par défaut correctes. Sans `WHISPER_API_KEY`, le bouton micro reste affiché mais répond « La voix ne marche pas pour l'instant. Écris ta question. ».

**Le micro n'existe que sur une page sécurisée** (https, ou `localhost`). Sur ton ordinateur, `http://localhost:3000` suffit. Depuis un téléphone sur le même Wi-Fi, `http://192.168…` ne marche pas pour la voix (le navigateur cache le micro) : teste avec le déploiement Vercel, en https.

## Étape 7 — Lancer et vérifier

```bash
npm run dev               # http://localhost:3000
npm run validate:fiches   # valide les fiches de content/demarches/
npm run lint
npm run build
```

Pour essayer la voix sans parler, Chrome peut simuler un micro avec un fichier son : `--use-fake-ui-for-media-stream --use-fake-device-for-media-stream --use-file-for-fake-audio-capture=fichier.wav%noloop` (fichier WAV PCM 16 bits, de préférence avec une seconde de silence au début).

## Étape 8 — (Optionnel) Base Neon

L'application fonctionne sans base. Neon sert au journal anonyme des questions et aux avis des utilisateurs : sans base, rien n'est noté et la page de réponse n'affiche pas « Cette réponse t'a aidé ? ».

1. Sur neon.com, crée un projet. Dans la fenêtre de connexion (bouton « Connect »), copie la chaîne de connexion (elle commence par `postgresql://`).
2. Mets-la dans `.env.local` : `DATABASE_URL=...`. Elle contient ton mot de passe : ne la partage pas et ne la committe jamais.
3. Crée les tables : `npm run db:migrate`. La commande peut être relancée sans risque, les migrations déjà appliquées sont ignorées.
4. Relance `npm run dev`, pose une question : la barre « Cette réponse t'a aidé ? » apparaît sous la réponse. Donne un avis, puis vérifie dans la console de Neon (Tables) : `select * from question_logs;` et `select * from feedback;`.
5. Pour le site en ligne, ajoute la même chaîne dans Vercel (voir l'étape 9) : `vercel env add DATABASE_URL production --sensitive`, et de même pour `preview`.
6. Purge automatique : le journal ne garde que 90 jours. Vercel lance chaque nuit (03 h, heure universelle) la tâche déclarée dans `vercel.json`, qui appelle `/api/cron/purge`. Pour que la route accepte l'appel, crée un secret (une longue valeur au hasard, par exemple `openssl rand -hex 32`) et ajoute-le à Vercel : `vercel env add CRON_SECRET production --sensitive`, puis redéploie. Vercel l'envoie lui-même dans l'en-tête de la tâche ; sans lui, la route répond `401`. Ne le mets jamais dans un fichier du dépôt.

## Étape 9 — (Optionnel) Déployer sur Vercel

Avec la CLI (`npm i -g vercel`, puis `vercel login`) ou depuis vercel.com.

1. Crée et lie le projet : `vercel link --yes --project demarche-bi`. Cette commande ajoute `VERCEL_OIDC_TOKEN` à ton `.env.local` : l'application n'en a pas besoin, tu peux retirer ces deux lignes.
2. Ajoute les variables d'environnement **avant le premier déploiement**, car le tout premier déploiement d'un projet devient la production. La valeur d'une clé entre par l'entrée standard, jamais dans la commande ni dans un fichier du dépôt : `vercel env add AI_API_KEY production --sensitive`, de même pour `WHISPER_API_KEY`, et les mêmes commandes avec `preview`.
3. `DEMARCHE_INCLUDE_DRAFTS=true` seulement pour **Preview** (`vercel env add DEMARCHE_INCLUDE_DRAFTS preview --no-sensitive`) : tu peux ainsi essayer les brouillons sans qu'ils répondent au public. En Production, laisse-la absente tant que des fiches ne sont pas vérifiées : le site y répond « Je ne sais pas encore ».
4. `vercel deploy` crée une adresse d'Aperçu, `vercel deploy --prod` met à jour la production. Les adresses d'Aperçu sont protégées par la connexion Vercel (réglage « Deployment Protection ») : pour les ouvrir sur un téléphone, connecte-toi d'abord à vercel.com avec le même compte. L'adresse de production `demarche-bi.vercel.app` est publique.
5. Pour redéployer à chaque `git push`, connecte le dépôt (Settings, Git) : l'application GitHub de Vercel doit avoir accès à `tamsir-ndao/demarche-bi`.
6. Mets l'adresse publique dans le README, pour le jury.

## Étape 10 — Développer avec l'agent

Dans Antigravity, demande à l'agent de suivre `docs/TASKS.md`, tâche par tâche. Les workflows de `.agent/workflows/` décrivent les boucles : `nouvelle-fonctionnalite` (plan, validation, code, vérifications, commit), `ajouter-une-fiche` et `preparer-soumission`. Coche les tâches terminées.

## Étape 11 — Soumettre

Le dossier doit être prêt le **18 octobre 2026** (date interne). La soumission se fait par un formulaire des organisateurs, **au plus tard le 19 octobre** : présentation (problème, solution, usage de l'IA), lien du dépôt public et sa documentation, technologies, modèles et outils d'IA, vidéo de 3 minutes au plus (facultative, recommandée). Les 5 finalistes déposent en plus leur projet sur la plateforme MLH (Organizer HQ, section *Challenges*) le **24 octobre**, après le check-in à l'Impact Hub Dakar.

Suis le workflow `preparer-soumission` : README final avec les chiffres d'évaluation et les modèles déclarés, vérification qu'aucun secret n'est dans l'historique, vidéo de démonstration de 3 minutes maximum, puis envoi par le formulaire avant le 19 octobre.

## Dépannage

| Problème | Piste |
|---|---|
| « Aucun fournisseur IA configuré » | `AI_API_KEY` manquante dans `.env.local` ; relance `npm run dev` après modification |
| HTTP 429 de Groq | Quota par minute ou par jour atteint : le second modèle prend le relais ; sinon attends, ou ajoute un secours chez un autre fournisseur (étape 5) |
| La page dit « L'assistant ne répond pas pour l'instant » | Regarde le terminal du serveur : les lignes `[ia] …` donnent la raison (`HTTP 401` : clé invalide ; `HTTP 429` : quota atteint ; délai dépassé : réseau) |
| HTTP 401 | Clé invalide ou mal copiée, sans espace ni guillemets |
| `validate:fiches` échoue | Lis le message : il indique le fichier et le champ. Compare avec `content/demarches/_modele.md` |
| Le build échoue sur les polices | Le projet utilise des polices système ; ne réintroduis pas `next/font/google` |
| « DATABASE_URL manquante » | La variable n'est pas dans `.env.local`, ou le fichier n'est pas à la racine du projet. Elle n'est nécessaire que pour `db:migrate` |
| Erreur de connexion SSL ou mot de passe | Recopie la chaîne de connexion complète depuis Neon (avec `sslmode=require`) |
