# Plan d'action — **MAIN** root-scene + ed-grid CSS

## Objectif

Faire en sorte que `root-scene` ne porte que `display:grid`, et garantir que la classe `ed-grid-w160-h90` de `__MAIN__` genere bien sa definition CSS.

## Plan detaille

- [x] **1. Simplifier la classe root-scene**
  - Reduire le style de `.root-scene` a `display:grid`.
  - Aligner la constante runtime associee.

- [x] **2. Corriger la generation CSS des classes grille**
  - Corriger `buildGridDefinitions` pour lire tous les tokens de `capsule.grid`.
  - Generer la definition de toute classe `ed-grid-wX-hY` presente, pas seulement le 1er token.

- [x] **3. Verification ciblee**
  - Verifier compilation des modules modifies.
  - Fournir explication racine + correctif.

## Review

- Resultat: `.root-scene` est reduite a `display:grid`.
- Resultat: `ed-grid-w160-h90` est maintenant bien generee meme quand `capsule.grid` contient plusieurs classes (`root-scene ed-grid-w160-h90`).
- Cause racine: la generation CSS ne lisait que le premier token de `capsule.grid`; avec `root-scene` en premier, la classe `ed-grid-w160-h90` etait ignoree.
- Correctif: parcours de tous les tokens de `capsule.grid` + traitement special de `root-scene`.
- Verification: compilation TS des modules modifies + verification runtime de `buildPlacementCss(...).gridDefinitions`.
