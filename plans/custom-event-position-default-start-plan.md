# Custom Event Position Default Start Plan

## Contexte

- Le champ `event.position` precise le point temporel de declenchement (`start` / `middle` / `end`) sur le cue.
- Regle metier: si `position` est absente, la valeur par defaut doit etre `start`.
- Actuellement, certains chemins utilisent `middle` comme fallback, ce qui fait ignorer partiellement la position choisie et desaligner le declenchement.

## Checklist

- [x] Harmoniser les fallbacks de `position` vers `start` dans les chemins runtime/builder (sans ajout de nouvelle donnee).
- [x] Mettre a jour le modele de poignees pour que la position implicite soit `start` (affichage + fallback de resolution).
- [x] Verifier que le drag handle continue d'ecrire `position` explicite (`start|middle|end`) sur `custom-event-update`.
- [x] Valider le typecheck.
- [x] Mettre a jour `plans/lessons.md` suite a la correction.

## Verification

- [x] Relecture diff sur les fichiers de resolution temporelle (`builder`, `provider`, `item-edit helpers`, `point editor model`).
- [x] Validation statique: absence de fallback implicite a `middle` quand `position` est manquante.

## Review

- Defaut `position` unifie a `start` dans les chemins de calcul temporel (`builder`, `selection cue`, `active cue`, tri item-edit).
- Le modele des poignees conserve `middle` comme point explicite de snap, mais fallback implicite passe a `start` quand la donnee est absente.
- Aucun nouveau champ ajoute: `position` reste derivee du snap visuel (`start|middle|end`) puis persistée via `custom-event-update`.
- Verification compile OK via `npm run typecheck`.
- Correction complementaire: le commit de drag utilise maintenant la coordonnee reelle du `pointerup` pour choisir le snap le plus proche (`start/middle/end`), ce qui evite un retour parasite sur `start` lie a un etat de preview stale.
- Cause racine identifiee pour intro/outro: `buildEditablePointHandles` reimposait des positions fixes (`start`/`end`) et `makeIntroOutroEventPayload` n'envoyait pas `position`; en plus le backend persistait `position` uniquement pour les events custom.
- Correction associee: intro/outro lisent et ecrivent `position`, et la persistence conserve desormais `position` pour tous les events valides (`start|middle|end`).
