# scene-logic - plan `active-set` pour visibilite reelle via capsules parentes

## Objectif

- [ ] Faire en sorte que `active-set` positionne la tete de lecture a un instant ou l'item selectionne est **vraiment visible**, meme si l'item n'a pas d'event `intro`.
- [ ] Remplacer l'hypothese "visible toute la sequence" par un calcul base sur la fenetre de visibilite de l'item **et de toute sa chaine de capsules parentes**.

## Decision d'architecture

- [x] Regrouper toutes les nouvelles fonctions de calcul dans un fichier dedie (ex: `app/provider/active-cue.ts`) et les appeler depuis `scene-logic`.

## Etape 1 - Poser le contrat de calcul

- [x] Definir une notion unique de fenetre de visibilite: `{ startSec, endSec }`.
- [x] Definir le temps "assure visible" comme `safeStartSec = max(startSec de tous les niveaux)`.
- [x] Definir la borne de validite `safeEndSec = min(endSec de tous les niveaux)`.
- [x] Si `safeStartSec < safeEndSec`, utiliser `safeStartSec` pour `active.cue`.
- [x] Si la fenetre est vide (`safeStartSec >= safeEndSec`), appliquer une strategie de fallback explicite (ex: `null`, ou intro item si present).

## Etape 2 - Construire les utilitaires de timeline

- [x] Ajouter un helper pour resoudre un cue par nom dans `sceneContents.events`.
- [x] Ajouter un helper `getNodeVisibilityWindow(itemId)`:
  - [x] `startSec = introCue.start + DEFAULT_DURATION/1000` si `intro` existe.
  - [x] sinon `startSec = 0`.
  - [x] `endSec = outroCue.end` si `outro` existe.
  - [x] sinon `endSec = +Infinity` (ou duree scene si disponible).
- [x] Ajouter un helper `getSceneDurationSec()` (depuis le dernier cue texte ou autre source deja disponible).
- [x] Normaliser les bornes infinies avant l'affectation finale (ex: clamp sur duree scene).

## Etape 3 - Remonter la chaine de capsules

- [x] Partir de l'item selectionne `itemId`.
- [x] Recuperer sa capsule directe via `items[itemId].capsuleId`.
- [x] Tant que la capsule n'est pas `main`:
  - [x] Trouver le `content` de type `capsule` qui pointe vers cette capsule.
  - [x] Trouver l'`item` qui porte ce `content` (item representant la capsule dans sa capsule parente).
  - [x] Ajouter cet item parent dans la chaine de calcul.
  - [x] Continuer avec la capsule de cet item parent.
- [x] Arreter proprement si un maillon est manquant (donnees incompletes), avec fallback non bloquant.

## Etape 4 - Intersecter les fenetres de visibilite

- [x] Calculer la fenetre de l'item selectionne.
- [x] Calculer la fenetre de chaque item parent de capsule remonte.
- [x] Intersecter toutes les fenetres pour obtenir la fenetre "assuree visible".
- [x] Produire un resultat final deterministic:
  - [x] `cue = safeStartSec` si intersection valide.
  - [x] fallback documente sinon.

## Etape 5 - Integrer dans `active-set`

- [x] Remplacer la logique actuelle basee uniquement sur `INTRO` de l'item dans `app/provider/scene-logic.ts`.
- [x] Centraliser la logique dans une fonction pure (ex: `computeActiveCue(itemId, context)`).
- [x] Garder le comportement existant intact pour les autres champs de `active`.
- [x] Eviter tout acces reseau: calcul 100% local sur le contexte courant.

## Etape 6 - Cas limites a couvrir

- [x] Item avec `intro` + parent sans `intro`.
- [x] Item sans `intro` + parent avec `intro` tardif (cas prioritaire).
- [x] Plusieurs niveaux de capsules avec intros successifs.
- [x] Presence d'un `outro` parent qui ferme la fenetre avant la fin scene.
- [x] Item dans `main` (pas de parent): resultat equivalent au calcul item seul.
- [x] Donnees partielles (cue introuvable, content capsule manquant, lien casse).

## Etape 7 - Validation fonctionnelle

- [x] Selection d'un item sans `intro` dans capsule animee: `active.cue` doit se placer apres l'intro du parent.
- [x] Selection d'un item avec `intro` plus tardif que son parent: `active.cue` doit suivre l'intro de l'item.
- [x] Selection d'un item dans capsules imbriquees: `active.cue` doit respecter le parent le plus contraignant.
- [ ] Verifier que le player affiche effectivement l'item a l'instant choisi (pas de frame cachee).
- [x] Verifier absence de regression sur les items simples deja fonctionnels.

## Etape 8 - Nettoyage et lisibilite

- [x] Nommer clairement les helpers (`getItemWindow`, `getAncestorCapsuleItems`, `intersectWindows`, etc.).
- [x] Ajouter un court commentaire de contrat sur la fonction principale de calcul.
- [x] Ajouter un mini bloc de doc technique dans le repo pour expliquer la notion de "assure visible".
