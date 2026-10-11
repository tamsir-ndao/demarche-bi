# Tâches — Démarche-Bi

Cocher au fur et à mesure. Soumission le **19 octobre 2026** (viser le 18), présélection le 21, finale le 24.

## Fait

- [x] Socle : Next.js, TypeScript, Tailwind, licence MIT, client IA (Groq, secours OpenRouter, Whisper), règles Antigravity
- [x] Pivot vers Démarche-Bi (9 octobre) : PRD, architecture, prompts, planning
- [x] Format de fiche (Zod), chargeur, validateur `npm run validate:fiches`, modèle de fiche
- [x] CI GitHub (fiches, lint, build), CONTRIBUTING, modèles d'issue et de pull request
- [x] Schéma Neon optionnel (journal anonyme, avis) et `npm run db:migrate` rejouable

## Vendredi 9 octobre — à faire par toi

- [ ] Mettre à jour ton inscription au hackathon avec Démarche-Bi, track Civic Tech (`docs/SETUP.md`, étape 2)
- [x] Créer le dépôt GitHub public `demarche-bi` et pousser le code (étape 3)
- [ ] Clé Groq dans `.env.local` (étapes 4 à 6)
- [ ] Choisir les 15 démarches (`docs/FICHES-A-PRODUIRE.md`)

## Samedi 10 — fiches (lot 1) et recherche

- [x] 5 brouillons de fiches avec sources officielles (11 octobre) : CNI, duplicata de CNI, NINEA, casier judiciaire, bonne vie et mœurs
- [ ] Relire les 5 fiches sur leurs sources puis les passer en `verifie` (`verifie_le`, `verifie_par`)
- [x] `src/lib/fiches/search.ts` : recherche lexicale, avec tests
- [ ] Vérifier le seuil de pertinence sur les 5 fiches

## Dimanche 11 — IA et API

- [ ] 5 fiches de plus (lot 2)
- [ ] `schemas.ts`, `understand.ts`, `answer.ts`, `guardrails.ts` dans `src/lib/ai/`
- [ ] Route `/api/ask` : comprendre, retrouver, répondre, vérifier, citer
- [ ] Tests des garde-fous (slug inconnu, montant inventé, sortie invalide)

## Lundi 12 — interface

- [ ] Page d'accueil : zone de question, exemples, réponse avec étapes
- [ ] Affichage des sources (titre, lien, date de vérification) et de l'avertissement
- [ ] États « je ne sais pas » et « question de précision »

## Mardi 13 — évaluation

- [x] `eval/questions.jsonl` : 40 questions (couvertes, hors périmètre, vagues), dont 10 en wolof ou mêlées de wolof
- [ ] Faire relire par un locuteur wolof les 10 questions `mixte` et `wo` de `eval/questions.jsonl` (tournures rédigées sans locuteur natif)
- [x] `scripts/eval.ts` et `npm run eval` : recherche seule (`-- --brouillons` tant que des fiches sont en brouillon)
- [ ] `npm run eval` de bout en bout (après `/api/ask`) : faits attendus et rejets des garde-fous
- [ ] Corriger la recherche et les prompts selon les résultats
- [ ] 5 fiches de plus (lot 3) : 15 au total

## Mercredi 14 — voix et consultation

- [ ] Route `/api/transcribe` et bouton d'enregistrement, transcription modifiable
- [ ] Spectre vocal en direct pendant l'enregistrement (barres animées par le niveau du micro), pour que l'utilisateur voie que sa voix est captée
- [ ] Pages `/demarches` et `/demarches/[slug]`
- [ ] Page `/contribuer`

## Jeudi 15 — avis et déploiement

- [ ] Avis « utile / pas utile » et `/api/feedback`
- [ ] Journal anonyme dans Neon (optionnel, l'application marche sans)
- [ ] Déploiement Vercel avec les variables d'environnement

## Vendredi 16 — essais réels

- [ ] Test sur téléphone et en connexion lente
- [ ] Faire essayer à 2 ou 3 personnes, noter leurs questions et leurs remarques (les questions réelles s'ajoutent à `eval/questions.jsonl`)
- [ ] Corriger ce qui bloque

## Samedi 17 — open source et chiffres

- [ ] README final avec les chiffres d'évaluation tels que mesurés
- [ ] Au moins 5 issues « good first issue » (nouvelles fiches à écrire)
- [ ] Vérification anti-secrets (workflow `preparer-soumission`)

## Dimanche 18 — soumission

- [ ] Vidéo de démonstration (3 minutes maximum)
- [ ] Texte de soumission : problème, solution, rôle de l'IA
- [ ] Soumettre (avec un jour de marge)

## Lundi 19 — marge

- [ ] Date limite : seulement des corrections mineures

## 20 au 23 octobre — finale

- [ ] Pitch de 7 minutes (problème, démo en direct, rôle de l'IA, open source, chiffres, suite)
- [ ] Réponses aux questions du jury (3 minutes) : exactitude des fiches, rôle réel de l'IA, mise à jour du contenu
- [ ] Plan B de démo : vidéo enregistrée si le réseau ou l'API tombe

## Samedi 24 octobre — finale à l'Impact Hub Dakar
