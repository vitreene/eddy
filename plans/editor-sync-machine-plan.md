# Plan d'action — Editor sync machine

## Objectif

Orchestrer explicitement l'ordre des mises a jour entre edit, vue player (seek) et cadre de selection via une machine dediee placee au niveau du resolver d'etat visuel edit.

## Etapes

- [x] Introduire une machine `editor-sync` avec pipeline `resolve -> seek -> project -> publish`.
- [x] Brancher `EditItem` sur cette machine sans deplacer la logique metier hors fonctions/classes.
- [x] Corriger la resolution de selection `intro/outro` sans cue explicite (fallback auto).
- [x] Ajouter un smoke test de fallback auto intro/outro.
- [x] Executer les tests cibles.

## Resultats

- Nouveau module: `app/parts/item-edit/editor-sync.machine.ts`.
- `EditItem` envoie des `sync.request` et consomme `projectedSyncKey` publie par la machine.
- Ordre garanti par etats de machine: seek (si necessaire) -> projection DOM -> sync cadre.
- Le seek est force au changement de selection d'event (signature `event+cue`) pour eviter les no-op percus sur intro/outro.
- La projection DOM est executee pour tout event selectionne (pas uniquement custom).
- Fallback selection event auto:
  - intro sans anchor: `window.startSec`
  - outro sans anchor: `window.endSec`
- Non-regression: `tests/event-selection-auto-fallback-smoke.ts`.
- Verification executee: `tests/event-selection-auto-fallback-smoke.ts`, `tests/custom-event-preflip-selection-smoke.ts`, `tests/transform-editor-smoke.ts`, `tests/item-edit-live-smoke.ts`, `tests/editable-visual-state-smoke.ts`.
