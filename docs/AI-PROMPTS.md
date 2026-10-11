# Prompts et schémas IA — Démarche-Bi

Tout appel au modèle passe par `src/lib/ai/client.ts` : `chat()` (Groq avec deux modèles, ou un autre fournisseur compatible OpenAI) et `transcribe()` (Whisper). Chaque sortie du modèle suit un schéma JSON envoyé au fournisseur en mode strict (`src/lib/ai/schemas.ts`), puis Zod la relit avant tout usage ; une réponse qui ne respecte pas le schéma est refusée et le modèle suivant est essayé. Les prompts vivent dans le code (`understand.ts`, `answer.ts`) ; cette page explique pourquoi ils sont écrits ainsi.

## Le principe : le modèle ne lit pas le site et n'écrit pas les faits

```
Question
  1. Comprendre   le modèle choisit la ou les démarches dans la liste fermée des fiches
  2. Décider      le code vérifie ce choix : répondre, demander une précision ou « je ne sais pas »
  3. Répondre     le modèle écrit une introduction courte, à partir d'UNE seule fiche
  4. Vérifier     le code compare l'introduction à la fiche (garde-fous)
  5. Citer        la page montre les pièces, les étapes, les chiffres et les sources de la fiche, mot pour mot
```

Deux mesures ont fixé ce choix (11 octobre 2026, `openai/gpt-oss-120b`) :

- **Choisir dans une liste fermée plutôt que chercher par mots-clés.** Faire écrire des mots-clés au modèle puis chercher avec BM25 donnait 29 bonnes décisions sur 40 questions. Lui faire choisir une démarche dans la liste des fiches (identifiant, titre, résumé) donne 50 sur 52 questions (le jeu a depuis été élargi de 40 à 52 questions). Avec les seuls titres, sans résumé : 46 sur 52.
- **N'écrire que l'introduction.** Quand le modèle réécrit les pièces et les étapes, il perd des conditions qui comptent (quel greffe, « certificat de nationalité seulement en cas de doute », « statuts seulement pour les sociétés », voie APIX). Les listes, les montants, les délais, les lieux et les sources viennent donc de la fiche, jamais du modèle.

## 1. Comprendre (`understand.ts`)

**Entrée** : la question (donnée à analyser, jamais consigne) et, dans le message système, la liste complète des fiches : `- identifiant : titre — résumé` (résumé coupé à 170 caractères).

**Sortie** (`ComprehensionSchema`) :

| Champ | Contenu |
|---|---|
| `question_claire` | la question reformulée en français standard (le wolof et les abréviations y sont rendus) |
| `demarches` | identifiants pris dans la liste : aucun, un, ou plusieurs (3 au plus) quand la question ne permet pas de choisir |
| `besoin_precision` | vrai si la question est administrative mais trop vague |
| `question_precision` | une question courte, au tutoiement, quand `besoin_precision` est vrai ; sinon vide |

Le code ne fait pas confiance à cette sortie : un identifiant absent de la liste est écarté, les doublons aussi, au plus 3 démarches sont gardées, `question_claire` est coupée à 300 caractères et `question_precision` à 200.

Avec beaucoup de fiches, la liste grossit d'environ 50 tokens par fiche : au-delà d'une cinquantaine, il faudra présélectionner par recherche lexicale avant d'interroger le modèle.

## 2. Décider (`decide.ts`, en code)

| Ce que le modèle a compris | Ce que fait le site |
|---|---|
| une seule démarche | la fiche répond |
| plusieurs démarches | écran « Que veux-tu faire ? » : la personne choisit, la réponse vient de la fiche choisie (`?fiche=`) |
| trop vague, sans démarche à proposer | « Peux-tu préciser ta question ? », le champ garde la question |
| aucune démarche | « Je ne sais pas encore », aucune source, invitation à proposer la démarche |

## 3. Répondre (`answer.ts`)

**Entrée** : la question, sa reformulation et **une** fiche en texte simple (titre, résumé, coût, délai, lieu, pièces, étapes, notes ; sans sources ni adresses, les identifiants internes cités dans les notes sont retirés).

