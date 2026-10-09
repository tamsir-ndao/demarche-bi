# Démarche-Bi

Assistant open source qui répond aux questions sur les démarches administratives au Sénégal, **uniquement à partir de fiches vérifiées, avec les sources officielles**. Quand il ne sait pas, il le dit.

Projet de l'**Open Source × AI Hackathon 2026** (Galsen DEV, Hacktoberfest Dakar), track Civic Tech & services publics.

> Information indicative : confirme toujours auprès de l'administration concernée.

**Statut : en développement.** Voir la feuille de route plus bas.

## Le problème

Pièces à fournir, lieu, coût, délais : l'information existe, mais elle est dispersée, parfois périmée, et les réponses trouvées en ligne ou dans les groupes de discussion citent rarement leur source. Un assistant généraliste peut inventer une procédure avec assurance. Pour une démarche administrative, c'est grave.

## Comment ça marche

1. **Comprendre** : l'IA transforme la question (texte ou voix, français, parfois mêlé de wolof) en mots-clés.
2. **Retrouver** : le code cherche les fiches pertinentes (recherche lexicale, sans IA).
3. **Répondre** : l'IA rédige une réponse à partir de ces fiches seulement.
4. **Vérifier** : des garde-fous contrôlent la réponse (fiches utilisées, chiffres cités).
5. **Citer** : le code ajoute les sources officielles et la date de vérification.

Si aucune fiche ne convient, la réponse est « je ne sais pas ».

## Les fiches : le cœur ouvert du projet

Chaque démarche est un fichier Markdown dans `content/demarches/`, avec un en-tête validé automatiquement : pièces, étapes, coût, délai, lieu, sources officielles (URL et date), statut (brouillon ou vérifié), date et auteur de la vérification. N'importe qui peut ajouter ou corriger une fiche par pull request : voir [`CONTRIBUTING.md`](CONTRIBUTING.md) et le modèle [`content/demarches/_modele.md`](content/demarches/_modele.md).

## Rôle de l'IA

- Comprendre une question informelle et la ramener à une démarche.
- Rédiger une réponse claire à partir des fiches, sans rien ajouter.
- Demander une précision quand la question est trop vague.
- Transcrire la voix (Whisper).

L'IA ne fournit aucun fait administratif de sa propre connaissance et n'écrit pas les sources.

## Modèles, APIs et outils IA utilisés

| Usage | Modèle / outil |
|---|---|
| Compréhension et réponse | Llama 3.3 70B (open-weight) via Groq, API compatible OpenAI |
| Secours | Modèle gratuit open-weight via OpenRouter (optionnel) |
| Transcription vocale | Whisper large v3 turbo via Groq |
| Aide au développement | Claude (Anthropic), Antigravity |

## Évaluation

Un jeu de 30 questions (`eval/questions.jsonl`) mesure si la bonne fiche est retrouvée, si l'assistant refuse à bon escient et combien de réponses sont rejetées par les garde-fous. Commande : `npm run eval`.

Résultats : à publier ici tels que mesurés, une fois le jeu d'évaluation écrit.

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Zod · Markdown + YAML pour le contenu · Neon (Postgres, optionnel) · Vercel

## Dépendances externes importantes

Bibliothèques (voir `package.json`) :

| Dépendance | Rôle |
|---|---|
| Next.js, React | Application web |
| Tailwind CSS | Mise en forme |
| Zod | Validation des fiches et des sorties de l'IA |
| gray-matter, js-yaml | Lecture des fiches Markdown et de leur en-tête YAML |
| @neondatabase/serverless, pg | Journal anonyme et migrations (optionnels) |
| tsx | Exécution des scripts TypeScript (validation, évaluation) |

Services externes (non open source, remplaçables par variables d'environnement) : API Groq (modèles Llama et Whisper), OpenRouter en secours (optionnel), Neon (optionnel), Vercel (hébergement).

## Installation

Guide complet pas à pas : [`docs/SETUP.md`](docs/SETUP.md).

```bash
git clone https://github.com/tamsir-ndao/demarche-bi.git
cd demarche-bi
npm install
cp .env.example .env.local   # renseigner la clé Groq (AI_API_KEY et WHISPER_API_KEY)
npm run dev
```

Aucune base de données n'est nécessaire. Pour valider les fiches : `npm run validate:fiches`.

## Feuille de route

- [x] Socle technique, format de fiche, validateur, CI, guide de contribution
- [ ] 15 fiches vérifiées
- [ ] Recherche, compréhension, réponse ancrée et garde-fous
- [ ] Interface web et voix
- [ ] Jeu d'évaluation et chiffres
- [ ] Vidéo de démonstration

## Licence

[MIT](LICENSE)
