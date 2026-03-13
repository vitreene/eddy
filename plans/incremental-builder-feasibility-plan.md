## Objectif

Evaluer la faisabilite d'un builder incrementiel qui ne reconstruit que les items impactes, avec propagation capsule->enfants, et sans regenerator CSS inutile quand aucune nouvelle classe n'est requise.

## Constat actuel

- `buildScene` reconstruit tout a chaque flush (`applyVisibilityRules`, `applyCapsuleDefaultItemEvents`, `mapEvents`, `buildPlacementCss`, `createStyle`, `createRenderablesInDisplayOrder`).
- Dans `home.tsx`, chaque `sequenceFlushToken` fait `setScene(buildScene(state))`.
- `PlayerRunner` recree completement le player a chaque changement de `scene` (`render.innerHTML = ""` + nouveau `Player`).

## Faisabilite (niveau)

- Faisable techniquement: **oui**.
- Impact limite si on touche seulement le builder: **moyen** (le player est actuellement reconstruit completement).
- Gain maximal necessite 2 chantiers:
  1. builder incrementiel,
  2. consommation incrementielle cote player (eviter recreate total).

## Plan propose (sans implementation immediate)

### Phase 1 - Incrementation builder (coeur)

- Introduire un service `IncrementalSceneBuilder` stateful avec cache entre flush.
- Calculer un `dirty set` par entite (items, capsules, decors, events, contents, theme).
- Rebuilder seulement les renderables items/capsules sales, conserver les autres references.
- Conserver API de sortie compatible (`{ persos, events, styles }`) pour migration progressive.

### Phase 2 - Graphe d'impacts

- Regles d'invalidation minimales:
  - decor/content/event d'un item -> item dirty,
  - capsule dirty -> capsule renderable dirty + items descendants dirty selon type de changement,
  - changement `grid/type/itemIds/order` d'une capsule -> tous items de la capsule dirty,
  - changement cues/sceneContents -> events map potentiellement globale,
  - changement visibilite -> sous-arbre concerne dirty.
- Cas capsule: si la capsule est item-host, invalider aussi l'item host + descendants.

### Phase 3 - CSS classe-aware

- Maintenir des registres de classes generees:
  - placement (`areas`, `gridDefinitions`),
  - static classes (`ed-static-*`).
- Si un changement n'introduit/supprime aucune classe, ne pas regenerer `styles` (reference stable).
- Regle explicite: updates purement inline (ex. couleur non statique) ne touchent pas au bloc classes.

### Phase 4 - Events timeline incrementiels

- Indexer contributions par item dans `mapEvents`.
- Au flush, recomposer uniquement les buckets de temps impactes.
- Garder une reconstruction full fallback pour scenarios ambigus (safety).

### Phase 5 - Integration player (recommandee pour gains reels)

- Eviter la recreation complete du player a chaque flush.
- Ajouter un mode `applyScenePatch`/`update` pour persos/events/styles modifies.
- Conserver reconstruction full en fallback (feature flag).

## Points d'attention

- `applyVisibilityRules` et `applyCapsuleDefaultItemEvents` sont aujourd'hui globaux; les rendre incrementiels est non trivial.
- L'ordre d'affichage depth-first (`createRenderablesInDisplayOrder`) doit rester deterministe.
- Les transitions `move` sont sensibles aux deltas de classes/placement: toute optimisation doit preserver l'ordre des changements.

## Strategy de deploiement

- Ajouter un feature flag `INCREMENTAL_BUILDER`.
- Instrumenter (temps build, nombre d'items rebuild, nombre de classes regenerees).
- Demarrer par Scene 1 de reference + smokes ciblant `move`, placement grille, events custom.

## Estimation

- Builder incrementiel seul: 3-5 jours (MVP fiable).
- Avec integration player incrementielle: +3-6 jours selon complexite d'update runtime.
