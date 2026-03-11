# Plan d'action — Poignee resize: repartir de l'echelle courante

## Objectif

Corriger le redimensionnement par la poignee SE pour qu'une nouvelle manipulation parte de `scaleX/scaleY` actuels, au lieu de repartir implicitement de `1`.

## Etapes

- [x] Identifier le calcul de scale pendant `resize-se` et confirmer la cause racine.
- [x] Corriger le calcul pour appliquer le delta a partir de l'echelle initiale (`startT.scaleX/scaleY`).
- [x] Ajouter une non-regression ciblee sur le calcul de scale au redrag.
- [x] Executer les tests smoke pertinents du transform editor.

## Review

- [x] Cause racine documentee.
- [x] Correctif valide par test.
- [x] Aucun impact regressif observe sur les autres modes (`move`, `rotate`, `origin`, `cell-snap`).

## Resultats

- Cause racine: le calcul de `resize-se` normalisait la taille locale sur `width/height` sans tenir compte de `startT.scaleX/scaleY`, ce qui forcait le nouveau drag a repartir de `1`.
- Correctif: extraction d'un calcul pur `computeNextResizeScale(...)` qui part de l'echelle courante et applique le delta local relatif.
- Verification: `npx tsx tests/transform-editor-smoke.ts` passe, avec assertions ajoutees pour le cas "no delta => scale conservee" et "delta positif => scale incrementee depuis la base courante".
