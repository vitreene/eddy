# Item 39 Selection Misalignment Analysis

## Scope

- Analyze Scene 1 / Item 39 animation stutter and selection frame misalignment.
- Identify probable root cause across runtime + editor selection projection.
- Propose a concrete fix plan without modifying production code.

## Tasks

- [x] Inspect scene/item/event data for Scene 1 Item 39.
- [x] Trace selection-frame projection pipeline and event targeting path.
- [x] Compare animation transform pipeline vs selection-box geometry source.
- [x] Isolate likely root cause and list evidence.
- [x] Propose a minimal correction plan (no code changes applied).

## Review

- Item 39 has events: `intro=3-003-donc`, `custom-1=3-007-prsente`, `outro=3-009-risques`.
- In Scene 1, computed action key collisions exist:
  - `3-007-prsente-custom-1` shared by items `39,53,89`.
  - `3-003-donc-intro` shared by items `6,39`.
- Built scene confirms Item 39 action names are not item-scoped (`3-003-donc-intro`, `3-007-prsente-custom-1__tween`, `3-009-risques-outro`).
- Built event timeline contains multiple timestamps for Item 39 custom tween key (`900` and `960`), causing repeated trigger and visible stutter.
- Selection frame pipeline reads DOM transform but can diverge when editor injects model transform values (`rotate/origin/scale`) in `mergeTransformFromInput`.
- Recommended correction (not applied): make event action names item-scoped to prevent cross-item trigger bleed; optionally harden frame sync to favor measured DOM transform outside drag sessions.