**Sortie** (`ReponseIASchema`) : `{ "trouve": true | false, "intro": "…" }`. `trouve` vaut faux seulement si la fiche traite d'une autre démarche ou d'un autre pays : l'introduction est alors vide et le site répond « Je ne sais pas encore ».

**Règles du prompt système** (le texte complet est dans `answer.ts`) :

1. Utiliser uniquement la fiche.
2. N'inventer aucun montant, délai, lieu, pièce, étape ni condition ; si la fiche ne donne pas l'information demandée, dire que ce n'est pas précisé dans les sources consultées.
3. Garder exactement les nombres de la fiche, et ne jamais répéter un nombre qui vient de la question.
4. Aucune adresse web, aucun numéro de téléphone, aucun identifiant technique, aucun balisage.
5. Signaler une incertitude de la fiche (« à confirmer »).
6. Dire la condition de la fiche qui change la réponse à la question posée.
7. Répondre « oui » ou « non » seulement si la fiche le dit clairement.
8. Ne pas employer de mot absolu (« seule », « toujours », « gratuit »…) que la fiche n'emploie pas.

Style : tutoiement, phrases courtes, deux phrases au plus, sans recopier les pièces et les étapes affichées juste dessous.

## 4. Vérifier (`guardrails.ts`, en code)

L'introduction n'est montrée que si elle passe tous ces contrôles :

- non vide, 450 caractères au plus ;
- aucun balisage, aucune adresse web ou e-mail, aucun identifiant interne de fiche ;
- chaque nombre (chiffres, ou écrit en lettres) figure dans la fiche, quelle que soit la façon d'écrire les milliers (« 10 000 », « 10.000 », « 10000 ») ;
- aucun mot absolu (« seul », « seulement », « uniquement », « toujours », « jamais », « aucun », « tous », « gratuit », « obligatoire »…) que la fiche n'emploie pas, à l'accord près.

Si l'introduction est refusée, le modèle reçoit la raison du refus et a une seconde chance. Si elle est refusée une seconde fois, le site montre la fiche sans introduction. Les contrôles ne remplacent pas la relecture des fiches : ils vérifient des chiffres et des mots, pas le sens.

## 5. Quand l'IA manque

| Situation | Ce que voit la personne |
|---|---|
| Pas de clé IA | La recherche par mots (`src/lib/fiches/search.ts`) choisit la fiche, sans introduction, sans message |
| IA saturée (429 sur tous les modèles : plafond de tokens par minute ou par jour atteint) ou en panne | Même chose, avec la note « L'assistant est très sollicité / ne répond pas pour l'instant » |
| Plus de 10 questions par minute et par visiteur | La fiche sans introduction, avec la note « très sollicité » (le quota gratuit est protégé) |
| Introduction refusée deux fois | La fiche sans introduction |
| Même question déjà posée (6 heures, 300 questions en mémoire) | Réponse immédiate, sans appel au modèle |

La mémoire et la limite par visiteur vivent dans l'instance du serveur : sur Vercel elles aident sans rien garantir. L'adresse du visiteur ne sert qu'à compter, elle n'est jamais enregistrée.

## 6. Voix (`transcribe`)

Whisper (Groq), langue `fr`. La transcription s'affiche et reste modifiable avant l'envoi. (À venir : étape 3.)

## Cas de comportement attendus (base du jeu d'évaluation)

