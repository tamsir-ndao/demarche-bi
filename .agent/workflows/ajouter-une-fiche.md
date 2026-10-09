---
description: Préparer une fiche de démarche à partir de sources officielles (brouillon à faire vérifier)
---

1. Demander le nom de la démarche et lire `docs/FICHES-A-PRODUIRE.md`.
2. Chercher des pages **officielles** (administration concernée, portail public). Noter l'URL et la date du jour. Si aucune source officielle claire n'existe, s'arrêter et le dire : pas de fiche.
3. Copier `content/demarches/_modele.md` vers `content/demarches/<slug>.md`.
4. Remplir chaque champ uniquement avec ce que disent les sources. Reformuler le texte, jamais les chiffres. Mettre `null` pour tout ce qui est incertain ou contradictoire.
5. Laisser `statut: brouillon`, `verifie_le: null`, `verifie_par: null`. Seul l'utilisateur, après avoir relu chaque information sur la source, passe la fiche à `verifie`.
6. Exécuter `npm run validate:fiches` et corriger.
7. Présenter à l'utilisateur la liste des informations à vérifier, avec le lien de la source pour chacune.
