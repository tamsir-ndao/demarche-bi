# Architecture — Démarche-Bi

## Vue d'ensemble

```
Question (texte ou voix)
   │
   ▼  voix : /api/transcribe ──► Whisper (Groq)
   │
   ▼  /api/ask
 1. Comprendre   LLM : langue, mots-clés, question claire, besoin de précision
 2. Retrouver    recherche lexicale dans les fiches (code, sans IA)
 3. Répondre     LLM : réponse rédigée à partir des seules fiches retrouvées
 4. Vérifier     garde-fous (code) : fiches utilisées, chiffres, format
 5. Citer        sources et date de vérification ajoutées par le code
   │
   ▼
Réponse + sources + avertissement        (journal anonyme Neon : optionnel)
```

Source de vérité du contenu : `content/demarches/*.md` (versionné dans Git, validé par la CI).

## Structure du code

```
content/demarches/        fiches Markdown (+ _modele.md)
eval/questions.jsonl      jeu d'évaluation (30 questions)
src/
  app/
    page.tsx              accueil et assistant
    demarches/            liste et pages des fiches
    contribuer/           comment contribuer
    api/
      ask/route.ts        question -> réponse
      transcribe/route.ts audio -> texte
      feedback/route.ts   avis utile / pas utile
  lib/
    fiches/
      schema.ts           schéma Zod d'une fiche
      load.ts             lecture et validation des fiches
      search.ts           recherche lexicale (BM25 simplifié)
    ai/
      config.ts           fournisseurs (Groq, secours OpenRouter) et Whisper
      client.ts           chat() avec basculement + transcribe()
      understand.ts       étape 1 : comprendre la question
      answer.ts           étape 3 : réponse ancrée
      guardrails.ts       étape 4 : garde-fous
      schemas.ts          schémas Zod des sorties IA
    db.ts                 client Neon (optionnel, serveur uniquement)
scripts/
  validate-fiches.ts      npm run validate:fiches
  db.mjs                  npm run db:migrate
  eval.ts                 npm run eval
db/migrations/            journal anonyme et avis (optionnel)
.github/                  CI, modèles d'issue et de pull request
```

## Format d'une fiche

En-tête YAML (validé par `src/lib/fiches/schema.ts`) puis texte libre : `slug`, `titre`, `categorie`, `resume`, `mots_cles`, `pieces`, `etapes`, `cout`, `delai`, `lieu`, `sources` (titre, URL https, date de consultation), `statut` (brouillon ou verifie), `verifie_le`, `verifie_par`. Les champs `cout`, `delai` et `lieu` sont obligatoires mais peuvent valoir `null`.

Seules les fiches au statut `verifie` répondent en production. Les brouillons ne sont utilisés que si `DEMARCHE_INCLUDE_DRAFTS=true` (développement).

## Recherche (étape 2)

Recherche lexicale écrite en code : normalisation (minuscules, accents retirés, mots vides français), pondération par champ (titre et mots-clés plus forts que le résumé, lui-même plus fort que le corps), score de type BM25. Un seuil de score décide s'il y a une fiche pertinente ; en dessous, la réponse est « je ne sais pas ». Pas d'embeddings : plus simple, reproductible, testable sans clé IA, et facile à comprendre pour un contributeur.

## Garde-fous (étape 4)

1. La sortie du modèle doit respecter le schéma Zod (`trouve`, `reponse`, `fiches_utilisees`) ; sinon une nouvelle tentative, puis message d'erreur propre.
2. `fiches_utilisees` doit être un sous-ensemble des fiches retrouvées.
3. Chaque montant (FCFA) et chaque délai chiffré cité dans la réponse doit apparaître dans une fiche utilisée ; sinon la réponse est rejetée.
4. Si `trouve` vaut faux, ou si aucune fiche ne dépasse le seuil : message standard « je ne sais pas » avec invitation à contribuer.
5. Les sources affichées sont produites par le code depuis les métadonnées de la fiche.

## Données (optionnel)

Neon sert uniquement à un journal anonyme (`question_logs`) et aux avis (`feedback`) : pas de compte, pas d'adresse IP, question tronquée à 500 caractères, purge conseillée à 90 jours. L'application fonctionne sans `DATABASE_URL`.

## Principes

- L'IA comprend et rédige ; le code décide, cite et vérifie.
- Tout appel modèle passe par `src/lib/ai/` et toute sortie est validée.
- Modèles open-weight via API compatible OpenAI, interchangeables par variables d'environnement.
- Pages légères, polices système, mobile-first, utilisables en connexion lente.

## Variables d'environnement

Voir `.env.example` et `docs/SETUP.md` : IA principale Groq (`AI_*`), secours OpenRouter (`AI_FALLBACK_*`), Whisper (`WHISPER_*`), Neon optionnel (`DATABASE_URL`), `DEMARCHE_INCLUDE_DRAFTS` (développement uniquement).
