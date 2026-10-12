# Tâches — Démarche-Bi

Cocher au fur et à mesure. Dossier prêt le **18 octobre 2026** (date interne), présélection prévue le 21 (modalités à confirmer par les organisateurs), finale et soumission MLH le **24 octobre**.

## Fait

- [x] Socle : Next.js, TypeScript, Tailwind, licence MIT, client IA (Groq, secours OpenRouter, Whisper), règles Antigravity
- [x] Pivot vers Démarche-Bi (9 octobre) : PRD, architecture, prompts, planning
- [x] Format de fiche (Zod), chargeur, validateur `npm run validate:fiches`, modèle de fiche
- [x] CI GitHub (fiches, lint, build), CONTRIBUTING, modèles d'issue et de pull request
- [x] Schéma Neon optionnel (journal anonyme, avis) et `npm run db:migrate` rejouable

## Vendredi 9 octobre — à faire par toi

- [ ] Mettre à jour ton inscription au hackathon avec Démarche-Bi, track Civic Tech (`docs/SETUP.md`, étape 2)
- [ ] Inscrire chaque membre de l'équipe sur MLH (mail des organisateurs du 11 octobre) : https://events.mlh.com/events/14896-hacktoberfest-hack-day-dakar-x-galsen-dev
- [x] Créer le dépôt GitHub public `demarche-bi` et pousser le code (étape 3)
- [x] Clé Groq dans `.env.local` (étapes 4 à 6)
- [ ] Choisir les 15 démarches (`docs/FICHES-A-PRODUIRE.md`)

## Samedi 10 — fiches (lot 1) et recherche

- [x] 5 brouillons de fiches avec sources officielles (11 octobre) : CNI, duplicata de CNI, NINEA, casier judiciaire, bonne vie et mœurs
- [ ] Relire les 5 fiches sur leurs sources puis les passer en `verifie` (`verifie_le`, `verifie_par`)
- [x] `src/lib/fiches/search.ts` : recherche lexicale, avec tests
- [ ] Vérifier le seuil de pertinence sur les 5 fiches

## Dimanche 11 — IA et API

