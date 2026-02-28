# Plan custom actions (events personnalises)

## Objectif

Ajouter des events personnalises par item (en plus de `intro`/`outro`) avec edition de decor d'event, positionnement temporel par `name` ou `delay`, interpolation builder, et UI complete dans event-panel + rubber.

## Etape 1 - Cadrage du modele event

- [x] Definir le schema event cible (runtime + DB + scene-logic):
  - [x] `kind` ne sera pas persiste en base (derive: custom si `action` n'est ni `intro` ni `outro`).
  - [x] pour `custom`, `ref` non utilise (vide/null).
  - [x] unicite du `name` par item (strategie auto-generation incluse).
  - [x] `name` est optionnel (mutuellement exclusif avec `delay`).
  - [x] `delay` est optionnel (mutuellement exclusif avec `name`).
  - [x] `delay` existe deja en DB mais en integer: migration vers type flottant (secondes).
  - [x] champs temporels: `name` (cue), `delay` (sec), `duration` (sec, optionnel).
  - [x] `position` en DB: nullable, renseigne uniquement pour les custom-events.
  - [x] regle d'exclusivite: `name` actif desactive `delay`, et inversement.

- [x] Contrainte explicite de persistance:
  - [x] `intro`/`outro` gardent leur logique de position par defaut (pas de `position` stockee).
  - [x] `position` par defaut = `NULL` en base.

- [x] Definir le contrat "active-event":
  - [x] selection d'un custom-event charge son decor d'event dans edit-event.
  - [x] deselection (toggle) revient au decor item.
  - [x] changement d'item reset la selection event.
  - [x] pas d'evenement `active-event-toggle` dans la machine.
  - [x] utiliser `active.event` dans scene-logic (valeur event ou `null`).
  - [x] toggle = ecrire la meme valeur puis `null`, ou `null` -> valeur.

## Etape 2 - Donnees et persistance (DB/API)

- [x] Etendre le schema `Event` (DB) pour supporter:
  - [x] `position` (`start|middle|end`) nullable (NULL par defaut).
  - [x] migration `delay` integer -> Float/Real (secondes).
  - [x] pas de colonne `kind` (derivee en applicatif).
  - [x] contrainte d'unicite du nom par item pour les custom-events.

- [x] API event/content:
  - [x] creation custom-event (base persist).
  - [x] update custom-event (name/delay/duration/position, base persist).
  - [x] suppression custom-event (interdire intro/outro).
  - [x] persistance decor associe a l'event selectionne (auto-link decor custom a la creation/update).

## Etape 3 - Scene-logic et etat reactif

- [x] Ajouter les events machine necessaires:
  - [x] `custom-event-create`.
  - [x] `custom-event-update`.
  - [x] `custom-event-delete`.
  - [x] pas de `active-event-toggle`: mutations directes de `active.event`.

- [x] Integrer le flux de persistance auto-commit:
  - [x] custom-events stockes dans `context.events[itemId]`.
  - [x] decor d'event stocke/modifie dans `context.decors`.
  - [x] sync API sur mutation.

## Etape 4 - UI event-panel / content-infos

- [x] Retirer `ContentPanel` de l'interface event.
- [x] Transformer chaque ligne event en bouton (style Tree):
  - [x] toggle select/deselect.
  - [x] style actif/inactif coherent.
  - [x] corbeille visible seulement sur event actif supprimable.
- [x] Ajouter bouton `+` en haut de ContentInfos pour creer un custom-event.
- [x] Interdire suppression `intro`/`outro`.

## Etape 5 - Zone de parametres au-dessus de Rubber

- [x] Ajouter les inputs de l'event actif:
  - [x] rename (name lisible, unique item).
  - [x] `delay` (sec).
  - [x] `duration` (sec, optionnel).
  - [x] radios `position`: `start|middle|end`.
- [x] Initialisation a la creation:
  - [x] delay par defaut = milieu entre intro et outro.
- [x] Regle d'activation mutuelle:
  - [x] saisir delay active `delay` et desactive `name`.
  - [x] deplacement pointeur rubber active `name` et desactive `delay`.

## Etape 6 - Rubber et calcul du point

- [x] Afficher un "point" pour chaque custom-event sur Rubber.
- [x] Ajouter fonction dediee de calcul du cue cible (travail isole):
  - [x] trouver le cue le plus proche a partir du delay.
  - [x] determiner start/middle/end du mot selon `position`.
  - [x] conversion bidirectionnelle delay <-> name.
- [x] Deplacement du point:
  - [x] mise a jour `name` + `position`.
  - [x] activation automatique mode `name`.

## Etape 7 - Builder (runtime animation)

- [x] Integrer les custom-events dans la timeline item.
- [x] Interpolation par defaut:
  - [x] interpole depuis etat precedent vers decor custom-event
  - [x] duree = delta entre event precedent et event courant.
- [x] Si `duration` defini:
  - [x] interpolation commence a l'instant du custom-event,
  - [x] se termine a `custom-event + duration`.
- [x] Respecter l'ordre temporel intro -> custom... -> outro.

## Etape 8 - Validation et non-regression

- [x] Tests unitaires:
  - [x] unicite `name` par item.
  - [x] calcul du point (cue proche + position start/middle/end).
  - [x] regles name/delay exclusives.
- [ ] Tests smoke integration:
  - [x] creation/edition/suppression custom-event.
  - [x] selection active-event + decor associe.
  - [x] rendu builder avec/sans duration.
- [ ] Verification manuelle UI complete (event-panel + rubber + edit-event).

## Etape 9 - Finalisation

- [x] `npm run typecheck`
- [x] `npm run test:smoke`
- [ ] revue UX finale (parite visuelle Tree/event-panel)

## Journal de suivi

- 2026-02-28: Plan cree, en attente de demarrage implementation.
- 2026-02-28: Contraintes valides: pas de `kind` en base, `delay` migre en flottant, `position` nullable reservee aux custom-events.
- 2026-02-28: Contrainte ajoutee: `name` et `delay` optionnels et exclusifs; activation event via `active.event` (valeur/null) sans event machine dedie.
- 2026-02-28: Etape 1 demarree: modele partage ajoute (`config/custom-events.ts`) + `active.event` introduit dans scene-logic.
- 2026-02-28: Etape 2 demarree: schema Event migre (`name?`, `ref?`, `delay/duration` en float, `position` nullable), unicite `(itemId,name)` et API content branchee sur les nouveaux champs.
- 2026-02-28: Etape 2 poursuivie: suppression custom-event disponible via DELETE `/api/content/:id` avec garde intro/outro.
- 2026-02-28: Etape 2 completee: decor custom auto-cree/lie lors de la persistance event (sans colonne `kind`).
- 2026-02-28: Etape 3 demarree: handlers scene-logic custom-event create/update/delete + usage de `active.event` (valeur/null) + reset au changement d'item.
- 2026-02-28: Etape 4 demarree: event-panel converti en liste de boutons (style tree), bouton `+`, toggle `active.event`, suppression custom conditionnelle, ContentPanel retire.
- 2026-02-28: Etapes 3-7 poursuivies: decor d'event charge via `active.event` dans EditItem + persistance decor cible, Rubber affiche les points custom et permet le repositionnement `name/position`, builder timeline integre les custom-events avec interpolation decor (delta precedent ou `duration` explicite).
- 2026-02-28: Etape 6 enrichie: extraction d'un module partage de mapping cues (`delay -> cue+position`, `cue+position -> delay`) avec couverture smoke dediee.
- 2026-02-28: Etape 8 avancee: ajout d'un smoke dedie custom-events (unicite nom, exclusivite name/delay, mapping delay/cue, cycle scene-logic create/update/delete) + scripts smoke mis a jour.
