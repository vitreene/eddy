# scene-logic - note technique "assure visible"

## Principe

`active-set` ne place plus la tete de lecture uniquement sur l'intro de l'item selectionne.
Le cue est calcule sur la fenetre de visibilite effective de l'item, en tenant compte de ses capsules parentes.

## Definition

- Fenetre item/capsule-host: `{ startSec, endSec }`
- `startSec`:
  - intro presente => `cue.start + DEFAULT_DURATION/1000`
  - sinon => `0`
- `endSec`:
  - outro presente => `cue.end`
  - sinon => `+Infinity` (puis normalisation sur la duree scene)

## Algorithme

1. Construire la fenetre de l'item selectionne.
2. Remonter la chaine des capsules via les items host (`content.type = capsule`).
3. Construire la fenetre de chaque item parent trouve.
4. Intersecter les fenetres:
   - `safeStartSec = max(startSec...)`
   - `safeEndSec = min(endSec...)`
5. Normaliser la fenetre avec la duree scene.
6. Retourner:
   - `cue = safeStartSec` si `safeStartSec < safeEndSec`
   - sinon `cue = null` (fallback explicite)

## Impl

- Fichier: `app/provider/active-cue.ts`
- Entree principale: `computeActiveCue(context, itemId)`
- Appelant: `app/provider/scene-logic.ts` sur l'evenement `active-set`
