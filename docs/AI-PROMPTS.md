# Prompts et schémas IA — Démarche-Bi

Tout appel modèle passe par `src/lib/ai/client.ts` (`chat()` avec basculement Groq puis OpenRouter, `transcribe()` pour Whisper). Chaque sortie est validée par un schéma Zod avant usage. Les prompts ci-dessous sont des brouillons à tester et à ajuster avec le jeu d'évaluation.

## 1. Comprendre la question (`understand.ts`)

**Entrée** : la question de l'utilisateur, en français, parfois mêlée de wolof ou d'abréviations.

**Prompt système (brouillon)** :

```
Tu aides à retrouver une démarche administrative au Sénégal.
À partir de la question de l'utilisateur (français, parfois mêlé de wolof ou d'abréviations),
réponds uniquement avec un JSON :
{
  "langue": "fr" | "wo" | "mixte",
  "mots_cles": ["..."],
  "question_claire": "reformulation en une phrase, en français",
  "besoin_precision": true | false,
  "question_precision": "une seule question courte" | null
}
"mots_cles" : 3 à 8 termes en français standard, avec les termes administratifs usuels.
"besoin_precision" : vrai seulement si la demande est trop vague pour savoir de quelle démarche il s'agit.
Ne réponds pas à la question. N'invente aucune information administrative.
```

**Usage** : les mots-clés servent uniquement à la recherche. Si le modèle échoue, on recherche avec les mots de la question brute.

## 2. Réponse ancrée (`answer.ts`)

**Entrée** : la question claire et les fiches retrouvées (3 au plus), insérées sous la forme `### FICHE <slug>` suivie des champs de la fiche.

**Prompt système (brouillon)** :

```
Tu es Démarche-Bi, un assistant d'information sur les démarches administratives au Sénégal.
Règles absolues :
1. Réponds UNIQUEMENT à partir des fiches fournies. N'utilise aucune autre connaissance.
2. N'invente aucun montant, délai, lieu, pièce ou étape. Si une information n'est pas dans les fiches, dis-le.
3. Si les fiches ne permettent pas de répondre à la question, renvoie "trouve": false.
4. Réponds en français simple, en phrases courtes, avec des étapes numérotées si c'est utile.
5. N'écris aucune adresse web : les sources sont ajoutées par le système.
6. Indique dans "fiches_utilisees" les slugs des fiches sur lesquelles repose ta réponse.
Réponds uniquement avec un JSON :
{ "trouve": true | false, "reponse": "...", "fiches_utilisees": ["slug"] }
```

## 3. Voix (`transcribe`)

Whisper (Groq), langue `fr`. La transcription s'affiche et reste modifiable avant l'envoi.

## Cas de comportement attendus (base du jeu d'évaluation)

| Cas | Comportement attendu |
|---|---|
| Question couverte par une fiche | `trouve` vrai, sources de la fiche affichées |
| Question hors périmètre (ex. météo) | « Je ne sais pas », aucune source |
| Démarche absente des fiches | « Je ne sais pas » et invitation à contribuer |
| Question vague (« je veux un papier ») | Une question de précision |
| Le modèle cite un slug qui n'existe pas | Réponse rejetée par les garde-fous |
| Le modèle cite un montant absent des fiches | Réponse rejetée par les garde-fous |
| Question en wolof ou mélangée | Mots-clés en français ; si rien n'est trouvé, refus propre |

Le fichier `eval/questions.jsonl` contient une ligne par cas : `{ "question": "...", "famille": "couverte" | "hors_perimetre" | "vague", "langue": "fr" | "mixte" | "wo", "attendu_slug": "slug" | null, "doit_contenir": ["..."] }`. `langue` vaut `fr` par défaut (`mixte` : français et wolof mêlés ; `wo` : wolof). `attendu_slug` et `doit_contenir` ne concernent que la famille `couverte`. Les faits attendus se prennent dans les fiches, jamais de mémoire : `npm run eval` vérifie que chacun figure dans la fiche attendue.

## Modèles déclarés (à garder synchronisés avec le README)

| Usage | Modèle / outil |
|---|---|
| Compréhension et réponse | Llama 3.3 70B via Groq (`llama-3.3-70b-versatile`) ; `llama-3.1-8b-instant` pour les tests |
| Secours | Modèle gratuit open-weight via OpenRouter (optionnel) |
| Transcription | Whisper large v3 turbo via Groq |
| Aide au développement | Claude (Anthropic), Antigravity |
