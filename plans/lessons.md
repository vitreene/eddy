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
