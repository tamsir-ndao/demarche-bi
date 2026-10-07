# Architecture — Jënd-Jaay

## Vue d'ensemble

```
Acheteur (texte / voix)
        │
        ▼
  Next.js (App Router) ──► /api/transcribe  ──► Whisper
        │                  /api/parse       ──► LLM open-weight  ──► demande structurée
        │                  /api/match       ──► classement fournisseurs
        │                  /api/compare     ──► LLM : synthèse + recommandation
        ▼
   Supabase (Postgres + Auth + RLS)
        ▲
        │
Fournisseur (catalogue, offres)
```

## Structure du code (cible)

```
src/
  app/
    page.tsx                  accueil
    acheteur/                 publier une demande, voir les offres
    fournisseur/              catalogue, demandes reçues, envoyer une offre
    api/
      transcribe/route.ts     audio -> texte
      parse/route.ts          texte -> demande structurée
      match/route.ts          demande -> fournisseurs classés
      compare/route.ts        offres -> recommandation
  lib/
    supabase.ts               client Supabase
    ai/
      client.ts               client API compatible OpenAI
      parse-request.ts        extraction + validation Zod
      compare-offers.ts       synthèse des offres
      schemas.ts              schémas Zod partagés
    matching.ts               logique de score (déterministe)
supabase/
  migrations/                 schéma SQL versionné
  seed.sql                    données de démo fictives
docs/                         PRD, architecture, tâches, prompts IA
```

## Modèle de données

Tables : `profiles` (role buyer/supplier), `products`, `requests` (`raw_text` + `parsed` jsonb), `offers` (`match_score`, `ai_summary`). Détail dans `supabase/migrations/0001_init.sql`. RLS activée sur toutes les tables.

## Flux de données

1. **Demande** : `raw_text` saisi ou transcrit, envoyé à `/api/parse`.
2. **Extraction** : le LLM renvoie du JSON ; validation Zod ; l'acheteur confirme ; stockage dans `requests.parsed`.
3. **Matching** : score déterministe par fournisseur, calculé en code (produits couverts, zone servie, prix). L'IA ne décide pas du score, elle l'explique ensuite.
4. **Offres** : le fournisseur envoie un total en FCFA et une date de livraison.
5. **Comparaison** : `/api/compare` envoie les offres au LLM, qui produit un résumé et une recommandation justifiée, stockés dans `offers.ai_summary`.

## Principes

- **L'IA est validée** : toute sortie modèle passe par un schéma Zod ; en cas d'échec, repli sur une saisie manuelle.
- **Le matching est déterministe** : reproductible, testable et rapide ; l'IA sert à comprendre et à expliquer.
- **Open source** : modèles open-weight via API compatible OpenAI, interchangeable par variables d'environnement.
- **Faible connexion** : pages légères, polices système, pas de dépendance distante lourde.

## Variables d'environnement

Voir `.env.example` : Supabase (URL, clé anon), IA (`AI_BASE_URL`, `AI_API_KEY`, `AI_MODEL`), Whisper (`WHISPER_BASE_URL`, `WHISPER_API_KEY`).
