# Plan d'action — Deux circuits de transition (`auto` vs `transform`)

Objectif: séparer clairement les intentions utilisateur.

- Circuit `auto` (ancien `move`): déplacement automatique entre positions (slot/grid/reflow).
- Circuit `transform`: édition fine des transformations (sans automatisme de move).

## Phase 1 — Contrat fonctionnel

- [x] **Nommer le mode UI**
  - `move` devient `auto` dans l'interface.
  - Option associée: `Effacer transformations`.

- [x] **Définir les déclencheurs `auto`**
  - Actions de position: `slotEditor` (`area`) et `editTransform` (`x/y/width/height`).

- [x] **Définir les 2 comportements du circuit `auto`**
  - Sans option: figer l'état transform courant pendant le move.
  - Avec `Effacer transformations`: finir le move avec transform par défaut (ex: `scale -> 1`).

## Phase 2 — Données et persistance

- [x] **Encoder le mode `auto` dans les custom-events**
  - Stockage dans `event.ref` (JSON) pour éviter migration DB.
  - Valeurs: `auto` (bool), `clearTransforms` (bool).

- [x] **Étendre `scene-logic` pour lire/écrire ces options**
  - `custom-event-create` initialise les options.
  - `custom-event-update` met à jour les options.

## Phase 3 — Builder

- [x] **Remplacer `move: true` booléen par un objet structuré**
  - `move: { mode: "auto", clearTransforms: boolean }`.

- [x] **Détecter les actions de position côté builder**
  - Déclencher le circuit `auto` uniquement pour changements de position (slot/x/y/size).

- [x] **Éviter les collisions avec `style`**
  - Si `auto` actif, retirer les clés de position de l'interpolation `style`.
  - Conserver la génération des classes CSS de slot dans `styles`.

## Phase 4 — Player

- [x] **Interrompre proprement la transition en cours sur `auto`**
  - Réutiliser le mécanisme existant de remplacement de transition move.

- [x] **Exécuter le mode `auto` structuré**
  - `auto` simple: FLIP positionnel.
  - `auto + Effacer transformations`: FLIP + retour vers defaults transform.

## Phase 5 — UI (item-edit)

- [x] **Ajouter les cases à cocher dans l'édition d'event custom**
  - `Auto`.
  - `Effacer transformations` (active seulement si `Auto` coché).

## Phase 6 — Tests

- [x] **Ajouter test builder: classe slot écrite dans `styles`**
  - Vérifier que `.cell-rX-cY` est bien présente si position custom appliquée.

- [x] **Ajouter test circuit auto structuré**
  - Vérifier que le payload `move` sort en objet.
  - Vérifier que `clearTransforms` modifie le comportement attendu.

- [ ] **Valider manuellement `scene 1 / item_53`**
  - Pas de saut brusque.
  - Slot appliqué + style CSS présent.
  - `auto` et `Effacer transformations` visibles et effectifs.
