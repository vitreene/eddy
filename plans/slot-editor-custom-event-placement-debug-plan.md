# Plan — Debug SlotEditor substitution on custom-event

## Repro

- Item 97, custom-event actif, selection d'un slot dans SlotEditor.
- Attendu: `cell-span-fill` retire, classe `ed-zone-*` appliquee.
- Observe: `cell-span-fill` persiste.

## Analyse

- Le flux `decor-patch-requested` pour un custom-event sans decor cree d'abord un decor seed (`decor-created`) puis applique le patch (`decor-patch-apply`).
- Le decor seed reprenait `className` de base (`cell-span-fill`) avant patch effectif.
- Cette fenetre intermediaire (seed sans patch) laissait le systeme re-evaluer la position sur `cell-span-fill`.
- `SlotEditor` passe par `onStyleChange` avec un payload style; la vue editee (`decor` resolu) pouvait diverger du decor cible (`editDecor || itemDecor`) et le garde no-op bloquait parfois la creation de decor dedie pour un 2e custom-event.

## Fix

- [x] Lors de `decor-created`, fusionner immediatement `params.patch` dans le decor cree (className/area/style).
- [x] Conserver `decor-patch-apply` ensuite (idempotent), mais sans etat intermediaire incoherent.
- [x] Forcer la creation d'un decor dedie pour custom-event lors d'une action placement SlotEditor (meme si patch no-op aparent).
- [x] Utiliser un seed base sur le decor resolu visible (`decor || itemDecor`) pour eviter les derives de contexte.
- [x] Verifier typecheck + smokes custom/transform.

## Review

- `scene-logic.ensureDecorPatchTarget` publie maintenant un `decor-created` deja patch-aware.
- La substitution de `cell-span-fill` par la classe de slot n'est plus perdue pendant la creation du decor custom-event.
- `onStyleChange` ne court-circuite plus la creation de decor custom dedie quand la modification vient d'un intent de placement.
