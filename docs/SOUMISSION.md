# Dossier de soumission — Démarche-Bi

> Document préparatoire pour le formulaire de soumission de l'**Open Source × AI Hackathon 2026 (Galsen DEV)** — Track Civic Tech & Services Publics.
> Date limite de soumission : **19 octobre 2026** (dossier finalisé le **18 octobre 2026**). État du projet décrit ici : **16 octobre 2026** (22 fiches dont 21 vérifiées, 1 162 tests automatisés). Les textes prêts à coller dans le formulaire sont à la section 8, la liste de ce qui reste à faire à la section 9.

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
4. **Pensé pour le contexte local sénégalais** : compréhension des requêtes formulées en français ou mêlées de wolof (« Dama bëgg carte d'identité », « Ñaata la paspoor bi ? »), typographie soignée (espaces insécables sur les montants FCFA pour éviter les coupures sur petit écran), mode hors ligne complet avec recherche locale. Salué en français, l'assistant répond en français ; salué en wolof, il répond en wolof.
5. **Une conversation à voix haute, de bout en bout** : la question est dite au micro, relue, puis la réponse est lue par la voix du téléphone (sans aucun service externe) ; si l'assistant a besoin d'une précision, on peut lui répondre à voix haute, et la fiche choisie se lit toute seule.
6. **Une réponse lisible, pas un dossier** : d'abord ce qui répond (phrase, coût, délai, lieu), puis les pièces à apporter, puis les étapes et les sources à un geste ; le texte apparaît bloc par bloc, au fil de la voix quand elle lit. La fiche complète reste accessible, et chaque information garde sa source.
7. **Une seule présentation au premier lancement** (trois écrans : parle ou écris, une réponse avec ses sources, je ne devine pas), puis plus jamais ; partage d'une fiche sur WhatsApp ou par la feuille de partage du téléphone.

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
- **Accessibilité** : 0 violation aux tests automatisés axe-core (accueil, réponse, démarches, écrans de la voix, présentation « Bienvenue »), vérifiée dans Chrome à 320, 390 et 1 440 px.
- **Tests automatisés** : 1 162 tests (`npm test`, 16 octobre 2026) sur les garde-fous, la recherche, les fiches, la voix, les écrans et les attaques connues (7 cas restent documentés comme ouverts dans `docs/FIABILITE.md`).
- **Fiches** : 22 au 16 octobre 2026, dont 21 vérifiées sur la page officielle (date et auteur de vérification dans chaque fiche) et 1 brouillon invisible en production (dédouanement d'un véhicule : limite d'âge à confirmer auprès des Douanes).

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
- « Salam aleykoum » (salutation en retour dans la même langue, « Maalekum salam ! », sans appel à l'IA ; « Bonjour » reçoit « Bonjour ! »)
Filmer sur un téléphone en mode avion pour le passage hors connexion (l'application doit avoir été ouverte une fois avec internet). Prévoir 15 secondes de marge : la vidéo doit faire 3 minutes au plus. Avant de filmer, poser une fois chaque question de la liste avec internet : la réponse est gardée en mémoire 6 heures et revient instantanément pendant l'enregistrement, sans dépendre du quota de l'IA.

---

## 8. Textes prêts à coller dans le formulaire

Chaque bloc est écrit pour une case du formulaire : copier tel quel, raccourcir si la case est limitée. Tout ce qui est affirmé ici est vérifiable dans le dépôt.

**Nom du projet** : Démarche-Bi

**En une phrase** : L'assistant open source qui répond aux questions sur les démarches administratives au Sénégal uniquement à partir de fiches vérifiées, avec les sources officielles, et qui dit « je ne sais pas » plutôt que d'inventer.

**Le problème** : Au Sénégal, savoir quelles pièces apporter, où aller, combien payer et combien de temps attendre pour une carte d'identité, un passeport, un extrait de naissance ou un permis relève du parcours du combattant : l'information est dispersée entre des portails parfois inaccessibles, des groupes WhatsApp et le bouche-à-oreille, et elle est rarement datée ni sourcée. Les assistants IA généralistes aggravent le problème : ils inventent des pièces, des montants et des délais avec aplomb. Une erreur coûte une journée de travail et un déplacement pour rien. Beaucoup de citoyens s'expriment plus facilement à l'oral, ou en wolof mêlé de français.

**La solution** : Démarche-Bi est une application web installable sur le téléphone (et utilisable hors connexion) qui répond à une question posée à l'écrit ou à voix haute, en français ou mêlée de wolof. Chaque réponse vient d'une fiche vérifiée sur la page officielle : pièces, étapes, coût en FCFA, délai, lieu, source et date de vérification, mot pour mot. Si aucune fiche ne correspond, l'assistant le dit. La réponse est lue à voix haute par la voix du téléphone et s'affiche bloc par bloc, du plus utile au plus détaillé. Les fiches sont des fichiers Markdown ouverts, validés automatiquement et relus une par une : n'importe qui peut en ajouter ou en corriger une par pull request. 22 fiches au 16 octobre 2026, dont 21 vérifiées (identité, passeport, casier judiciaire, nationalité, NINEA, état civil, carte grise, permis de conduire).

**L'usage de l'IA** : L'IA sert à comprendre, jamais à affirmer. Un modèle open-weight (gpt-oss-120b via Groq, avec Qwen3.8-27B et gpt-oss-20b en secours) lit la question, même avec des fautes, à l'oral ou en wolof, et choisit la démarche dans la liste fermée des fiches ; quand plusieurs conviennent, il pose une question de précision. Il n'écrit qu'une phrase d'introduction, à partir de la seule fiche choisie, et le code la vérifie : tout nombre, adresse, mot absolu (« gratuit », « obligatoire ») ou morceau de prompt absent de la fiche la fait rejeter, et la fiche est alors montrée sans phrase. Tous les faits administratifs affichés viennent de la fiche, pas du modèle, et la phrase de l'IA est signalée à l'écran. Whisper (large v3 turbo) transcrit la voix ; la personne relit et corrige avant d'envoyer. Si l'IA est saturée ou en panne, une recherche par mots prend le relais sans interruption. Mesuré le 14 octobre sur 69 questions : 0 chiffre inventé, 0 champ vide deviné, bonne fiche 30/30, refus à bon escient 9/10, pièges résistés 8/10 (détail dans `docs/FIABILITE.md`).

**Technologies, modèles et outils IA** :
- Modèles : `openai/gpt-oss-120b` (principal), `qwen/qwen3.8-27b` et `openai/gpt-oss-20b` (secours), tous open-weight sous licence Apache 2.0, servis par l'API Groq (format OpenAI, sorties JSON à schéma strict) ; `whisper-large-v3-turbo` (Groq) pour la transcription.
- Application : Next.js 16 (App Router), React 19, TypeScript strict, Tailwind CSS 4, Zod (validation des fiches et des sorties de l'IA), Markdown + YAML pour les fiches, service worker écrit à la main pour le mode hors connexion, `speechSynthesis` du navigateur pour la lecture à voix haute.
- Données et hébergement : Neon (Postgres, facultatif) pour un journal anonyme des questions et les avis, purgé à 90 jours ; Vercel.
- Qualité : 1 162 tests automatisés (`node:test`), jeu d'évaluation de 95 questions dont 15 en wolof, suite de fiabilité (fidélité, refus, pièges, saisie, répétition), axe-core (0 violation), CI GitHub.
- Outils IA de développement : Claude (Anthropic) et Antigravity, sous les règles du dépôt (`GEMINI.md`, `CLAUDE.md`).

**Liens** :
- Dépôt (MIT, historique public depuis le 7 octobre 2026) : https://github.com/tamsir-ndao/demarche-bi
- Application : https://demarche-bi.vercel.app · page projet : https://demarche-bi.vercel.app/projet
- Documentation : `README.md`, `docs/ARCHITECTURE.md`, `docs/AI-PROMPTS.md`, `docs/FIABILITE.md`, `docs/SETUP.md`, `CONTRIBUTING.md`
- Vidéo de démonstration (2 min 02) : https://youtu.be/TF9t8Gp6h_c

---

## 9. Avant d'envoyer : ce qui reste à faire

- [x] Vidéo mise en ligne le 17 octobre et lien ajouté à la section 8 : film de 2 min 02 sur YouTube (non répertorié, jusqu'en 4K).
- [x] Chaque membre de l'équipe s'inscrit sur MLH (demandé par les organisateurs, même avant la finale) : fait, confirmé par Tamsir le 17 octobre.
- [x] Formulaire des organisateurs (https://tally.so/r/jeDjKJ) rempli avec les textes de la section 8 et soumis par Tamsir le 19 octobre, avant la date limite du mardi 20 octobre à 12 h. Page de confirmation reçue ; annonce des 5 finalistes le mercredi 21 octobre dans la soirée, par e-mail.
- [x] Vérifier sur un vrai téléphone, juste avant d'envoyer, les questions de la section 7 avec internet puis en mode avion : fait par Tamsir le 17 octobre, tout est bon.