| Cas | Comportement attendu |
|---|---|
| Question couverte par une fiche | La fiche répond : introduction vérifiée, pièces, étapes et sources de la fiche |
| Question qui peut viser deux fiches (« carte d'identité ») | Écran de précision, la personne choisit |
| Question vague (« je veux un papier ») | Question pour préciser |
| Question hors périmètre, ou démarche absente des fiches | « Je ne sais pas encore », aucune source, invitation à contribuer |
| Le modèle propose un identifiant de fiche qui n'existe pas | Ignoré par le code |
| Le modèle écrit un nombre, une adresse, un balisage ou un mot absolu absents de la fiche | Introduction refusée, seconde chance, sinon fiche sans introduction |
| Question en wolof ou mélangée | Reformulée en français par le modèle ; si rien n'est trouvé, refus propre |
| IA saturée, en panne ou non configurée | Voir « Quand l'IA manque » |

Le fichier `eval/questions.jsonl` contient une ligne par cas : `{ "question": "...", "famille": "couverte" | "hors_perimetre" | "vague", "langue": "fr" | "mixte" | "wo", "attendu_slug": "slug" | null, "doit_contenir": ["..."] }`. `langue` vaut `fr` par défaut (`mixte` : français et wolof mêlés ; `wo` : wolof). `attendu_slug` et `doit_contenir` ne concernent que la famille `couverte`. Les faits attendus se prennent dans les fiches, jamais de mémoire : `npm run eval` vérifie que chacun figure dans la fiche attendue.

Quand une démarche citée ici comme hors périmètre (passeport, acte de naissance, certificat de décès, légalisation) reçoit sa fiche, ses questions passent en `couverte` avec leur `attendu_slug`.

## Mesurer

| Commande | Ce qu'elle mesure |
|---|---|
| `npm run eval -- --brouillons` | La recherche seule, sans IA : c'est le repli quand l'IA manque. Gratuit, instantané. |
| `npm run eval -- --ia --brouillons` | Le parcours complet comme sur le site, avec la clé de `.env.local`. Une pause de 15 secondes entre deux questions (`--pause=30` pour l'allonger) ménage le plafond par minute ; compte une quinzaine de minutes et plus de la moitié du plafond gratuit du jour d'un modèle (200 000 tokens) : ne la lance pas plusieurs fois par jour. |

Le verdict de chaque question en mode `--ia` : une question couverte réussit quand la bonne fiche répond, et « réussit à moitié » quand l'écran de précision propose la bonne fiche ; une question hors périmètre réussit quand le site dit « je ne sais pas » ; une question vague réussit quand le site demande de préciser, « réussit à moitié » avec « je ne sais pas » (rien d'inventé, mais pas d'aide), et échoue quand il devine une démarche. Le rapport donne aussi le nombre d'introductions montrées, refusées par les garde-fous ou absentes, et prévient quand l'IA a échoué pour certaines questions (leur résultat est alors celui du repli). Les chiffres dépendent du modèle et varient d'un jour à l'autre.

### Première mesure (11 octobre 2026)

5 fiches en brouillon, 52 questions, `openai/gpt-oss-120b`, une seule passe : ces chiffres varient d'un jour à l'autre et seront refaits quand les fiches seront vérifiées.

| Famille | Résultat |
|---|---|
| Couvertes (27) | 26 avec la bonne fiche, 1 avec l'écran de précision qui propose la bonne fiche, 0 mauvaise réponse |
| Hors périmètre (15) | 15 « je ne sais pas » corrects |
| Vagues (10) | 7 questions de précision, 2 « je ne sais pas » (en wolof), 1 démarche devinée (« Je veux faire ma carte. ») |
| Introductions (27 réponses avec une fiche) | 26 acceptées par les garde-fous, 1 refusée |
| Recherche seule, sans IA (le repli) | 22 bonnes fiches sur 27 couvertes, 14 refus corrects sur 15 |

L'IA n'a échoué pour aucune des 52 questions. L'introduction refusée venait d'un mot absent de la fiche : à « C'est gratuit le casier judiciaire ? », le modèle répondait « non, ce n'est pas gratuit : 200 FCFA », exact, mais le mot « gratuit » n'est pas dans la fiche. Le code signale désormais au modèle les mots de la question qu'il ne doit pas reprendre ; ce correctif a été vérifié sur la phrase seule (« n'est pas sans frais. Il coûte 200 FCFA ») mais pas remesuré sur le parcours complet : le plafond gratuit du jour (200 000 tokens par modèle) était épuisé.

## Modèles déclarés (à garder synchronisés avec le README)

| Usage | Modèle / outil |
|---|---|
| Comprendre la question et écrire l'introduction | `openai/gpt-oss-120b` via Groq (open-weight, Apache 2.0), effort de raisonnement `low` |
| Secours | `qwen/qwen3.8-27b` via Groq, même clé, plafonds de tokens séparés (open-weight, Apache 2.0), effort de raisonnement `none` ; ou un autre fournisseur via `AI_FALLBACK_*` |
| Transcription | Whisper large v3 turbo via Groq |
| Aide au développement | Claude (Anthropic), Antigravity |
