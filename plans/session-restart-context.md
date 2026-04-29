Contexte de reprise (repo: /Users/hervesaintmacary/Projets/vitreene/eddy)

Date: 2026-04-29
Branche: new-schema

Objectif actif:

- Corriger le comportement orientation scene 11 pour que portrait/landscape soient coherents en editeur et en diffusion.
- Contrainte produit confirmee: `@media (orientation: ...)` ne convient pas pour le cas editeur car cela lit le viewport, pas le container scene.

Etat de la discussion produit:

- Decision validee avec l'utilisateur:
  - baser l'orientation sur la geometrie de `.root-scene` (`width > height` => landscape, sinon portrait),
  - appliquer l'orientation via classes/attributs container (pas via media orientation pour la simulation),
  - garder un comportement identique entre ce que lit/fait le player en edition et en diffusion.
- Proposition recommandee:
  - ajouter `data-orientation="portrait|landscape"` sur `.root-scene`,
  - piloter toutes les regles orientees (grille root + zones + placement) via `.root-scene[data-orientation="..."] ...`,
  - detection via `ResizeObserver` sur le container scene,
  - option de force preview en editeur (override explicite).

Diagnostic technique capture:

- Cause principale: `@media (orientation: ...)` suit le viewport et peut contredire l'orientation simulee du player container.
- Cause secondaire observee: conflit de priorite CSS possible entre regles preview `.root-scene.ed-preview-orientation--*` et regles `@media`.

Travail deja en place avant cette reprise (orientation):

- Root preview class appliquee directement sur `.root-scene`.
- Resolver orientation root centralise (`app/lib/orientation-grid.ts`).
- Generation CSS root orientation preview + media (`app/scene-runtime/capsule-layout/layout-css.ts`).
- Fix zone editor 1x1 deja applique via `gridClassName` effectif dans l'editeur de zones.
- Tests orientation existants:
  - `tests/orientation-grid-fallback-smoke.ts`
  - `tests/root-orientation-grid-smoke.ts`
  - couverture builder associee dans `tests/builder-capsule-smoke.ts`

Etat git actuel (non commit):

- M app/parts/event-edit/index.tsx
- M package.json
- M prisma/dev.db
- ?? tests/event-edit-default-explicit-smoke.ts

Note importante:

- Aucun patch code supplementaire n'a encore ete applique dans cette session sur la partie detection orientation par container.

Prochaines etapes recommandees:

1. Introduire un deriveur runtime `resolveRootOrientationFromContainer(rect)` (width/height + garde anti-flicker).
2. Poser `data-orientation` sur `.root-scene` depuis le runtime player (source unique), avec override preview editeur si actif.
3. Migrer les regles root/zones/placements orientes pour prioriser `data-orientation` (et garder media seulement en fallback legacy si necessaire).
4. Ajouter un smoke test "container orientation overrides viewport media" pour verrouiller le contrat.
5. Revalider:
   - `npm run typecheck`
   - `npm run test:regression-lock`
   - `npx tsx tests/root-orientation-grid-smoke.ts`
   - `npx tsx tests/zone-orientation-merge-smoke.ts`

Script terminal de reprise:

```bash
cd /Users/hervesaintmacary/Projets/vitreene/eddy
git branch --show-current
git status --short
npm run typecheck
npm run test:regression-lock
npx tsx tests/root-orientation-grid-smoke.ts
npx tsx tests/zone-orientation-merge-smoke.ts
```

Donc pour votre cas (éditeur + conteneur simulé), il faut sortir de @media pour l’application orientationnelle.
Voici les solutions, de la moins intrusive à la plus “pure CSS”.
Solution recommandée (robuste)

- Ajouter une orientation explicite sur .root-scene via JS runtime:
  - .root-scene[data-orientation="portrait"]
  - .root-scene[data-orientation="landscape"]
- Calcul: landscape si width > height, sinon portrait, mesuré sur .root-scene (ou son viewport parent fixe).
- Appliquer toutes les règles orientation (grille root + zones + placements orientés) via ce sélecteur, pas via @media.
- Même code en éditeur et diffusion: un seul moteur de détection, donc comportement identique.
  Exemples de règles:
  .root-scene[data-orientation="portrait"] { /_ grid 9x16 _/ }
  .root-scene[data-orientation="landscape"] { /_ grid 16x9 _/ }
  .root-scene[data-orientation="portrait"] .ed-zone-hero { ... }
  .root-scene[data-orientation="landscape"] .ed-zone-hero { ... }
  Pourquoi c’est la meilleure option
- Non intrusive: on ne change pas le modèle de données, juste le mécanisme d’application CSS.
- Déterministe: plus d’ambiguïté viewport vs conteneur.
- Identique éditeur/diffusion: même logique de lecture/exécution.
- Compatible avec vos données actuelles orientationGrid et variantes de zones.
  Détails importants à prévoir
- Utiliser ResizeObserver sur le conteneur source de vérité.
- Ajouter une petite hystérésis autour de l’égalité (abs(w-h) < 2) pour éviter le flicker.
- Prévoir un mode forcedOrientation (utile pour simulation éditeur), qui écrase l’auto-détection quand actif.
- Fallback initial avant premier resize: orientation par défaut config (ex landscape) puis correction auto.
  Alternative 2 (hybride)
- Garder @media pour diffusion mobile native + ajouter la classe/data-orientation pour l’éditeur.
- Moins de diff immédiat, mais deux logiques concurrentes à long terme (plus fragile).
  Alternative 3 (container queries)
- @container (width > height) sur un conteneur nommé.
- Élégant en CSS pur, mais dépend plus du support navigateur/chaîne tooling, et plus délicat à unifier avec le player actuel.
  Si vous validez, je recommande d’implémenter la solution 1 avec:

1. détection orientation conteneur unique,
2. attribution data-orientation sur .root-scene,
3. migration des règles orientation root/zones vers ce sélecteur,
4. conservation optionnelle de @media seulement en fallback legacy.
