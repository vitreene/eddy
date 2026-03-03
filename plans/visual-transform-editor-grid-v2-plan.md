## Objectif

Remplacer l'edition visuelle actuelle par un nouveau composant dedie au systeme de positionnement des items, sans casser l'existant:

- conserver le composant actuel (deplace dans les Demos),
- creer un nouveau composant avec la meme logique/props,
- adapter les interactions a la nouvelle UI et aux contraintes du layout courant,
- ajouter un mode debug temporaire qui bloque la persistence des transforms.

## Plan d'action

- [x] Cadrer les exigences fonctionnelles/UI a partir de la spec et de la reference visuelle (`/Users/hervesaintmacary/Projets/e-prev-etude/2jlearning/selecteur.webp`).
- [x] Extraire la logique reutilisable du composant actuel (lecture/mesure/apply/drag math) pour limiter les regressions.
- [x] Creer un nouveau composant dans un nouveau fichier (API identique): rectangle de selection + controle rotation + controle resize + controle deplacement cellule + drag interne translate.
- [x] Implementer la rotation avec snap `Shift` a 15deg et conserver le comportement libre sans `Shift`.
- [x] Implementer le resize via poignee bas-droite (width/height) avec ratio conserve par defaut; `Shift` desactive la contrainte de ratio; min constraints existantes conservees.
- [x] Implementer le deplacement cellule parent via losange haut-gauche (hook vers logique grille existante).
- [x] Implementer le drag interne du cadre en `transform: translate(...)` avec unites `cqi`.
- [x] Brancher le nouveau composant dans le flux d'edition courant, en debranchant l'ancien sans le supprimer (ancien composant conserve et deplace vers Demos).
- [x] Ajouter un guard debug temporaire pour empecher l'envoi des transforms en base, facilement retirable (point unique).
- [x] Commenter les fonctions et variables importantes du nouveau composant (intention, invariants, conversions unites/espace).
- [ ] Valider techniquement (`npm run typecheck` + tests/smoke pertinents) et verifier manuellement le cas scene 1 / item "logo SST".

## Journal

- 2026-03-03: Plan initialise et enregistre dans `plans/visual-transform-editor-grid-v2-plan.md`.
- 2026-03-03: Regle resize precisee: ratio conserve par defaut, `Shift` pour resize libre (sans ratio).
- 2026-03-03: Strategie legacy precisee: ancien composant conserve (non supprime), uniquement debranche du flux principal.
- 2026-03-03: Nouveau composant implemente dans `app/components/position-editor/visual-transform-grid.tsx` et branche dans `app/parts/item-edit/index.tsx`.
- 2026-03-03: Guard debug retabli via flag temporaire de persistence transform (client + serveur).
- 2026-03-03: Validation technique executee (`npm run typecheck` OK). Verification manuelle scene 1 / "logo SST" reste a confirmer.
- 2026-03-03: Smoke tests executes (`npm run test:smoke` OK).

## Notes d'implementation

- Le guard debug sera concentre dans un seul filtre de persistence (client + eventuel filet server), pour suppression rapide apres debug.
- Les commentaires seront limites aux blocs non triviaux: conversion repere parent/local, conversion px -> cqi, et ancrages de poignées.