- [x] 5 fiches de plus (lot 2) : 9 brouillons faits le 12 octobre (14 fiches au total). Les 7 fiches dont la page officielle a été lue (carte d'identité, duplicata, casier judiciaire, bonne vie et mœurs, NINEA, passeport ordinaire, certificat de nationalité par mariage) sont passées en « vérifié » le 12 octobre, après relecture par tamsir-ndao. Repris d'une copie collée du texte des pages du portail (Service public ou Sénégal Services), qui n'ont pas pu être ouvertes depuis notre outil, restent en brouillon tant que leur page officielle n'est pas lisible (servicepublic.gouv.sn et senegalservices.sn ne répondent plus ; le guichet unique e-senegal.sn et cappkarange.sn sont des pistes) : copie littérale d'acte de naissance, 4 fiches carte grise (véhicule neuf, véhicule d'occasion importé, changement de propriétaire, duplicata) et 2 fiches permis de conduire (premier permis, renouvellement et duplicata). Les contradictions du portail sur le permis (délai, lieu de dépôt, pièces) sont notées « à confirmer »
- [x] `schemas.ts`, `understand.ts`, `decide.ts`, `answer.ts`, `guardrails.ts` dans `src/lib/ai/` (11 octobre) : le modèle choisit dans la liste fermée des fiches, n'écrit que l'introduction, le code vérifie
- [x] Route `/api/ask` : comprendre, décider, répondre, vérifier, citer (la page `/reponse` appelle le même service)
- [x] Tests des garde-fous (identifiant inconnu, nombre inventé, adresse, balisage, mot absolu, sortie invalide)
- [ ] Prévoir la capacité IA de la démo et de la finale : le gratuit de Groq plafonne à 200 000 tokens par jour et par modèle (80 à 100 questions) ; décider entre l'offre payante à l'usage (très bon marché), un troisième modèle à mesurer (`openai/gpt-oss-20b`) ou un secours chez un autre fournisseur ; la limite par visiteur (10 questions et 6 enregistrements par minute) se compte par adresse réseau : au Wi-Fi du lieu de la finale, tout le monde partage la même adresse, donc prévoir de la relever pour la démo
- [x] Projet Vercel `demarche-bi` créé, Aperçu avec l'IA, la voix et les brouillons vérifié sur Vercel (11 octobre) : pages, réponse écrite par l'IA, transcription Whisper, parcours dans Chrome en https
- [ ] Production Vercel : ajouter les clés en Production (le site public répond aujourd'hui « Je ne sais pas encore », sans IA ni voix), laisser les brouillons absents tant que des fiches ne sont pas vérifiées, connecter le dépôt GitHub, mettre l'adresse dans le README (un lien public sera sans doute demandé pour la présélection)

## Lundi 12 — interface

- [x] Design « doux » de la maquette porté dans le vrai site (11 octobre) : mode sombre, mobile d'abord, polices du système, accessibilité vérifiée avec axe-core (0 violation)
- [x] Page d'accueil : zone de question, exemples, réponse avec étapes (l'IA choisit la fiche et écrit l'introduction ; sans micro avant la voix)
- [x] Affichage des sources (titre, lien, date de consultation), de la date de vérification et de l'avertissement
- [x] État « je ne sais pas » (11 octobre)
- [x] Thème nuit en gris foncé neutre à la place du vert très foncé (demande du 11 octobre) ; le vert vif reste pour les accents
- [ ] Espaces insécables dans les montants (« 10 000 FCFA » se coupe en fin de ligne sur téléphone)
- [x] État « question de précision » : écran de choix entre plusieurs démarches, et question à reformuler quand la demande est trop vague

## Mardi 13 — évaluation

- [x] `eval/questions.jsonl` : 52 questions (couvertes, hors périmètre, vagues), dont 10 en wolof ou mêlées de wolof
- [ ] Vérifier la licence de Qwen3.8-27B sur la page officielle `Qwen/Qwen3.8-27B` (Apache 2.0 annoncée par la presse et le catalogue NVIDIA) avant le README final
- [ ] Faire relire par un locuteur wolof les 10 questions `mixte` et `wo` de `eval/questions.jsonl` (tournures rédigées sans locuteur natif)
- [x] `scripts/eval.ts` et `npm run eval` : recherche seule (`-- --brouillons` tant que des fiches sont en brouillon)
- [x] `npm run eval -- --ia` de bout en bout : bonne fiche, refus, précision, introductions refusées par les garde-fous (premiers chiffres le 11 octobre ; à refaire une fois les fiches vérifiées)
- [ ] Corriger la recherche et les prompts selon les résultats
- [ ] 5 fiches de plus (lot 3) : 15 au total

## Mercredi 14 — voix et consultation

- [x] Route `/api/transcribe` et bouton d'enregistrement, transcription modifiable (11 octobre)
- [x] Spectre vocal en direct pendant l'enregistrement (barres animées par le niveau du micro), pour que l'utilisateur voie que sa voix est captée (11 octobre)
- [ ] Essayer la voix sur de vrais téléphones, en https (Safari iPhone, Chrome Android), avec de vrais locuteurs : seuil de détection de voix, phrases inventées sur du silence, accent ; compléter `src/lib/voix/silence.ts` avec ce que Whisper invente réellement
- [x] Application installable (manifeste, icônes) et message « Installe Démarche-Bi » : bouton sur Android, explications sur Safari de l'iPhone, silence de 14 jours après « Plus tard » (11 octobre)
- [ ] Essayer l'installation sur un vrai Android (Chrome) et un vrai iPhone (Safari) : le message, l'icône, le nom sous l'icône, l'ouverture en plein écran, et le micro dans l'application installée (iPhone : l'autorisation peut être redemandée) ; installer depuis l'adresse publique, pas depuis un aperçu protégé
- [x] Réponse à voix haute (12 octobre) : bouton « Écouter la réponse » avec la voix du téléphone, lecture automatique après une question posée à voix haute, texte lu construit depuis la fiche
- [x] Voix plus courte et qui suit le texte (12 octobre) : la voix dit l'essentiel (phrase de réponse, coût, délai, lieu, pièces, nombre d'étapes) au lieu de tout l'écran, et le bloc lu est surligné et amené à l'écran ; bouton « Écouter l'essentiel »
- [x] Réponse personnalisée aux questions sans fiche (12 octobre) : « Ce n'est pas mon domaine » pour un sujet sans rapport avec l'administration, « Je ne sais pas encore » pour une démarche absente, chacun avec une phrase écrite par le modèle pour la question et vérifiée par le code (pas de chiffre, de montant ni d'adresse) ; une question qui parle d'une démarche n'est jamais « hors domaine »
- [x] Cadre autour du titre des écrans de la voix retiré (12 octobre)
- [ ] Essayer la réponse à voix haute sur de vrais téléphones (iPhone Safari, Android Chrome) : qualité de la voix française, lecture automatique après une question parlée (iPhone), voix manquante, temps de lecture ; ajuster la vitesse si besoin
- [x] Écran de démarrage des téléphones (12 octobre) : logo, coche qui se dessine, fondu vers l'accueil, une fois par ouverture ; 26 images de démarrage pour l'iPhone
- [ ] Voir l'écran de démarrage sur de vrais téléphones : l'enchaînement avec l'écran d'Android et celui de l'iPhone (images claires et sombres), la durée (1,3 s : à raccourcir si c'est long), l'application installée et le navigateur
- [x] Pages `/demarches` et `/demarches/[slug]` (11 octobre)
- [x] Page `/a-propos` à la place de `/contribuer` (11 octobre) : sources, « je ne devine pas », questions fréquentes, liens pour proposer une démarche ou signaler une erreur
- [x] Produit fini (12 octobre) : `/a-propos` ne garde que ce qui sert à l'utilisateur (sources, « je ne devine pas », ouvert à tous, tes données) ; la FAQ, « Tu veux aider ? » et les liens GitHub passent sur `/projet` (pour le jury, hors menu, lien discret au bas d'« À propos »)
- [x] Même logique pour le pied de page ordinateur : « Voir le code sur GitHub » et « Signaler une erreur » retirés (12 octobre)
- [ ] Blocs « Proposer une démarche » (« Je ne sais pas encore » et liste des démarches) : à décider

