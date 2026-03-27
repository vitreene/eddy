# Event Edit Rubber/Waveform Switch Plan

## Contexte

- Evolution demandee: garder `RubberProportionalTest` et `WaveformCanvasTest` en permanence dans le code.
- Affichage voulu: un seul composant visible a la fois via un switch.
- Emplacement du switch: `ContentInfos`.
- Contrainte architecture: pas de `useState` React ajoute; utiliser le state XState existant (`active-set`).

## Checklist

- [x] Definir un mode d'affichage timeline (`rubber` vs `waveform`) derive depuis `state.context.active`.
- [x] Ajouter un switch UI dans `ContentInfos` qui met a jour ce mode via `sceneLogic.send({ type: "active-set" })`.
- [x] Remplacer le rendu simultane dans `EditEvent` par un rendu conditionnel base sur le mode actif.
- [x] Conserver un mode par defaut stable quand aucune valeur n'est encore set.

## Verification

- [x] Relecture diff sur `app/parts/event-edit/index.tsx`.
- [x] Validation statique: aucun `useState` ajoute pour ce switch.

## Review

- Le switch `Rubber/Waveform` est place dans `ContentInfos` et pilote `active.timelineView` via `active-set`.
- `EditEvent` garde les deux composants permanents dans le code et n'en affiche qu'un seul selon le mode actif.
- Le mode par defaut est `rubber` quand `timelineView` est absent/invalide.
