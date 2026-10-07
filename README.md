# Jënd-Jaay

Sourcing alimentaire par IA pour les restaurateurs, boutiquiers et traiteurs du Sénégal.

Projet réalisé pour l'**Open Source × AI Hackathon 2026** (Galsen DEV, Hacktoberfest Dakar).

## Le problème

Les petits acheteurs commandent leurs produits par appels et messages WhatsApp, comparent peu les prix et perdent du temps à chercher qui a quoi. Les grossistes et producteurs n'ont pas de vitrine structurée.

## La solution

L'acheteur écrit ou dicte sa demande librement, par exemple :

> « Il me faut 50 kg d'oignons et 20 kg de pommes de terre pour demain à Thiès »

L'IA la transforme en commande structurée, trouve les fournisseurs adaptés, puis compare leurs offres et recommande la meilleure.

## Rôle de l'IA

- **Compréhension de la demande** : texte ou vocal, français avec termes wolof, converti en produits, quantités, lieu et délai.
- **Matching** : classement des fournisseurs par produits, zone, prix et fiabilité.
- **Comparaison** : résumé des offres avec une recommandation justifiée.
- **Côté fournisseur** : création de catalogue à partir d'une photo ou d'un message libre.

## Modèles, APIs et outils IA utilisés

À compléter au fil du développement :

| Usage | Modèle / outil |
|---|---|
| Extraction et comparaison | Llama 3.3 70B (open-weight) via Groq, API compatible OpenAI |
| Secours | Modèle gratuit open-weight via OpenRouter (optionnel) |
| Transcription vocale | Whisper large v3 turbo via Groq |
| Aide au développement | Claude (Anthropic), Antigravity |

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Neon (Postgres serverless) · Vercel

## Installation

Guide complet pas à pas (GitHub, Neon, Groq, Vercel) : [`docs/SETUP.md`](docs/SETUP.md).

```bash
git clone https://github.com/tamsir-ndao/jend-jaay.git
cd jend-jaay
npm install
cp .env.example .env.local   # renseigner DATABASE_URL (Neon) et les clés Groq
npm run dev
```

Base de données (Neon) : `npm run db:migrate` applique le schéma (`db/migrations/`), puis `npm run db:seed` charge les données de démonstration fictives (`db/seed.sql`).

## Feuille de route

- [x] Squelette, schéma de base de données, données de démo
- [ ] Parsing de la demande par l'IA (texte puis voix)
- [ ] Matching et comparaison des offres
- [ ] Interfaces acheteur et fournisseur
- [ ] Vidéo de démonstration

## Licence

[MIT](LICENSE)
