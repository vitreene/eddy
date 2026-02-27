# Plan refactor transitions (intro/outro)

## Objectif

Unifier les transitions autour d'un nom unique (ex: `fade`) avec variantes `intro`/`outro`, filtrer correctement en UI selon le contexte, persister `event.action` + `event.ref` en base, corriger `zoom in`, ajouter une transition nulle/cut, puis migrer les references existantes.

## Suivi des etapes

- [x] **Valider les conventions de transitions (specification)**
  - [x] Definir le format cible: une transition unique (`fade`) avec variantes `intro` et `outro`.
  - [x] Definir la convention DB: `event.action = intro|outro`, `event.ref = transitionKey` (ex: `fade`).
  - [x] Lister les cles canoniques + labels UI FR.

- [x] **Refactor de l'objet `transitions`**
  - [x] Remplacer la structure actuelle (`fadeIn`, `fadeOut`, etc.) par une structure groupee par nom unique.
  - [x] Ajouter un helper `getTransitionVariant(ref, action)` qui retourne le bon style.
  - [x] Corriger le cas `zoom in` dans la nouvelle structure.

- [x] **Ajouter transition nulle / cut**
  - [x] Creer `cut` (ou `none`) pour un changement instantane.
  - [x] La rendre disponible pour intro et outro.
  - [x] Definir un fallback explicite si transition inconnue.

- [x] **Adapter les interfaces de selection**
  - [x] Mettre a jour `media-events` pour proposer les transitions par nom unique.
  - [x] Mettre a jour `edit-capsule` selon la meme logique.
  - [x] Garantir que la valeur envoyee est la cle canonique (`ref: "fade"`).

- [x] **Adapter persistance API/DB**
  - [x] Verifier/adapter l'ecriture des events (`action` + `ref` canonique).
  - [x] Conserver une compatibilite de lecture temporaire pour anciennes refs.

- [x] **Adapter le builder**
  - [x] Remplacer la lecture des anciennes refs par `getTransitionVariant(ref, action)`.
  - [x] Mapper les defaults `DEFAULT_IN/DEFAULT_OUT` vers les cles canoniques.
  - [x] Verifier tous les usages (items, capsules, defaults).

- [x] **Migration des donnees existantes**
  - [x] Ecrire un script SQL/TS de migration (`fadeIn` -> `fade`, `fadeOut` -> `fade`, etc.).
  - [x] Completer le mapping pour toutes les transitions legacy.
  - [x] Executer localement et verifier des scenes existantes (dont scene 7).

- [x] **Nettoyage post-migration**
  - [x] Retirer (ou deprecier) les aliases legacy devenus inutiles.
  - [x] Harmoniser les labels affiches en UI.

- [x] **Verification et non-regression**
  - [x] Tests manuels cibles: media-events, edit-capsule, builder, persistance DB.
  - [x] Verification specifique `zoom` + `cut`.
  - [x] Ajouter/adapter des tests smoke ou unitaires.

## Journal de suivi

- 2026-02-27: Plan cree, toutes les etapes en attente.
- 2026-02-27: Pause etape 1 finie (conventions + structure transitions + zoom + cut).
- 2026-02-27: Pause etape 2 finie (UI media-events + edit-capsule + persistance API/DB + builder).
- 2026-02-27: Pause etape 3 finie (migration SQL executee sur dev.db + verification refs + tests smoke).
- 2026-02-27: Convention ajustee: proprietes `[INTRO]`/`[OUTRO]` adoptees dans `transitions`, support legacy retire du runtime.
