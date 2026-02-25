# Migration grille CSS vers le builder

- [ ] **Couper l'ecriture du CSS de grille dans l'editeur**  
       Dans `app/parts/item-edit/index.tsx:97`, garder `onChangeGrid` pour mettre a jour `capsule.grid`, mais supprimer l'envoi `send({ type: "theme-update", payload: { generated: ... } })`.

- [ ] **Conserver uniquement la classe dans le modele**  
       Verifier que `onChangeGrid` ne persiste que le nom de classe (`ed-grid-wX-hY`) via `capsule-update` dans `app/parts/item-edit/index.tsx:100`.

- [ ] **Generer le CSS des grilles dans le builder**  
       Dans `app/player/builder/builder.ts`, ajouter une etape qui parcourt `snapshot.capsules`, recupere les `capsule.grid` uniques, et produit les definitions CSS correspondantes (comme pour `areas`).

- [ ] **Brancher ce CSS dans `createStyle`**  
       Modifier `createStyle` dans `app/player/builder/builder.ts:59` pour concatener :
  1. `snapshot.theme?.custom`
  2. CSS grilles genere depuis les capsules
  3. `areas.join("\n")`  
     (et retirer la dependance a `snapshot.theme?.generated` pour les grilles).

- [ ] **Creer/reutiliser un helper de conversion classe->regle CSS**  
       Eviter la logique UI dans le builder : extraire la logique de grille vers un util partageable (ex. dans `app/lib/utils.ts`) puis l'utiliser cote builder (et eventuellement cote `draw-grid.tsx` pour eviter la duplication).

- [ ] **Nettoyer `scene-logic` lie au theme genere par grille**  
       Dans `app/provider/scene-logic.ts`, retirer le lien implicite grid -> `themeTouched` (actuellement dans `capsule-update`) et supprimer la persistance `/api/theme` declenchee uniquement pour la grille.

- [ ] **Nettoyage optionnel (recommande)**  
       Si `theme-update` ne sert plus du tout dans le repo, supprimer l'event/type/action associes dans `app/provider/scene-logic.ts` pour eviter le code mort.

- [ ] **Verifier les regressions fonctionnelles**  
       Tester manuellement : redimensionner une capsule, changer d'item, commit, reload de page. La grille doit rester correcte sans nouvelle entree dans `theme.generated`.

- [ ] **Verifier le CSS final genere**  
       Controler que les classes `ed-grid-w*-h*` presentes dans les capsules ont bien leur regle dans `styles` genere par `buildScene` (`app/player/builder/builder.ts`).
