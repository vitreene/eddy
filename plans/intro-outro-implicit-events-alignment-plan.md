# Plan d'action - alignement intro/outro, implicites, et decors

## Objectif

Verifier et finaliser le contrat metier suivant:

- `intro` et `outro` sont les bornes de vie d'un item.
- Les events custom doivent rester dans cet intervalle.
- Les events implicites (auto) doivent etre resolus en events normaux avant traitement.
- `intro` garde son decor dans l'etat `initial` (item decor).
- `intro` est precede d'une transition nommee, `outro` est suivi d'une transition nommee.
- Hors ces points, le comportement doit rester aligne avec les custom-events.

## Etat actuel verifie

- [x] Resolution implicite cote builder existe deja (`applyCapsuleDefaultItemEvents` -> `resolveCueWindows(generateMissingEvents: true)`).
- [x] Selection cue intro/outro gere le fallback implicite (`resolveSelectedEventCueSec`).
- [x] Intro reste en contexte item decor dans item-edit (`isItemDecorEventContext`).
- [x] Custom-events interpolent bien les deltas de style vers l'event suivant (`buildStyleInterpolation`).
- [x] Edition item-edit sur `outro` implicite materialisee avant patch decor.
- [ ] Bornage strict des custom-events entre intro/outro n'est pas centralise (diff de comportement Rubber vs Waveform vs reducer).
- [ ] Parite complete "event normal" entre editor/runtime n'est pas encore unifiee par une source unique.
- [x] Regle "decor property animee si remodifiee a l'event suivant" couverte aussi pour `outro` decor.

## Plan de mise en oeuvre

### 1) Source unique d'events effectifs (editor + runtime)

- [x] Introduire un helper partage qui retourne, pour un item, les events effectifs (explicites + implicites resolus).
- [ ] Reutiliser ce helper dans `event-edit`, `rubber`, `waveform` pour eviter les divergences locales (deja branche sur `item-edit`).
- [x] Garantir que la selection d'un `outro` implicite donne un contexte event valide (pas de fallback silencieux sur item decor).

### 2) Cible decor item-edit: parite explicite/implicite

- [x] Materialiser `outro` implicite dans item-edit avant `decor-patch-requested` pour creer/cibler un decor event au premier changement reel.
- [ ] Conserver la regle actuelle: `intro` -> item decor uniquement.
- [ ] Eviter toute creation de decor a la simple selection (creation paresseuse au premier patch).

### 3) Bornage metier intro/outro pour custom

- [ ] Centraliser une fonction de clamp temporel/point custom sur la fenetre intro/outro effective.
- [ ] L'appliquer aux mutations custom dans `scene-logic` (pas seulement a certains UIs).
- [ ] Aligner Rubber et Waveform sur la meme logique (nom/position/temps) pour interdire les sorties de fenetre.

### 4) Animation inter-events: fermeture des trous

- [x] Verifier la chaine d'animation sur `outro` avec decor event selon le flux d'un event normal.
- [x] Appliquer l'interpolation standard des proprietes decor entre l'etat precedent et `outro`.
- [ ] Conserver les specificites voulues: intro dans `initial`, transition intro avant, transition outro apres.

### 5) Tests de verrouillage

- [x] Ajouter un smoke "outro implicite materialise avec ancre resolue + transition nommee".
- [ ] Ajouter un smoke "custom hors bornes est clamp" (reducer/API path, pas seulement UI).
- [x] Ajouter un smoke "outro decor delta anime avant transition".
- [ ] Ajouter un smoke de parite "explicite vs implicite" avec meme resultat runtime.

## Verification prevue

- [x] `npx tsx tests/selection-contract-lock-smoke.ts`
- [x] `npx tsx tests/item-edit-decor-resolution-smoke.ts`
- [x] `npx tsx tests/event-selection-auto-fallback-smoke.ts`
- [x] `npx tsx tests/custom-events-smoke.ts`
- [x] `npx tsx tests/custom-event-auto-smoke.ts`
- [x] `npx tsx tests/move-snapshot-boundary-smoke.ts`
- [x] `npx tsx tests/static-changes-move-priority-smoke.ts`
- [x] `npx tsx tests/on-update-keyframe-window-smoke.ts`
- [x] `npm run typecheck`

