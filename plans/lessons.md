# Lessons

## 2026-03-11 — Diagnostic temporel des custom-events

- Ne pas conclure "event sans name" sans verifier la ligne DB cible (`event.id`) et la presence du cue dans `scene_content.events`.
- Avant de corriger, tracer toute la chaine temporelle: `event.startMs`, position mappee dans `mapEvents`, et fenetre de progression runtime (`curr/next`).
- Eviter les correctifs ponctuels qui changent une seule couche (builder) si le symptome implique aussi le player (`on-update` / static changes).
- Regle de prevention: pour tout bug de keyframe, valider explicitement les trois temps `previousMs`, `startMs`, `next` sur un item reel avant patch.

## 2026-03-11 — Stabilite des regles selection <-> vue

- Ne jamais corriger la selection d'event dans plusieurs couches a la fois sans contrat central; creer une API unique de resolution du cue.
- Pour tout seek de selection, borner sur la fenetre de visibilite assuree (item + ancetres), sinon la vue peut devenir incoherente.
- Conserver des regles constantes entre `intro`, `custom`, `outro`: ancre explicite puis clamp, sans exceptions ad hoc non documentees.

## 2026-03-11 — Overlay: simplicite d'abord

- Quand un overlay se desolidarise au scroll, tester d'abord l'hypothese de positionnement (`fixed` vs `absolute`) avant d'ajouter des listeners/invalidations supplementaires.
- Eviter l'over-engineering sur le recalcul frame tant qu'un correctif CSS structurel simple n'a pas ete valide.

## 2026-03-11 — Timeline keyframe vs runtime

- Toujours distinguer `keyframe` (etat attendu a un instant) et `runtime start` (moment de declenchement animation).
- Ne pas reutiliser une seule variable temporelle pour les deux concepts: cela cree des collisions intro/custom.
- Formaliser ce contrat dans des fonctions dediees avant de modifier le player ou la selection UI.

## 2026-03-11 — Seed custom event sur seek

- Lors du seed custom-event, le "nearest" doit etre borne par la fenetre intro/outro de l'item; sinon un cue hors fenetre peut etre selectionne et paraitre incoherent.
- Garder un fallback global seulement en dernier recours, jamais comme priorite principale.

## 2026-03-11 — Verifier persistance apres seed

- Apres toute modif de seed custom-event, verifier explicitement la condition de persistance (`name` ou `delay`) pour eviter des creations visibles en UI mais non en base.
- Ajouter un test qui couvre le mode degrade (pas de cues exploitables) avec fallback persistable.
