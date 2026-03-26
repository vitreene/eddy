# Player index ref cleanup plan

## Checklist

- [x] Lire les contraintes `AGENTS.md` et `plans/lessons.md` applicables.
- [x] Supprimer les refs miroir (`activeRef`, `isMutedRef`) dans `app/player/index.tsx`.
- [x] Garder le comportement telco identique (play/seek/mute) avec source de verite stable.
- [x] Verifier la compilation TypeScript (`npm run typecheck`).

## Review

- `activeRef` est retire: les actions telco lisent l'etat `active` directement via `actorRef.getSnapshot().context.active`.
- `isMutedRef` est retire: l'initialisation telco recopie l'etat mute via un updater `setIsMuted((current) => ...)` sans ref miroir.
- Signature `initializePlayerRuntime` simplifiee: une seule source `getActive()` au lieu de getters partiels.
- Verification: `npm run typecheck` passe sans erreur.
