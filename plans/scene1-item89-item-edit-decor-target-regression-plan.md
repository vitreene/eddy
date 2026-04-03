# Plan d'action — Scene 1 item 89 decor target regression

## Objectif

Retablir le comportement historique de persistance depuis item-edit: les modifications (position et autres proprietes de decor) doivent s'enregistrer dans le decor du contexte event actif, avec fallback sur le decor initial si aucun event n'est actif ou si l'event actif est intro.

## Etapes

- [x] Reproduire et tracer le circuit item-edit -> selection de cible decor (none/intro/custom/outro).
- [x] Identifier la regression recente qui ecrit dans le mauvais decor (ou ignore le decor event).
- [x] Corriger la resolution de cible decor sans ajouter de feature flag ni nouvelle variable de controle.
- [x] Verifier que la creation paresseuse du decor event est maintenue pour custom/outro.
- [x] Executer les checks cibles (tests/build) et valider le scenario scene 1 item 89.

## Review

- Resultat:
  - Regression corrigee dans la resolution de contexte decor: seul `intro` utilise le decor item; `custom-*`/`outro` ciblent toujours un decor event.
  - Le fallback "premier custom -> decor item" a ete retire pour retablir le comportement attendu de creation decor event a la modification.
  - Le calcul de decor effectif en edition a ete aligne: en `intro`, l'UI se base sur le decor item meme si un `intro.decorId` existe deja.
  - Smokes de verrouillage et de resolution decor etendus pour couvrir ces cas de regression.
- Verification executee:
  - `npx tsx tests/item-edit-decor-resolution-smoke.ts` (OK)
  - `npx tsx tests/selection-contract-lock-smoke.ts` (OK)
  - `npx tsx tests/custom-event-auto-smoke.ts` (OK)
  - `npx tsx tests/item-edit-smoke.ts` (OK)
  - `npm run typecheck` (OK)
