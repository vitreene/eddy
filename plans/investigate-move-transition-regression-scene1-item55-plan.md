## Objectif

Identifier la cause racine de la regression sur les transitions `move` (scene 1, item_55), sans workaround temporaire.

## Plan d'investigation

- [x] Reproduire le bug avec les outils/tests existants (ou un scenario manuel traceable) pour confirmer le symptome exact.
- [x] Comparer la chaine de calcul `move` avant/apres changements recents dans:
  - edition live (`item-edit`, `live-node-style`),
  - build player (`builder/styles`, `builder/entities`),
  - placement/layout (`capsule-layout/layout-css`).
- [x] Inspecter les modifications recentes liees a `rawCss`, `position/transform split`, et classes de placement pour trouver le point de rupture.
- [x] Verifier si le bug est provoque par donnees decor (`style`, `className`, `area`) ou par projection runtime (classe/style final applique).
- [x] Isoler la cause racine precise (fichier + fonction + condition) et expliquer pourquoi le comportement valide precedent est casse.
- [x] Proposer la correction structurelle (pas de patch temporaire), puis implémenter.
- [x] Verifier la correction avec typecheck + scenario cible scene1/item55.

## Verification cible

- `npm run typecheck`
- Reproduction puis validation sur scene 1 / item_55 (transition `move`).

## Review

- Symptome reproduit sur la chaine build pour `scene 1 / item__55`: action `3-018-prvenir-custom-2` ajoutait `cell-r1-c1` sans retirer `cell-span-r2-c2-rs1-cs1`, ce qui cassait la coherence de `move`.
- Cause racine: merge de decor evenement dans `app/player/builder/styles.ts:getEventDecor` utilisait `incoming.className ?? fallback.className`, donc un `className: null` ne nettoyait jamais la classe precedente.
- Le regression trigger est apparu avec les changements recents de classes de placement (suppression de fallback auto pour certains items), qui ont expose ce merge incorrect.
- Correction structurelle: respecter explicitement la presence de `className`/`area` dans le decor event (y compris `null`) via `hasOwnProperty`, au lieu de forcer le fallback.
- Validation:
  - `npm run typecheck` OK
  - nouveau smoke `tests/scene1-item55-move-smoke.ts` OK
  - ce smoke verifie que `custom-2` retire bien `cell-span-r2-c2-rs1-cs1` et garde `move: { mode: "auto" }`.
