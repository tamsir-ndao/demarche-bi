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
| Extraction et matching | Modèle open-weight (Llama ou Qwen) via API compatible OpenAI |
| Transcription vocale | Whisper |
| Aide au développement | Claude (Anthropic) |

## Stack

Next.js (App Router) · TypeScript · Tailwind CSS · Supabase (Postgres, Auth, RLS) · Vercel

## Installation

```bash
git clone <url-du-depot>
cd jend-jaay
npm install
cp .env.example .env.local   # renseigner les variables
npm run dev
```

Base de données : appliquer `supabase/migrations/0001_init.sql`, puis `supabase/seed.sql` pour les données de démonstration (fictives).

## Feuille de route

- [x] Squelette, schéma de base de données, données de démo
- [ ] Parsing de la demande par l'IA (texte puis voix)
- [ ] Matching et comparaison des offres
- [ ] Interfaces acheteur et fournisseur
- [ ] Vidéo de démonstration

## Licence

[MIT](LICENSE)
