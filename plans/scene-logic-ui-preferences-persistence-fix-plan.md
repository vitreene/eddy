# Plan d'action — Persistance locale preferences UI scene-logic

## Objectif

Implementer la persistance locale pour deux preferences UI stockees dans `scene-logic.active`:

- mute Telco,
- onglet actif item-edit/capsule-edit.

Contraintes:

- stockage local uniquement (pas de DB),
- pas d'impact sur les circuits metier existants,
- restauration au chargement.

## Etapes

- [x] Etendre `ActiveState` avec `telcoMuted` et `itemEditTab`.
- [x] Initialiser ces champs dans `scene-logic`.
- [x] Ajouter un module dedie de normalisation + lecture/ecriture LocalStorage pour ces preferences.
- [x] Persister lors des `active-set` qui modifient ces preferences.
- [x] Rehydrater les preferences au chargement de scene (`home` -> `scene-logic`).
- [x] Brancher Telco mute sur `scene-logic.active.telcoMuted`.
- [x] Brancher Tabs item-edit/capsule-edit sur `scene-logic.active.itemEditTab`.
- [x] Ajouter un smoke test de non-regression pour la normalisation des preferences.
- [x] Verifier typecheck + smokes cibles.

## Review

- Resultat:
  - Preferences UI desormais stockees dans `scene-logic.active` (`telcoMuted`, `itemEditTab`) et persistees en LocalStorage via un module dedie.
  - Telco mute n'est plus un state React local ephemere: l'etat source est `scene-logic.active.telcoMuted`.
  - Les tabs `item-edit`/`capsule-edit` sont controles par `scene-logic.active.itemEditTab` (plus de `defaultValue` non persistant).
  - Rehydratation ajoutee au demarrage scene (`init` puis `active-set` avec preferences lues).
  - Aucune variable de controle additionnelle introduite dans les circuits metier de decor/events.
- Verification executee:
  - `npx tsx tests/scene-logic-ui-preferences-smoke.ts` (OK)
  - `npx tsx tests/item-edit-smoke.ts` (OK)
  - `npm run typecheck` (OK)
