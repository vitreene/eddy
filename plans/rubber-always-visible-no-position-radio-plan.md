# Rubber Always Visible + Remove Position Radios Plan

## Contexte

- Le composant Rubber doit rester visible meme sans item selectionne.
- `ContentInfos` doit rester present (espace conserve), mais vide quand aucun item n'est selectionne.
- Les options `start/middle/end` dans `EventParams` doivent disparaitre; le placement est gere par les poignees visuelles.
- Le snap doit continuer d'utiliser `start/middle/end` calcule, sans nouvelle donnee.

## Checklist

- [x] Modifier `EditEvent` pour ne plus retourner `null` quand `item` est absent, et conserver le rendu timeline.
- [x] Adapter `ContentInfos` pour accepter `item: ItemComp | null` et rendre un conteneur vide de largeur stable si aucun item.
- [x] Supprimer l'UI radio `start/middle/end` de `EventParams` (custom events).
- [x] Verifier que la logique de snap reste basee sur `start/middle/end` via `TimelinePointEditor` + layout (sans ajout de schema).
- [x] Mettre a jour `plans/lessons.md` suite a la correction utilisateur.

## Verification

- [x] Relecture diff de `app/parts/event-edit/index.tsx`.
- [x] Validation statique: `RubberProportionalTest` reste visible sans item, poignees uniquement avec `active.itemId`.

## Review

- `EditEvent` garde toujours la zone timeline visible; seul `EventParams` est conditionnel a la selection d'item.
- `ContentInfos` conserve sa largeur (`w-64`) et affiche le switch `Rubber/Waveform` meme sans item selectionne; la liste d'events reste masquee tant qu'aucun item n'est actif.
- Les radios `start/middle/end` ont ete retirees de `EventParams`; le positionnement passe exclusivement par la manipulation visuelle des poignees.
- Aucun nouveau champ/metadonnee ajoute: le snap continue d'utiliser les positions `start/middle/end` deja supportees par les events existants.
