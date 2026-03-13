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

## 2026-03-11 — Eviter le drift pendant commit transform

- Ne pas appliquer de patch de classes de placement en live au milieu d'un `transform commit` : cela change la base mesuree (`readTransformPreserve`) et peut decaler la position affichee vs editee.
- Pour le lock auto-placement sur transform: persister le patch decor, puis laisser le runtime reappliquer de facon stable.

## 2026-03-11 — Classes area live: eviter les conflits

- Quand une `area` explicite est appliquee en live, supprimer les classes de placement auto (`cell_auto_*`, `liste-rN`) en meme temps; sinon l'ordre CSS peut conserver l'ancien placement visuel.
- Ne pas supposer que `decor.area` prime automatiquement en live tant que l'etat de classes du node n'est pas nettoye.

## 2026-03-11 — Selection custom et frame FLIP

- Pour l'edition d'un custom-event, la cible visuelle attendue est souvent l'etat pre-FLIP; seeker exactement au keyframe affiche la premiere frame de transition, pas l'etat precedent.
- Regle: pour la selection custom uniquement, utiliser une ancre `keyframe - 1ms` (bornee a 0) afin d'aligner la vue editeur avec l'etat attendu.

## 2026-03-11 — Edit comme source de verite

- En mode edit custom-event, si le DOM live et l'etat edit divergent, appliquer explicitement l'etat d'edition sur le node (au minimum `area`) au changement de selection.
- Ne pas supposer qu'un seek timeline suffit toujours pour refléter l'etat edite au pixel pres.

## 2026-03-11 — Unifier cadre de selection et DOM

- Si l'UI d'edition applique des patches live sur le node (`class`/`style`), le cadre de selection doit re-mesurer le DOM sur ces mutations; sinon il suit un etat stale.
- Regle: une seule geometrie de reference a l'ecran — celle du DOM courant — et le cadre derive de cette mesure via resync.

## 2026-03-11 — DOM resync: fallback, pas source nominale

- Le circuit `MutationObserver -> resync` peut debloquer rapidement, mais ne doit pas devenir la source de verite de l'edition.
- Preferer un etat derive unique (`EditableVisualState`) pousse vers l'edit, le cadre et le DOM.

## 2026-03-11 — Hooks et orchestration

- Ne jamais introduire un hook apres un retour conditionnel (`if (!item) return null`) : verifier l'ordre des hooks apres chaque refactor.
- Pour les chaines multi-etapes (seek -> projection -> frame), preferer une machine dediee plutot que des effets React implicites.

## 2026-03-11 — Discipline Plan Mode (check-in obligatoire)

- Quand AGENTS impose le plan mode, ne jamais coder juste apres avoir ecrit le plan : faire un message de check-in explicite a l'utilisateur avant la premiere modification de code.
- Ajouter un garde-fou personnel avant tout `apply_patch`: verifier une mini-checklist `Plan ecrit ?` + `Check-in fait ?`; si non, stopper et faire le check-in.
- En cas d'ambiguite entre "agir sans poser de questions" et regle locale AGENTS, la regle locale prime pour le flux (ici: check-in avant implementation).

## 2026-03-12 — Separation stricte transform vs position

- Ne jamais faire transiter `ElementTransform` dans le circuit `position` (props, machine, service, commit): utiliser des types de commit distincts.
- Eviter les unions de modes qui laissent passer des metadonnees transform dans la branche position; preferer des callbacks differencies (`onTransformCommit` / `onPositionCommit`).
- Si un composant est declare comme `position`, il ne doit construire que des donnees grille (`cell`, `gridPlacement`, `reorderIndex`) et rien d'autre.

## 2026-03-13 — Anime.js: patch vs reconstruction

- Anime.js v4 permet des patchs partiels de timeline (`add`, `remove`, `sync`) sans reconstruire tout dans les cas simples.
- Limitation cle doc: `remove()` ne recompose pas la duree/shape globale; pour modification structurelle de timeline, recreer une nouvelle timeline est recommande.
- Strategie pratique pour eviter une cassure visuelle lors d'une recreation: utiliser `keepTime()` (Scope) pour conserver le temps courant.
