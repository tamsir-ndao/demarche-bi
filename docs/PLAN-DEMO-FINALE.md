# Plan de Démonstration & Finale — Démarche-Bi

> Guide opérationnel pour la présentation et la démonstration en direct lors de la finale de l'**Open Source × AI Hackathon 2026 (Galsen DEV)** à l'Impact Hub Dakar (Samedi 24 octobre 2026 à 15 h).
> Format officiel : **10 minutes** (7 minutes de présentation & démo + 3 minutes de questions/réponses).

---

## 1. Découpage minuté du pitch (7 minutes)

| Temps | Partie | Ce que tu dis / Ce que tu montres |
|---|---|---|
| **0:00 - 1:15** | **L'accroche & Le problème** | *« Au Sénégal, qui n'a jamais perdu une journée entière devant un commissariat ou un tribunal parce qu'il manquait un timbre fiscal à 10 000 FCFA ou un extrait de naissance ? L'information existe, mais elle est dispersée. Et si vous demandez à un LLM classique (ChatGPT, etc.), il invente des démarches et des lois imaginaires avec aplomb. »* |
| **1:15 - 2:00** | **Notre réponse : Démarche-Bi** | *« Démarche-Bi est un assistant civique transparent : zéro hallucination sur les démarches administratives. L'IA sert à comprendre le citoyen, mais chaque fait, chaque coût et chaque pièce est ancré dans une fiche vérifiée avec sa source officielle et sa date. »* |
| **2:00 - 4:15** | **La démo en direct (Scénario nominal)** | 1. **Recherche vocale** : appuyer sur le micro, poser une question en direct (ex: *« J'ai perdu ma carte d'identité à Dakar, que dois-je faire ? »*). Relire et valider.<br>2. **Anatomie de la réponse** : pointer du doigt le coût en FCFA, les pièces à fournir, les étapes, et surtout **les sources officielles et la date de vérification**.<br>3. **Inclusivité linguistique** : taper ou dicter une question en wolof/français mêlé (*« Dama bëgg sama passeport, ñaata la ? »*) → la bonne démarche apparaît immédiatement. |
| **4:15 - 5:30** | **L'effet « WOW » : Le mode hors-ligne** | *« À Dakar ou en région, la connexion coupe souvent. Regardez ce qui se passe si je coupe internet. »*<br>→ Activer le **Mode Avion** sur le téléphone en direct.<br>→ Poser une nouvelle question (ex: *« renouveler permis »*).<br>→ L'application répond instantanément grâce à son moteur de recherche déterministe local embarqué dans le Service Worker. |
| **5:30 - 6:30** | **Architecture & Bien commun Open Source** | - 100 % open source (Licence MIT).<br>- Les démarches sont de simples fichiers Markdown (`content/demarches/`) vérifiés par schéma Zod.<br>- N'importe quel citoyen ou administration peut ajouter ou corriger une démarche via Pull Request.<br>- Montrer les 5 issues GitHub ouvertes pour la communauté. |
| **6:30 - 7:00** | **Conclusion & Vision** | *« Démarche-Bi ne remplace pas l'administration, il la rend accessible à chaque Sénégalais. Zéro mensonge, 100 % transparent. Merci ! »* |

---

## 2. Les 3 filets de sécurité techniques (Gestion des imprévus)

Le Wi-Fi des événements publics est réputé instable. Démarche-Bi intègre une architecture à tolérance de panne conçue pour cela :

### Filet n°1 : Basculement automatique en cas de lenteur API
- **Problème potentiel** : Le Wi-Fi rame, l'API Groq tarde à répondre ou le quota gratuit est serré.
- **Comportement automatique** :
  - Timeout strict configuré sur les requêtes IA (10 secondes par fournisseur).
  - Trois modèles open-weight en cascade (`gpt-oss-120b` → `qwen3.8-27b` → `gpt-oss-20b`).
  - Si l'IA échoue ou tarde, le serveur bascule **automatiquement et sans planter** sur la recherche lexicale déterministe (`repliParMots`).
  - La fiche officielle s'affiche avec toutes les pièces, coûts et sources, avec une discrète mention d'assistance.

