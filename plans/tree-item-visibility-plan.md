# Plan feature visibilite item/capsule dans tree

## Objectif

Ajouter un etat `visible` persistant sur les items (defaut `true`), pilotable depuis le tree via une icone oeil/oeil barre, avec impact direct sur le builder (item/capsule masques ignores).

Contrainte d'heritage: masquer une capsule n'ecrit pas l'etat des items enfants. L'heritage de masquage est runtime (builder) uniquement. Si un enfant est explicitement masque dans une capsule masquee, il reste masque apres re-affichage de la capsule.

## Etapes

- [x] **Valider le scope fonctionnel**
  - [x] Confirmer la regle: masquer une capsule masque recursivement son contenu.
  - [x] Confirmer la regle d'heritage: ne pas afficher/propager explicitement l'etat masque aux enfants.
  - [x] Confirmer la semantique: item masque = ignore par le builder, conserve en edition.
  - [x] Confirmer les etats UI: oeil au hover, oeil barre persistant si masque.

- [x] **Schema BDD et migration**
  - [x] Ajouter `visible Boolean @default(true)` sur `Item` dans `prisma/schema.prisma`.
  - [x] Generer/appliquer migration locale.
  - [x] Verifier donnees existantes (`visible=true` partout apres migration).

- [x] **API/DB access layer**
  - [x] Etendre les lectures DB pour exposer `item.visible` dans le snapshot scene.
  - [x] Etendre les updates item (`/api/item/:id`) pour persister `visible`.
  - [x] Ajouter si besoin un endpoint dedie toggle (sinon reutiliser update item existant).

- [x] **Scene logic**
  - [x] Ajouter l'etat `visible` dans le contexte item.
  - [x] Ajouter un event `item-visibility-toggle` (ou equivalent).
  - [x] Integrer la persistence auto-commit de cet etat.

- [x] **UI tree**
  - [x] Ajouter bouton icone oeil sur item (affiche au hover, comme delete).
  - [x] Afficher oeil barre en permanence si `visible=false`.
  - [x] Gerer click toggle sans casser selection/drag tree.
  - [x] Appliquer la meme logique aux items de type capsule (host capsule).

- [x] **Builder (comportement runtime)**
  - [x] Exclure du rendu tout item `visible=false`.
  - [x] Exclure recursivement le contenu des capsules masquees.
  - [x] Appliquer l'heritage de masquage en calcul (sans mutation de `visible` sur les enfants).
  - [x] Ignorer egalement leurs actions/events dans le resultat builder.

- [x] **Cas limites et coherence**
  - [x] Garantir que l'edition reste possible apres re-affichage.
  - [x] Verifier qu'un enfant explicitement masque reste masque apres re-affichage de sa capsule parente.
  - [x] Verifier que les auto-events ne cassent pas si des items sont masques.
  - [x] Verifier interactions avec suppression, move, reorder.

- [x] **Tests et verification**
  - [x] Ajouter/adapter smoke tests builder pour visibilite item/capsule.
  - [x] Tester persistance DB apres reload.
  - [x] Tester UI hover + etat persistant oeil barre.
  - [x] Lancer `npm run typecheck` et `npm run test:smoke`.

## Journal de suivi

- 2026-02-27: Plan cree, en attente de demarrage implementation.
- 2026-02-27: Precision ajoutee: masquage capsule herite uniquement au runtime, sans propagation visuelle/persistante aux enfants.
- 2026-02-27: Pause etape 1 finie (schema + migration + regeneration Prisma + support API item visible).
- 2026-02-27: Pause etape 2 finie (scene-logic + UI tree oeil/oeil barre + toggle persistant).
- 2026-02-27: Pause etape 3 finie (builder filtre visibilite recursive + tests smoke + verification DB).
