Contexte de reprise (repo: /Users/Rve/Projets/eddy)

Objectif:

- Feature Rubber: encoder la position dans event.name
  - start => nom brut
  - middle/end => suffixe -middle / -end
- Tous les events Rubber concernés (intro/outro/custom)
- Waveform n’émet pas de suffixes, mais ignore/tolère les suffixes en lecture
- Pas de fallback legacy

Travail déjà fait:

- Ajout helper central: app/scene-runtime/visibility/event-cue-name.ts
  - buildEventCueName
  - parseEventCueName
  - resolveEventCuePoint
  - resolveCueEntryByEventName
  - hasCueByEventName
- Renommage:
  - makeIntroOutroEventPayload -> buildEventPayloadFromCuePoint
- Emission Rubber mise à jour:
  - app/parts/rubber/rubber.tsx
  - app/parts/rubber/timeline-point-editor.model.ts
- Waveform tolérance suffixes:
  - app/parts/rubber/waveform-canvas.tsx
  - app/parts/rubber/haptic-timeline.tsx
- Lookup/timing décodage suffixes:
  - app/player/builder/events.ts
  - app/provider/active-cue.ts
  - app/provider/event-selection-cue.ts
  - app/provider/scene-logic.helpers.ts
  - app/parts/item-edit/item-edit.helpers.ts
  - app/scene-runtime/visibility/custom-event-cue-mapping.ts
  - app/scene-runtime/visibility/resolve-cue-windows.ts
  - app/parts/event-edit/index.tsx
- Plan + suivi:
  - plans/rubber-cue-position-suffix-plan.md
- Lessons mises à jour:
  - plans/lessons.md (entrée 2026-04-08)

Etat git (non commit):

- M app/parts/event-edit/index.tsx
- M app/parts/item-edit/item-edit.helpers.ts
- M app/parts/rubber/haptic-timeline.tsx
- M app/parts/rubber/rubber.tsx
- M app/parts/rubber/timeline-point-editor.model.ts
- M app/parts/rubber/waveform-canvas.tsx
- M app/player/builder/events.ts
- M app/provider/active-cue.ts
- M app/provider/event-selection-cue.ts
- M app/provider/scene-logic.helpers.ts
- M app/scene-runtime/visibility/custom-event-cue-mapping.ts
- M app/scene-runtime/visibility/resolve-cue-windows.ts
- M plans/lessons.md
- ?? app/scene-runtime/visibility/event-cue-name.ts
- ?? plans/rubber-cue-position-suffix-plan.md

Vérifications déjà passées:

- npm run typecheck
- tests/keyframe-coherence-smoke.ts
- tests/custom-event-selection-cue-smoke.ts
- tests/item-edit-decor-resolution-smoke.ts
- tests/custom-events-smoke.ts

A reprendre en priorité:

1. relancer tests restants (builder-capsule-smoke + éventuellement active-cue-smoke)
2. corriger si régression
3. faire un récap final

Script terminal de reprise:

```bash
cd /Users/Rve/Projets/eddy
git status --short
npm run typecheck
npx tsx tests/keyframe-coherence-smoke.ts
npx tsx tests/custom-event-selection-cue-smoke.ts
npx tsx tests/item-edit-decor-resolution-smoke.ts
npx tsx tests/custom-events-smoke.ts
npx tsx tests/builder-capsule-smoke.ts
```
