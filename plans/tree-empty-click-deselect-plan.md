# Tree Empty Click Deselect Plan

## Contexte

- Besoin: quand un item est selectionne, cliquer dans une zone vide du composant tree doit deselectionner l'item.
- Contraintes: conserver les comportements existants de selection/edition du tree.

## Checklist

- [x] Identifier le composant tree qui gere la selection active (`active.itemId`).
- [x] Ajouter un handler de click sur fond vide qui envoie `active-set` avec `itemId: null` (et reset event associe si necessaire).
- [x] S'assurer que le click sur un item ne declenche pas la deselection via propagation ciblee.
- [x] Valider le typecheck.

## Verification

- [x] Relecture diff sur le composant tree.
- [x] Validation statique: deselection seulement sur zone vide.

## Review

- `SceneTreeView` reutilise `tree.getContainerProps()` et ajoute un `onClick` de fond qui ne s'active que si `event.target === event.currentTarget` (zone vide).
- En zone vide avec item actif: `tree.setSelectedItems([])` puis `active-set` avec `{ itemId: null, event: null }`.
- Les clics sur lignes/items ne deselectionnent pas (cible differente), donc comportement existant conserve.
- Typecheck OK (`npm run typecheck`).
