## Objectif

Introduire une file d'execution maison, generique et independante des payloads, pour orchestrer les lectures/ecritures DOM liees a `move` sans artefacts visuels, tout en preservant les performances de la timeline.

## Contraintes de conception

- [x] La queue ne depend d'aucun schema metier (`item`, `decor`, `event`, etc.).
- [x] L'API expose uniquement des callbacks (`read`, `write`, `measure`, `commit`, `cancel`) et des metadonnees minimales (`key`, `priority`, `frame`).
- [x] Une seule passe RAF par frame pour les jobs en attente.
- [x] Separation stricte des phases: READ -> WRITE -> READ -> PLAY (FLIP batch).
- [x] Deduplication par `key` dans la meme frame (dernier job gagne).

## Etape 1 - Cadrage de l'API queue

- [x] Definir le contrat cible de la queue (document present).
- [x] Definir les types generiques:
  - [x] `QueueJob<TContext>`
  - [x] `QueuePhaseHooks<TContext, TResult>`
  - [x] `QueueController` (`enqueue`, `flush`, `clear`, `dispose`).
- [x] Definir les regles d'ordonnancement:
  - [x] tri par `priority` puis ordre d'arrivee.
  - [x] deduplication par `key`.
  - [x] gestion des erreurs par job (isolation des echecs).

## Etape 2 - Creation du module independant

- [x] Creer `app/player/queue/frame-queue.ts` (module neutre, sans import player metier).
- [x] Implementer le scheduler RAF unique.
- [x] Implementer les 4 phases batch:
  - [x] phase 1: `readBeforeWrite`
  - [x] phase 2: `applyWrite`
  - [x] phase 3: `readAfterWrite`
  - [x] phase 4: `commit`
- [x] Ajouter `dispose()` pour cleanup complet (cancel RAF + purge file).

## Etape 3 - Adaptation du pipeline move (player)

- [x] Integrer la queue dans le runtime (`Player`) sans couplage fort.
- [x] Remplacer l'execution directe de `_moveChange` par un job queue pour les cas `move: true`.
- [x] Conserver le comportement actuel pour `move: string` (reparent) tant qu'aucune regression n'est constatee.
- [x] Verifier que les classes sont appliquees avant mesure finale (coherence `className add/remove`).
- [x] Garantir que la transition animejs est preparee apres le batch write, puis pilotee par la timeline existante.

## Etape 4 - Robustesse et performance

- [ ] Eviter le layout thrashing:
  - [x] regrouper toutes les lectures puis toutes les ecritures.
  - [ ] une seule invalidation layout globale par frame.
- [ ] Ajouter garde-fous:
  - [ ] ignorer les transitions nulles (no-op old/new).
  - [ ] ignorer les elements detaches du DOM.
  - [ ] timeout de securite optionnel pour jobs orphelins.
- [ ] Ajouter traces debug activables (feature flag) pour diagnostiquer ordre/latence queue.

## Etape 5 - Validation

- [x] Tests unitaires du module queue (pur TypeScript, sans DOM reel si possible):
  - [x] deduplication
  - [x] ordre des phases
  - [x] isolation des erreurs
  - [ ] dispose
- [ ] Tests smoke player:
  - [ ] move custom-slot sans artefacts visuels.
  - [x] fin de scene + rembobinage: retour exact a l'etat initial.
  - [ ] drag/seek frequent: pas de regen scene/player non souhaitee.
- [x] `npm run typecheck`
- [x] `npm run test:smoke`

## Etape 6 - Finalisation

- [ ] Nettoyer les chemins obsoletes (`move.ts` legacy si non utilise).
- [ ] Documenter l'usage de la queue dans le player (bloc commentaire + invariants).
- [ ] Revue finale UX/perf sur scene `id:6` (cas `sst`).

## Journal

- 2026-02-28: Plan cree et decoupe en etapes avec checklist operationnelle.
- 2026-03-01: Implementation initiale de `frame-queue` generique (RAF + phases + dedup + priorites + isolation erreurs), integration dans `Player` pour `move: true`, conservation `move: string`, ajout smoke `tests/frame-queue-smoke.ts`, puis validation typecheck/smoke.
- 2026-03-01: Note regression seek: le seek etait stable avant les derniers changements Builder/placement (styles statiques en classes). Depuis, flicker visible pendant seek/scrub, surtout quand des `move:true` sont emis sur custom-events.

## Note seek / flicker

### Constat

- Avant les changements recents, `seek` ne produisait pas d'artefact visible.
- Depuis le passage d'une partie du style (FlexMini/layout) en classes calculees par Builder, plus d'events marquent `move:true`.
- Pendant `seek`, l'application des changements et la logique `onUpdate` peuvent produire des etats intermediaires (reparent/className/layout) qui se voient a l'ecran sous forme de flicker.

### Hypotheses techniques

- Collision entre deux chemins d'application pendant `seek`:
  - `seekChanges(time)` applique un etat cumule,
  - puis `timeline.seek(time)` declenche `onUpdateStaticChanges` qui peut reappliquer/mesurer/transitionner.
- Jobs `moveQueue` (phase read/write/read/commit) declenches autour d'un `seek` alors que l'attendu UX est un saut instantane (pas de FLIP anime).
- Changement de `className` (incluant classes statiques de placement) provoque un recalcul layout entre deux reads.

### Pistes de resolution (a traiter plus tard)

- [ ] Introduire un mode `seek hard` explicite:
  - appliquer un seul etat final sans transition (`move:true` traite comme write direct),
  - court-circuiter temporairement `onUpdateStaticChanges` pendant ce mode.
- [ ] Unifier l'ordre d'application seek pour eviter les doubles ecritures:
  - definir une source unique de verite (soit `seekChanges` puis sync timeline, soit l'inverse, mais pas les deux qui se recouvrent).
- [ ] Geler la queue pendant seek:
  - clear + blocage enqueue/commit sur la fenetre du seek,
  - reprise normale hors seek.
- [ ] En dernier recours UX: masque 1 frame du conteneur player pendant l'application seek (hide/apply/show) pour eliminer les etats transitoires perceptibles.
