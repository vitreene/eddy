# Plan — Refonte selection/flush (state-machine first)

## Contexte

Des deselections intermittentes apparaissent pendant l'edition (`item-edit`, `event-edit`, `rubber/waveform`, seek telco).
Le probleme est structurel: `active-set` melange selection, transport, seek auto, dirty flags et policy de flush.

## Invariants a verrouiller

### Invariants globaux

- `selection.clear` est la seule transition qui peut vider `itemId/node/contentId/event`.
- Un `seek` ne desactive jamais l'item en cours d'edition.
- Selection d'event ne doit jamais annuler `itemId`.
- Un flush technique ne doit pas decider seul de la desactivation de selection.

### Invariants item-edit

- Tant que `itemId` est actif, les actions decor/style/layout/transform ne desactivent jamais la selection.
- Changer d'onglet item-edit n'a pas d'effet sur la selection.
- Projection/sync visuelle ne modifie pas la selection.

### Invariants event-edit / rubber

- `selection.event.requested` conserve toujours l'item courant.
- Rubber/waveform peuvent produire des `seek`, jamais `selection.clear` implicite.
- Edition intro/outro/custom ne perturbe pas `itemId`.

### Invariants tree / reflush

- `tree-mutation` peut provoquer un reflush, mais preserve la selection si l'item selectionne existe toujours.
- Si l'item est supprime (ou capsule supprimee), clear explicite autorise.
- `scene-switch` clear explicite autorise.

## Strategie de refonte

### Phase 1 (immediate, faible risque)

- [x] Source d'intention unique pour la policy de flush: utiliser l'action finale (`nextActive.action`) et non plus un payload partiel.
- [x] Centraliser la policy `preserveSelection` dans `scene-reload-policy` pour les deux chemins de flush.
- [x] Ajouter la policy tree: preserve si item actif existe encore.

### Phase 2 (architecture machine)

- [x] Introduire intents explicites (selection vs transport), conserver `active-set` en adaptateur transitoire.
- [x] Sortir la logique selection/transport dans transitions dediees, limiter `active-set` a un mapping de compatibilite.
- [x] Supprimer les collisions entre dirty flags d'edition et transport.

### Phase 3 (migration callers)

- [x] Migrer event-edit/rubber/waveform/player/tree vers intents explicites.
- [x] Supprimer l'usage direct de `active-set` dans les modules UI critiques (event-edit/rubber/waveform/player/tree).
- [x] Retirer l'adaptateur legacy (`active-set` supprime des events machine et callers).

## Verification

- [x] typecheck
- [x] item-edit smoke
- [x] transform-editor smoke
- [ ] scenario manuel cible: `scene/3`, item `94`, selection item + intro + rubber + seek sans deselection

## Review

- Transport player migre vers intents explicites (`transport.play/pause/seek`, `transport.progress.updated`, `transport.seek.completed`).
- Selection + seek item-edit migres vers `selection.event.seek.requested` pour eviter `active-set` mixte.
- `selection.clear.requested` nettoie maintenant aussi `contentId` et `node` pour un clear coherent.
- Tree mutation ne raise plus `active-set`: la selection passe par `selection.item.requested`.
- Etats UI migrés vers `ui.active.updated` (`telcoMuted`, `itemEditTab`, `timelineView`, init prefs).
- Verification locale: `npm run typecheck`, `npx tsx tests/item-edit-smoke.ts`, `npx tsx tests/transform-editor-smoke.ts`, `npx tsx tests/custom-events-smoke.ts`, `npx tsx tests/selection-contract-lock-smoke.ts`.

## Demarrage

Demarrage sur Phase 1: policy flush centralisee + tree reflush preserve selection.
