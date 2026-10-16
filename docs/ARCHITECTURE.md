# Architecture — Démarche-Bi

## Vue d'ensemble

```
Question (texte, ou voix)
   │
   ▼  voix : bouton micro ──► spectre en direct ──► POST /api/transcribe ──► Whisper (Groq)
   │      le texte reconnu s'affiche, la personne le relit et le corrige (« C'est bien ça ? »)
   │
   ▼  page /reponse  (ou POST /api/ask pour d'autres applications)
 1. Comprendre   LLM : choisit la ou les démarches dans la liste fermée des fiches
 2. Décider      code : vérifie le choix, puis répond, demande une précision ou dit « je ne sais pas »
 3. Répondre     LLM : écrit une introduction courte à partir d'UNE seule fiche
 4. Vérifier     garde-fous (code) : nombres, adresses, balisage, mots absolus ; une seconde chance
 5. Citer        la page montre pièces, étapes, chiffres et sources de la fiche, mot pour mot
   │
   ▼
Réponse + sources + avertissement        (journal anonyme et avis, Neon : optionnel)
```

Si l'IA manque (pas de clé, saturée, en panne), la recherche par mots choisit la fiche et la page la montre sans introduction. Voir « Quand l'IA manque » dans `docs/AI-PROMPTS.md`.

Source de vérité du contenu : `content/demarches/*.md` (versionné dans Git, validé par la CI).

## Structure du code

