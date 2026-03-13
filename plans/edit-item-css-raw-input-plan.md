## Objectif

Retirer l'affichage de detail transform dans `edit-item` et le remplacer par un champ texte libre pour saisir des proprietes CSS "a la volee" (sans validation syntaxique), appliquees au decor de l'item.

## Plan d'action

- [x] Identifier le composant actuel de detail transform dans `item-edit` et retirer son rendu UI.
- [x] Ajouter un nouveau composant simple `RawCssInput` (textarea ou input multiline) dans `edit-item`.
- [x] Brancher ce composant pour ecrire le texte brut dans le decor de l'item (champ style existant, sans parsing strict).
- [x] Conserver le comportement actuel des autres sections d'edition item.
- [x] Appliquer un style avec scroll (`overflow: auto`) quand le contenu depasse.
- [x] Verifier typecheck.

## Verification cible

- `npm run typecheck`
- verification manuelle:
  - saisie CSS libre visible et persistante,
  - aucune validation bloquante,
  - scroll actif en cas de long contenu,
  - plus de detail transform affiche.

## Review

- Le bloc `TransformDebug` est retire de `app/components/style-editor/index.tsx`.
- Nouveau bloc `RawCssEditor` avec superposition `textarea` + `pre` (inspire de la piste CSS-Tricks), scroll synchronise, saisie libre sans validation bloquante.
- Le texte saisi est persiste dans `style.rawCss`.
- Parsing best-effort des declarations CSS ajoute:
  - `app/lib/raw-css.ts`
  - application live editor: `app/parts/item-edit/live-node-style.ts`
  - application player/build: `app/player/builder/styles.ts`
- `EditableStyle` et defaults/managed keys sont etendus pour `rawCss`:
  - `app/components/style-editor/types.ts`
  - `app/config/item-style-defaults.ts`
- Verification executee: `npm run typecheck` OK.