## Review

- Resultats:
  - `outro` suit maintenant un flux d'event normal: interpolation decor depuis l'etat precedent (`__tween`) puis transition nommee `outro`.
  - En item-edit, un `outro` implicite selectionne est materialise (event explicite) au premier changement reel avant patch decor.
  - Fix scene 10/capsule 31: la materialisation `outro` ne depend plus de la presence d'un cue resolu; un event effectif est fourni meme sans cues (`name: null`), ce qui evite les patches "live-only" perdus au reload.
  - Le meme chemin couvre toutes les proprietes item-edit: style (dont couleur), `area` et `className`.
  - Fix regression: si `outro/custom` partageaient le `decorId` de l'item, le patch ecrivait dans le decor initial; le systeme force maintenant un decor event dedie pour tout event non-intro.
  - Fix regression visuelle: un `outro` seul ne replie plus son decor dans `initial`; l'etat initial reste le decor de base, et la transition vers `outro` passe par un tween d'event normal.
  - Fix regression item-edit: la selection `outro` applique bien le decor outro meme sans custom-events intermediaires (style/className/area).
  - Alignement slot/move sur `outro`: les deltas de placement sont desormais portes par l'action `__tween` (fenetre precedente) au lieu d'etre appliques uniquement dans l'effet nomme de sortie.
  - Fix merge timeline t=0: quand `outro.__tween` partage le meme timestamp que l'initial (cas sans intro explicite), `move:auto` n'est plus ecrase par le `move` parent string.
  - Fix runtime FLIP: les valeurs animejs (`utils.get`) sont desormais normalisees avec fallback finite avant animation `move:auto`, ce qui retablit le glissement slot intro->outro.
  - Fix temporalite `outro` seul: `outro__tween` demarre sur une baseline implicite d'intro (500ms) au lieu de `0ms`, ce qui evite le pre-positionnement immediate a l'etat outro au chargement.
  - Fix runtime on-update: `change.snapshot` n'est reapplique que si le prochain change est un move transition (`move:true`/`move:auto`), ce qui evite les ruptures visuelles aux frontieres style-only.
  - Alignement merge same-timestamp: le payload `move:auto` le plus recent est conserve pour permettre le FLIP runtime.
  - Le contexte decor reste conforme: `intro` continue d'utiliser le decor item, `outro` cible un decor event.
  - Un helper partage de resolution d'event effectif est introduit et branche sur item-edit.
- Verification executee:
  - `npx tsx tests/implicit-outro-materialization-smoke.ts` (OK)
  - `npx tsx tests/implicit-outro-no-cues-effective-event-smoke.ts` (OK)
  - `npx tsx tests/event-decor-targeting-smoke.ts` (OK)
  - `npx tsx tests/move-snapshot-boundary-smoke.ts` (OK)
  - `npx tsx tests/static-changes-move-priority-smoke.ts` (OK)
  - `npx tsx tests/on-update-keyframe-window-smoke.ts` (OK)
  - `npx tsx tests/outro-only-initial-style-regression-smoke.ts` (OK)
  - `npx tsx tests/outro-decor-without-custom-smoke.ts` (OK)
  - `npx tsx tests/outro-slot-move-timing-smoke.ts` (OK)
  - `npx tsx tests/outro-same-position-move-merge-smoke.ts` (OK)
  - `npx tsx tests/outro-slot-move-timing-smoke.ts` (OK, re-run apres fix runtime FLIP)
  - `npx tsx tests/outro-normal-event-interpolation-smoke.ts` (OK)
  - `npx tsx tests/outro-only-baseline-timing-smoke.ts` (OK)
  - `npx tsx tests/selection-contract-lock-smoke.ts` (OK)
  - `npx tsx tests/item-edit-decor-resolution-smoke.ts` (OK)
  - `npx tsx tests/event-selection-auto-fallback-smoke.ts` (OK)
  - `npx tsx tests/custom-events-smoke.ts` (OK)
  - `npx tsx tests/custom-event-auto-smoke.ts` (OK)
  - `npx tsx tests/intro-keyframe-runtime-offset-smoke.ts` (OK)
  - `npm run typecheck` (OK)
