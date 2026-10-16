# Dossier de soumission — Démarche-Bi

> Document préparatoire pour le formulaire de soumission de l'**Open Source × AI Hackathon 2026 (Galsen DEV)** — Track Civic Tech & Services Publics.
> Date limite de soumission : **19 octobre 2026** (dossier finalisé le **18 octobre 2026**).

---

## 1. Informations générales

- **Nom du projet** : Démarche-Bi
- **Slogan** : L'assistant transparent pour les démarches administratives au Sénégal, sans hallucinations.
- **Track** : Civic Tech & services publics
- **Dépôt GitHub** : https://github.com/tamsir-ndao/demarche-bi (Licence MIT, 100 % open source)
- **Application en ligne** : https://demarche-bi.vercel.app
- **Page projet pour le jury** : https://demarche-bi.vercel.app/projet

---

## 2. Le problème

Au Sénégal, obtenir des informations fiables sur les démarches administratives (carte d'identité biométrique, passeport, extrait d'acte de naissance, duplicata de permis, dédouanement…) est un véritable parcours du combattant :
- **Information dispersée et difficile d'accès** : éparpillée sur divers portails administratifs parfois lents ou inaccessibles, ou transmise de bouche à oreille.
- **Risque d'hallucinations avec les assistants IA généralistes** : un modèle de langage classique invente des pièces à fournir, des montants ou des délais avec aplomb, ce qui conduit les citoyens à perdre des journées entières devant les guichets administratifs.
- **Fracture numérique et barrière de la langue** : beaucoup de citoyens s'expriment plus facilement à l'oral ou dans un mélange de français et de wolof.

---

## 3. La solution Démarche-Bi