```
content/demarches/        fiches Markdown (+ _modele.md)
eval/questions.jsonl      jeu d'évaluation (95 questions, dont 15 en wolof ou mêlées de wolof)
src/
  app/
    page.tsx              accueil : bouton micro, champ de question et exemples
    reponse/              réponse à une question, lue dans l'adresse (/reponse?q=…)
    demarches/            liste et pages des fiches
    a-propos/             à propos pour les utilisateurs : sources, « je ne devine pas », ouvert à tous, tes données
    projet/               pour le jury et les contributeurs : questions fréquentes, liens GitHub ; hors menu, lien discret au bas d'« À propos »
    not-found.tsx         page introuvable
    globals.css           couleurs, mode sombre, animations (design « doux »)
    manifest.ts           nom, couleurs et icônes de l'application installable (+ apple-icon.png, favicon.ico, public/icons/)
    hors-connexion/       page de secours quand une question ne peut pas partir (recherche par mots dans les fiches du téléphone) et donnees.json (pages à copier + fiches) ; le programme est public/sw.js
    api/
      ask/route.ts        POST : question -> réponse (le site appelle le même service sans passer par là)
      transcribe/route.ts POST : enregistrement audio -> texte (le son n'est jamais gardé)
      feedback/route.ts   POST : avis « utile / pas utile » + commentaire facultatif (anonyme, répond 204)
  components/             interface : cadre de page et menu, boutons, pastilles, cartes, blocs d'une fiche, écrans de précision,
                          voix (BoutonVoix : fenêtre et état ; VoixEcrans : les écrans d'enregistrement, de transcription, de vérification et d'erreur),
                          message d'installation sur l'écran d'accueil du téléphone (MessageInstaller),
                          réponse à voix haute (BoutonEcouter), écran de démarrage des téléphones (EcranDemarrage),
                          avis « Cette réponse t'a aidé ? » (AvisReponse),
                          mode sans connexion (HorsConnexion : enregistre le service worker et affiche le bandeau ; ResultatsHorsConnexion : la page de secours)
  lib/
    texte.ts              petits outils de texte (accents, question de l'adresse, apostrophes, ponctuation française)
    liens.ts              liens vers le dépôt GitHub
    demarrage.ts          écran de démarrage : le script « une fois par ouverture » et les 26 images de démarrage de l'iPhone (testé)
    installation.ts       message « Installe Démarche-Bi » : quand l'afficher (Android, Safari de l'iPhone), silence de 14 jours après « Plus tard » (calcul pur, testé)
    hors-connexion/       mode sans connexion : pages à copier, lecture des données, rythme des mises à jour, tests du service worker (sw.test.ts)
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
      transcription.ts    POST /api/transcribe : contrôle du fichier, limite par visiteur, Whisper, texte
    voix/                 la voix, utilisée par le navigateur et par le serveur
      audio.ts            formats acceptés (webm, ogg, mp4, wav…), durée et taille maximales, lecture du fichier reçu
      silence.ts          repère les phrases que Whisper invente sur du silence
      codes.ts            les erreurs possibles de la voix, partagées par le serveur et le navigateur
      messages.ts         ce que la personne lit pour chaque erreur
      spectre.ts          barres du spectre en direct, détection de voix, chronomètre (calcul pur)
      enregistreur.ts     micro, enregistrement et analyse du son dans le navigateur
      envoi.ts            envoi de l'enregistrement à /api/transcribe
      lecture.ts          l'essentiel lu à voix haute, construit depuis la fiche, chaque phrase liée à un bloc de l'écran (calcul pur, testé)
      parleur.ts          la voix du téléphone (speechSynthesis) : choix de la voix française, lecture phrase par phrase, bloc en cours
      surlignage.ts       surligne à l'écran le bloc que la voix lit (attributs data-lecture / data-lu) et amène la page jusqu'à lui
      lectureAuto.ts      la note « question posée à voix haute » qui déclenche la lecture automatique
    avis/                 le journal anonyme et les avis (voir « Données »)
      avis.ts             lecture d'un avis (corps de POST /api/feedback, validé par Zod), commentaire nettoyé
      journal.ts          les deux écritures SQL (question_logs, feedback) et ce qui est noté d'une réponse ; ne lève jamais d'erreur
      service.ts          noter la réponse après l'envoi de la page ; recevoir un avis, avec ses limites par visiteur
      serveur.ts          branche le service sur DATABASE_URL (sans elle : rien n'est noté)
      envoi.ts            envoi de l'avis à /api/feedback, messages d'erreur
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
- `/reponse` : la question est lue dans l'adresse (`?q=…`, et `&fiche=…` quand la personne a choisi une démarche sur l'écran de précision). Le cadre de la page est prérendu avec l'écran d'attente, la réponse arrive ensuite (Cache Components) : une fiche avec son introduction, un écran de précision, « Je ne sais pas encore » (démarche absente) ou « Ce n'est pas mon domaine » (sujet sans rapport avec l'administration), les deux avec une phrase écrite pour la question quand elle passe les garde-fous. Cette page n'est pas indexée (les questions sont dans l'adresse). La réponse demande JavaScript.
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
5. Si la question concerne une pratique frauduleuse, falsifiée, corrompue ou illégale (faux papiers, falsification, corruption, pot-de-vin, fraude…) : « Interdit par la loi » (refus déterministe immédiat en code pur). Si la question n'est qu'une salutation (« Bonjour », « Salam aleykoum », « Nanga def »…) : « Salam aleykoum ! » et une invitation à poser sa question, sans appel au modèle (code pur aussi). Si le modèle dit que la fiche ne traite pas la question, ou si aucune démarche ne correspond : « Je ne sais pas encore » ; si le modèle juge que la question n'a aucun rapport avec les démarches administratives : « Ce n'est pas mon domaine ». Dans ces deux derniers cas, une phrase écrite pour la question remplace la phrase habituelle quand elle passe `verifierMessageSansReponse`.
6. Une phrase écrite par l'IA est signalée à l'écran (« Phrase écrite par l'IA, d'après la fiche. »).
7. Le quota gratuit est protégé : mémoire des questions déjà posées (6 heures, 300 questions) et 10 questions par minute et par visiteur. Ces deux outils vivent dans l'instance du serveur : ils aident sur Vercel sans rien garantir.

## API

`POST /api/ask` avec un corps JSON `{ "question": "…", "fiche": "identifiant" }` (`fiche` est facultatif : il saute l'étape « comprendre »). La question est mise sur une ligne et coupée à 300 caractères. Réponse `200` :

| `type` | Contenu |
|---|---|
| `fiche` | `fiche` (tous ses champs), `autres` (fiches voisines), `intro` (texte ou `null`), `degrade` (`saturee`, `indisponible` ou `null`), `rejet` (raison du refus des garde-fous ou `null`) |
| `precision` | `options` (fiches entre lesquelles choisir), `question` (peut être vide) |
| `precision_generale` | `question` (peut être vide) |
| `inconnue` | `message` (phrase écrite pour la question et vérifiée, absente sinon) : une démarche administrative que le site n'a pas |
| `hors_domaine` | `message` (comme ci-dessus) : la question n'a aucun rapport avec les démarches administratives |
| `interdit` | `message` : la question porte sur une pratique frauduleuse ou illégale (refus en code pur, sans modèle) |
| `salutation` | `message` : la question n'est qu'une salutation ; l'écran salue en retour et invite à poser sa question (code pur, sans modèle) |

Un corps illisible ou une question vide répondent `400` avec `{ "erreur": "…" }`. La route n'a pas de réglage CORS : seul le site l'appelle depuis un navigateur.

## Voix

Le bouton micro de l'accueil ouvre une fenêtre plein écran (`<dialog>`) : « Je t'écoute… » avec le spectre de la voix en direct et un chronomètre, puis « C'est bien ça ? » avec le texte reconnu, modifiable, avant de chercher la réponse. Le navigateur enregistre en webm/opus à 32 kbit/s (mp4 sur Safari) : 30 secondes pèsent une centaine de ko, utile avec un forfait data limité. L'enregistrement s'arrête seul à 30 secondes.

- `POST /api/transcribe` reçoit un formulaire dont le champ `audio` est le fichier et rend `{ "texte": "…" }` (texte vide quand rien n'a été entendu), ou `{ "erreur": "code" }` avec le statut HTTP qui va avec : 400 (fichier absent ou vide), 413 (plus de 2 Mo), 415 (format inconnu), 429 (trop d'enregistrements : 6 par minute et par visiteur), 503 (Whisper saturé ou en panne).
- Le son n'est jamais gardé : il reste en mémoire le temps de la requête, puis il est transmis à Whisper (Groq). Les journaux du serveur ne contiennent ni le texte ni le son, seulement la nature d'une panne.
- Un enregistrement sans voix n'est pas envoyé : le navigateur mesure la puissance du son (au moins 0,3 s au-dessus d'un seuil) et affiche « Je n'ai rien entendu ». Sur du silence, Whisper invente des phrases (« Sous-titrage Société Radio-Canada », « Merci. ») avec une probabilité d'absence de parole à 0 : le serveur écarte les plus courantes (`src/lib/voix/silence.ts`).
- Un refus du micro par le téléphone (`NotAllowedError`) donne « Je n'ai pas accès à ton micro. Autorise-le dans les réglages de ton appareil, puis réessaie. » : constaté le 12 octobre sur l'application installée d'un iPhone alors que le serveur, le code d'enregistrement et le parcours complet dans Chrome fonctionnaient ; cause supposée : une autorisation refusée ou perdue côté iPhone (quitter et rouvrir l'application, vérifier les réglages, ou la réinstaller).
- Le micro n'existe que sur une page sécurisée (https, ou localhost) : sur l'adresse réseau du serveur de développement (http://192.168…), le navigateur le refuse et la fenêtre propose d'écrire la question.
- Quitter la page, fermer la fenêtre (croix, Échap) ou la voir cachée par la navigation coupe le micro et abandonne l'envoi en cours.

## Réponse à voix haute

La page de réponse a un bouton **Écouter l’essentiel** (et **Arrêter**) : le téléphone lit l'essentiel de la réponse avec sa propre voix (`speechSynthesis`). Aucune clé, aucun quota, rien n'est envoyé par Démarche-Bi ; Groq n'a d'ailleurs aucune voix française (seulement l'anglais et l'arabe). Pas de wolof parlé : aucune voix gratuite n'en a.

- **Le texte lu vient de la fiche, pas de l'IA, et il va à l'essentiel** (30 à 65 secondes au lieu de 1 min 15 à 2 min 40 quand tout l'écran était lu). `src/lib/voix/lecture.ts` le construit dans l'ordre de l'écran : l'avertissement d'une fiche pas vérifiée ou périmée (rien pour une fiche à jour), la phrase de l'IA (ou le titre si elle manque), le coût (jamais coupé), le délai et le lieu (« non précisé » quand la fiche ne le dit pas ; au-delà de 100 caractères, seulement jusqu'au premier point-virgule ou à la première phrase, puis « Le reste est à l'écran »), une phrase si quelque chose est à confirmer (« regarde l'écran »), les pièces sans leurs précisions entre parenthèses (six au plus, puis « Et N autres pièces, à l'écran ») et le nombre d'étapes. Les étapes, les notes « à confirmer » et l'avertissement final restent à l'écran. Les autres écrans (précision, « Je ne sais pas encore ») ont leur version.
- **La voix suit le texte.** Chaque phrase dite porte un repère (`cible` : `intro`, `cout`, `piece-2`…) ; les blocs de la page portent `data-lecture="repère"` (Pieces, FaitsCles, NoteAConfirmer, ReponseFiche, Pastilles). Le parleur donne la cible de la phrase en cours, `BoutonEcouter` pose `data-lu` sur le bloc correspondant et `globals.css` le surligne (fond doux et barre à gauche, clair et sombre, sans animation si le téléphone les a coupées). Si le bloc n'est pas bien visible (hors de la zone entre 15 % et 70 % de la hauteur), la page défile pour le mettre au milieu ; sinon elle ne bouge pas. Le suivi se fait phrase par phrase (le mot par mot dépend du téléphone).
- **Mis en forme pour la voix** : « FCFA » devient « francs CFA », « 10 000 » est collé en « 10000 » (chaque téléphone dit « dix mille »), un numéro vert est épelé chiffre par chiffre, les guillemets et parenthèses deviennent des pauses. Le texte est coupé en phrases de 200 caractères au plus : Chrome coupe la voix d'un texte trop long au bout d'une quinzaine de secondes.
- **Voix** : la meilleure voix française du téléphone (le français de France d'abord, puis une voix « améliorée »). Si les voix sont chargées et qu'aucune n'est française, le bouton disparaît (une voix étrangère lirait n'importe quoi). Chrome charge ses voix après coup : une liste vide ne cache pas le bouton.
- **Lecture automatique après une question posée à voix haute.** « Chercher la réponse » laisse dans la mémoire de l'onglet une note datée (`sessionStorage`, valable 90 secondes) ; la page de réponse la prend, une seule fois, et lit. Une question écrite, une page rechargée ou un lien partagé ne lisent rien tout seuls. Sur iPhone, la voix n'est autorisée qu'après un appui : au toucher de « Chercher la réponse », une phrase vide et muette débloque la voix pour la réponse qui arrive plus tard. Si le téléphone refuse quand même, le bouton « Écouter l’essentiel » reste là.
- Quitter la page coupe la voix.

Limites connues : la qualité dépend des voix installées sur le téléphone (sur Android, voix Google ; certaines passent par le réseau) ; pas de pause, seulement arrêter et reprendre du début ; la voix n'a été essayée que sur un faux moteur et sur celui de Chrome sur Mac (sans son), pas sur un vrai Android ni un vrai iPhone.

## Écran de démarrage (téléphone)

À l'ouverture sur téléphone, l'application ne s'affiche pas d'un coup : un fond avec le logo, **immobile**, reste environ 1,2 s, puis un fondu de 0,5 s ouvre l'accueil (1,7 s en tout), comme une application. Le fond suit le mode du téléphone (clair ou sombre) dès le premier instant. L'écran de la page reprend exactement l'image de démarrage de l'iPhone (même logo, même taille, coche déjà dessinée, pas de halo) : aucun saut entre les deux (essayé le 13 octobre : au démarrage de l'animation le logo est déjà plein et centré, 96 × 96, sans zoom).

- **Dans la page** (`EcranDemarrage`, monté en premier dans `layout.tsx`) : tout est en CSS (`globals.css`, classes `ecran-demarrage`), donc l'écran est visible dès le premier dessin, sans attendre le JavaScript. Il est **caché par défaut** et n'est allumé que par un petit script inline (`lib/demarrage.ts`, joué pendant la lecture de la page, avant le premier affichage) qui pose `data-actif="oui"` **une seule fois par ouverture** (note dans `sessionStorage` : pas de rejeu au rechargement ni en changeant de page ; mémoire bloquée : on le montre). Il suit le guide Next.js « Preventing flash before hydration ».
- **Il ne peut pas rester collé** : sans animations (réglage « réduire les animations » du téléphone) il reste invisible, sans JavaScript il n'est jamais allumé, il ne reçoit aucun appui (`pointer-events: none`), et il est caché sur ordinateur (≥ 1024 px).
- **Android** : une fois l'application installée, Android affiche déjà son propre écran de démarrage (l'icône sur le `background_color` du manifeste, à partir de l'icône de 512 px). L'écran de la page prend la suite avec le même fond.
- **iPhone** : l'iPhone garde l'image de démarrage qu'il avait à l'installation : après un changement des images, supprimer l'application de l'écran d'accueil puis la réinstaller. Sans image dédiée, l'iPhone affiche un écran vide avant la page. `layout.tsx` déclare 26 images (`public/demarrage/`, une claire et une sombre par taille d'iPhone, listées dans `lib/demarrage.ts`) : le logo sur le fond de l'application, à la même taille que dans la page. Safari veut l'image exacte pour chaque écran : un nouvel iPhone demande d'ajouter sa taille à `APPAREILS_IOS` et de régénérer les images. Le test vérifie que chaque fichier existe et a la bonne taille.
- **Logo qui « sautait » sur l'iPhone installé (14 octobre)** : l'application installée affiche la page SOUS la barre d'état (`apple-mobile-web-app-status-bar-style: default`, valeur par défaut de Next), donc la page est plus courte que l'écran, alors que l'image de démarrage est centrée sur TOUT l'écran : le logo changeait de place (d'environ la moitié de la barre d'état, 23 points sur un iPhone 15) quand la page prenait le relais. Le script de `lib/demarrage.ts` mesure `(screen.height − innerHeight) / 2` quand `navigator.standalone` est vrai (portrait seulement, entre 0 et 40 points) et le met dans la variable CSS `--decalage-demarrage`, qui remonte le logo (`globals.css`). Vérifié en simulation (page de 805 points sur un écran de 852 : le logo retombe à 426, comme sur l'image) ; **à confirmer sur un vrai iPhone**. Si le logo saute encore, la solution de repli est de ne pas montrer l'écran de la page dans l'application installée de l'iPhone (l'image de démarrage suffit).
- **Mode développement** : après avoir changé `globals.css`, redémarrer `npm run dev` (le CSS déjà servi n'est pas mis à jour).

Limites connues : le fond de l'écran de démarrage d'Android est celui du manifeste (clair) même quand le téléphone est en mode sombre (le manifeste n'a qu'une couleur ; une variante sombre n'est pas confirmée) : en mode nuit, un bref fond clair peut précéder l'écran sombre de la page ; la qualité de l'enchaînement avec l'écran de l'iPhone n'a pas été vue sur un vrai iPhone.

## Installation sur le téléphone

Démarche-Bi peut s'installer sur l'écran d'accueil (application web). `src/app/manifest.ts` donne le nom, les couleurs et les icônes (`public/icons/`, `src/app/apple-icon.png`, `src/app/favicon.ico`). Le service worker (`public/sw.js`, voir « Sans connexion » plus bas) rend le site utilisable sans réseau. Chrome propose l'installation avec ou sans lui (vérifié avec Chrome 154 sur ordinateur : aucune erreur d'installabilité, l'événement `beforeinstallprompt` part).

Le message `MessageInstaller` (monté dans `src/app/layout.tsx`) invite à installer l'application, sur téléphone seulement (`lg:hidden`), au-dessus du menu du bas :

- **Android (Chrome)** : l'événement `beforeinstallprompt` est gardé dès le chargement du fichier (il part une fois, juste après le chargement de la page) ; « Installer » ouvre la fenêtre du navigateur. Un navigateur sans cet événement (Firefox) n'affiche rien.
- **iPhone (Safari)** : aucun bouton n'existe, le message explique « Touche Partager, puis Sur l'écran d'accueil ». Les autres navigateurs de l'iPhone (Chrome, Firefox, Edge…) et ceux des applications (Facebook, Instagram…) n'ont pas « Partager » au même endroit : rien n'est affiché.
- Le message arrive 8 secondes après l'ouverture du site, jamais plus tôt. « Plus tard », « Compris » ou un refus dans la fenêtre de Chrome le cachent 14 jours : une date dans `localStorage`, rien d'autre. Il n'apparaît pas dans l'application installée (`display-mode: standalone`, `navigator.standalone`).
- Les règles (quand l'afficher, combien de temps se taire) sont dans `src/lib/installation.ts` : du calcul pur, testé. Le composant ne fait que lire le navigateur.

Limites connues : sur iPhone, rien ne dit si l'icône a vraiment été ajoutée ; le micro dans l'application ajoutée à l'écran d'accueil de l'iPhone est à essayer sur un vrai appareil (des rapports parlent d'une autorisation redemandée à chaque ouverture) ; l'icône garde l'adresse où elle a été ajoutée, donc il faut installer depuis l'adresse publique, pas depuis un aperçu protégé.

## Sans connexion

Le site marche sans réseau, une fois ouvert **une fois avec internet**. Le programme `public/sw.js` (service worker, écrit à la main, aucune dépendance) tourne dans le navigateur du téléphone. Il est enregistré par `HorsConnexion` (monté dans `layout.tsx`, **en production seulement**) ; `next.config.ts` lui donne `Cache-Control: no-cache` pour qu'une mise à jour arrive toujours.

- **Ce qui marche** : ouvrir l'application à froid ; lire la liste des démarches et chaque fiche visible, « À propos » et « Le projet » ; écouter une fiche (voix du téléphone) ; poser une question **écrite** : `/reponse` renvoie alors vers `/hors-connexion?q=…`, qui cherche les mots dans les fiches gardées (`searchFiches`, la même recherche que le repli sans IA) et propose les démarches qui ressemblent.
- **Ce qui ne marche pas** : la phrase rédigée par l'IA, la question dite à voix haute (le micro dit « Pas de connexion » tout de suite : `BoutonVoix` regarde `navigator.onLine`), l'envoi d'un avis. Un bandeau « Tu es hors connexion. Les fiches restent lisibles. » s'affiche.
- **Ce qui est copié** : à l'installation, le programme lit `/hors-connexion/donnees.json` (préparé à la construction : la liste des pages et les fiches visibles, donc jamais un brouillon en production), copie ces pages (accueil, démarches, une page par fiche visible, projet, à propos, page de secours) puis les fichiers qu'elles citent (`/_next/static/…`, icônes, manifeste). Environ 2,7 Mo en tout avec 21 fiches (27 pages, mesuré le 14 octobre). Si la liste manque, l'installation échoue et sera retentée : on ne garde jamais une copie vide.
- **Jamais copié** : `/reponse` (les questions et les réponses ne restent pas sur le téléphone), `/api/*`, les envois (POST), les données de page de Next (`_rsc`) : sans réseau, Next passe alors par une navigation complète, que le programme sait servir.
- **Les pages passent par le réseau d'abord** (4 s au plus) : avec du réseau on voit la version à jour, et la copie est renouvelée ; sans réseau (ou s'il tarde trop) on voit la copie ; sans copie, la page de secours. Les fichiers au nom unique sont pris dans la copie ; les icônes sont rafraîchies en arrière-plan.
- **Mises à jour** : à chaque ouverture avec réseau, la page demande au programme de rafraîchir ses copies, **au plus une fois par demi-journée** (`lib/hors-connexion/rafraichir.ts`, date dans `localStorage`) ; les fichiers que plus aucune page ne cite sont supprimés. Pour repartir de zéro : changer `VERSION` dans `public/sw.js` (les anciennes copies sont supprimées à l'activation).
- **Tests** : `src/lib/hors-connexion/*.test.ts` (règles du programme chargé dans un faux navigateur, données, rythme) ; et un essai réel dans Chrome avec le réseau coupé (installation, accueil à froid, lecture des fiches, question écrite, micro, axe, retour du réseau).

Limites connues : il faut une première visite avec internet ; sur iPhone, installer l'application sur l'écran d'accueil (dans Safari, l'iPhone peut effacer les copies d'un site resté une semaine sans visite) ; certaines voix Android pour la lecture à voix haute ont besoin d'internet ; une page sans copie (fiche ajoutée depuis la dernière mise à jour) montre la page de secours ; le bandeau lit `navigator.onLine`, qui reste vrai avec un Wi-Fi sans internet : il ne s'affiche pas alors, mais la question qui échoue mène quand même à la page de secours, et le délai de 4 s gère le réseau lent.

## Données (optionnel)

Neon sert uniquement à un journal anonyme (`question_logs`) et aux avis (`feedback`) : pas de compte, pas d'adresse IP, pas d'identifiant de visiteur, question tronquée à 500 caractères, purge à 90 jours, automatique : une tâche planifiée de Vercel (`vercel.json`, chaque nuit à 03 h UTC) appelle `GET /api/cron/purge` avec le secret `CRON_SECRET` (`Authorization: Bearer …`, comparé sans fuite de durée ; `401` sans le bon secret, y compris quand aucun secret n'est réglé) ; la route supprime d'abord les avis, puis les questions, de plus de 90 jours (`src/lib/avis/purge.ts`), et répond `{ reponses, avis }`. Elle peut aussi se lancer à la main : `delete from question_logs where created_at < now() - interval '90 days'`. **L'application fonctionne sans `DATABASE_URL`** : rien n'est noté et la barre d'avis n'apparaît pas.

- **Le journal** : une ligne par réponse **finale** montrée sur `/reponse` (une fiche, « Je ne sais pas encore » ou « Ce n'est pas mon domaine ») : la question (sur une ligne, 500 caractères au plus), `answered`, les fiches montrées (`fiche_slugs`). Une question de précision n'est pas notée : la réponse choisie ensuite l'est, avec la même question. L'écriture se fait **après l'envoi de la page** (`after` de Next.js) : elle ne ralentit jamais la réponse, et si la base est en panne la personne ne le voit pas (la panne est signalée dans les journaux du serveur par son seul nom, jamais avec la question). Un visiteur qui recharge sans cesse est limité à 30 réponses notées par minute (mémoire de l'instance, comme les autres limites). Les colonnes `language` et `channel` ne sont pas remplies : `channel` garde sa valeur par défaut `text`, le site ne sait pas si la question a été dite à voix haute.
- **L'identifiant** : le serveur tire un UUID pour chaque réponse notée et le donne à la barre d'avis (`AvisReponse`, dans la page). L'avis (`POST /api/feedback`, `{ journalId, utile, commentaire? }`) s'y rattache ; si la ligne du journal n'a pas pu être écrite, l'avis est gardé sans rattachement plutôt que perdu.
- **La barre d'avis** : « Cette réponse t'a aidé ? », « Oui » (un appui, un envoi) ou « Pas vraiment » (champ facultatif « Dis-moi ce qui manque », 500 caractères). Messages d'erreur clairs (trop de demandes, pas de réseau, base en panne) avec possibilité de réessayer.
- **L'API** : corps limité à 4 Ko, 10 avis par minute et par visiteur (comptés avant la lecture du corps, donc aussi pour les corps invalides), réponses `204`, `400 avis_invalide`, `429 trop_de_demandes`, `503 indisponible` (sans base, ou base en panne). Le visiteur est connu par ses en-têtes, seulement pour limiter, jamais gardé.
- **Rien d'autre n'est gardé** : ni la voix, ni l'adresse, ni un identifiant de visiteur. La question reste dans l'adresse `/reponse?q=…` et donc dans les journaux de l'hébergeur : c'est dit dans la page « À propos ».

## Principes

- L'IA choisit la démarche et écrit une introduction ; le code décide, cite et vérifie.
- Tout appel modèle passe par `src/lib/ai/` et toute sortie est validée.
- Modèles open-weight via API compatible OpenAI, interchangeables par variables d'environnement.
- Pages légères, polices système, mobile-first, utilisables en connexion lente.

## Variables d'environnement

Voir `.env.example` et `docs/SETUP.md` : IA principale Groq (`AI_*`) avec, par défaut, un second modèle Groq en secours (autre fournisseur possible avec `AI_FALLBACK_*`), Whisper (`WHISPER_*`), Neon optionnel (`DATABASE_URL`), `DEMARCHE_INCLUDE_DRAFTS` (développement uniquement).
