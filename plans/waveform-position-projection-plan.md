# Waveform Position Projection Plan

## Contexte

- Objectif: faire l'equivalent de Rubber sur la vue Waveform pour placer les positions d'events.
- Contraintes fonctionnelles:
  - memes regles metier de selection d'events (intro/outro/custom),
  - projection differente: une seule ligne temporelle (axe X waveform),
  - creation/modification de position => generation d'un cue persiste dans `scene_content.events`.
- Aggregation demandee:
  - lire les cues de `content.timestamp.words` (hors `timestamp.waveform`),
  - les agglomerer avec les cues persistes dans `scene_content.events`.
- Regles complementaires utilisateur:
  - les noms des cues de position doivent etre structurellement differents des noms Whisper (ex: `time-001`),
  - le `name` ne doit pas contenir de reference a l'item edite,
  - un cue de position conserve son `name` quand il est deplace (seule sa valeur temporelle change),
  - la fusion des deux sources est uniquement pour l'editeur (pas de fusion ecrite en base),
  - en waveform, les poignees representent un point: pas de snap `start/middle/end`.

## Etude: impact `end = null`

- Audit statique: plusieurs chemins runtime/builder utilisent encore `Number(cue.end)` directement.
- Avec `end = null`, `Number(null) === 0`, ce qui peut produire des bornes fausses (notamment autour des calculs intro/outro/capsule windows).
- Exemples sensibles identifies:
  - `app/scene-runtime/visibility/resolve-cue-windows.ts`
  - `app/provider/scene-logic.helpers.ts`
  - `app/scene-runtime/scene-content.ts`
  - autres chemins de calcul de bornes qui supposent un `end` numerique.

## Decision recommandee (compatibilite)

- Cues ponctuels: traiter semantiquement le point via `start`.
- Persist/relecture: normaliser `end` a la meme valeur que `start` (au lieu de `null`) pour eviter des reprises larges dans le builder.
- Pour les cues techniques waveform, la precision est portee par le temps du point lui-meme; `position` event est forcee/normalisee a `start` lors d'un placement waveform.
- Naming cues techniques: prefixe reserve global (ex: `__wfpos__t-0001`) sans `itemId`, pour eviter toute collision Whisper et permettre des cles partagees multi-items.
- Semantique cle partagee: plusieurs events peuvent pointer vers le meme `name`; deplacer ce cue met a jour la reference temporelle commune.

## Architecture cible

- Etendre la logique metier (classe/layout) avec une projection waveform:
  - conversion `timeSec -> x` sur largeur utile du waveform,
  - poignees ponctuelles (pas de decoupage segmentaire `start/middle/end`),
  - selection du cue de reference le plus proche sur l'axe temporel continu.
- Ajouter un editeur d'overlay waveform dedie (non React-business):
  - poignees intro/outro/custom,
  - drag libre + projection temporelle directe,
  - indications passives (autres items capsule + bornes capsule), non cliquables.
- Reutiliser le modele existant de payload events (`events-update`, `custom-event-update`, `active-set`).

## Pipeline donnees a introduire

- Introduire un helper d'aggregation de cues de scene:
  - `words` issus de `content.timestamp.words`,
  - `scene events` issus de `scene_content.events`,
  - fusion + tri + dedupe deterministic (editeur uniquement, read-model temporaire en memoire/store).
- Introduire des cues techniques de position (naming deterministic et stable par `itemId+action`), persistes dans `scene_content.events`.
- Introduire des cues techniques de position en namespace global de scene (naming stable, non lie a l'item), persistes dans `scene_content.events`.
- A chaque commit de poignee waveform:
  - mettre a jour l'event item (existant),
  - upsert du cue technique correspondant dans `scene_content.events` en conservant son `name`,
  - renvoyer `scene-content-upsert` pour synchro immediate store/UI.
- Suppression d'un cue technique: meme comportement que les autres cues (delete normal dans `scene_content.events`).

## Checklist implementation

- [x] Ajouter helper de fusion des cues (`timestamp.words` + `scene_content.events`) et l'utiliser dans les lectures scene-content.
- [x] Adapter les endpoints `scene-content` pour ne pas perdre les cues techniques lors des updates de transcription/audio settings.
- [x] Implementer la projection waveform (x unique ligne) + overlay handles ponctuels (sans snap `start/middle/end`).
- [x] Repliquer les couches visuelles de guidance (hors selection, hors capsule, marqueurs passifs) sur waveform.
- [x] Ajouter upsert de cues techniques a chaque creation/modification de position depuis waveform.
- [x] Garantir la stabilite de nom des cues techniques lors des deplacements (valeur temporelle seulement).
- [x] Garantir un generateur de `name` global (sans `itemId`) et collision-safe dans `scene_content.events`.
- [x] Definir la regle d'edition d'une cle partagee (si un `name` est reference par plusieurs events, update du point commun).
- [x] Maintenir coherences des defaults intro/outro (`start`/`end`) sans ecraser un choix explicite utilisateur.

## Verification

- [x] Typecheck global.
- [ ] Test manuel Rubber + Waveform: edition poignees, persistance, reload, etat identique.
- [ ] Verification agglomeration editeur: cues words + cues techniques visibles ensemble, sans ecriture de fusion en base.
- [ ] Verification robustesse builder: aucune regression avec cues ponctuels (normalises `end=start`).
- [ ] Verification naming: cues techniques gardent le meme `name` apres deplacement.
- [ ] (Optionnel hardening) test cible pour prouver que des cues techniques ne cassent pas `resolveCueWindows`.

## Review

- Ajout d'un namespace global de cues techniques waveform (`__wfpos__t-xxxx`) sans reference item, avec generation collision-safe et conservation du nom au deplacement.
- Nouvelle API `scene-content/position-cues` pour upsert/delete des cues techniques dans `scene_content.events`; un deplacement met a jour le point commun si plusieurs events partagent le meme `name`.
- La fusion `timestamp.words + scene_content.events` est appliquee en lecture (editor/runtime snapshot) via `mergeSceneEditorCues`, sans persister de vue fusionnee en base.
- `upsertSceneContentCues` preserve maintenant les cues techniques lors des updates de transcription et evite d'ecraser ces references.
- `WaveformCanvas` integre un overlay d'edition ponctuelle (sans snap start/middle/end), guidance passive capsule, et couches de gris equivalentes a Rubber.
