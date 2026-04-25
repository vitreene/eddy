# Plan — Scene10 item104 debug before/after edition

## Objectif

Passer en mode debug pour tracer la chaine complete avant/apres edition position (drag -> commit -> patch decor -> resync frame) sur le cas `scene 10 / item 104`.

## Checklist

- [x] Ajouter des logs "before commit" et "after commit" dans le service de drag position.
- [x] Ajouter des logs runtime machine autour de `props.sync`, `drag.start` et cycle de resync post-commit.
- [x] Ajouter des logs controleur item-edit au moment du commit position et des patchs decor emis.
- [x] Ajouter logs overlay frame pour comparer frame calculee vs rect DOM.
- [x] Verifier typecheck + smokes.

## Review

- Logs de debug ajoutes dans `position-editor.service.ts` avec snapshots DOM avant commit + 8 frames apres commit.
- Logs de debug ajoutes dans `position-editor.machine.ts` pour `props.sync`, `drag.start`, `resync.start/frame/end`.
- Logs de debug ajoutes dans `item-edit.transform-controller.ts` pour visualiser les patchs emits (`className`, `area`) et l'etat DOM associe.
- Logs de debug ajoutes dans `visual-transform-grid.tsx` pour la frame overlay (`w/h/matrix`) et le rect element.
- Scope debug: actif par defaut pour `item__104`; activable globalement via `window.__EDDY_POSITION_DEBUG__ = true` ou ciblable via `window.__EDDY_POSITION_DEBUG_ITEM__`.
- Correction du scope: pour ce cas, le node actif est une capsule (`content.type = capsule`, node id `capsule__34`) et pas `item__104`; le filtrage debug inclut maintenant aussi `capsule__34`.
- `syncToken` est publie dans `window.__EDDY_POSITION_DEBUG_TOKEN__` depuis `EditTransform` pour corréler les logs commit/frame.
- Analyse des logs: le commit et le patch decor sont bien executes, puis resync machine tourne (`frame.1..8`). Le point fragile restant est le remplacement potentiel du node actif apres flush player.
- Ajustement applique: `usePositionRuntime` resynchronise desormais sur tout changement de props (`[send, props]`) au lieu de `syncToken` seul, pour ne pas rater un changement de `element` sans nouveau token.
- Le remount force par `key=position-${syncToken}` a ete retire pour eviter de figer une instance sur un node intermediaire juste avant swap DOM.
- Logs enrichis avec `isConnected` et deltas frame-vs-rect (`dx/dy/dw/dh`) pour confirmer si le frame reste accroche a un node stale.
- Observation decisive (payload utilisateur): `dx/dy = 0` et `isConnected = true`, mais `dw/dh` negatif (~0.43/0.31) => frame bien ancre, taille legerement sous-estimee.
- Correctif applique: `buildPositionFrame` n'utilise plus `offsetWidth/offsetHeight` (arrondis entiers) pour le rendu nominal; la taille overlay est maintenant derivee de `getBoundingClientRect()` hors preview drag.
- Verification:
  - `npm run typecheck` ✅
  - `npx tsx tests/transform-editor-smoke.ts` ✅
  - `npx tsx tests/transform-overlay-alignment-smoke.ts` ✅
  - `npx tsx tests/auto-placement-lock-smoke.ts` ✅
