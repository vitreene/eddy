# Rubber Cleanup Rename Plan

## Contexte

- Demande de clean-up: retirer l'ancien composant `Rubber` historique.
- Renommer les composants actifs en supprimant le suffixe `Test`.

## Checklist

- [x] Renommer `RubberProportionalTest` en `Rubber` et mettre a jour les imports/usages.
- [x] Renommer `WaveformCanvasTest` en `WaveformCanvas` et mettre a jour les imports/usages.
- [x] Supprimer l'ancien `app/parts/rubber/index.tsx` (Rubber legacy) et les fichiers devenus orphelins associes.
- [x] Verifier qu'aucune reference a `*Test`/ancien Rubber ne reste.
- [x] Valider le typecheck.

## Verification

- [x] Relecture diff des fichiers `event-edit` et `rubber`.
- [x] Validation statique: grep sans reference a `RubberProportionalTest`, `WaveformCanvasTest`, `app/parts/rubber/index`.

## Review

- Renommage effectif des composants actifs: `Rubber` (`app/parts/rubber/rubber.tsx`) et `WaveformCanvas` (`app/parts/rubber/waveform-canvas.tsx`).
- `EditEvent` importe/utilise les nouveaux chemins et noms sans suffixe `Test`.
- Suppression du Rubber legacy (`app/parts/rubber/index.tsx`) et de son helper orphelin (`app/parts/rubber/slider-left-right.tsx`).
- Typecheck OK (`npm run typecheck`).
