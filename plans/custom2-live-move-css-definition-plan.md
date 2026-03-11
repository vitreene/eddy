# Plan d'action — Custom2 live move immediate

## Objectif

Corriger le cas ou un changement de position (`area`) sur un custom-event est persiste mais non visible immediatement sans reload.

## Etapes

- [x] Verifier la chaine live: patch class applique, mais definition CSS de la nouvelle area absente.
- [x] Ajouter une injection live de definition CSS pour `cell-rX-cY` lors des updates area.
- [x] Brancher cette injection sur les changements area et sur le lock auto-placement.
- [x] Ajouter une non-regression smoke.
- [x] Executer les tests cibles.

## Resultats

- Cause racine: classe area bien ajoutee au node, mais regle CSS non presente avant rebuild scene/reload.
- Correctif: `ensureLiveAreaClassDefinition(...)` dans `app/parts/item-edit/live-node-classes.ts`.
- Integration: appels depuis `app/parts/item-edit/index.tsx` sur `areaChanged` et `lockPatch.area`.
- Non-regression: `tests/item-edit-live-smoke.ts` verifie l'injection du style `.cell-rX-cY{...}`.
- Verification executee: `npx tsx tests/item-edit-live-smoke.ts`, `npx tsx tests/auto-placement-lock-smoke.ts`, `npx tsx tests/custom-events-smoke.ts`.
