# Architecture — Démarche-Bi

## Vue d'ensemble

```
Question (texte ; voix à venir)
   │
   ▼  voix : /api/transcribe ──► Whisper (Groq)                      (étape 3)
   │
   ▼  page /reponse  (ou POST /api/ask pour d'autres applications)
 1. Comprendre   LLM : choisit la ou les démarches dans la liste fermée des fiches
 2. Décider      code : vérifie le choix, puis répond, demande une précision ou dit « je ne sais pas »
 3. Répondre     LLM : écrit une introduction courte à partir d'UNE seule fiche
 4. Vérifier     garde-fous (code) : nombres, adresses, balisage, mots absolus ; une seconde chance
 5. Citer        la page montre pièces, étapes, chiffres et sources de la fiche, mot pour mot
   │
   ▼
Réponse + sources + avertissement        (journal anonyme Neon : optionnel, à venir)
```

Si l'IA manque (pas de clé, saturée, en panne), la recherche par mots choisit la fiche et la page la montre sans introduction. Voir « Quand l'IA manque » dans `docs/AI-PROMPTS.md`.

Source de vérité du contenu : `content/demarches/*.md` (versionné dans Git, validé par la CI).

## Structure du code

```
content/demarches/        fiches Markdown (+ _modele.md)
eval/questions.jsonl      jeu d'évaluation (52 questions, dont 10 en wolof ou mêlées de wolof)
src/
  app/
    page.tsx              accueil : champ de question et exemples
    reponse/              réponse à une question, lue dans l'adresse (/reponse?q=…)
    demarches/            liste et pages des fiches
    a-propos/             à propos, questions fréquentes, comment contribuer
    not-found.tsx         page introuvable
    globals.css           couleurs, mode sombre, animations (design « doux »)
    api/
      ask/route.ts        POST : question -> réponse (le site appelle le même service sans passer par là)
      transcribe/route.ts audio -> texte                                          (à venir)
      feedback/route.ts   avis utile / pas utile                                  (à venir)
  components/             interface : cadre de page et menu, boutons, pastilles, cartes, blocs d'une fiche, écrans de précision
  lib/
    texte.ts              petits outils de texte (accents, question de l'adresse, apostrophes)
    liens.ts              liens vers le dépôt GitHub
    fiches/
      schema.ts           schéma Zod d'une fiche
      load.ts             lecture et validation des fiches
      search.ts           recherche lexicale (BM25 simplifié)
      affichage.ts        mise en forme pour l'écran (dates, statut, pièces, sources), fonctions pures testées
      disponibles.ts      fiches que le site peut montrer (serveur uniquement)
    eval/
      retrieval.ts        mesure de la recherche sans IA (fiche retrouvée, refus), lue par scripts/eval.ts
      bout-en-bout.ts     mesure du parcours complet avec l'IA (npm run eval -- --ia)
    ai/
      config.ts           fournisseurs (Groq : deux modèles ; ou un autre fournisseur) et Whisper
      client.ts           chat() avec basculement, sortie JSON stricte, erreurs typées ; transcribe()
      structured.ts       un appel au modèle qui renvoie un objet validé par un schéma Zod
      schemas.ts          schémas Zod des sorties du modèle
      understand.ts       1. comprendre : choisir dans la liste fermée des fiches
      decide.ts           2. décider : répondre, préciser ou « je ne sais pas » (code)
      answer.ts           3. répondre : introduction à partir d'une fiche
      guardrails.ts       4. vérifier l'introduction (code)
      ask.ts              le parcours complet, avec ses replis
      service.ts          ask.ts + mémoire des questions + limite par visiteur
      cache.ts            mémoire des questions déjà posées et limite par visiteur
      serveur.ts          branche le service sur l'environnement et les fiches du site
      api.ts              lecture de la demande de POST /api/ask
    db.ts                 client Neon (optionnel, serveur uniquement)
scripts/
  validate-fiches.ts      npm run validate:fiches
  db.mjs                  npm run db:migrate
  eval.ts                 npm run eval (recherche seule) ; npm run eval -- --ia (parcours complet)
db/migrations/            journal anonyme et avis (optionnel)
.github/                  CI, modèles d'issue et de pull request
```

## Format d'une fiche

En-tête YAML (validé par `src/lib/fiches/schema.ts`) puis texte libre : `slug`, `titre`, `categorie`, `resume`, `mots_cles`, `pieces`, `etapes`, `cout`, `delai`, `lieu`, `sources` (titre, URL https, date de consultation), `statut` (brouillon ou verifie), `verifie_le`, `verifie_par`. Les champs `cout`, `delai` et `lieu` sont obligatoires mais peuvent valoir `null`.

Seules les fiches au statut `verifie` répondent en production. Les brouillons ne sont utilisés que si `DEMARCHE_INCLUDE_DRAFTS=true` (développement).

## Interface

Design « doux » (vert, blanc, noir adouci) : les couleurs sont des variables CSS de `src/app/globals.css` et le mode sombre suit le réglage du téléphone. Le thème nuit est en gris foncé neutre ; le vert vif ne sert qu'aux accents (logo, boutons, icônes, liens, pastilles). Polices du système, mobile d'abord : le menu est en bas sur téléphone, en haut sur ordinateur.

