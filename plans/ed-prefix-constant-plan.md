# Plan d'action — Prefixe de classes `ed-` centralise

## Objectif

Centraliser le prefixe de classes `ed-` dans une constante modifiable, puis remplacer les generations hardcodees pour utiliser cette source unique.

## Plan detaille

- [x] **1. Introduire une source unique du prefixe**
  - Creer un module de configuration dedie (ex: `app/config/class-prefix.ts`).
  - Exposer des helpers pour classes frequentes (`grid`, `item`, `caps`, `static`).

- [x] **2. Remplacer les usages hardcodes de generation `ed-`**
  - Grilles (`ed-grid-wX-hY`) dans presets + edition + defaults DB/tree.
  - Classes runtime `ed-item`, `ed-caps`, `ed-static-*` dans builder.

- [x] **3. Verification ciblee**
  - Compiler les modules touches.
  - Documenter ce qui reste hors scope (classes statiques de CSS/docs).

## Review (a completer apres implementation)

- Resultat: prefixe centralise dans `app/config/class-prefix.ts` (base `GRID_DEFAULT_PREFIX`), avec helpers communs (`buildEditorGridClassName`, `EDITOR_ITEM_CLASS`, `EDITOR_CAPSULE_CLASS`, `EDITOR_STATIC_STYLE_CLASS_PREFIX`).
- Resultat: les generations runtime hardcodees `ed-` sont remplacees pour grilles, classes `item/caps`, et classes statiques builder.
- Tests/commandes executes: `npx tsx -e "import './app/config/class-prefix.ts'; import './app/config/capsule-presets.ts'; import './app/player/builder/entities.ts'; import './app/player/builder/styles.ts'; import './app/parts/item-edit/capsule-edit.tsx'; import './app/parts/item-edit/scene-edit.tsx'; import './app/provider/tree-mutations.ts'; import './app/api/db.ts';"`.
- Limites connues: certaines occurrences `ed-` restent dans commentaires/documentation; les classes statiques ecrites en CSS brut hors generation runtime ne peuvent pas etre parametrees par constante TS.
