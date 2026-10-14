# Démarche-Bi

Assistant open source qui répond aux questions sur les démarches administratives au Sénégal, **uniquement à partir de fiches vérifiées, avec les sources officielles**. Quand il ne sait pas, il le dit.

Projet de l'**Open Source × AI Hackathon 2026** (Galsen DEV, Hacktoberfest Dakar), track Civic Tech & services publics.

> Information indicative : confirme toujours auprès de l'administration concernée.

**Statut : en développement.** Voir la feuille de route plus bas.

**Site en ligne : https://demarche-bi.vercel.app** (le projet, pour le jury et les contributeurs : https://demarche-bi.vercel.app/projet). Les fiches sont relues une par une : le site ne répond qu'avec des fiches vérifiées (21 le 14 octobre 2026) et dit « Je ne sais pas encore » quand aucune ne correspond.

## Le problème

Pièces à fournir, lieu, coût, délais : l'information existe, mais elle est dispersée, parfois périmée, et les réponses trouvées en ligne ou dans les groupes de discussion citent rarement leur source. Un assistant généraliste peut inventer une procédure avec assurance. Pour une démarche administrative, c'est grave.

## Comment ça marche

1. **Comprendre** : l'IA lit la question (français, parfois mêlé de wolof) et choisit la ou les démarches dans la liste des fiches.
2. **Décider** : le code vérifie ce choix. Une démarche : il répond. Plusieurs : il demande de choisir. Aucune : « je ne sais pas ».
3. **Répondre** : l'IA écrit une introduction courte, à partir d'une seule fiche.
4. **Vérifier** : des garde-fous contrôlent cette introduction (nombres, adresses, mots que la fiche n'emploie pas).
5. **Citer** : la page montre les pièces, les étapes, les chiffres et les sources de la fiche, mot pour mot, avec la date de vérification.

Si aucune fiche ne convient, la réponse est « je ne sais pas ». Si l'IA est absente ou en panne, une recherche par mots choisit la fiche, sans introduction.

## Les fiches : le cœur ouvert du projet

Chaque démarche est un fichier Markdown dans `content/demarches/`, avec un en-tête validé automatiquement : pièces, étapes, coût, délai, lieu, sources officielles (URL et date), statut (brouillon ou vérifié), date et auteur de la vérification. N'importe qui peut ajouter ou corriger une fiche par pull request : voir [`CONTRIBUTING.md`](CONTRIBUTING.md) et le modèle [`content/demarches/_modele.md`](content/demarches/_modele.md).

## Rôle de l'IA

- Comprendre une question informelle (y compris mêlée de wolof) et la ramener à une démarche de la liste.
- Écrire une introduction courte qui répond à la question, à partir de la seule fiche choisie.
- Demander une précision quand la question est trop vague ou peut viser plusieurs démarches.
- Transcrire la voix (Whisper) : la personne relit et corrige le texte avant de chercher la réponse. (La réponse peut ensuite être lue à voix haute, avec la voix du téléphone : l'IA n'y participe pas.)

L'IA ne fournit aucun fait administratif de sa propre connaissance : les pièces, étapes, coûts, délais, lieux et sources affichés viennent de la fiche, pas du modèle. Sa phrase d'introduction est contrôlée par le code et signalée à l'écran.

## Modèles, APIs et outils IA utilisés

| Usage | Modèle / outil |
|---|---|
| Compréhension et introduction | gpt-oss-120b (open-weight, Apache 2.0) via Groq, API compatible OpenAI |
| Secours | Qwen3.8-27B puis gpt-oss-20b (open-weight, Apache 2.0) via Groq, avec la même clé, chacun avec son propre quota ; ou un autre fournisseur compatible OpenAI (optionnel) |
| Transcription vocale | Whisper large v3 turbo via Groq |
| Aide au développement | Claude (Anthropic), Antigravity |

## Évaluation

Un jeu de 95 questions (`eval/questions.jsonl`), dont 15 en wolof ou mêlées de wolof, mesure si la bonne fiche est retrouvée, si l'assistant refuse à bon escient, s'il demande une précision quand la question est vague et combien d'introductions sont refusées par les garde-fous.

Commandes (ajouter `-- --brouillons` tant que des fiches sont en brouillon) :
- `npm run eval` : la recherche seule, sans IA (repli quand l'IA manque ou hors ligne) ;
- `npm run eval -- --ia` : le parcours complet de bout en bout, avec la clé de `.env.local`.

### Mesures sur les 21 fiches vérifiées (14 octobre 2026)

Recherche lexicale seule (`npm run eval`) :
- **Questions couvertes (68 évaluées)** :
  - Fiche attendue en 1ère position : **96 %** (65/68)
  - Fiche attendue dans les 3 premières : **100 %** (68/68)
- **Questions hors périmètre (14 évaluées)** :
  - Refus correct (aucune démarche proposée à tort) : **79 %** (11/14)
- **Par langue** :
  - Français : 56/57 en 1er (98 %), 57/57 dans le top 3 (100 %)
  - Français et wolof mêlés : 9/11 en 1er (82 %), 11/11 dans le top 3 (100 %)

Première mesure complète avec IA du 11 octobre 2026 : voir [`docs/AI-PROMPTS.md`](docs/AI-PROMPTS.md#première-mesure-11-octobre-2026).
Des tests de fiabilité (rien d'inventé ni de deviné par rapport aux fiches, refus, pièges, fautes de saisie, répétition) se lancent avec `npm run fiabilite` : voir [`docs/FIABILITE.md`](docs/FIABILITE.md).

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

Services externes (non open source, remplaçables par variables d'environnement) : API Groq (modèles gpt-oss et Qwen, Whisper), un autre fournisseur compatible OpenAI en secours (optionnel), Neon (optionnel), Vercel (hébergement).

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
- [x] 15 fiches vérifiées (21 le 14 octobre 2026)
- [x] Recherche, compréhension, réponse ancrée et garde-fous
- [x] Interface web (accueil, réponse, démarches, à propos)
- [x] Voix (question parlée, réponse lue à voix haute)
- [x] Installable sur l'écran d'accueil du téléphone, avec un écran de démarrage
- [x] Marche sans connexion : fiches lisibles, et recherche par mots pour une question écrite (après une première visite avec internet)
- [x] Avis « Cette réponse t'a aidé ? » et journal anonyme (facultatifs, avec une base Neon)
- [x] Jeu d'évaluation et chiffres mesurés (95 questions, recherche seule et avec IA)
- [ ] Vidéo de démonstration

## Licence

[MIT](LICENSE)
