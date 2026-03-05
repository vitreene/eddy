## Objectif

Implementer dans `EditTransform` le deplacement de position via le losange (haut-gauche), en ajoutant un mode drag avec grille de drop clonee depuis le conteneur parent, sans toucher aux valeurs de `transform`.

## Plan d'action

- [x] Cadrer la spec fonctionnelle (modes liste vs autres modes, positions stables, cycle drag-start/drag-end, rendu visuel des cellules).
- [x] Cartographier le flux existant (`EditTransform` + `ItemTransformEditor` + mutations tree/reorder) et identifier les points d'integration minimaux.
- [x] Ajouter l'etat de session de drag "reposition" (item actif, parent grille, cellule survolee/selectionnee, destination).
- [x] Implementer `drag-start`: creer un clone overlay du parent avec meme structure de grille (classes/styles/attributs) et injecter une zone drop par cellule.
- [x] Implementer le feedback visuel des cellules drop (blanc 15%, outline pointille opaque, 60% si selectionnee) et l'etat de survol/selection.
- [x] Faire suivre l'item drague au-dessus du clone pendant le drag (preview mobile avec le curseur, sans commit immediate).
- [x] Convertir la cellule cible en position finale (classe CSS de slot equivalente au process actuel `SlotEditor`).
- [x] Brancher la logique de commit selon le mode parent:
- [x] En mode liste: appliquer un reorder (ordre de liste modifie) et propager la mise a jour Tree.
- [x] Dans les autres modes: positionner l'item dans la cellule cible sans deplacer les autres items (positions stables).
- [x] Implementer `drag-end`: supprimer le clone overlay, nettoyer tous les listeners/etats temporaires, puis appliquer le commit final unique.
- [x] Refactoriser `ItemTransformEditor` en separant logique et presentation (hook de logique dedie + composant de rendu).
- [x] Introduire une machine XState locale dediee a l'editeur de transform (hors `scene-logic`) pour piloter l'etat d'interaction UI.
- [ ] Verifier la non-regression: aucune mutation des valeurs `transform` pendant cette operation; tests manuels + validation technique.

## Journal

