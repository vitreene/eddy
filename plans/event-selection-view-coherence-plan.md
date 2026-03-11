# Plan d'action — Coherence selection event <-> vue

## Objectif

Reprendre a zero la logique de selection d'event pour garantir une vue stable, visible et coherentement alignee avec l'event selectionne, sans regles implicites mouvantes.

## Spec fonctionnelle (source de verite)

- Intro/outro/custom utilisent des ancres temporelles explicites.
- Le seek de selection est toujours borne a la fenetre de visibilite effective (item + ancetres capsule).
- Si l'ancre est hors fenetre, on clamp dans la fenetre (jamais de seek hors visibilite).
- Les regles sont centralisees dans un module dedie; `scene-logic` ne contient plus de logique temporelle embarquee.

## Etapes

- [x] Reconcevoir une API unique de resolution de cue pour la selection d'event.
- [x] Reimplanter `scene-logic` sur cette API (suppression des branches ad hoc).
- [x] Uniformiser l'usage de constantes `INTRO` / `OUTRO` dans les zones touchees.
- [x] Ajouter une non-regression unitaire de coherence selection/visibilite.
- [x] Verifier sur `scene 1` pour `item 39` et `item 53` avec extraction runtime.
- [x] Executer les smoke tests cibles.

## Review

- [x] Selection intro ne seek jamais hors visibilite.
- [x] Selection custom ne seek jamais hors visibilite.
- [x] Regles identiques entre item 39 et item 53.
- [x] Aucun comportement divergent entre deux corrections successives.

## Resultats

- Nouvelle API centrale: `app/provider/event-selection-cue.ts`.
- `computeCueForSelectedCustomEvent(...)` delegue integralement a cette API; suppression de la logique inline conditionnelle.
- Les ancres temporelles intro/outro/custom sont resolues une seule fois, puis bornees par la fenetre de visibilite assuree.
- Verification runtime scene 1: controles explicites pour `item 39` et `item 53` via `tests/event-selection-scene1-smoke.ts`.
- Suites executees: `tests/custom-event-selection-cue-smoke.ts`, `tests/event-selection-scene1-smoke.ts`, `tests/keyframe-coherence-smoke.ts`, `tests/item-reset-smoke.ts`, `tests/item-edit-live-smoke.ts`, `tests/custom-event-auto-smoke.ts`.
