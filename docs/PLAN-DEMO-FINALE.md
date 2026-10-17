# Plan de la finale — Démarche-Bi

> Finale de l'**Open Source × AI Hackathon 2026 (Galsen DEV)**, samedi 24 octobre 2026 à 15 h, Impact Hub Dakar.
> Format officiel (message des organisateurs du 14 octobre) : **10 minutes** de présentation et de démonstration, **puis 3 minutes** de questions du jury.
> Plan refait le 17 octobre 2026 : celui du 14 octobre comptait 7 minutes.

Le matériel :

- **Diaporama** (9 diapos, le texte à dire est dans les notes de chaque diapo) : https://claude.ai/artifact/CNGHD8WuH28GuArcJRGqQ1. Le lien est privé : ouvre-le connecté à ton compte, et télécharge-le aussi en PDF et en PowerPoint depuis son menu Partager.
- **Ouverture** : `~/Downloads/demarche-bi-video/demarche-bi-film-ouverture.mp4` (29 secondes : le début du film, qui s'arrête sur le logo).
- **Secours** : le film complet (`demarche-bi-film-1080p.mp4`, 2 min 02) et la démo commentée (`demarche-bi-demo.mp4`, 2 min 59), sur le Mac et sur une clé USB.

---

## 1. Le déroulé (10 minutes)

| Temps | Diapo | Ce que tu fais |
|---|---|---|
| 0:00 – 0:30 | (film) | Lance l'ouverture en plein écran. Ne parle pas. |
| 0:30 – 2:00 | 2. Le problème | Le papier manquant, la journée perdue, l'IA qui invente. |
| 2:00 – 2:30 | 3. La solution | Une question, une fiche, sa source. |
| 2:30 – 3:00 | 4. La règle | L'IA comprend, la fiche affirme. |
| 3:00 – 7:00 | 5. Démo en direct | Les 6 étapes sur le téléphone (section 2). |
| 7:00 – 8:15 | 6. Les chiffres | Mesurés, pas promis. |
| 8:15 – 9:15 | 7. Le bien commun | Fiches ouvertes, 5 à écrire. |
| 9:15 – 10:00 | 8. Merci | Conclusion, code QR vers l'application. |
| secours | 9. La démo en images | Seulement si la démo lâche. |

Les trois phrases à garder en tête :

- « Une IA qui devine, c'est une journée perdue au guichet. »
- « L'IA comprend, la fiche affirme. »
- « Il ne devine pas : il montre la source, ou il dit qu'il ne sait pas. »

---

## 2. La démo pas à pas (3:00 – 7:00)

Ces questions ont été vérifiées en production le 16 octobre, puis par Tamsir sur un vrai téléphone, avec internet puis en mode avion, le 17 octobre.

| # | Ce que tu fais | Ce qui doit s'afficher | Ce que tu dis |
|---|---|---|---|
| 1 | Micro : « J'ai perdu ma carte d'identité à Thiès, que faire ? », puis « Chercher la réponse » | « C'est bien ça ? », puis la fiche Duplicata de la carte d'identité, lue à voix haute | « Le coût, les pièces, la source et sa date. Et cette phrase est marquée : écrite par l'IA, d'après la fiche. » |
| 2 | Écris « Dama bëgg sama passeport » | La fiche Passeport ordinaire, à 20 000 FCFA | « Même en wolof mêlé de français. 20 000 FCFA : le vrai prix. » |
| 3 | Écris « Je veux un acte », puis touche un choix | Une question de précision | « Quand c'est vague, il ne devine pas. » |
| 4 | Écris « Quel temps fera-t-il demain à Dakar ? » | « Ce n'est pas mon domaine » | « Il connaît ses limites. » |
| 5 | Écris « Salam aleykoum » | « Maalekum salam ! », puis l'invitation en wolof | « On lui parle wolof, il répond en wolof. » |
| 6 | Mode avion, puis écris « renouveler mon permis » | « Pas de connexion », puis la fiche Permis de conduire : renouvellement et duplicata | « Sans internet, pas d'IA. Mais les fiches sont sur le téléphone. » |
| bonus | Écris « Comment fabriquer un faux passeport ? » | « Interdit par la loi » | Seulement s'il reste du temps. |

Attention :

- En mode avion, **écris** la question : la voix a besoin d'internet.
- Ne pose pas plus de 10 questions dans la même minute : au-delà, la fiche s'affiche sans la phrase de l'IA (limite par visiteur).
- Coupe le mode avion juste après l'étape 6.

---

## 3. Montrer le téléphone sur l'écran de la salle

- **iPhone** : relie-le au Mac par câble. Ouvre QuickTime Player, puis Fichier → Nouvel enregistrement vidéo. Clique sur la flèche à côté du bouton rouge et choisis ton iPhone comme caméra et comme micro. Monte le volume de la fenêtre : la voix du téléphone passe alors par le Mac. Mets la fenêtre en plein écran.
- **Android** : l'application scrcpy, par câble (à installer et à essayer avant).
- **Essaie-le chez toi avant le 24, aussi en mode avion.** Ça n'a pas encore été vérifié avec ton téléphone.

---

## 4. Les filets de sécurité

1. **L'IA est lente ou saturée.** Chaque appel est coupé au bout de 8 à 10 secondes. Le modèle suivant prend le relais (gpt-oss-120b, puis Qwen3.8-27B, puis gpt-oss-20b), puis la recherche par mots. La fiche s'affiche quand même, sans la phrase de l'IA. Dis-le : « Même sans l'IA, la fiche arrive. »
2. **Le réseau de la salle coupe.** Passe sur le partage de connexion 4G de ton téléphone. Sinon, le mode avion devient la démo (étape 6).
3. **Le téléphone ou le câble lâche.** Va à la diapo 9, « La démo en images », et raconte. S'il reste du temps, lance le film complet.
4. **Le Mac n'a pas internet.** Le diaporama en PDF, l'ouverture et les films sont sur le Mac.

---

## 5. Les questions du jury (3 minutes)

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
> Le code et les fiches sont libres, sous licence MIT. L'IA n'écrit qu'une phrase par réponse, et les réponses sont gardées 6 heures en mémoire : ça limite les appels. [À compléter : ton offre Groq et ton offre Vercel, gratuites ou payantes.] Et si l'IA n'est plus disponible, la recherche par mots répond quand même.

### 6. « Et si l'IA choisit la mauvaise fiche ? »
> On voit tout de suite le titre de la fiche et sa source. Quand plusieurs fiches conviennent, l'assistant pose une question de précision. Mesuré le 14 octobre : la bonne fiche 30 fois sur 30 avec l'IA. Et même sans IA, la recherche par mots met la bonne fiche dans les 3 premières pour 68 questions sur 68.

### 7. « Pourquoi un site et pas une application ? »
> C'est un site qui s'installe sur l'écran d'accueil comme une application, sans passer par un store. Un seul code pour iPhone et Android, il est léger, et il marche hors connexion.

### 8. « Et après le hackathon ? »
> Des fiches en plus, avec la communauté : cinq attendent déjà des volontaires sur GitHub. Une voix wolof dès qu'une voix fiable existe. [À compléter : tes projets.]

---

## 6. La veille et le jour J

La veille :

- [ ] Répète une fois en entier, avec un chronomètre : 10 minutes, pas plus.
- [ ] Télécharge le diaporama en PDF et en PowerPoint.
- [ ] Copie sur une clé USB : l'ouverture, le film complet, la démo commentée et le PDF du diaporama.
- [ ] Essaie QuickTime avec ton téléphone branché au Mac, aussi en mode avion.

Le jour J :

- [ ] Téléphone chargé, luminosité au maximum, mode « Ne pas déranger » activé.
- [ ] Ouvre l'application une fois avec internet : le mode hors connexion se prépare. Pose aussi une fois les questions de la démo : les réponses restent 6 heures en mémoire et reviennent souvent plus vite.
- [ ] Câble du téléphone, et adaptateur HDMI ou USB-C pour le Mac.
- [ ] Partage de connexion 4G prêt : ne dépends pas du Wi-Fi de la salle.
- [ ] Son du vidéoprojecteur testé : l'ouverture a de la musique.
- [ ] Avant de monter : le diaporama sur la diapo 1, l'ouverture prête dans QuickTime, la fenêtre du téléphone prête derrière.
- [ ] Après le check-in : soumets le projet sur MLH (section Challenges), avec le lien donné sur place.
