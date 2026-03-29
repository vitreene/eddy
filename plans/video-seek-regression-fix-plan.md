# Video Seek Regression Fix Plan

## Scope

- Corriger la regression de seek video (scene 9, item 87) sans ajouter de nouveau dispositif.
- Restaurer le calcul de `currentTime` base sur le dernier `play`/`pause` effectif et sur `offset/changeAt`.

## Checklist

- [x] Analyser le pipeline media player (`setStaticChanges`, `applyMediaChanges`, `seekMedias`).
- [x] Corriger `seekMedias` pour distinguer etats `play` vs `pause`.
- [x] Corriger l'ancrage `startAt` a partir de `changeAt - offset` (au lieu du temps de seek courant).
- [x] Conserver la prise en charge des videos demarrant a un temps precis (`offset`).
- [x] Garantir un parcours chronologique des positions timeline lors du pre-calcul media (`setStaticChanges`).
- [ ] Valider manuellement scene 9 / item 87 (seek video se met a jour correctement).

## Verification

- [x] Typecheck.