## Jeudi 15 — avis et déploiement

- [x] Avis « utile / pas utile » : barre « Cette réponse t'a aidé ? » et `POST /api/feedback` (12 octobre)
- [x] Journal anonyme dans Neon (optionnel, l'application marche sans) : une ligne par réponse finale, écrite après l'envoi de la page (12 octobre)
- [x] Réponse « Est-ce que tu gardes mes données ? » de la page À propos refaite (12 octobre)
- [x] Base Neon créée, `npm run db:migrate` lancée, `DATABASE_URL` dans `.env.local` et dans Vercel (Production et Preview, secret), barre d'avis essayée avec la vraie base (12 octobre) ; reste à redéployer la production
- [ ] Purge du journal à 90 jours : aujourd'hui à lancer à la main (voir `docs/ARCHITECTURE.md`, « Données ») ; une tâche planifiée Vercel ou un script, avant la finale
- [ ] Essayer la barre d'avis sur de vrais téléphones (clavier, zone du bas, thème sombre) et relire les premiers avis

## Vendredi 16 — essais réels

- [ ] Test sur téléphone et en connexion lente
- [ ] Faire essayer à 2 ou 3 personnes, noter leurs questions et leurs remarques (les questions réelles s'ajoutent à `eval/questions.jsonl`)
- [ ] Corriger ce qui bloque

## Samedi 17 — open source et chiffres

- [ ] README final avec les chiffres d'évaluation tels que mesurés
- [ ] Au moins 5 issues « good first issue » (nouvelles fiches à écrire)
- [ ] Vérification anti-secrets (workflow `preparer-soumission`)

## Dimanche 18 — dossier prêt

- [ ] Vidéo de démonstration (3 minutes maximum)
- [ ] Texte de soumission : problème, solution, rôle de l'IA
- [ ] Envoyer le dossier de présélection selon les modalités des organisateurs (à confirmer)

## Lundi 19 — marge

- [ ] Marge : corrections mineures seulement

## 20 au 23 octobre — finale

- [ ] Pitch de 7 minutes (problème, démo en direct, rôle de l'IA, open source, chiffres, suite)
- [ ] Réponses aux questions du jury (3 minutes) : exactitude des fiches, rôle réel de l'IA, mise à jour du contenu
- [ ] Plan B de démo : vidéo enregistrée si le réseau ou l'API tombe

## Samedi 24 octobre — finale à l'Impact Hub Dakar

- [ ] Check-in sur place, puis soumission sur MLH Organizer HQ (section Challenges) pour les 5 finalistes
