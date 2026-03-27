# Rubber Intro/Outro Gray Layer Plan

## Contexte

- Nuance demandee: ajouter une couche visuelle intermediaire dans Rubber.
- Regle: les mots hors intervalle `[intro..outro]` doivent passer en gris.
- Exception: si aucun item n'est selectionne, cette couche est ignoree.

## Checklist

- [x] Deriver les bornes intro/outro depuis les events de l'item actif.
- [x] Appliquer un style grise aux segments hors bornes, sans casser le highlight actif.
- [x] Ignorer totalement ce masquage si `active.itemId` est absent.
- [x] Ajouter des indications passives intro/outro des autres items de la capsule de l'item actif.
- [x] Signaler intro/outro de capsule et renforcer le gris hors capsule.
- [x] Deriver ces indications via la resolution dynamique (auto placements inclus).

## Verification

- [x] Relecture diff ciblee `app/parts/rubber/rubber-proportional-test.tsx`.
- [x] Validation statique typecheck.

## Review

- Ajout d'un masque visuel base sur les bornes intro/outro: les cues hors intervalle sont rendus en gris.
- Le masque ne s'applique que lorsqu'un item est selectionne (`active.itemId` present) et que les deux bornes existent.
- Aucun impact sur les donnees: c'est uniquement une couche de presentation, le snap/edition reste inchange.
- Extension: les intro/outro des autres items de la capsule sont rendus comme marqueurs passifs non cliquables.
- Les bornes globales de capsule sont marquees distinctement, et l'exterieur capsule passe en gris plus soutenu.
- Les marqueurs/bornes sont derives de `resolveCueWindows(..., generateMissingEvents: true)` + `buildCapsuleBehaviorById`, donc suivent dynamiquement les placements auto lors des modifications de l'item edite.
