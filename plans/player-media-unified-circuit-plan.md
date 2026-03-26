# Player media unified circuit plan

## Checklist

- [x] Confirmer le diagnostic de regression: les `change.media` sont calcules mais ne sont pas appliques sur le node en lecture continue.
- [x] Reconnecter le circuit media runtime dans le player:
  - ajouter le point d'application media dans `onUpdateStaticChanges` lors du passage de change,
  - centraliser l'execution des actions media dans le player (process extensible au-dela de `play/pause`).
- [x] Retirer le traitement specifique du son lie a la scene dans le builder:
  - supprimer l'action `intro.media.play` hardcodee,
  - deplacer l'intention de lecture au niveau initial media du node (meme circuit player).
- [x] Mettre a jour les tests/contrats impactes:
  - adapter `scene-linked-sound-builder-smoke` au nouveau contrat,
  - ajouter un smoke test runtime qui prouve qu'un intro media declenche `node.play()` via `onUpdate`.
- [x] Verifier localement (`typecheck` + smoke tests cibles).

## Review

- Runtime reconnecte: `onUpdateStaticChanges` appelle maintenant `applyMediaChanges(...)` lors du passage sur un change.
- Execution media centralisee dans `Player`: `executeMediaAction(...)` est utilise par `play()`, `pause()` et `applyMediaChanges()`.
- Son de scene despecialise: suppression de `actions.intro.media.play` hardcodee; l'intention de lecture passe par `initial.media`.
- Robustesse update: `getChange(...)` gere maintenant correctement le cas mono-change (`prev=null`, `next=null`).
- Tests:
  - `tests/scene-linked-sound-builder-smoke.ts` adapte au nouveau contrat,
  - `tests/player-media-runtime-smoke.ts` ajoute (preuve runtime `node.play()` via `onUpdate`),
  - `tests/event-media-action-smoke.ts` reste vert.
- Verification:
  - `npm run typecheck` OK,
  - `npx tsx tests/scene-linked-sound-builder-smoke.ts` OK,
  - `npx tsx tests/event-media-action-smoke.ts` OK,
  - `npx tsx tests/player-media-runtime-smoke.ts` OK,
  - simulation scene 9: `scene-sound__6.playCalls=1`, `item__87.playCalls=1`, `item__87.pauseCalls=2` via le circuit runtime player.
