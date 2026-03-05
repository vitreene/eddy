# Plan - defer reload sequence apres edition

## Objectif

Eviter tout rebuild automatique de la sequence pendant l'edition (item/capsule/events), conserver le DOM de l'element en cours d'edition, puis declencher un rebuild propre uniquement lors d'une action de sequence (telco play/rewind/seek), avec deselection de l'item actif.

## Contraintes d'architecture (regle directrice)

- `scene-logic` (XState) est la source unique de verite metier.
- Le maximum de la logique defer/flush, init scene, et orchestration player passe par `scene-logic`.
- Pour garder `scene-logic.ts` lisible, extraire methodes/fonctions/guards/actions dans des fichiers secondaires `provider/*` (meme pratique que les helpers/actors existants).
- Convention `active`: `ActiveState` regroupe les etats applicatifs principaux partages entre composants; reutiliser `active` dans ce sens si de nouveaux etats partages sont necessaires.
- Convention `*Touched`: ces flags identifient les zones d'interface touchees par une intervention utilisateur; conserver ce pattern de nommage/comportement pour tout nouveau flag.
- React sert d'interface (rendu, wiring, callbacks UI), pas de moteur metier parallele.
- `home.tsx` reste une page de distribution UI + chargement scene + relai player, avec logique minimale.
- Toute logique metier non triviale en page/composant doit etre deplacee vers `scene-logic` (ou un acteur XState enfant invoque par `scene-logic`).
- `useRef`/`useState` restent autorises pour du pur UI local, jamais pour porter l'etat metier defer/flush ou les regles de synchro scene.

## Ordre d'intervention (checklist globale)