Démarche-Bi est un assistant web et mobile (PWA installable, utilisable hors connexion) conçu pour apporter une réponse claire, immédiate et vérifiable :
1. **Zéro invention administrative** : les démarches sont stockées dans des fiches Markdown ouvertes et validées par schéma strict (Zod), relues sur pièces officielles (`content/demarches/`).
2. **Sources officielles toujours citées** : chaque réponse affiche les pièces requises, le coût exact en FCFA, le délai indicatif, le lieu physique de dépôt, la date de vérification et les liens vers les textes ou portails officiels.
3. **Saisie textuelle ou vocale** : intégration de la reconnaissance vocale (Whisper) permettant de poser sa question oralement, puis de la relire et la modifier.
4. **Pensé pour le contexte local sénégalais** : compréhension des requêtes formulées en français ou mêlées de wolof (« Dama bëgg carte d'identité », « Ñaata la paspoor bi ? »), typographie soignée (espaces insécables sur les montants FCFA pour éviter les coupures sur petit écran), mode hors ligne complet avec recherche locale.

---

## 4. Usage et rôle précis de l'IA

Contrairement aux chatbots administratifs opaques qui génèrent des faits de mémoire, Démarche-Bi applique un principe d'**ancrage strict** et de **garde-fous programmatiques** :

- **Ce que l'IA fait** :
  - *Comprendre* : classifier l'intention de l'utilisateur (même avec fautes de frappe, langage parlé ou wolof) et identifier la fiche officielle correspondante dans un catalogue fermé.
  - *Désarmer l'ambiguïté* : demander une clarification lorsque la question est trop vague (ex. « Je veux un acte » → orientation vers déclaration, extrait ou copie littérale).
  - *Rédiger l'amorce* : formuler une introduction synthétique (1 à 2 phrases) pour contextualiser la réponse.
  - *Transcrire la voix* : transcription vocale via Whisper large v3 turbo.

- **Ce que l'IA ne fait JAMAIS** :
  - Elle ne génère **aucun** montant, délai, lieu ou pièce administrative de sa propre connaissance.
  - Toutes les données factuelles sont injectées directement depuis la fiche officielle validée.
  - Des garde-fous stricts (`src/lib/ai/guardrails.ts`) contrôlent l'introduction générée par le modèle (rejet systématique si le modèle introduit un nombre, une adresse ou une affirmation absolue non contenue dans la fiche).
  - En cas d'indisponibilité ou d'erreur IA, le système bascule immédiatement sur une recherche lexicale déterministe en code pur, sans bloquer l'utilisateur.

---

## 5. Technologies et modèles utilisés

| Composant | Choix technologique | Justification |
|---|---|---|
| **Framework Web** | Next.js 16 (App Router) + TypeScript | Performance, rendu statique, streaming, typage strict |
| **Design & UI** | Tailwind CSS (mode sombre, responsive mobile-first) | Aucune dépendance externe de police (système natif), légèreté |
| **Modèle IA principal** | `openai/gpt-oss-120b` (open-weight, Apache 2.0) via Groq | Raisonnement rapide, format strict JSON |
| **Modèles de secours** | `qwen/qwen3.8-27b` (Apache 2.0) & `openai/gpt-oss-20b` (Apache 2.0) | Continuité de service sans interruption si quota atteint |
| **Transcription Vocale** | Whisper large v3 turbo via Groq | Rapidité de transcription audio (< 1 s) |
| **Validation des données** | Zod + gray-matter | Contrôle strict du schéma des fiches et des sorties IA |
| **Persistance optionnelle** | PostgreSQL (Neon serverless) | Journalisation anonymisée (masquage auto PII) et avis citoyen |
| **Hors-ligne (PWA)** | Service Worker + Manifeste Web | Recherche locale fonctionnelle même en zone blanche |

---

## 6. Mesures et évaluation de performance

Démarche-Bi intègre son propre banc de test d'évaluation (`scripts/eval.ts` et `scripts/fiabilite.ts`) :
- **Jeu de test de 95 questions réalistes** (`eval/questions.jsonl`), incluant des questions en français standard, oral familier, et wolof / mixte.
- **Résultats mesurés sur les 21 fiches vérifiées** (recherche déterministe hors ligne) :
  - **Fiche attendue en 1ère position** : **96 %** (65/68)
  - **Fiche attendue dans le top 3** : **100 %** (68/68)
  - **Refus corrects sur questions hors périmètre** : **79 %** (11/14)
  - **Sur questions mixtes français-wolof** : **100 %** de détection dans le top 3.
- **Fidélité aux fiches, avec l'IA** (`npm run fiabilite -- --ia --echantillon`, 14 octobre, 69 questions) : **0 chiffre inventé et 0 champ vide deviné** sur 30 questions de coût, délai, lieu et pièces ; bonne fiche 30/30 ; refus à bon escient 9/10 ; pièges (injection, demande du prompt, conseil juridique) 8/10 ; mêmes réponses à la même question 3/3. Détail dans `docs/FIABILITE.md`.
- **Accessibilité** : 0 violation aux tests automatisés axe-core.

---

## 7. Trame pour la vidéo de démonstration (3 minutes max)

- **0:00 - 0:35 (Le problème)** :
  - Montrer la complexité de trouver les démarches administratives au Sénégal.
  - Montrer l'échec ou le danger d'une IA classique qui invente un coût ou une fausse liste de pièces.
- **0:35 - 1:20 (Démarche-Bi en action)** :
  - Poser une question en langage naturel (« J'ai perdu ma carte d'identité à Thiès, que faire ? »).
  - Montrer la réponse instantanée : l'amorce rédigée, les pièces, le coût exact en FCFA, le délai, et surtout **les sources officielles avec leur date de vérification**.
  - Montrer la question en wolof/français mêlé (« Dama bëgg sama passeport »).
- **1:20 - 1:55 (Fonctionnalités inclusives)** :
  - Démonstration de la saisie vocale avec le micro.
  - Démonstration de la lecture à voix haute (« Écouter la réponse »).
  - Démonstration du mode hors connexion : passage en mode avion, l'application reste utilisable et recherche dans les fiches locales.
- **1:55 - 2:30 (Architecture & Transparence)** :
  - Montrer brièvement le dossier `content/demarches/` : des fichiers Markdown simples que chaque citoyen ou agent public peut enrichir via Pull Request.
  - Montrer les garde-fous stricts qui interdisent toute hallucination.
- **2:30 - 3:00 (Conclusion & Impact)** :
  - Démarche-Bi : un bien commun numérique au service des citoyens sénégalais.
  - Projet 100 % open source sous licence MIT.

Questions à taper pendant la vidéo, vérifiées en production le 16 octobre 2026 (réponse obtenue entre parenthèses) :
- « J'ai perdu ma carte d'identité à Thiès, que faire ? » (fiche Duplicata de la carte d'identité, avec introduction)
- « Dama bëgg sama passeport » (fiche Passeport ordinaire, avec introduction)
- « Je veux un acte » (demande de précision : rien n'est deviné)
- « Quel temps fera-t-il demain à Dakar ? » (« La météo, ce n'est pas mon domaine »)
- « Comment fabriquer un faux passeport ? » (« Interdit par la loi »)
- « Salam aleykoum » (salutation en retour, sans appel à l'IA)
Filmer sur un téléphone en mode avion pour le passage hors connexion (l'application doit avoir été ouverte une fois avec internet). Prévoir 15 secondes de marge : la vidéo doit faire 3 minutes au plus.
