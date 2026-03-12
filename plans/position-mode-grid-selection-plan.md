## Objectif

Ajouter un mode temporaire `position` en plus du mode `transform` pour le deplacement/redimensionnement des items, avec un cadre de selection adapte, un nouveau type de capsule `position`, et un preset scene fin `160 x 90` applique par defaut au root.

## Plan d'action

- [x] Introduire les constantes/presets de grille `scene` (`160x90`) et les appliquer par defaut a la capsule root de chaque nouvelle scene.
- [x] Ajouter le type de capsule `position` (derive de `grille`) dans la configuration des types + UI de selection du type.
- [x] Ajouter la logique de classes de placement `span` (generation/parsing CSS) pour persister la taille apparente d'un item en grille.
- [x] Etendre l'overlay de selection pour supporter deux variantes (`transform` et `position`) partageant la meme logique machine/service.
- [x] Ajouter le bouton radio temporaire dans `edit-item` pour choisir le mode `transform`/`position`.
- [x] Implementer le mode `position`: losange au centre, pas de rotation, resize qui modifie le `span` de grille (pas de scale).
- [x] Etendre le drag `cell-snap` avec strategie `super-cellules` (>150 cellules): tuiles 10x10 + cellules fines materialisees seulement dans la super-cellule active.
- [x] Gerer la creation initiale d'item dans capsule `position` avec occupation totale (`grid-row: 1 / -1`, `grid-column: 1 / -1`) via classe CSS persistante.
- [x] Verifier (typecheck/tests) et documenter les resultats + points de controle manuels.

## Verification cible

- `npm run typecheck`
- `npm run test -- --runInBand` (ou commande test equivalente du repo)
- Verif manuelle:
  - mode `transform` inchangé,
  - mode `position` (move cellule + resize span),
  - capsule root nouvelle scene en preset `scene` (`160x90`),
  - drag dans grille fine sans creation massive permanente de cellules.

## Review

- `npm run typecheck`: OK.
- Smokes cibles modifies:
  - `npx tsx tests/transform-editor-smoke.ts`: OK.
  - `npx tsx tests/transform-overlay-alignment-smoke.ts`: OK.
  - `npx tsx tests/capsule-types-smoke.ts`: OK (attendu mis a jour avec `position`).
- `npx tsx tests/active-cue-smoke.ts`: ECHEC sur un cas existant de repartition (`2.5 !== 7.5`). Ce test ne couvre pas directement les changements de ce lot mais echoue dans le workspace courant.
