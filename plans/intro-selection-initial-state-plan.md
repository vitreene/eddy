# Plan d'action — Selection intro et visibilite

## Objectif

Garantir qu'en selectionnant `intro`, le seek respecte les regles de visibilite et affiche un etat effectivement visible.

## Etapes

- [x] Verifier le calcul de cue pour `intro` dans la selection d'event.
- [x] Corriger pour respecter la fenetre visible sur `intro`.
- [x] Ajouter une non-regression smoke.
- [x] Executer les tests cibles.

## Resultats

- Ajustement final: retour au comportement de visibilite pour `intro` (`intro.start + duration`, avec clamp sur fenetre visible).
- La logique de clamp reste active pour les custom-events afin d'eviter les seeks hors fenetre visible.
- Non-regression: `tests/custom-event-selection-cue-smoke.ts` verifie que `intro` et custom sont tous deux clamps sur `window.startSec` quand necessaire.
- Verification executee: `npx tsx tests/custom-event-selection-cue-smoke.ts`, `npx tsx tests/keyframe-coherence-smoke.ts`, `npx tsx tests/custom-event-auto-smoke.ts`.
