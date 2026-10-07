# PRD — Jënd-Jaay

## Vision

Permettre à un petit acheteur alimentaire (restaurateur, boutiquier, traiteur) de dire ce dont il a besoin en une phrase, et d'obtenir des offres comparées de fournisseurs, sans passer des heures au téléphone.

## Problème

- Les commandes passent par appels et messages WhatsApp : lent, peu de comparaison de prix.
- Les grossistes et producteurs n'ont pas de vitrine structurée.

## Utilisateurs

| Rôle | Besoin |
|---|---|
| Acheteur | Publier une demande en langage naturel (texte ou vocal), comparer les offres, choisir |
| Fournisseur | Tenir un catalogue simple, recevoir les demandes pertinentes, répondre par une offre |

## Parcours principal (démo de 3 minutes)

1. L'acheteur dicte : « Il me faut 50 kg d'oignons et 20 kg de pommes de terre pour demain à Thiès ».
2. L'IA affiche la demande structurée (produits, quantités, lieu, délai) pour confirmation.
3. Les fournisseurs pertinents sont classés et reçoivent la demande.
4. Les offres arrivent ; l'IA les compare et recommande la meilleure avec une justification.
5. L'acheteur accepte une offre et contacte le fournisseur par WhatsApp.

## Périmètre du MVP (à tenir)

Inclus :
- Demande en texte, puis en voix (transcription Whisper).
- Extraction structurée par l'IA, confirmée par l'acheteur.
- Matching des fournisseurs par produit, zone et prix.
- Création d'offres par les fournisseurs, comparaison par l'IA.
- Catalogue fournisseur (saisie manuelle ; photo ou message libre en bonus).
- Contact par lien WhatsApp.
- Données de démonstration fictives réalistes.

Exclus (après le hackathon) : paiement, livraison, messagerie interne, notation, application mobile native.

Bonus si le temps le permet : paiement Bictorys, création de catalogue depuis une photo.

## Critères du hackathon et réponse

| Critère | Poids | Réponse du projet |
|---|---|---|
| Pertinence du problème et utilité | 25 % | Problème quotidien et réel des acheteurs alimentaires |
| Pertinence de l'IA | 20 % | L'IA structure la demande, classe les fournisseurs et justifie la recommandation |
| Qualité technique / prototype | 20 % | Démo de bout en bout fonctionnelle, sorties IA validées |
| Démarche open source | 20 % | Dépôt public, MIT, README complet, historique Git, modèles déclarés |
| Présentation, UX, potentiel | 15 % | Parcours en 3 minutes, mobile-first, extensible à d'autres secteurs |

## Livrables de soumission (19 octobre 2026)

- Dépôt public avec licence MIT et historique Git
- README : problème, solution, rôle de l'IA, modèles/APIs/outils, installation
- Vidéo de démonstration de 3 minutes maximum
- Description du problème, de la solution et de l'usage de l'IA

## Calendrier

- 7 octobre : lancement
- 19 octobre : soumission
- 21 octobre : présélection des 5 finalistes
- 24 octobre : finale à l'Impact Hub Dakar (7 min de pitch + 3 min de questions)
