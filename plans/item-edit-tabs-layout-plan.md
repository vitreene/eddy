# Item Edit Tabs Layout Plan

## Contexte

- Le panneau item-edit deborde souvent du layout.
- Demande: organiser en tabs Shadcn.
- Tabs voulus:
  - `presets`: uniquement edition du titre (capsule) ou texte (content type `text`),
  - `layout`: typo, couleurs, marges,
  - `advanced`: positions + CSS brut.
- Les boutons reset restent visibles au-dessus des tabs.
- Scene edit ne doit pas etre impacte (pas de tabs scene).

## Checklist

- [x] Etendre `StyleEditor` pour supporter un rendu par mode (`full/layout/advanced/preset`) et pouvoir masquer sa toolbar interne.
- [x] Mettre en place les tabs + toolbar reset/copy dans `ItemEditPanel`.
- [x] Mettre en place les tabs + toolbar reset/copy dans `CapsuleEdit` (preset = nom capsule).
- [x] Garder `SceneEdit` inchange.
- [x] Verifier typecheck.

## Verification

- [x] Relecture diff `style-editor`, `item-edit-panel`, `capsule-edit`.
- [x] Validation statique: reset/copy toujours visibles au-dessus des tabs, scene sans tabs.

## Review

- `StyleEditor` accepte desormais `mode` (`full/layout/advanced/preset`) et `showToolbar` pour reutilisation par onglets.
- `ItemEditPanel` utilise des tabs Shadcn avec toolbar reset/copy fixe en haut; `presets` ne contient que l'edition texte pour `content.type === text`.
- `CapsuleEdit` utilise des tabs Shadcn avec toolbar reset/copy fixe; `presets` contient uniquement le nom capsule.
- `layout` regroupe typo/couleurs/marges; `advanced` regroupe positions + CSS brut (et les controles capsule existants).
- `SceneEdit` reste inchangé (pas de tabs).
- Typecheck valide (`npm run typecheck`).
