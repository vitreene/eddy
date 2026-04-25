# Plan — Scene 10 item 104 position frame sync remonté au parent

## Objectif

Corriger la desynchronisation du cadre de selection en mode `position` (scene 10, item 104) en reduisant la fragilite du `useEffect` de `usePositionRuntime` et en pilotant explicitement la resync depuis le parent.

## Checklist

- [x] Simplifier le trigger `props.sync` de `usePositionRuntime` pour eviter la liste de dependances manuelle incomplete.
- [x] Remonter le controle de resync au parent `EditTransform` (remount/signal explicite sur `syncToken`).
- [x] Verifier typecheck + smokes position/transform.
- [x] Documenter le resultat dans la section Review.

## Review

- `usePositionRuntime` n'utilise plus une longue liste de dependances pour `props.sync`; la sync est desormais pilotee par `syncToken` uniquement.
- Le parent `EditTransform` force un remount du composant position (`key=position-${syncToken}`), ce qui garantit un recalcul machine/frame sur chaque cycle de sync editeur.
- Ce schema respecte la demande: pilotage de la synchronisation remonte au parent, au lieu d'un couplage implicite a des dependances React detaillees dans `usePositionRuntime`.
- Verification:
  - `npm run typecheck` ✅
  - `npx tsx tests/transform-editor-smoke.ts` ✅
  - `npx tsx tests/transform-overlay-alignment-smoke.ts` ✅
  - `npx tsx tests/auto-placement-lock-smoke.ts` ✅
