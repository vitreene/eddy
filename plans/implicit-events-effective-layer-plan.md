# Plan - unification des events implicites/effectifs

## Objectif

Traiter `intro/outro` implicites comme des events de premiere classe pour tous les consommateurs (selection, item-edit, rubber/waveform, builder/runtime), tout en restant dynamiques et sans persister des noms auto (`__auto_*`) stales.

## Diagnostic

- Generation implicite centralisee existe (`resolveCueWindows(generateMissingEvents: true)`) mais la consommation reste partielle.
- Plusieurs chemins UI/metier lisent encore `context.events[itemId]` explicite uniquement.
- Le split explicite/effectif cree des incoherences de seek, handles, placement et materialisation non souhaitee.

## Plan

### Phase 1 - Source unique d'events effectifs

- [ ] Introduire un resolver partage `effective-events` (par item): transitions intro/outro effectives + metadata source (`explicit|implicit|mixed`).
- [ ] Faire retourner des ancrages valides meme si `name` explicite est absent/invalide.
- [ ] Interdire la persistance implicite automatique de noms `__auto_*` hors action explicite de pin.

### Phase 2 - Basculer les consommateurs UI/metier

- [ ] `item-edit`: lire transitions effectives (selection, decor target, bounds custom) au lieu d'explicite-only.
- [ ] `event-edit`: exposer intro/outro effectifs pour edition cohérente.
- [ ] `rubber`/`waveform`/`haptic`: construire handles et contraintes depuis les events effectifs.

### Phase 3 - Aligner builder/runtime

- [ ] `builder/events` et `builder/entities`: consommer les timings effectifs plutot que dependre d'une derivation materialisee ad hoc.
- [ ] Simplifier `builder/derivation` pour ne plus etre le point unique qui "corrige" les events.
- [ ] Verrouiller la coherences placements/move quand intro/outro sont implicites.

### Phase 4 - Verrouillage tests

- [ ] Ajouter smoke "implicit intro/outro handle parity" (selection + rubber/waveform).
- [ ] Ajouter smoke "no auto-name persistence" (style edit sur outro implicite ne persiste pas `__auto_*`).
- [ ] Ajouter smoke "custom bounds from effective transitions" (seed/clamp dans fenetre intro/outro effective).
- [ ] Rejouer la suite outro/intro existante + `npm run typecheck`.

## Verification prevue

- [ ] `npx tsx tests/implicit-intro-selection-seek-smoke.ts`
- [ ] `npx tsx tests/event-selection-auto-fallback-smoke.ts`
- [ ] `npx tsx tests/selection-contract-lock-smoke.ts`
- [ ] `npx tsx tests/event-selection-scene1-smoke.ts`
- [ ] `npx tsx tests/outro-slot-move-timing-smoke.ts`
- [ ] `npx tsx tests/outro-static-window-duration-smoke.ts`
- [ ] `npm run typecheck`

## Review

- En attente d'implementation.
