# Plan — item-edit network via scene-logic/XState

## Objectif

Faire en sorte que les interactions reseau declenchees depuis `item-edit` ne passent plus par des `fetch` dans les composants React.
Toutes les operations reseau doivent transiter par des evenements XState et etre executees dans `scene-logic`.

## Portee

- Inclus
  - creation de decor pour event custom
  - commit texte content
  - patch scene depuis `scene-edit`
  - extraction des appels reseau de `scene-logic` vers fichier annexe
- Exclu
  - flux tree-mutations/reorder existants
  - refactor global du reste de la machine

## Etapes

- [x] 1. Ajouter un module annexe `scene-logic` dedie aux appels API (create decor, patch scene, commit text, etc.).
- [x] 2. Etendre les evenements/actions XState dans `scene-logic.ts` pour porter ces operations.
- [x] 3. Modifier `item-edit/index.tsx` pour supprimer les `fetch` directs et envoyer des evenements machine.
- [x] 4. Modifier `item-edit/scene-edit.tsx` pour remplacer le patch scene local par un evenement machine.
- [x] 5. Verifier (`typecheck`) et documenter le resultat.

## Definition de fini

- Aucun `fetch` dans `app/parts/item-edit/index.tsx`.
- Aucun `fetch` dans `app/parts/item-edit/scene-edit.tsx`.
- Les appels reseau de ces flux sont executes via `scene-logic`.
- Les methodes reseau ajoutees pour cette intervention sont deplacees dans un fichier annexe.

## Review

- Module annexe ajoute: `app/provider/scene-logic.api.ts`.
- Evenements XState ajoutes dans `scene-logic.ts`:
  - `scene-patch-requested`
  - `content-text-commit-requested`
  - `decor-create-requested`
  - `decor-created`
- `item-edit/index.tsx` n'appelle plus `fetch` (creation decor et commit texte via evenements machine).
- `item-edit/scene-edit.tsx` n'appelle plus `fetch` (patch scene via evenement machine).
- Verification: `npm run typecheck` OK.
