# Plan - unification des events implicites/effectifs

## Objectif

Traiter `intro/outro` implicites comme des events de premiere classe pour tous les consommateurs (selection, item-edit, rubber/waveform, builder/runtime), tout en restant dynamiques et sans persister des noms auto (`__auto_*`) stales.

## Diagnostic

- Generation implicite centralisee existe (`resolveCueWindows(generateMissingEvents: true)`) mais la consommation reste partielle.
- Plusieurs chemins UI/metier lisent encore `context.events[itemId]` explicite uniquement.
- Le split explicite/effectif cree des incoherences de seek, handles, placement et materialisation non souhaitee.

## Plan

### Phase 1 - Source unique d'events effectifs

- [x] Introduire un resolver partage `effective-events` (par item): transitions intro/outro effectives + metadata source (`explicit|implicit|mixed`).
- [x] Faire retourner des ancrages valides meme si `name` explicite est absent/invalide.
- [ ] Interdire la persistance implicite automatique de noms `__auto_*` hors action explicite de pin.

### Phase 2 - Basculer les consommateurs UI/metier

- [x] `item-edit`: lire transitions effectives (selection, decor target, bounds custom) au lieu d'explicite-only.
- [ ] `event-edit`: exposer intro/outro effectifs pour edition cohérente.
- [x] `rubber`/`waveform`/`haptic`: construire handles et contraintes depuis les events effectifs.

### Phase 3 - Aligner builder/runtime

- [ ] `builder/events` et `builder/entities`: consommer les timings effectifs plutot que dependre d'une derivation materialisee ad hoc.
- [ ] Simplifier `builder/derivation` pour ne plus etre le point unique qui "corrige" les events.
- [ ] Verrouiller la coherences placements/move quand intro/outro sont implicites.

### Phase 4 - Verrouillage tests

- [x] Ajouter smoke "implicit intro/outro handle parity" (selection + rubber/waveform).
- [ ] Ajouter smoke "no auto-name persistence" (style edit sur outro implicite ne persiste pas `__auto_*`).
- [ ] Ajouter smoke "custom bounds from effective transitions" (seed/clamp dans fenetre intro/outro effective).
- [x] Rejouer la suite outro/intro existante + `npm run typecheck`.

## Verification prevue

- [x] `npx tsx tests/effective-implicit-handles-smoke.ts`
- [x] `npx tsx tests/implicit-intro-window-anchor-smoke.ts`
- [x] `npx tsx tests/implicit-intro-selection-seek-smoke.ts`
- [x] `npx tsx tests/event-selection-auto-fallback-smoke.ts`
- [x] `npx tsx tests/selection-contract-lock-smoke.ts`
- [x] `npx tsx tests/event-selection-scene1-smoke.ts`
- [x] `npx tsx tests/custom-event-preflip-selection-smoke.ts`
- [x] `npx tsx tests/item-edit-decor-resolution-smoke.ts`
- [x] `npx tsx tests/custom-events-smoke.ts`
- [x] `npx tsx tests/outro-slot-move-timing-smoke.ts`
- [x] `npm run typecheck`

## Review

- Une couche partagee `effective-events` a ete introduite pour resoudre intro/outro implicites dynamiquement et fournir une map d'events utilisable comme une map normale.
- `scene-logic.helpers` (selection/cues custom) et `event-selection-cue` consomment maintenant cette couche au lieu d'une logique locale explicite-only.
- `item-edit.helpers` calcule les bornes intro/outro pour l'ordre custom via events effectifs, ce qui aligne les placements avec l'etat runtime.
- `rubber`, `waveform` et `haptic` lisent desormais une map d'events effectifs pour handles/contraintes intro-outro.
- Fix critique: `resolveCueWindows` renseigne maintenant aussi `cueWindowsByItemId` pour les items hors fenetrage capsule (ex: enfants directs du main), ce qui restaure un `assured.window.startSec` correct pour la selection intro implicite.
- Le calcul de cue de selection intro/outro prefere desormais la fenetre effective (`assured.window`) pour les transitions non-explicites, au lieu d'un ancrage de nom potentiellement stale/non-resoluble.
- Reste a faire: bloquer explicitement la persistance auto des noms `__auto_*`, et basculer `event-edit` + builder complet sur la meme source unique.