- `/` : le champ de question est un formulaire `GET` vers `/reponse?q=…`.
- `/reponse` : la question est lue dans l'adresse (`?q=…`, et `&fiche=…` quand la personne a choisi une démarche sur l'écran de précision). Le cadre de la page est prérendu avec l'écran d'attente, la réponse arrive ensuite (Cache Components) : une fiche avec son introduction, un écran de précision, ou « Je ne sais pas encore ». Cette page n'est pas indexée (les questions sont dans l'adresse). La réponse demande JavaScript.
- `/demarches` et `/demarches/[slug]` : une page statique par fiche, créée à la construction du site. Une fiche non montrable (brouillon en production) répond 404.
- Hors l'introduction écrite par l'IA (signalée à l'écran), l'écran n'ajoute aucune information : un `cout`, `delai` ou `lieu` à `null` s'affiche « Non précisé » ; les notes qui contiennent « à confirmer » sont mises en avant ; les apostrophes des fiches deviennent typographiques à l'affichage seulement.
- `src/lib/fiches/affichage.ts` prépare les textes (fonctions pures, testées) ; `src/components/` contient les composants.

## Recherche par mots (repli sans IA)

Recherche lexicale écrite en code : normalisation (minuscules, accents retirés, mots vides français), pondération par champ (titre et mots-clés plus forts que le résumé, lui-même plus fort que le corps), score de type BM25. Un seuil de score décide s'il y a une fiche pertinente ; en dessous, la réponse est « je ne sais pas ». Une fiche n'est retenue que si un mot de la question figure dans son titre ou ses mots-clés : citer « acte de naissance » parmi ses pièces ne suffit pas (les mots-clés d'une fiche doivent donc contenir les mots que les gens emploient, par exemple « perdu » ou « refaire »). Les verbes génériques des questions (obtenir, avoir, faire, demander, savoir) sont ignorés. Pas d'embeddings : plus simple, reproductible, testable sans clé IA, et facile à comprendre pour un contributeur. Elle ne sert plus qu'au repli (IA absente, saturée ou en panne) et aux fiches « voir aussi » : quand l'IA répond, c'est elle qui choisit la fiche.

## Garde-fous

1. Le modèle ne reçoit que la liste des fiches puis **une** fiche ; il ne lit jamais le site ni Internet.
2. Ses sorties suivent un schéma JSON strict puis sont relues par Zod ; un identifiant de fiche qu'il invente est ignoré.
3. Il n'écrit que l'introduction. Pièces, étapes, coût, délai, lieu et sources viennent de la fiche, mot pour mot.
4. L'introduction est refusée si elle contient un nombre, une adresse web ou e-mail, un balisage, un identifiant interne ou un mot absolu (« seule », « gratuit », « toujours »…) que la fiche ne contient pas, ou si elle dépasse 450 caractères. Le modèle a une seconde chance avec la raison du refus ; ensuite la fiche est montrée sans introduction.
5. Si le modèle dit que la fiche ne traite pas la question, ou si aucune démarche ne correspond : « Je ne sais pas encore », avec invitation à proposer la démarche.
6. Une phrase écrite par l'IA est signalée à l'écran (« Phrase écrite par l'IA, d'après la fiche. »).
7. Le quota gratuit est protégé : mémoire des questions déjà posées (6 heures, 300 questions) et 10 questions par minute et par visiteur. Ces deux outils vivent dans l'instance du serveur : ils aident sur Vercel sans rien garantir.

## API

`POST /api/ask` avec un corps JSON `{ "question": "…", "fiche": "identifiant" }` (`fiche` est facultatif : il saute l'étape « comprendre »). La question est mise sur une ligne et coupée à 300 caractères. Réponse `200` :

| `type` | Contenu |
|---|---|
| `fiche` | `fiche` (tous ses champs), `autres` (fiches voisines), `intro` (texte ou `null`), `degrade` (`saturee`, `indisponible` ou `null`), `rejet` (raison du refus des garde-fous ou `null`) |
| `precision` | `options` (fiches entre lesquelles choisir), `question` (peut être vide) |
| `precision_generale` | `question` (peut être vide) |
| `inconnue` | rien d'autre |

Un corps illisible ou une question vide répondent `400` avec `{ "erreur": "…" }`. La route n'a pas de réglage CORS : seul le site l'appelle depuis un navigateur.

## Données (optionnel)

Neon sert uniquement à un journal anonyme (`question_logs`) et aux avis (`feedback`) : pas de compte, pas d'adresse IP, question tronquée à 500 caractères, purge conseillée à 90 jours. L'application fonctionne sans `DATABASE_URL`.

## Principes

- L'IA choisit la démarche et écrit une introduction ; le code décide, cite et vérifie.
- Tout appel modèle passe par `src/lib/ai/` et toute sortie est validée.
- Modèles open-weight via API compatible OpenAI, interchangeables par variables d'environnement.
- Pages légères, polices système, mobile-first, utilisables en connexion lente.

## Variables d'environnement

Voir `.env.example` et `docs/SETUP.md` : IA principale Groq (`AI_*`) avec, par défaut, un second modèle Groq en secours (autre fournisseur possible avec `AI_FALLBACK_*`), Whisper (`WHISPER_*`), Neon optionnel (`DATABASE_URL`), `DEMARCHE_INCLUDE_DRAFTS` (développement uniquement).
