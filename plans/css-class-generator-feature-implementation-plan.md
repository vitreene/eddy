# Plan d'application — Feature CSSClassGenerator

## Objectif

Construire et brancher `CSSClassGenerator` comme source unique de generation des classes/definitions de position,
en deplacant les donnees metier vers `decor.style.itemPosition`.

Contexte de livraison:

- Pas de retrocompat produit cible.
- Compatibilite temporaire autorisee uniquement pour maintenir les tests pendant la migration.
- Nettoyage de ces patches temporaires requis avant finalisation.

## Perimetre

- Classe `CSSClassGenerator` + configuration v1 simple.
- Remplacement des generateurs de classes eparpilles.
- Amenagements `item-edit` (lecture/ecriture `itemPosition`, live preview).
- Conversion des decors existants en base vers `style.itemPosition`.

## Etapes

### 1) Contrat de donnees `itemPosition`

- [x] Definir le schema TS v1 de `style.itemPosition` (grid area/span/zone + orientation optionnelle).
- [x] Ajouter `itemPosition` a `EditableStyle` (`app/components/style-editor/types.ts`).
- [x] Adapter sanitization/persist (`app/config/item-style-defaults.ts`) pour conserver `itemPosition`.
- [x] Verifier que `normalizeDecorPayload` et persist decor ne suppriment pas `itemPosition` (`app/api/decor.ts`).

### 2) Classe `CSSClassGenerator`

- [x] Creer `app/lib/css-class-generator.ts`.
- [x] Implementer les methodes v1 validees (`getToken`, `submit`, `submitMany`, `setOrientationEnabled`, `renderStyleSheet`, `clear`, `parse`).
- [x] Implementer state interne (base rules + media buckets) avec dedupe.
- [x] Integrer prefixe global (hors config) depuis la constante projet.

### 3) Configuration v1 du generateur

- [x] Creer un module de config `CSSClassGenerator` (noms de classes explicites + build suffix + build definitions).
- [x] Definir les kinds initiaux: `grid.container`, `grid.area`, `grid.span`, `grid.zone`.
- [x] Factoriser l'enveloppe `@media` au niveau moteur (pas dans chaque rule).
- [x] Valider que les formats produits pour `grid.container`, `grid.area`, `grid.span` sont strictement alignes avec l'existant.

### 4) Remplacement des fonctions eparpillees

- [x] Remplacer la generation `buildEditorGridClassName` / `gridWHClassName` par des appels au generateur.
- [x] Remplacer `classNameToCssDefinition` / `gridPlacementClassNameToCssDefinition` / `gridClassNameToCssDefinition` par des wrappers sur le generateur (phase transitoire).
- [x] Remplacer generation dynamique dans `app/player/builder/styles.ts` et `app/scene-runtime/capsule-layout/layout-css.ts`.
- [x] Mettre a jour `live-node-classes` pour utiliser les artifacts du generateur.

### 5) Amenagements item-edit

- [x] Lire la position depuis `decor.style.itemPosition` comme source metier.
- [x] Ecrire les modifications position dans `decor.style.itemPosition` (pas seulement `area`/`className`).
- [x] Garder le rendu live coherant (node class + CSS definitions injectees).
- [x] Verrouiller les flux event-context (intro/custom/outro) avec la nouvelle source position.

### 6) Conversion BDD des decors

- [x] Ecrire un script de conversion des decors existants vers `style.itemPosition`.
- [x] Convertir `area`/`className` existants vers donnees metier `itemPosition`.
- [x] Executer la conversion sur la base de dev.
- [x] Verifier echantillon de decors convertis (avant/apres).

### 7) Compatibilite temporaire tests (explicite et retiree)

- [x] Introduire des bridges temporaires minimaux pour laisser passer les tests pendant migration.
- [x] Taguer clairement ces bridges (`TEMP_COMPAT_TESTS`) et centraliser leur localisation.
- [x] Retirer tous les bridges temporaires avant cloture.

### 8) Verification finale

- [x] Ajouter des tests unitaires `CSSClassGenerator` (token, dedupe, media grouping, render stylesheet).
- [x] Mettre a jour les smokes impactes (`item-edit`, `layout-css`, `builder styles`).
- [x] Executer `npm run typecheck`.
- [x] Executer les smokes cibles et verifier l'absence de regression fonctionnelle.
- [x] Verifier qu'aucun appel ne depend encore des anciennes fonctions hors wrappers explicitement temporaires.

## Definition of done

- [x] `itemPosition` est la source metier de position.
- [x] `CSSClassGenerator` est la source unique de generation classes/definitions.
- [x] Les fonctions historiques eparpillees ne portent plus de logique dupliquee.
- [x] Les patches temporaires de compat tests sont supprimes.
- [x] Les decors de la base dev sont convertis.

## Review

- Resultat:
  - `CSSClassGenerator` v1 implementee avec config centralisee et state interne (`baseRules` + buckets `@media`).
  - Generation de classes/definitions unifiee (container/area/span/zone), avec wrappers compat sur les fonctions historiques.
  - `itemPosition` introduit dans `style` et utilise pour resoudre les tokens de placement (runtime + item-edit).
  - Parsing placement duplique factorise dans `app/lib/item-position.ts` et reutilise dans services position editor.
  - Script de migration BDD ajoute et execute (`42` decors convertis sur `81`).
  - Bridges temporaires `TEMP_COMPAT_TESTS` retires apres migration BDD; persistance position via `style.itemPosition` uniquement.
- Verification executee:
  - `npm run typecheck` (OK)
  - `npm run migrate:item-position` (OK)
  - `npx tsx tests/css-class-generator-smoke.ts` (OK)
  - `npx tsx tests/item-position-smoke.ts` (OK)
  - `npx tsx tests/builder-capsule-smoke.ts` (OK)
  - `npx tsx tests/builder-slot-style-smoke.ts` (OK)
  - `npx tsx tests/item-edit-live-smoke.ts` (OK)
  - `npx tsx tests/item-edit-smoke.ts` (OK)
  - `npx tsx tests/item-edit-decor-resolution-smoke.ts` (OK)
  - `npx tsx tests/editable-visual-state-smoke.ts` (OK)
  - `npx tsx tests/auto-placement-lock-smoke.ts` (OK)
  - `npx tsx tests/transform-editor-smoke.ts` (OK)
  - `npx tsx tests/transform-overlay-alignment-smoke.ts` (OK)
  - `npx tsx tests/content-api-smoke.ts` (OK)
  - Note: `tests/active-cue-smoke.ts` echoue sur une attente existante non liee au perimetre classes/position.
