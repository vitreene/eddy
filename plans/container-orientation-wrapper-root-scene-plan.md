# Plan: Migration orientation vers `@container` avec `wrapper-root-scene`

Date: 2026-04-30
Branche: `new-schema`

## Contexte et décisions validées

- Pas de legacy pour ce POC: suppression des règles `@media (orientation: ...)` sur ce sujet.
- Application orientationnelle runtime en CSS via `@container`, pas via logique orientation du player.
- L'éditeur conserve `previewOrientation` pour l'édition (projection et génération des classes/variantes).
- Le wrapper externe de diffusion est inconnu: on ne dépend pas de sa structure/CSS.
- Architecture retenue: insertion d'un `wrapper-root-scene` interne, entre l'hôte runtime et `.root-scene`.

## Objectif technique

Basculer toutes les règles orientées (grille root, zones, placements orientés) de `@media` vers `@container`, avec un conteneur nommé porté par `wrapper-root-scene` (interne à la séquence), tout en conservant les classes preview éditeur.

## Plan d'intervention

### 1) Introduire le wrapper interne de conteneur

- [x] Définir une constante runtime pour le wrapper (ex: `ROOT_WRAPPER = "root-scene-wrapper"`).
- [x] Créer/insérer ce nœud dans le flux de rendu player entre l'hôte (`render`) et `.root-scene`.
- [x] Garantir que `.root-scene` reste parent direct de ses descendants existants (pas d'intermédiaire entre `.root-scene` et ses enfants).
- [x] Vérifier que les scènes existantes continuent de se monter sans modifier les données stockées.

### 2) Déclarer le conteneur CSS nommé

- [x] Ajouter sur `.root-scene-wrapper`:
  - `container-type: size;`
  - `container-name: scene;`
- [x] Conserver les contraintes de dimensionnement/aspect ratio de `.root-scene`.
- [x] Vérifier qu'aucune règle globale n'écrase ces propriétés dans l'éditeur.

### 3) Migrer la grille orientée de `.root-scene`

- [x] Dans `app/scene-runtime/capsule-layout/layout-css.ts`, remplacer les blocs:
  - `@media (orientation: portrait){...}`
  - `@media (orientation: landscape){...}`
  par:
  - `@container scene (aspect-ratio <= 1/1){...}`
  - `@container scene (aspect-ratio > 1/1){...}`
- [x] Conserver les règles `.root-scene.ed-preview-orientation--portrait|landscape`.

### 4) Migrer les règles de zones orientées

- [x] Dans `app/lib/position-zones.ts`, remplacer media orientation par container queries nommées `scene`.
- [x] Conserver les règles preview éditeur `.ed-preview-orientation--*`.

### 5) Migrer les placements orientés tokenisés

- [x] Dans `app/lib/oriented-placement.ts`, remplacer media orientation par container queries nommées `scene`.
- [x] Conserver la règle de base et les overrides preview éditeur.

### 6) Supprimer les dépendances `@media` orientation côté génération

- [x] Rechercher `@media (orientation:` dans le code.
- [x] Éliminer toute émission orientationnelle restante sur root/zones/placements.
- [x] Confirmer qu'aucune règle équivalente n'est réintroduite par un autre module.

### 7) Mettre à jour et compléter les tests

- [x] Mettre à jour:
  - `tests/root-orientation-grid-smoke.ts`
  - `tests/builder-capsule-smoke.ts`
  - `tests/oriented-placement-smoke.ts`
- [x] Remplacer les assertions `@media` par des assertions `@container scene (aspect-ratio ...)`.
- [x] Garder les assertions sur `.ed-preview-orientation--*`.
- [x] Ajouter un smoke test de contrat: aucune sortie CSS générée ne contient `@media (orientation:` pour ces règles.

### 8) Vérification finale

- [x] `npm run typecheck`
- [ ] `npm run test:regression-lock`
- [x] `npx tsx tests/root-orientation-grid-smoke.ts`
- [x] `npx tsx tests/zone-orientation-merge-smoke.ts`
- [x] `npx tsx tests/oriented-placement-smoke.ts`
- [x] `npx tsx tests/orientation-container-contract-smoke.ts`
- [ ] Vérification manuelle éditeur: toggle orientation preview continue d'éditer/projeter correctement portrait/landscape.

## Contrôles DB (scene 11)

- Contrôle demandé: vérifier que la scène 11 n'a pas de dépendance directe à une règle media explicite.
- Résultat: aucune occurrence `@media` trouvée dans les données liées à la scène 11 (scene/theme/capsule/decor/scene_content).
- Résultat global DB: aucune occurrence `@media (orientation:` trouvée dans `theme.custom`, `theme.generated`, `capsule.profil`, `decor.style`.

## Risques et parades

- Risque: insertion wrapper casse l'ordre de montage DOM.
  - Parade: ajout minimal dans le chemin de création des éléments, sans changer la hiérarchie interne de `.root-scene`.
- Risque: divergence éditeur vs diffusion.
  - Parade: même CSS générée orientée `@container`; preview éditeur conservée uniquement comme override de simulation.
- Risque: conflit de spécificité.
  - Parade: ordonner les règles générées et conserver une structure de sélecteurs homogène root/zones/placements.

## Review (à compléter après implémentation)

- [x] Diff final validé.
- [x] Tests passants.
- [x] Contrat orientation container-first confirmé.

Notes review:

- Le wrapper runtime `#root-scene-wrapper` est injecté entre `#container-scene` et `.root-scene`.
- Les règles orientationnelles root/zones/placements ne génèrent plus de `@media (orientation: ...)`.
- La génération CSS produit désormais des `@container scene (aspect-ratio ...)` pour portrait/landscape.
