# Plan d'action — item_53: slot initial ignore avec custom event

## Objectif

Corriger le playback pour qu'un slot defini en `initial` reste applique au demarrage, meme si un custom-event definit un autre slot plus tard.

## Etapes

- [x] Confirmer la cause racine dans le calcul temporel des custom-events du builder.
- [x] Annuler le correctif precedent base sur le cas `delay` (diagnostic incomplet).
- [x] Separarer le scheduling custom en deux temps: interpolation (`tween`) puis keyframe (`etat statique`).
- [x] Aligner la duree des transitions `move:auto` sur l'intervalle temporel reel (`curr -> next`) au lieu d'une duree fixe.
- [x] Ajouter une non-regression sur le cas slot initial + slot custom nomme.
- [x] Executer les smoke tests builder cibles.

## Review

- [x] Le slot initial reste actif au demarrage.
- [x] Le slot custom s'applique au moment attendu.
- [x] Pas de regression sur le tri intro/custom/outro.

## Resultats

- Cause racine reelle: le custom-event etait mappe sur la timeline a `previousMs`, ce qui declenchait ses `static changes` (slot/class/move) trop tot.
- Correctif: separation explicite custom `tween` vs `keyframe`.
  - `...__tween` est mappe a `previousMs` (interpolation style)
  - l'action keyframe (`<name>-<action>`) est mappee a `startMs` (etat statique)
- Correctif systemique player: les transitions `move:auto` ne progressent plus sur une fenetre fixe `+1000ms`; elles utilisent la fenetre du change (`curr -> next`) pour atteindre l'etat cible avant le prochain keyframe.
- Le patch precedent sur `delay` dans `events.ts` et son test associe ont ete annules.
- Non-regression: `tests/builder-slot-style-smoke.ts` verifie maintenant que le slot initial reste en place et que le keyframe custom se declenche au temps du cue.
- Verification executee: `npx tsx tests/builder-slot-style-smoke.ts`, `npx tsx tests/custom-events-smoke.ts`, `npx tsx tests/custom-event-auto-smoke.ts`, `npx tsx tests/static-changes-move-priority-smoke.ts`.
