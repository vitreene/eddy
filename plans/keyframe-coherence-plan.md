# Plan d'action — Cohérence keyframe

## Objectif

Verifier et verrouiller la coherence du modele keyframe sur les custom-events: interpolation de style entre keyframes, et application de l'etat statique au temps du keyframe.

## Etapes

- [x] Formaliser les invariants keyframe (timing + repartition des donnees).
- [x] Ajouter un smoke test dedie couvrant style/class/area/move sur deux custom-events.
- [x] Integrer le test a la suite smoke.
- [x] Executer les smoke tests cibles.
- [x] Etendre le controle au runtime de progression (`curr -> next`) pour garantir l'atteinte de la destination avant le keyframe suivant.

## Review

- [x] `__tween` est present au temps precedent (pas au temps du keyframe cible).
- [x] l'action keyframe est presente au temps exact du cue custom.
- [x] `style` est dans `__tween`, `className/move` dans keyframe.

## Resultats

- Invariants verifies:
  - custom-event = keyframe d'etat au temps du cue
  - interpolation = action `__tween` sur la fenetre precedente
  - etat statique (slot/class/move) = action keyframe au temps du cue
- Nouveau test: `tests/keyframe-coherence-smoke.ts`.
- Nouveau test runtime: `tests/on-update-keyframe-window-smoke.ts` (progression et fenetre de transition).
- Integration: ajoute a `npm run test:smoke`.
- Verification executee: `npx tsx tests/keyframe-coherence-smoke.ts`, `npx tsx tests/on-update-keyframe-window-smoke.ts`, `npx tsx tests/builder-slot-style-smoke.ts`, `npx tsx tests/custom-event-auto-smoke.ts`, `npx tsx tests/static-changes-move-priority-smoke.ts`.