- 2026-03-05: Plan initialise et enregistre dans `plans/edit-transform-reposition-plan.md`.
- 2026-03-05: Cartographie terminee: `EditTransform` delegue a `ItemTransformEditor`; commit centralise dans `app/parts/item-edit/index.tsx`; reorder tree exploitable via event `tree-move-item`.
- 2026-03-05: `cell-snap` remplace par une session de reposition drag avec clone du parent, cellules de drop, ghost draggable et selection de cellule active.
- 2026-03-05: Commit `cell-snap` adapte: en mode liste => `tree-move-item` (reorder + update Tree), autres modes => `decor.area` en format `cell-rX-cY`; aucune ecriture des champs transform.
- 2026-03-05: Validation technique executee (`npm run typecheck` OK). Validation manuelle visuelle encore a faire.
- 2026-03-05: Smoke tests executes (`npm run test:smoke` OK). Validation manuelle de l'interaction drag/drop reposition encore a faire.
- 2026-03-05: Ajustement implementation: parent clone pris via scene-logic (capsule de l'item actif) au lieu d'une recherche DOM; cellules calculees depuis la config de grille capsule (meme logique que `CapsuleGridTypeSelector` via `getValuesFromGridName`), avec padding visuel leger.
- 2026-03-05: Ajustements UX/bugs: cellules de drop rendues par la grille (plus d'absolu), visibilite renforcee (0.8 / 1), masquage temporaire de l'item source pendant drag, resolution du parent clone via `snapParentId` pour eviter le bug de premiere selection.
- 2026-03-05: Simplification structure cellules: une seule div par cellule (sans imbrication) + styles mutualises via classes CSS (`.vte-reposition-cell`, `.vte-reposition-cell-active`) dans `app/app.css`.
- 2026-03-05: Ajustement grille reguliere: suppression du positionnement explicite `gridRow/gridColumn` des cellules (auto-placement grid), + resync force du cadre d'edition apres drop `cell-snap` pour eviter la dissociation visuelle.
- 2026-03-05: Fix drop/reliability: suppression du mode persistant du clone de grille, destruction systematique a la fin du drag, et selection de cellule cible prioritaire par inclusion du pointeur (fallback distance) pour fiabiliser la destination de drop.
- 2026-03-05: Refactor architecture: logique migree dans `app/components/position-editor/visual-transform-grid.logic.ts`, composant React reduit au rendu dans `app/components/position-editor/visual-transform-grid.tsx`.
- 2026-03-05: Machine XState ajoutee dans `app/components/position-editor/visual-transform-grid.machine.ts` pour gerer l'etat drag/hide overlay independamment de `scene-logic`.
- 2026-03-05: Rollback de la tentative de refactor split (retour a un composant unique `visual-transform-grid.tsx`) suite a non-conformite de l'approche (logique encore couplee a React via delegation de hooks).

## Plan refactor logique/rendu (propose)

- [ ] Creer une machine XState dediee `transform-editor.machine.ts` qui porte tout l'etat d'interaction (idle, dragging move/rotate/resize/origin/cell-snap, commit, cleanup).
- [ ] Definir un service pur (sans React, sans JSX) `transform-editor.service.ts` pour les calculs et effets imperatifs DOM (mesure, clone grid, ghost, target detection, transform math, sync frame).
- [ ] Exposer une API de pont minimale entre React et la logique (`attach`, `detach`, `startDrag`, `updatePointer`, `endDrag`, `setContext`) avec entrees/sorties serialisables.
- [ ] Remplacer les `useState/useRef` metier par un actor XState unique instancie dans le composant, React ne gardant que des refs de noeuds (render-only shell).
- [ ] Isoler le rendu dans un composant presentational pur (`TransformEditorView`) recevant uniquement des props derivees de la machine (frame, visibilite handles, callbacks).
- [ ] Brancher la persistance (`onCommit`) exclusivement sur les sorties de machine (event `commit.ready`) pour garantir un point unique de commit.
- [ ] Ajouter des tests de machine/services (transitions, selection cellule, commit meta) puis verifier la non-regression visuelle manuellement.
- [x] Creer une machine XState dediee `transform-editor.machine.ts` qui porte tout l'etat d'interaction (idle, dragging move/rotate/resize/origin/cell-snap, commit, cleanup).
- [x] Definir un service pur (sans React, sans JSX) `transform-editor.service.ts` pour les calculs et effets imperatifs DOM (mesure, clone grid, ghost, target detection, transform math, sync frame).
- [x] Exposer une API de pont minimale entre React et la logique (`attach`, `detach`, `startDrag`, `updatePointer`, `endDrag`, `setContext`) avec entrees/sorties serialisables.
- [x] Remplacer les `useState/useRef` metier par un actor XState unique instancie dans le composant, React ne gardant que des refs de noeuds (render-only shell).
- [x] Isoler le rendu dans un composant presentational pur (`TransformEditorView`) recevant uniquement des props derivees de la machine (frame, visibilite handles, callbacks).
- [x] Brancher la persistance (`onCommit`) exclusivement sur les sorties de machine (event `commit.ready`) pour garantir un point unique de commit.
- [x] Ajouter des tests de machine/services (transitions, selection cellule, commit meta) puis verifier la non-regression visuelle manuellement.

- 2026-03-05: Refactor execute vers architecture machine+service: `visual-transform-grid.tsx` devient shell de rendu pilote par `transformEditorMachine` + `TransformEditorDomService`.
- 2026-03-05: Ajout des fichiers `app/components/position-editor/transform-editor.machine.ts` et `app/components/position-editor/transform-editor.service.ts` (sans React/JSX).
- 2026-03-05: Ajout d'un smoke test dedie `tests/transform-editor-smoke.ts` et integration dans `npm run test:smoke`.
- 2026-03-05: Validation automatisee apres refactor: `npm run typecheck` OK, `npm run test:smoke` OK.
- 2026-03-05: Deplacement final de l'effet `applyTransformLive` hors composant React vers `TransformEditorDomService`, declenche depuis la machine (`applyLiveTransform`).

## Notes

- Les cases seront cochees au fil de l'avancement reel de l'implementation.
