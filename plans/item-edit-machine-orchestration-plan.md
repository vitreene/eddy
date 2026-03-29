# Item Edit Machine Orchestration Plan

## Scope (Phase 1)

- Replacer la dedupe React locale par un pilotage machine explicite.
- Garder React comme couche d'affichage/dispatch uniquement.
- Supprimer les structures opaques (`useRef` dedupe, signatures locales incomprehensibles).

## Checklist

- [x] `editor-sync.machine.ts`: remplacer `sync.request` par `sync.update` avec payload explicite (`selection*`, `visual*`).
- [x] `editor-sync.machine.ts`: centraliser les decisions via `shouldSeekRequest` et `shouldProjectRequest`.
- [x] `editor-sync.machine.ts`: publier `projectedVisualKey` depuis la machine.
- [x] `index.tsx`: supprimer la dedupe `useRef` + helper associe.
- [x] `index.tsx`: envoyer uniquement des faits vers la machine (`visualKey`, `visualState`, `selectionAction`, `selectionCueSec`, `selectionKey`).
- [x] `index.tsx`: laisser `onProject` accepter `visualState`, et deleguer le filtrage "event actif requis" a la machine.
- [x] `editor-sync.machine.ts`: ne pas projeter quand `selectionAction` est absente (evite ecrasement des edits item par defaut).
- [x] `index.tsx`: restaurer le `console.log` protege (`NE PAS RETIRER CE CONSOLE.LOG`).

## Next (Phase 2)

- [ ] Revoir `active-set` dans `scene-logic.ts` en extrayant la regle `shouldForceSeek` dans une fonction dediee.
- [ ] Finaliser le flux intro/outro Rubber via une config par type d'event (sans flags speciaux).

## Debug expose (historique)

- [x] Corriger le routage decor item/event: `isItemDecorEventContext` doit retourner `false` si l'event a deja un `decorId` explicite.
- [x] Ajouter un traceur leger en memoire (`app/lib/debug-trace.ts`) avec API browser:
  - `window.__eddyReadDebugTrace()`
  - `window.__eddyClearDebugTrace()`
  - `window.__eddyDebugVerbose = true`
- [x] Instrumenter les points critiques:
  - `item-edit.style.commit` / `item-edit.style.skip-noop`
  - `item-edit.sync.project`
  - `scene-logic.decor.patch.request`
  - `scene-logic.decor.patch.ensure-target`
  - `scene-logic.decor.patch.apply`
- [x] Cause racine identifiee sur rollback: endpoint `POST /api/content/:id` ne persistait pas `decorId` des events.
- [x] Correction appliquee: passer `decorId` dans `addEventToContent` (`app/api/content.ts`).
- [x] Nettoyage: instrumentation retiree apres validation du fix.

## Verification

- [x] Typecheck.
- [ ] Test manuel: edition style item sans rollback.
- [ ] Test manuel: selection custom sans boucle.
