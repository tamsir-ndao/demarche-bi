# Prompts et schémas IA — Jënd-Jaay

Tout appel modèle passe par `src/lib/ai/`. Chaque sortie est validée par un schéma Zod avant usage. À compléter et tester au fil du développement.

## 1. Extraction de la demande (`parse-request`)

**Entrée** : texte libre ou transcription vocale, en français avec parfois du wolof.

**Prompt système (brouillon)** :

```
Tu es un assistant d'achats alimentaires au Sénégal. À partir de la demande de l'acheteur,
extrais les produits, quantités, unités, lieu de livraison et délai.
Réponds uniquement avec un JSON valide, sans texte autour.
Si une information est absente, mets null. N'invente rien.
Les quantités sont des nombres. Les noms de produits sont au singulier, en français, sans accent superflu.
Date du jour : {{today}}. Convertis « demain », « vendredi », etc. en date ISO.
```

**Schéma de sortie** :

```json
{
  "items": [
    { "product": "oignon", "quantity": 50, "unit": "kg" }
  ],
  "delivery_city": "Thiès",
  "needed_by": "2026-10-08",
  "budget_fcfa": null,
  "confidence": 0.9,
  "needs_clarification": []
}
```

**Exemples de test** :

| Entrée | Attendu |
|---|---|
| « 50 kg d'oignons et 20 kg de pommes de terre pour demain à Thiès » | 2 items, ville Thiès, date J+1 |
| « Je veux du thiof, 10 kilos, vendredi, Mbour » | 1 item, unité kg, ville Mbour |
| « Des tomates pour mon restaurant » | quantité null, `needs_clarification` rempli |

**Repli** : si le JSON est invalide, une nouvelle tentative, puis formulaire de saisie manuelle.

## 2. Transcription vocale (`transcribe`)

Whisper via API compatible. Langue : `fr`. La transcription est affichée et modifiable avant l'extraction.

## 3. Comparaison des offres (`compare-offers`)

**Entrée** : la demande structurée et la liste des offres (fournisseur, total FCFA, date de livraison, note, score de matching).

**Prompt système (brouillon)** :

```
Tu aides un acheteur à choisir entre plusieurs offres de fournisseurs au Sénégal.
Compare le prix total, la date de livraison et la fiabilité (score de matching).
Recommande UNE offre et justifie en 2 phrases maximum, avec les écarts chiffrés en FCFA ou en pourcentage.
Utilise uniquement les données fournies. Réponds en français, ton simple.
```

**Schéma de sortie** :

```json
{
  "recommended_offer_id": "uuid",
  "reason": "Le fournisseur B est 8 % moins cher et livre à la date demandée.",
  "tradeoffs": ["A livre un jour plus tôt mais coûte 4 500 FCFA de plus."]
}
```

## 4. Catalogue depuis une photo ou un message (bonus)

Entrée : photo d'un étal ou message libre du fournisseur. Sortie : liste de produits `{ name, category, unit, unit_price_fcfa }`. Toujours confirmée par le fournisseur avant enregistrement.

## Modèles déclarés (à synchroniser avec le README)

| Usage | Modèle / outil |
|---|---|
| Extraction et comparaison | Modèle open-weight (Llama ou Qwen) via API compatible OpenAI |
| Transcription | Whisper |
| Aide au développement | Claude (Anthropic), Antigravity |
