# Plan — Zones `position` (controle strict)

## Cadre

- Le type libre cible est `position`.
- `card` est reserve a une autre fonctionnalite (hors scope ici).
- On reprend en mode plan uniquement: implementation suspendue tant que le plan n'est pas verrouille.

## Regles anti-derive

- Avancer par phases courtes, avec validation explicite a la fin de chaque phase.
- Ne pas ajouter de UI annexe dans une phase (pas de boutons/listes si la phase concerne seulement l'overlay).
- Ne pas coupler plusieurs objectifs (overlay visuel + persistence + edition) dans la meme phase.
- Pas de fallback implicite non valide dans le plan.

## Definition du type libre

- Le mode zones ne s'active que pour capsule `position`.
- Le mode zones doit etre accessible:
  - depuis une capsule `position` selectionnee,
  - depuis la capsule-root `__MAIN__` de la scene.

## Plan par phases

### Phase 0 — Base propre (etat courant)

- [x] Revenir a un etat code stable (pas de flux zones partiellement actif).
- [x] Conserver uniquement les documents de plan.

Critere de sortie:

- Le repo ne contient plus de composants zones actifs cote runtime/UI.

### Phase 1 — Overlay clone exact (visuel uniquement)

- [x] Creer un overlay qui superpose la capsule cible.
- [x] Rendu overlay = clone minimal de la div capsule:
  - meme `className`,
  - aucun enfant,
  - aucune interaction metier.
- [x] Positionnement identique au cadre de selection (meme mecanique de frame).

Critere de sortie:

- A l'ecran, le clone recouvre exactement la capsule cible (item capsule et `__MAIN__`).

### Phase 2 — Tracage rectangle (sans persistence)

- [x] Ajouter le drag rectangle sur l'overlay clone.
- [x] Interaction identique a la logique du cadre de selection (pointer down/move/up).
- [x] Afficher uniquement le rectangle en cours de tracage.

Critere de sortie:

- Le rectangle suit correctement le drag et reste confine a la capsule.

### Phase 3 — Premier objet zone en memoire (local)

- [x] A la fin du drag, creer une zone locale simple avec `row/col/rowSpan/colSpan`.
- [x] Nommer automatiquement la zone (`zone-01`, `zone-02`, ...).
- [x] Construire une classe CSS et sa regle (`.ed-zone-xx{...}`).
- [x] Afficher cette zone sur l'overlay.
- [x] Toujours sans persistence provider/API.

Note reportee:

- La grille fine actuelle (160 x 90) pourra etre simplifiee en fin de chantier, hors de cette etape.

### Phase 3bis — Refactor architecture (sans state React)

- [x] Remplacer `ZoneBuilder` base `useState` par un couple `ZoneBuilderService` + `zoneBuilderMachine` (XState).
- [x] Garder React en wiring minimal (selectors, sync props machine, render).
- [x] Conserver le bouton proche de `SlotEditor` + ajout scene-root `__MAIN__`.
- [x] Garder la contrainte d'affichage: uniquement capsules de type `position`.

### Phase 3ter — Sync scroll overlay/player

- [x] Corriger la desynchronisation overlay lors du scroll page.
- [x] Deplacer le tracking de frame dans le service (hors composant React).
- [x] Stabiliser l'overlay en coordonnees viewport (`position: fixed`) + listeners viewport.

### Phase 3quater — Interface item-edit via SlotEditor

- [x] Integrer le gestionnaire de zones dans `SlotEditor` (remplacement branche `position`).
- [x] Lister chaque zone creee dans l'interface item-edit.
- [x] Ajouter actions de gestion par zone: renommer, effacer, dupliquer.
- [x] Conserver le bouton scene-root `__MAIN__` uniquement si capsule `position`.

### Phase 3quinquies — UX liste/actions zones

- [x] Remplacer actions textuelles dupliquer/effacer par icones dans une barre d'actions au-dessus de la liste.
- [x] Exiger une selection de zone avant activation des actions globales.
- [x] Supprimer l'affichage inline de la regle CSS et la deplacer dans le `title` de ligne.
- [x] Corriger le debordement de liste (conteneur scroll local, pas scroll global application).

### Phase 4 — Contrat de donnees + persistence capsule

- [x] Definir schema `cardZones` (nom technique temporaire) dans `profil` capsule.
- [x] Lire/ecrire via API capsule + flatten scene.
- [x] Brancher la creation/edition de zone vers la persistence (`capsule-update` + scene-root patch).

### Phase 5 — Assignation item -> zone

- [x] SlotEditor `position` cote items enfants: lecture des zones disponibles + designation d'une zone.
- [x] Le gestionnaire de zones reste cote edition capsule (`CapsuleEdit`) et scene-root `__MAIN__`.
- [x] Les autres variantes `SlotEditor` (card/grille/line/list) restent actives et inchangees.

Critere de sortie:

- Une zone creee reste visible tant que le mode est actif.

### Phase 4 — Contrat de donnees + persistence capsule

- [ ] Definir schema `cardZones` (nom technique temporaire) dans `profil` capsule.
- [ ] Lire/ecrire via API capsule + flatten scene.
- [ ] Brancher uniquement la creation de zone vers la persistence.

Critere de sortie:

- Rechargement scene: les zones creees sont restaurees.

### Phase 5 — Assignation item -> zone

- [ ] Etendre `SlotEditor` pour zones de capsule `position`.
- [ ] Ecrire `decor.style.itemPosition = { kind: "zone", zone }`.
- [ ] Garder `area/className` comme derivees runtime.

Critere de sortie:

- Un item assigne a une zone prend la bonne position au runtime.

## Checkpoints de verification

- Typecheck a chaque phase.
- Smokes cibles par phase (ajoutes progressivement, pas en lot final).
- Validation manuelle obligatoire en fin de phase 1 et 2 (alignement visuel + drag).

## Questions a verrouiller avant implementation

- Le nom technique `cardZones` est-il conserve temporairement, ou renomme tout de suite en `positionZones` ?
- En phase 2, le drag rectangle doit-il accepter un minimum de taille (ex: 1 cellule) ou toute taille pixel ?
