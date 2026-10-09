# Contribuer à Démarche-Bi

Merci d'aider ! La contribution la plus utile : des fiches **exactes, sourcées et à jour**.

## Ajouter ou corriger une fiche

1. Fais un fork, clone-le, puis `npm install`.
2. Copie `content/demarches/_modele.md` vers `content/demarches/<slug>.md`. Le nom du fichier doit être identique au champ `slug` (minuscules, chiffres et tirets).
3. Remplis chaque champ à partir de **sources officielles**. Mets `null` pour une information que tu ne peux pas confirmer (coût, délai, lieu) : un `null` honnête vaut mieux qu'une information approximative.
4. Laisse `statut: brouillon` tant que personne n'a relu chaque information sur la source. Passe à `verifie`, avec `verifie_le` et `verifie_par` (ton pseudo GitHub), seulement si tu as vérifié toi-même.
5. Lance `npm run validate:fiches` et corrige les erreurs affichées.
6. Ouvre une pull request (un modèle est proposé).

## Règles de contenu

- Sources officielles uniquement (administrations, portails publics, textes officiels), avec URL et date de consultation.
- Reformule avec tes mots, ne recopie pas de longs passages.
- Entoure de guillemets `"..."` tout texte de l'en-tête qui contient « : », sinon le fichier est illisible.
- Pas d'opinion ni d'astuce non officielle : le texte libre sert à des précisions tirées des sources.
- Aucune donnée personnelle : pas de nom, de numéro de téléphone ou de contact privé.
- Seules les fiches `verifie` répondent aux utilisateurs en production.

## Signaler une erreur ou une fiche périmée

Ouvre une issue « Fiche obsolète ou erronée » avec le lien de la source à jour.

## Contribuer au code

- Lis `GEMINI.md` (règles du projet) et `docs/ARCHITECTURE.md`.
- Avant ta PR : `npm run lint`, `npm run validate:fiches` et `npm run build`.
- Aucun secret dans le dépôt. Aucune donnée personnelle dans les journaux.
- L'assistant ne doit jamais répondre au-delà des fiches : toute modification de la partie IA garde les garde-fous.

## Licence

En contribuant, tu acceptes que ta contribution soit publiée sous la licence MIT du projet.
