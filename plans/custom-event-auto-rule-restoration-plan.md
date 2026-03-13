# Plan d'action — Restauration regle auto custom-event

## Objectif

Retablir la regle coeur editeur: un repositionnement custom-event doit produire par defaut un deplacement auto cote builder (`move:true`/`move:{mode:"auto"}`), et l'absence de process auto doit rester une exception.

## Plan detaille

- [x] Mettre a jour la configuration par defaut des options custom-event pour privilegier le process auto.
- [x] Corriger la detection builder des repositionnements classes (`cell-span`, `cell_layout_auto`, `liste-r*`) pour generer un `move` auto.
- [x] Conserver la compatibilite des exceptions explicites (ex: desactivation auto pour style-only) sans casser les repositionnements structurels.
- [x] Lister les usages de `auto` dans le code, par categorie metier.
- [x] Verifier build et documenter le resultat.

## Review (a completer apres implementation)

- Resultat:
- Verification executee:
- Liste usages `auto`:

- Resultat:
  - Valeur par defaut des options custom-event basculee sur `auto: true`.
  - Le builder detecte maintenant aussi les deltas de classes de placement (`cell-span`, `cell_layout_auto`, `liste-r*`) pour declencher `move: { mode: "auto" }`.
  - Les exceptions explicites restent possibles pour les deltas purement style (`x/y/width/height`) via `auto: false`.
- Verification executee:
  - `npm run build` (OK).
- Liste usages `auto`:
  - Custom-event auto options: `app/config/custom-events.ts`, `app/provider/scene-logic.ts`, `app/parts/event-edit/index.tsx`, `app/player/builder/entities.ts`.
  - Player auto move runtime: `app/player/builder/entities.ts`, `app/player/types.ts`, `app/player/deps/on-update.ts`, `app/player/player.ts`.
  - Auto placement classes (layout): `app/scene-runtime/capsule-layout/layout-css.ts`, `app/parts/item-edit/item-edit.grid-placement.ts`, `app/parts/item-edit/live-node-classes.ts`, `app/player/builder/styles.ts`.
  - Autres usages `auto` non lies au move custom-event: `itemDurationMode` (capsules) dans `app/api/db.ts`, `app/api/capsule.ts`, `app/provider/tree-mutations.ts`, `app/parts/item-edit/capsule-edit.tsx`; auto cue windows dans `app/scene-runtime/visibility/resolve-cue-windows.ts`; langue Whisper `"auto"` dans `app/whisper/hooks/useTranscriber.ts`.
