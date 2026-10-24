# Plan de la finale — Démarche-Bi

> Finale de l'**Open Source × AI Hackathon 2026 (Galsen DEV)**, samedi 24 octobre 2026 à 15 h, Impact Hub Dakar.
> Format officiel (mail des organisateurs du 23 octobre) : **10 minutes** de pitch et de démo, **puis 5 minutes** de questions du jury. Le temps est strictement respecté : on vise **8 min 30**, pour garder de la marge.
> Démarche-Bi passe **en premier** sur cinq. Sur place **au plus tard à 14 h** pour tester le matériel, début à **14 h 30**. Impact Hub Dakar, Cité Keur Gorgui, en face de la DGPU. À l'accueil : se présenter comme participant du hackathon, projet Démarche-Bi.
> Plan refait le 17 octobre 2026, puis resserré le 24 octobre à 8 min 30.

Le matériel :

- **Diaporama** (10 diapos, le texte à dire est dans les notes de chaque diapo) : https://claude.ai/artifact/CNGHD8WuH28GuArcJRGqQ1. Le lien est privé : ouvre-le connecté à ton compte, et télécharge-le aussi en PDF et en PowerPoint depuis son menu Partager.
- **Ouverture** : `~/Downloads/demarche-bi-video/demarche-bi-film-ouverture.mp4` (29 secondes : le début du film, qui s'arrête sur le logo).
- **Secours** : le film complet (`demarche-bi-film-1080p.mp4`, 2 min 02) et la démo commentée (`demarche-bi-demo.mp4`, 2 min 59), sur le Mac et sur une clé USB.

---

## 1. Le déroulé (8 min 30, sur 10 minutes autorisées)

| Temps | Diapo | Ce que tu fais |
|---|---|---|
| 0:00 – 0:30 | 1. Titre, puis le film | Lance l'ouverture en plein écran. Ne parle pas. |
| 0:30 – 1:15 | 2. Le problème | Une pièce manque, une journée perdue ; l'information est éparpillée. |
| 1:15 – 1:45 | 3. Les IA inventent | La fausse réponse tamponnée « INVENTÉ. ». |
| 1:45 – 2:15 | 4. La solution | Une question, une fiche, sa source. |
| 2:15 – 3:00 | 5. La règle | Le modèle (gpt-oss-120b via Groq), ce qu'il fait, ce qu'il ne fait jamais, comment le code le contrôle. |
| 3:00 – 6:15 | 6. Démo en direct | Un parcours complet, puis trois situations courtes (section 2). |
| 6:15 – 7:00 | 7. Les preuves | Mesuré, pas promis. |
| 7:00 – 7:45 | 8. Le bien commun | Une vraie fiche, la licence, comment installer et contribuer. |
| 7:45 – 8:30 | 9. Merci | Ce que tu as construit, ce que ça change, la suite ; code QR. |
| secours | 10. Ce que montre la démo | Seulement si la démo lâche. |

Les trois phrases à garder en tête :

- « Une IA qui devine, c'est une journée perdue au guichet. »
- « L'IA comprend, la fiche affirme. »
- « Il ne devine pas : il montre la source, ou il dit qu'il ne sait pas. »

---

## 2. La démo pas à pas (3:00 – 6:15)

Conseil des organisateurs : un parcours clair, du début à la fin, plutôt qu'un tour des fonctionnalités. Donc un parcours complet d'abord (1 min 30), puis trois situations courtes. Le reste devient du bonus.

Ces questions ont été vérifiées en production le 16 octobre, puis par Tamsir sur un vrai téléphone, avec internet puis en mode avion, le 17 octobre.

| # | Temps | Ce que tu fais | Ce qui doit s'afficher | Ce que tu dis |
|---|---|---|---|---|
| 1 | 3:00 – 4:30 | Le parcours complet. Micro : « J'ai perdu ma carte d'identité à Thiès, que faire ? », puis « Chercher la réponse ». Fais défiler jusqu'à la source. | « C'est bien ça ? », puis la fiche Duplicata de la carte d'identité, lue à voix haute | « Je peux corriger avant d'envoyer. Le coût, les pièces, la source officielle et sa date. Cette phrase est marquée : écrite par l'IA, d'après la fiche. Je ne me déplace qu'une fois. » |
| 2 | 4:30 – 5:00 | Écris « Dama bëgg sama passeport » | La fiche Passeport ordinaire, à 20 000 FCFA | « Même en wolof mêlé de français. 20 000 FCFA : le vrai prix. » |
| 3 | 5:00 – 5:25 | Écris « Je veux un acte », puis touche un choix | Une question de précision | « Quand c'est vague, il ne devine pas. » |
| 4 | 5:25 – 6:15 | Mode avion, puis écris « renouveler mon permis » | « Pas de connexion », puis la fiche Permis de conduire : renouvellement et duplicata | « Sans internet, pas d'IA. Mais les fiches sont sur le téléphone. » |
| bonus | avant l'étape 4, si le chrono est sous 5:45 | « Quel temps fera-t-il demain à Dakar ? », « Salam aleykoum » ou « Comment fabriquer un faux passeport ? » | « Ce n'est pas mon domaine », « Maalekum salam ! », « Interdit par la loi » | « Il connaît ses limites. » |

Attention :

- En mode avion, **écris** la question : la voix a besoin d'internet.
- Ne pose pas plus de 10 questions dans la même minute : au-delà, la fiche s'affiche sans la phrase de l'IA (limite par visiteur).
- Coupe le mode avion juste après l'étape 4.

---

## 3. Montrer le téléphone sur l'écran de la salle

- **iPhone** : relie-le au Mac par câble. Ouvre QuickTime Player, puis Fichier → Nouvel enregistrement vidéo. Clique sur la flèche à côté du bouton rouge et choisis ton iPhone comme caméra et comme micro. Monte le volume de la fenêtre : la voix du téléphone passe alors par le Mac. Mets la fenêtre en plein écran.
- **Android** : l'application scrcpy, par câble (à installer et à essayer avant).
- **Essaie-le chez toi avant le 24, aussi en mode avion.** Ça n'a pas encore été vérifié avec ton téléphone.

---

## 4. Les filets de sécurité

1. **L'IA est lente ou saturée.** Chaque appel est coupé au bout de 8 à 10 secondes. Le modèle suivant prend le relais (gpt-oss-120b, puis Qwen3.8-27B, puis gpt-oss-20b), puis la recherche par mots. La fiche s'affiche quand même, sans la phrase de l'IA. Dis-le : « Même sans l'IA, la fiche arrive. »
2. **Le réseau de la salle coupe.** Passe sur le partage de connexion 4G de ton téléphone. Sinon, le mode avion devient la démo (étape 6).
3. **Le téléphone ou le câble lâche.** Va à la diapo 10, « Ce que montre la démo », et raconte. S'il reste du temps, lance le film complet.
4. **Le Mac n'a pas internet.** Le diaporama en PDF, l'ouverture et les films sont sur le Mac.

---

## 5. Les questions du jury (5 minutes)

Réponds court : deux ou trois phrases, puis arrête-toi.

### 1. « Comment les fiches restent-elles à jour si un tarif change ? »
> Chaque fiche affiche sa source officielle et sa date de vérification. Ce sont des fichiers texte publics : si un tarif change, on corrige le fichier, et l'historique montre qui a changé quoi, et quand. N'importe qui peut proposer la correction ; elle est validée automatiquement, puis relue.

### 2. « Pourquoi pas un RAG classique avec ChatGPT ? »
> Parce qu'un RAG laisse le modèle rédiger les faits : il peut mélanger deux démarches ou inventer un montant. Ici, le modèle choisit seulement la fiche dans une liste fermée, et il écrit une phrase que le code vérifie. Tous les faits viennent de la fiche. Et la recherche par mots marche même sans internet, sur le téléphone.

### 3. « Et les données personnelles ? »
> Pas de compte, pas de mot de passe, aucun document à envoyer. La question part chez Groq, le fournisseur d'IA, pour être comprise. Le journal des questions est facultatif : avant d'écrire, il masque les e-mails, les téléphones et les longs numéros, comme ceux d'une carte d'identité, et il est purgé au bout de 90 jours. Sa limite est écrite dans le dépôt : il ne reconnaît pas un nom écrit en toutes lettres.

### 4. « Pourquoi la réponse n'est-elle pas lue en wolof ? »
> Parce qu'aucune voix de synthèse gratuite ne parle wolof aujourd'hui, ni sur les téléphones ni chez les fournisseurs que nous utilisons ; nous préférons une voix française juste qu'un wolof approximatif. L'assistant comprend déjà le wolof mêlé de français, et il salue en wolof quand on le salue en wolof. Dès qu'une voix wolof fiable existe, elle se branche au même endroit.

### 5. « Combien ça coûte à faire tourner ? »
> Le code et les fiches sont libres, sous licence MIT. L'IA n'écrit qu'une phrase par réponse, et les réponses sont gardées 6 heures en mémoire : ça limite les appels. Aujourd'hui, tout tourne sur les offres gratuites de Groq et de Vercel : ça coûte zéro franc. Avec les trois modèles, le gratuit de Groq tient environ 240 à 300 questions par jour. Si l'usage grandit, l'offre payante de Groq se paie à l'usage. Et si l'IA n'est plus disponible, la recherche par mots répond quand même.

### 6. « Et si l'IA choisit la mauvaise fiche ? »
> On voit tout de suite le titre de la fiche et sa source. Quand plusieurs fiches conviennent, l'assistant pose une question de précision. Mesuré le 14 octobre : la bonne fiche 30 fois sur 30 avec l'IA. Et même sans IA, la recherche par mots met la bonne fiche dans les 3 premières pour 68 questions sur 68.

### 7. « Pourquoi un site et pas une application ? »
> C'est un site qui s'installe sur l'écran d'accueil comme une application, sans passer par un store. Un seul code pour iPhone et Android, il est léger, et il marche hors connexion.

### 8. « Et après le hackathon ? »
> Je continue, oui. D'abord des fiches en plus, avec la communauté : cinq attendent déjà des volontaires sur GitHub. Ensuite une voix wolof, dès qu'une voix fiable existe. Le projet est ouvert : chacun peut l'installer, l'améliorer, ou ajouter la démarche qu'il connaît.

---

## 6. La veille et le jour J

La veille :

- [ ] Répète une fois en entier, avec un chronomètre : vise 8 min 30, jamais plus de 9 minutes.
- [ ] Télécharge le diaporama en PDF et en PowerPoint.
- [ ] Copie sur une clé USB : l'ouverture, le film complet, la démo commentée et le PDF du diaporama.
- [ ] Essaie QuickTime avec ton téléphone branché au Mac, aussi en mode avion.

Le jour J :

- [ ] Sur place au plus tard à 14 h : tu passes en premier, à 14 h 30. Ordinateur chargé et son chargeur.
- [ ] Téléphone chargé, luminosité au maximum, mode « Ne pas déranger » activé.
- [ ] Le diaporama est privé : connecte-toi à ton compte Claude sur le Mac avant de partir, et garde le PDF en secours.
- [ ] Entre 12 h et 14 h : ouvre l'application une fois avec internet (le mode hors connexion se prépare) et pose une fois les questions de la démo. Les réponses restent 6 heures en mémoire et reviendront plus vite à 14 h 30.
- [ ] Câble du téléphone, et adaptateur HDMI ou USB-C pour le Mac.
- [ ] Partage de connexion 4G prêt : ne dépends pas du Wi-Fi de la salle.
- [ ] Son du vidéoprojecteur testé : l'ouverture a de la musique.
- [ ] Avant de monter : le diaporama sur la diapo 1, l'ouverture prête dans QuickTime, la fenêtre du téléphone prête derrière.
- [ ] Après le check-in : soumets le projet sur MLH (section Challenges), avec le lien donné sur place.
