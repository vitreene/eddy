# Plan d'action — Source unique de vérité pour EditTransform

Objectif: utiliser `scene-logic` comme source métier unique pour les transforms, et réserver les mesures DOM aux besoins visuels runtime (overlay/sélection + transitions implicites).

## Phase 1 — Cadrage et instrumentation

- [ ] **Cartographier les flux de données transform**
  - Entrées: `decor`, `custom-event decor`, defaults
  - Sorties: `item-edit`, `player`, `overlay`
  - Identifier toutes les lectures DOM qui alimentent l'état métier

- [ ] **Ajouter une instrumentation temporaire ciblée (`item_53`)**
  - Comparer à chaque sélection: `scene originX/Y` vs `DOM transformOrigin`
  - Comparer après `play/seek/reselect`
  - Conserver les logs jusqu'à validation finale

## Phase 2 — Source de vérité logique

- [ ] **Créer un selector canonique de transform côté scene-logic**
  - Fusionner `decor` de base + `event decor` actif
  - Appliquer defaults explicites (origin centré, scale 1, etc.)
  - Exposer un `TransformState` unique consommable par l'UI
  - En cours: `EditItem` fournit déjà un `transformValue` dérivé de l'état `decor` fusionné

- [x] **Brancher `EditTransform` sur ce selector (mode contrôlé)**
  - `value` vient uniquement de `scene-logic`
  - `onCommit` met à jour `scene-logic`
  - Ne plus dériver l'état métier via `readTransformPreserve`
  - Fait: `EditTransform` reçoit `value` depuis `EditItem` (`decor.style`) et la machine fusionne cette valeur en priorité

## Phase 3 — Séparation logique vs runtime visuel

- [x] **Conserver les mesures DOM uniquement pour l'overlay**
  - Le cadre de sélection reste aligné via matrice DOM réelle
  - Aucun backflow DOM -> état métier
  - Fait: `buildFrame` continue de mesurer la géométrie DOM, tandis que les champs transform métier viennent de `value`

- [ ] **Limiter le player aux calculs implicites runtime**
  - Grid auto / reflow / move implicite: calcul runtime autorisé
  - Interdire la réinjection de ces valeurs dans `decor`
  - Progression: extraction de procédures partagées runtime (`applyVisibilityRules`, `buildCapsuleBehaviorById`) réutilisées par builder + active-cue

## Phase 4 — Nettoyage des points de divergence

- [ ] **Réviser les snapshots runtime `move`**
  - Garder uniquement les champs techniques nécessaires à l'interpolation
  - Retirer toute lecture d'origin depuis anime/DOM pour alimenter la logique

- [ ] **Rendre explicite `transformOrigin` à la projection builder**
  - Dériver systématiquement depuis `originX/Y` logiques
  - Éviter les fallbacks implicites instables

## Phase 5 — Validation et non-régression

- [x] **Ajouter/mettre à jour des tests de non-régression**
  - Cas: sélection initiale -> lecture -> re-sélection
  - Vérifier que l'origin reste stable
  - Vérifier que le live update item-edit reste immédiat (incluant slot)
  - Ajouté: test d'alignement coordonnées écran élément/cadre avec transform + slot + margin + origin (`tests/transform-overlay-alignment-smoke.ts`)

- [ ] **Valider le scénario réel `scene 1 / item_53`**
  - Pivot centré en sélection initiale
  - Pas de bascule à `0,0` après lecture
  - Overlay toujours correctement aligné

## Phase 6 — Finalisation

- [ ] **Retirer l'instrumentation temporaire**
- [ ] **Documenter la règle d'architecture**
  - `scene-logic` = source métier
  - DOM = projection / mesure visuelle uniquement
