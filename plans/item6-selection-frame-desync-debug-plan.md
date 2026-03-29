# Item 6 Selection Frame Desync Debug Plan

## Scope

- Diagnostiquer la desynchronisation du cadre de selection sur scene 1 / item 6.
- Isoler si l'ecart vient de `EditTransform` (activation/mode/token) ou du runtime position-editor (mesure frame vs DOM rect).

## Checklist

- [x] Ajouter une trace ciblee sur l'etat `EditTransform` (mode, active cue/action, activation overlay, sync token).
- [x] Ajouter une trace ciblee dans `useTransformRuntime` (frame calculee vs rect DOM element).
- [x] Ajouter une trace ciblee dans `usePositionRuntime` (frame calculee vs rect DOM element).
- [x] Reproduire scene 1 / item 6 et collecter `window.__eddyReadDebugTrace()` filtre sur `selection-frame`.
- [x] Identifier cause racine et patch minimal.
- [x] Retirer les traces temporaires apres validation.

## Verification

- [x] Typecheck.
