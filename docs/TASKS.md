# Tâches — Jënd-Jaay

Cocher au fur et à mesure. Date limite de soumission : **19 octobre 2026**.

## J1-2 — Fondations (7-8 oct)

- [x] Squelette Next.js + Tailwind + TypeScript
- [x] Licence MIT
- [x] Schéma Supabase + RLS (`0001_init.sql`)
- [x] Données de démo fictives (`seed.sql`)
- [x] README initial, `.env.example`
- [x] Fichiers de contexte agent (`GEMINI.md`, `CLAUDE.md`, `.agent/`, `docs/`)
- [x] Client IA Groq + secours OpenRouter + Whisper (`src/lib/ai/`), guide `docs/SETUP.md`
- [ ] Dépôt GitHub public créé et code poussé (`docs/SETUP.md`, étape 3)
- [ ] Projet Supabase créé, migration et seed appliqués (étape 4)
- [ ] Inscription au hackathon (https://tally.so/r/0Qp5rB) (étape 2)
- [ ] Clés Groq (et OpenRouter en secours) dans `.env.local` (étapes 5 à 7)
- [ ] Déploiement Vercel (étape 9)

## J3-5 — IA : comprendre la demande (9-11 oct)

- [ ] Installer Zod ; schémas dans `src/lib/ai/schemas.ts`
- [ ] `parse-request.ts` : texte -> demande structurée (voir `docs/AI-PROMPTS.md`)
- [ ] Route `/api/parse` + gestion d'erreur et repli
- [ ] Page acheteur : saisie texte, affichage de la demande structurée à confirmer
- [ ] Route `/api/transcribe` (Whisper) et bouton d'enregistrement vocal

## J6-8 — Matching et offres (12-14 oct)

- [ ] `matching.ts` : score par produits couverts, zone et prix
- [ ] Route `/api/match` et affichage des fournisseurs classés
- [ ] Création d'une offre par le fournisseur (total FCFA, livraison, note)
- [ ] `compare-offers.ts` + route `/api/compare` : résumé et recommandation

## J9-10 — Interfaces (15-16 oct)

- [ ] Auth Supabase (acheteur / fournisseur)
- [ ] Interface acheteur : publier, suivre, comparer, accepter, lien WhatsApp
- [ ] Interface fournisseur : catalogue, demandes reçues, envoyer une offre
- [ ] Mobile-first et vérification en connexion lente

## J11 — Démo (17 oct)

- [ ] Jeu de données de démo réaliste et parcours de bout en bout sans erreur
- [ ] Polissage de l'UX, messages d'erreur clairs en français

## J12 — Soumission (18-19 oct)

- [ ] README final : modèles/APIs/outils déclarés, installation vérifiée
- [ ] Vidéo de démonstration (3 minutes maximum)
- [ ] Vérification anti-secrets (workflow `preparer-soumission`)
- [ ] Soumission via le formulaire avant le 19 octobre

## Finale — 24 octobre

- [ ] Pitch de 7 minutes préparé (problème, démo en direct, rôle de l'IA, open source, suite)
- [ ] Réponses aux questions du jury préparées (3 minutes)
