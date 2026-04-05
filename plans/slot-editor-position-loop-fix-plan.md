# Plan — SlotEditor position loop fix

## Contexte

- Repro utilisateur: en changeant la position via SlotEditor (custom-event/item cible), une boucle infinie de mises a jour se declenche.

## Cause racine

- `onTransformModeChange` en mode `position` pouvait re-emettre un `onDecorUpdate` semantiquement identique (no-op patch), en particulier avec une classe zone (`ed-zone-*`) sans `area`.
- `onDecorUpdate` relayait toujours le patch vers la machine meme sans difference effective.
- Cela recreait le controller, relancait l'effet et refermait la boucle.

## Fix

- [x] `item-edit.transform-controller`: ne normaliser vers `spanClass` que si un vrai changement existe (`shouldApplySpanClass`).
- [x] `item-edit/index`: filtrer les patchs decor en no-op (className/area) avant emission `decor-patch-requested`.
- [x] Sanitizer de classes zones: si `ed-zone-*` est present, retirer les tokens placement legacy concurrents (`cell-span`, `cell-r`, `cell_layout_auto`, `liste-r`).
- [x] Verification typecheck + smokes.

## Review

- Plus d'emission de patch decor no-op depuis le cycle `position`.
- Le flux SlotEditor reste compatible zones `ed-zone-*` sans re-normalisation agressive.
- La selection de zone n'embarque plus de `cell-span-*` orphelin dans le decor cible.