### Filet n°2 : Démonstration en mode avion (Hors connexion totale)
- **Problème potentiel** : Coupure totale du réseau Wi-Fi de la salle.
- **Procédure de démo** :
  - L'application est une PWA installée sur l'écran d'accueil du smartphone.
  - La base locale (`/hors-connexion/donnees.json`) est déjà mise en cache par le Service Worker (`public/sw.js`).
  - En tapant n'importe quelle question, le Service Worker intercepte la requête et la bascule sur `/hors-connexion?q=...` qui effectue la recherche en mémoire sur le téléphone.
  - **Avantage compétitif** : Au lieu d'avoir l'air pris au dépourvu, vous transformez la coupure réseau en point fort de votre démonstration !

### Filet n°3 : Le plan de secours ultime (Vidéo locale)
- Avoir la vidéo de démo de 3 minutes enregistrée sur une clé USB et sur le stockage interne de l'ordinateur/téléphone (lisible avec VLC, sans aucune connexion internet requise).

---

## 3. Anticipation des questions pièges du jury (3 minutes Q&A)

### Question 1 : *« Comment garantissez-vous que les informations ne deviennent pas obsolètes si une loi change ? »*
> **Réponse recommandée :**
> *« C'est précisément pour cela que chaque fiche porte une date de vérification visible (`verifie_le`) et un lien direct vers la source officielle. Contrairement à un modèle IA qui garde en mémoire des données figées de son entraînement, nos fiches sont des fichiers Markdown en clair sur GitHub. Si un tarif change demain, une simple mise à jour de fichier ou une Pull Request communautaire met à jour l'ensemble du système instantanément, avec historique traçable. »*

### Question 2 : *« Pourquoi ne pas avoir fait un simple RAG vectoriel avec embeddings et ChatGPT ? »*
> **Réponse recommandée :**
> *« Pour trois raisons fondamentales :*
> 1. *L'éthique et la fiabilité : les bases vectorielles et les LLMs génératifs peuvent encore halluciner ou combiner des morceaux de deux démarches différentes. Ici, la réponse administrative est déterministe.*
> 2. *La souveraineté et les coûts : les bases vectorielles cloud nécessitent des serveurs payants et une connexion internet permanente. Notre recherche lexicale tourne en 2 millisecondes, même hors-ligne dans un navigateur mobile sur un téléphone à 40 000 FCFA.*
> 3. *La frugalité : zéro coût d'infrastructure obligatoire, respectueux des faibles débits. »*

### Question 3 : *« Qu'en est-il de la confidentialité et des données personnelles des citoyens ? »*
> **Réponse recommandée :**
> *« Démarche-Bi applique le principe de minimisation stricte : aucun compte utilisateur, aucun mot de passe, aucun dépôt de document personnel (CNI, avis d'imposition). Même pour les questions posées, notre journal anonymisé applique un masque automatique qui supprime les numéros de téléphone, emails et identifiants avant tout enregistrement, avec purge automatique à 90 jours. »*

---

## 4. Checklist matériel pour le Jour J (24 octobre à Dakar)

- [ ] Smartphone chargé à 100 % avec l'application installée sur l'écran d'accueil (PWA).
- [ ] Avoir ouvert l'application au moins une fois avec internet avant de monter sur scène (pour initialiser le cache hors-ligne du Service Worker).
- [ ] Ordinateur portable avec adaptateur HDMI / USB-C pour le vidéoprojecteur.
- [ ] Partage de connexion 4G activé sur le téléphone (ne jamais dépendre uniquement du Wi-Fi public).
- [ ] Vidéo de démonstration de 3 minutes stockée en local sur le bureau de l'ordinateur.
