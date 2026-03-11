# Plan d'action — Intro keyframe et offset runtime

## Objectif

Rendre coherent le modele temporel: `intro` se termine au keyframe, son declenchement runtime est anticipe de sa duree; `outro` reste au keyframe.

## Etapes

- [x] Introduire un modele de timing explicite (`keyframeMs` + `runtimeStartMs`) pour chaque event.
- [x] Rewriter le builder timeline pour mapper les markers sur `runtimeStartMs` et ordonner les custom sur `keyframeMs`.
- [x] Rewriter le builder entities pour calculer les fenetres d'interpolation custom sur la distance entre keyframes.
- [x] Aligner la selection d'event: `intro`/`outro` anchors au keyframe.
- [x] Ajouter des smoke tests de non-regression, incluant item 53.
- [x] Executer les tests cibles.

## Review

- [x] Selection `intro` pointe la fin de transition intro (keyframe).
- [x] Le custom suivant ne demarre plus pendant intro (pas de collision).
- [x] `outro` reste keyframe-based.

## Resultats

- Le builder dispose maintenant d'un timing explicite par event: `keyframeMs` et `runtimeStartMs`.
- `intro`: keyframe = fin d'intro, runtime start = keyframe - duration (clamp a 0).
- `outro`: keyframe = runtime start = `cue.end`.
- Les tween custom demarrent depuis le keyframe precedent (et non plus depuis le runtime start d'intro), supprimant la collision intro/custom.
- La selection d'event conserve un ancrage keyframe (`intro` fin de transition, `outro` au keyframe).
- Non-regressions ajoutees/mises a jour: `tests/intro-keyframe-runtime-offset-smoke.ts`, `tests/builder-slot-style-smoke.ts`, `tests/keyframe-coherence-smoke.ts`.
- Verifications executees: `tests/intro-keyframe-runtime-offset-smoke.ts`, `tests/builder-slot-style-smoke.ts`, `tests/keyframe-coherence-smoke.ts`, `tests/event-selection-scene1-smoke.ts`, `tests/custom-event-selection-cue-smoke.ts`, `tests/custom-event-auto-smoke.ts`.
