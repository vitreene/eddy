# Runbook — Regression freeze (visibilite / reset)

## Invariants a ne pas casser

- Selection item: le seek doit tomber sur un instant visible (pas sur un instant encore cache).
- Intro explicite sans cue resolu: fallback visible a `start + duration` (cas approuve: `0.5s`).
- Reset item: preserve les noms de cue (`name`) mais nettoie timing (`duration/delay/position`) et `decorId` des events standards.
- Persistance event: `decorId: null` doit supprimer le lien decor (et ne jamais restaurer l'ancien decor).

## Points corriges

### 1) Regression visibilite a la selection

- Symptome: selection d'un item, seek au debut de fenetre brute, element encore invisible.
- Correctif: calcul cue selection borne par la visibilite intro effective dans `computeActiveCue`.
- Fichiers: `app/provider/active-cue.ts`, `app/provider/scene-logic.ts`.
- Verrou test: `tests/selection-visibility-contract-smoke.ts`.

### 2) Reset event qui perd les ancres de cue

- Symptome: reset intro/outro casse l'ancrage temporel attendu car `name` saute.
- Correctif: patch reset conserve `name`, reset transitions/timing et `decorId`.
- Fichiers: `app/parts/item-edit/item-edit.reset.ts`, `app/parts/item-edit/index.tsx`.
- Verrou test: `tests/item-reset-smoke.ts`.

### 3) Reapparition de classes placement apres reset

- Symptome: une classe `cell-span-*` reapparait en lecture apres reset.
- Cause corrigee: persistance event traitait `decorId: null` comme fallback vers ancien decor.
- Correctif: distinction stricte `null` vs `undefined` dans la persistance.
- Fichier: `app/api/db.ts` (`resolveEventDecorIdForPersist`).
- Verrou test: `tests/event-persist-decor-null-smoke.ts`.

## Comment verifier rapidement

- Suite de freeze rapide:

```bash
npm run test:regression-lock
```

- Verification globale type system:

```bash
npm run typecheck
```

## Si un souci revient: diagnostic rapide

1. Relancer `npm run test:regression-lock` pour identifier l'invariant casse.
2. Lire les logs `"[selection-cue]"` dans `app/provider/active-cue.ts` (raison, cue resolu, fenetre).
3. Verifier les emissions seek cote player via logs `"[telco-sync]"` dans `app/player/index.tsx`.
4. En cas de reapparition placement, inspecter la persistence event/decor:
   - route `app/api/content.ts`
   - resolution `decorId` dans `app/api/db.ts`
5. Revalider les tests cibles:
   - `tests/selection-visibility-contract-smoke.ts`
   - `tests/item-reset-smoke.ts`
   - `tests/event-persist-decor-null-smoke.ts`

## Commandes utiles (copier/coller)

```bash
npx tsx tests/selection-visibility-contract-smoke.ts
npx tsx tests/item-reset-smoke.ts
npx tsx tests/event-persist-decor-null-smoke.ts
npx tsx tests/event-selection-auto-fallback-smoke.ts
npx tsx tests/active-cue-smoke.ts
```
