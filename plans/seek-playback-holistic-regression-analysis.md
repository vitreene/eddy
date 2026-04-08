# Seek vs Lecture - Analyse globale des regressions

## Etat

- Le patch de bascule de fenetre applique juste avant (bornes `[debut, fin)`) a ete annule.
- Le symptome initial reste: sur certaines frames, la position obtenue en `seek` ne correspond pas a la position observee en lecture continue.

## Regressions identifiees

1. Regression introduite (puis annulee)

- Changer la logique globale de passage au changement suivant a deplace des bascules de frame dans tout le player.
- Impact: incoherences propagees sur des elements non cibles.

2. Cause structurelle probable (toujours presente)

- Le `seek` et la lecture n'utilisent pas exactement le meme chemin de calcul pour les transitions de position.
- Lecture continue:
  - suit un etat runtime incrementale (`persoPositions`, `transitions`, `lastEndCoords`).
- Seek:
  - recompose l'etat d'un coup (`seekChanges`) puis recree des transitions a partir du DOM courant.
- Cette recreation depend de mesures DOM/caches runtime, ce qui peut differer d'une lecture continue au meme instant.

3. Incoherence de bornes (preuve)

- Selection de fenetre au `seek` (`time >= curr && time <= next`) differente de la lecture (`time < next` via `prev/next`).
- Repro minimale observee:
  - `t=1000` -> seek choisit l'etat A, lecture choisit l'etat B.
  - `t=2000` -> seek choisit l'etat B, lecture choisit l'etat C.
- Effet visible: a la frame de frontiere, la position/etat n'est pas identique entre lecture et seek.

4. Cache mutable asymetrique

- `lastEndCoords` est consomme en lecture dans `_moveChange` mais purge au `seek` (`seek/replay/revert`).
- Donc, a temps egal, la transition peut etre reconstruite avec un "old" different selon le mode d'acces au temps.

## Zone de code a risque (regressions)

- `app/player/player.ts`
  - `seek()` + `seekChanges()`
  - `_moveChange()` (mesures `old/nex`, usage conditionnel de `lastEndCoords`)
  - `_createMoveTransition()`
- `app/player/deps/on-update.ts`
  - moteur runtime incrementale (progression, snapshots, passage de fenetres)
- `app/player/deps/utils.ts`
  - selection de fenetre courante (`setNextChange`)

## Plan d'action

1. Verrouiller une regle unique de selection d'etat

- Extraire une fonction partagee "etat actif a t".
- L'utiliser a la fois dans le chemin seek et dans le chemin lecture.

2. Coordonner `lastEndCoords` entre seek et lecture

- Ne pas purger le cache de facon asymetrique au seek/replay/revert.
- Laisser la verification de proximite (`areRectsClose`) decider si le cache est utilisable.

3. Ajouter des tests de contrat

- Test frontieres (`next`) sur la fonction partagee.
- Test que `setNextChange` suit la meme regle.

4. Verifier sur scene reel + smokes

- Rejouer le cas `scene 1 / item 39`.
- Lancer les smokes player keyframes/move + typecheck.

## Checklist

- [x] Regle unique de selection d'etat partagee seek/lecture.
- [x] `lastEndCoords` coordonne entre seek/lecture.
- [x] Tests de frontiere ajoutes.
- [x] Smokes + typecheck verts.

## Review

- `app/player/deps/utils.ts`:
  - ajout de `isChangeActiveAtTime(currentTime, change)` comme source unique de selection.
  - `setNextChange` utilise cette source unique.
- `app/player/deps/on-update.ts`:
  - selection de changement actif bascule sur `isChangeActiveAtTime`.
- `app/player/player.ts`:
  - `seekChanges` utilise `isChangeActiveAtTime` pour choisir la fenetre active.
  - suppression de la purge asymetrique `lastEndCoords.clear()` dans `seek/replay/revert`.
- `tests/on-update-keyframe-window-smoke.ts`:
  - ajout des assertions de frontiere (`next`) sur la fonction partagee + `setNextChange`.
- Verification:
  - `npx tsx tests/on-update-keyframe-window-smoke.ts` OK
  - `npx tsx tests/player-move-old-next-smoke.ts` OK
  - `npx tsx tests/static-changes-move-priority-smoke.ts` OK
  - `npx tsx tests/intro-keyframe-runtime-offset-smoke.ts` OK
  - `npx tsx tests/keyframe-coherence-smoke.ts` OK
  - `npx tsx tests/builder-capsule-smoke.ts` OK
  - `npx tsx tests/custom-event-selection-cue-smoke.ts` OK
  - `npx tsx tests/event-selection-scene1-smoke.ts` OK
  - `npm run typecheck` OK

## Critere de fin

- Pour un meme temps `t`, la position d'un item est la meme en lecture continue et en seek direct.
- Pas de regression sur les transitions des autres elements.
