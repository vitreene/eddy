# Plan d'action — Item55 sync edit vs DOM

## Objectif

Supprimer le decalage entre la position affichee dans l'editeur et la position visible dans le DOM au keyframe d'un custom-event. L'edit reste la source de verite.

## Etapes

- [x] Verifier la cause racine sur selection custom (etat timeline vs etat edit).
- [x] Appliquer une synchronisation live explicite de `area` depuis l'etat edit vers le DOM quand un custom est selectionne.
- [x] Garder la logique de patch area unifiee (suppression des tokens auto conflictuels).
- [x] Executer les tests cibles.

## Resultats

- Cause racine: la selection custom pouvait afficher un instant timeline qui ne reflechissait pas encore la `area` de l'event edite.
- Correctif: synchronisation live de `decor.area` vers le node DOM quand un custom-event est selectionne (`useEffect` dans `item-edit/index.tsx`).
- Le patch area passe par `applyAreaClassPatch(...)`, qui nettoie les tokens auto conflictuels avant d'appliquer l'area explicite.
- Verification executee: `npx tsx tests/item-edit-live-smoke.ts`, `npx tsx tests/custom-event-preflip-selection-smoke.ts`, `npx tsx tests/event-selection-scene1-smoke.ts`.
