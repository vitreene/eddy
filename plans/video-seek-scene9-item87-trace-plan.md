# Video Seek Scene9 Item87 Trace Plan

## Scope

- Instrumenter le player pour capturer le chemin seek video runtime sur scene 9 / item 87.
- Verifier: source media active, etat play/pause, calcul `changeAt/offset/startAt`, `currentTime` avant/apres seek.

## Checklist

- [x] Ajouter un traceur runtime leger expose en browser (`window.__eddyReadPlayerSeekTrace`, `window.__eddyClearPlayerSeekTrace`).
- [x] Tracer `createTelcoController.seek` et `syncFromActive.seek`.
- [x] Tracer `Player.seek`, `seekChanges`, `applyMediaChanges`, `seekMedias`.
- [ ] Reproduire scene 9 / item 87 puis collecter trace.
- [x] Appliquer correctif minimal base sur la trace (re-application robuste de `currentTime` quand media non pret).
- [x] Identifier cause transport: endpoint media sans support HTTP Range (`seekable` bloquee a `[0,0]`).
- [x] Corriger `/api/upload` pour renvoyer `206 Partial Content` avec `Content-Range`/`Accept-Ranges`.
- [x] Nettoyer l'instrumentation player de debug apres diagnostic.

## Verification

- [x] Typecheck.
