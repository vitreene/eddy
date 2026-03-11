# Plan d'action — Overlay scroll + reset transform

## Objectif

- Corriger le cadre de selection pour qu'il reste colle a l'item si la page scrolle.
- Ajouter un bouton `Reset transform` qui remet les proprietes de transform aux valeurs par defaut sur l'event selectionne.

## Etapes

- [x] Stabiliser la mise a jour du frame overlay sur scroll/resize/resizeObserver.
- [x] Introduire une API de reset transform explicite (payload centralise).
- [x] Connecter un bouton UI `Reset transform` au workflow item-edit.
- [x] Ajouter des non-regressions smoke cibles.
- [x] Executer les tests cibles, incluant verification scene 1 item 39 et 53.

## Review

- [x] Le frame overlay suit l'item apres scroll de page.
- [x] Le reset transform cible uniquement les cles de transform.
- [x] Le reset agit sur l'event actif (custom) ou l'item de base (intro/outro).

## Resultats

- Overlay: `ItemTransformEditor` ecoute `scroll` + `resize` + `ResizeObserver` et emet `bump`; `frame` depend de `nonce`, ce qui recale le cadre sans changer les regles de geometrie.
- Reset transform: ajout d'un payload canonique `TRANSFORM_RESET_STYLE` via `buildResetTransformStyle()`.
- UI: bouton `Reset transform` ajoute dans `app/parts/item-edit/edit-transform.tsx`, branche sur `onStyleChange` dans `app/parts/item-edit/index.tsx`.
- Verification executee: `tests/item-reset-transform-smoke.ts`, `tests/transform-overlay-alignment-smoke.ts`, `tests/event-selection-scene1-smoke.ts`, `tests/item-edit-live-smoke.ts`.
