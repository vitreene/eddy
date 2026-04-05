# Plan — Fix max depth TimelinePointEditor

## Contexte

- Erreur React: `Maximum update depth exceeded`.
- Stack: `refreshAnchors` dans `timeline-point-editor.tsx`.

## Hypothese

- `refreshAnchors` appelle `setAnchors` a chaque render/effect, meme quand la geometrie est identique.
- Avec `snapPoints` recree frequemment, cela peut former une boucle de rerender.

## Etapes

- [x] Supprimer le couple `useEffect + setAnchors` (state derive) de `TimelinePointEditor`.
- [x] Recalculer `anchors` au render et rafraichir via `useSyncExternalStore` pour les resize viewport.
- [x] Verifier typecheck + smokes.
- [x] Mettre a jour lessons.

## Review

- `TimelinePointEditor` n'utilise plus de `setState` pour la geometrie `anchors`; le calcul est derive au render.
- Subscription resize migree vers `useSyncExternalStore` (pattern recommande par `use-effects-README`).
- Verification: `npm run typecheck`, `npx tsx tests/event-selection-scene1-smoke.ts`, `npx tsx tests/selection-contract-lock-smoke.ts`, `npx tsx tests/custom-events-smoke.ts`.