- [x] 1. Cadrage technique et reperage des flux existants (`EditItem`, `EditTransform`, `SceneLogic`, `PlayerRunner`, `home.tsx`).
- [x] 2. Documenter les points de reload actuels et formaliser la regle metier unique: "defer pendant edition, flush sur action sequence".
- [x] 3. Concevoir la politique defer/flush DANS XState (`scene-logic`) plutot qu'un systeme parallele.
- [x] 4. Implementer les evenements/flags `scene-logic` necessaires (edition en cours, sequence-action, flush-requested/flush-done).
- [x] 5. Integrer la deselection metier avant flush/rebuild (`itemId/node/contentId/event = null`) dans `scene-logic`.
- [x] 6. Brancher le relai player/rebuild sur les signaux issus de `scene-logic` (React execute, `scene-logic` decide).
- [x] 7. Couvrir les cas declencheurs demandes: telco play/rewind/seek, ajout d'element, deplacement/creation d'event entrainant seek.
- [x] 8. Revoir l'initialisation de la scene courante et du provider `scene-logic` selon les pratiques XState recommandes.
- [x] 9. Simplifier `home.tsx` (page d'assemblage) en deplacant la logique metier residuelle vers `scene-logic`/acteurs dedies.
- [ ] 10. Verifier le comportement UX cible de bout en bout (edition continue sans reload, rebuild unique au bon moment).
- [x] 11. Nettoyage (logs debug, coherence conditions) + validation locale (lint/typecheck/tests cibles).

## Detail point 3 - politique defer/flush dans `scene-logic`

- [x] 3.1 Ajouter un sous-domaine metier dans `scene-logic` (etat/contexte) pour la politique de reload sequence.
- [x] 3.2 Definir des evenements explicites: `scene-change-detected`, `sequence-action`, `flush-requested`, `flush-consumed` (noms a confirmer selon convention repo).
- [x] 3.3 Stocker en contexte XState les informations minimales: scene pending, fingerprint/cle de comparaison, raison du flush.
- [x] 3.4 Definir les transitions: edition -> queue only, action sequence -> request flush, post-flush -> clean.
- [x] 3.5 Garder `buildScene`/rebuild hors de la machine, mais decision de "quand rebuild" 100% dans la machine.
- [x] 3.6 Prevoir idempotence: snapshot identique => pas de flush inutile.
- [ ] 3.7 Si necessaire, preferer un acteur XState enfant invoque par `scene-logic` plutot qu'un module imperatif autonome.
- [x] 3.8 Si ajout de flags, respecter la convention existante `*Touched` (zone UI impactee par action utilisateur) et documenter leur role dans `active`.

## Detail point 2 - points de reload et regle metier unique

- [x] 2.1 Point de reload actuel principal: dans `home.tsx`, la souscription `actorRef.subscribe` rebuild via `setScene(buildScene(state))` des qu'un slice scene change.
- [x] 2.2 Point de fragilite associe: rebuild player peut detacher/remplacer le noeud DOM actif pendant une edition continue (`EditTransform`/`EditItem`).
- [x] 2.3 Cas a couvrir: action telco (`play`, `rewind`, `seek`), ajout d'element, deplacement/creation d'event entrainant seek.
- [x] 2.4 Regle metier formalisee: tant qu'on est en edition, les changements sont appliques visuellement + stockes dans `scene-logic` + persistes DB, sans rebuild sequence immediat.
- [x] 2.5 Regle metier formalisee: lors d'une action sequence, `scene-logic` force la deselection active puis demande un flush unique du dernier etat pending avant reprise normale.
- [x] 2.6 Regle d'implementation: les actions/guards/helpers de cette politique sont extraites dans des fichiers secondaires `provider/*` pour conserver la lisibilite de `scene-logic.ts`.

### Critere d'acceptation point 2

- [x] Les points de reload actuels et leurs effets de bord sont identifies.
- [x] Une regle metier unique et explicite defer/flush est ecrite.
- [x] La contrainte de lisibilite (`scene-logic.ts` fin, logique extraite) est etablie.

### Critere d'acceptation point 3

- [x] Aucune politique defer/flush metier n'est conservee dans `useRef`/`useState` React.
- [x] Le "quand flusher" est entierement determine par `scene-logic`.
- [x] Une action sequence ne provoque qu'un seul flush/rebuild du dernier etat pending.

## Detail points 4-7 - implementation des regles fonctionnelles

- [x] 4.1 Faire emettre par `scene-logic` un signal de flush sur action telco `play`.
- [x] 4.2 Faire emettre par `scene-logic` un signal de flush sur action telco `rewind`.
- [x] 4.3 Faire emettre par `scene-logic` un signal de flush sur action telco `seek`.
- [x] 5.1 Avant emission flush, forcer la deselection active dans `scene-logic` (`itemId/node/contentId/event`).
- [x] 6.1 Adapter le relai player pour consommer le signal de flush sans redefinir les regles metier dans React.
- [x] 7.1 Ajouter le cas "nouvel element ajoute" dans la meme politique (queue puis flush sur action sequence).
- [x] 7.2 Ajouter le cas "deplacement/creation d'event provoquant seek" dans la meme politique.
- [x] 7.3 Verifier uniformite capsule/item/event: meme regle defer/flush.

### Critere d'acceptation points 4-7

- [x] Les trois actions telco (`play`, `rewind`, `seek`) declenchent le comportement cible.
- [x] Les creations/deplacements concernes n'induisent plus de reload immediat parasite.
- [ ] L'element edite reste visuellement stable tant qu'aucune action sequence n'intervient.

## Detail point 8 - chargement scene courante et init XState

- [x] 8.1 Cartographier les usages actuels `useRef`/`useState` lies au boot scene/actor.
- [x] 8.2 Definir une procedure d'initialisation XState claire et unique (init idempotente, pas de double init).
- [x] 8.3 Aligner l'initialisation provider/actor avec les pratiques XState React recommandees (actor stable, init explicite).
- [x] 8.4 Deplacer la logique metier de chargement/changement de scene vers `scene-logic` (event d'init/reset dedie).
- [x] 8.5 Laisser React declencher l'init declarativement puis afficher, sans orchestration metier interne.

### Critere d'acceptation point 8

- [x] Initialisation `scene-logic` reproductible et conforme XState.
- [x] Pas de logique metier de boot scene dispersee dans les hooks React.

## Detail point 9 - simplification `home.tsx`

- [x] 9.1 Identifier la logique metier residuelle de `home.tsx` et la deplacer vers `scene-logic`/acteurs dedies.
- [x] 9.2 Conserver `home.tsx` en composeur declaratif (layout + wiring + relai player).
- [x] 9.3 Verifier que les composants enfants s'appuient sur `SceneLogicContext` pour parent/enfant plutot que sur des synchronisations React manuelles.

### Critere d'acceptation point 9

- [x] `home.tsx` ne contient plus de politique metier etendue.
- [x] Le relai player reste fonctionnel avec logique metier centralisee dans `scene-logic`.

## Journal d'avancement

- 2026-03-04: Plan initialise et etape 1 cochee (analyse des points d'entree et des zones de reload/de selection).
- 2026-03-04: Plan reordonne pour prioriser `scene-logic`/XState sur toute la chaine defer/flush + init scene.
- 2026-03-04: Point 2 effectue (points de reload documentes + regle metier unique formalisee + consigne d'extraction des fonctions dans `provider/*`).
- 2026-03-04: Realisation etapes 3 a 7 (politique defer/flush centralisee dans `scene-logic`, signal de flush consomme par `home.tsx`, deselection metier avant rebuild).
- 2026-03-04: Etapes 8 et 9 appliquees (procedure d'init extraite `provider/scene-logic.init.ts`, `init` gere en start + edit, `home.tsx` reduit au wiring UI).
- 2026-03-04: Validation technique executee (`npm run typecheck`, `npm run test:smoke`) - OK; verification UX manuelle ciblee reste a finaliser (etape 10).
- 2026-03-04: Etape 11 completee (cleanup logs dans `home.tsx` + `npm run build` + re-validation `npm run typecheck`).
- 2026-03-04: Retour UX test 2 traite: application visuelle immediate restauree pour `EditItem` (style + texte) via `parts/item-edit/live-node-style.ts`; en attente de revalidation manuelle.
- 2026-03-04: Correction complementaire suite retour UX: `EditItem`/`EditTransform` envoient des patches (valeurs modifiees uniquement), merge patch cote `scene-logic`, et application live filtree sur le noeud actif (typecheck+smoke OK).
- 2026-03-04: Correctif bouton `bold`: filtrage robuste des diffs UI vs style courant (payload complet de StyleEditor tolere), suppression des valeurs non modifiees/parasites dans le patch envoye.
- 2026-03-04: Regle telco ajustee selon recette UX: `seek` seul ne declenche plus le rebuild; flush one-shot conserve sur premiere action telco autorisee (`play`/`rewind`) apres edition.
- 2026-03-04: Regle deplacement item precisee: un move item/capsule declenche aussi un rebuild (signal `sequence-flush-request` force ajoute en sortie `tree-after-move`).
- 2026-03-04: Correctif mesure edition: suppression de la neutralisation `min-width/min-height` imposee a la selection dans les editeurs de transform pour lire la geometrie native avant toute modification.
- 2026-03-04: Correctif calcul translate sur patch transform partiel (ex: scale seul): recalage sur base position derivee (`readTransformPreserve` - persisted x/y) pour eviter tout deplacement non sollicite.
- 2026-03-04: Correctif premiere selection item: ajout d'une relance `active-set` (payload vide) cote `EditTransform` quand `itemId` est present mais `node` indisponible, afin d'activer la resolution lazy du noeud sans exiger une seconde selection.
- 2026-03-04: Ajustement garantie post-seek: relance de resolution `active-set {}` deplacee cote `PlayerRunner` sur frame suivant un `seek` (si `itemId` selectionne et `node` absent), pour attendre la fin du seek avant activation `EditTransform`.
- 2026-03-04: Debug premiere selection renforce: log explicite `EditTransform` sur resolution node + fallback DOM direct dans `getPlayerNode` + relance post-seek centralisee dans `telcoController.syncFromActive` (sans effet React additionnel dedie).
- 2026-03-04: Correctif activation overlay premiere selection: `offsetParent` n'est plus memoise sur `element` seul (recalcul a chaque render) pour eviter un `null` stale avant la fin du seek/layout.
- 2026-03-04: Overlay transform ajuste: retrait log debug, retour d'un pivot d'origine manipulable (croix verte), rotation alignee sur ce pivot, et resize-se conserve en mode "etirement depuis top-left" sans forcer l'origine a `0,0`.
