# Lessons

## 2026-04-25 — "undo" utilisateur: annuler uniquement la session courante et eviter tout git destructif

- Si l'utilisateur dit "undo", annuler uniquement les changements faits dans l'echange en cours, puis confirmer explicitement ce qui a ete retire.
- Ne jamais utiliser de commande git ecriture/suppression sans autorisation explicite; limiter git a la lecture (`status/log/diff`) tant que la contrainte est active.
- En regression, prioriser un correctif minimal sur les chemins existants plutot que d'ajouter de nouveaux artefacts de support.

## 2026-04-25 — Semantique d'ancrage: aligner handle, preview et commit

- Si le handle de position represente l'ancre (ex: losange haut-gauche), le calcul de cible (`probe`), le preview live et le commit final doivent utiliser cette meme ancre.
- Eviter les conversions implicites "centre" dans le controleur de commit quand le produit attend un ancrage coin haut-gauche.
- Une divergence ancre UI vs ancre commit cree un ressenti "la position n'est pas fixee" meme si le commit est bien emis.

## 2026-04-25 — Fin de drag: ne pas nettoyer trop tot le preview inline

- Si le commit persiste asynchronement (ou peut etre rejoue), retirer immediatement l'inline preview peut provoquer un retour visuel a l'ancien placement.
- En succes de commit, finaliser l'inline au placement cible est plus robuste; reserver le rollback inline au cancel/no-op.
- Pour valider, tester explicitement le scenario "resize visible pendant drag, puis relachement".

## 2026-04-25 — Preview inline style: restaurer vs finaliser selon l'issue du drag

- Pendant un drag grid-native, appliquer `grid-row/grid-column` en inline pour le preview live est acceptable.
- En fin de drag avec commit valide, ne pas restaurer les anciennes valeurs inline: supprimer les props inline pour laisser la classe committee devenir source de verite.
- La restauration des anciennes valeurs inline doit etre reservee aux no-op/cancel.

## 2026-04-25 — Interactivite drag en projection grille: separer preview et commit

- Un cadre grid-native ne doit pas lire uniquement le placement DOM persiste (classe/computed style), sinon l'interaction parait "figee" jusqu'au commit.
- Transporter un `previewPlacement` live dans la machine (`preview.placement`) et le prioriser au rendu pendant le drag.
- Pour diagnostiquer vite: si `drag.start.after started=true` et `commit.before` existent, le probleme est probablement le canal de preview visuelle, pas la gestuelle.

## 2026-04-25 — Logs "avant/apres": instrumenter le chemin actif, pas seulement les couches basses

- Quand l'utilisateur demande des logs "before/after", les placer explicitement sur le composant actif (event UI), puis sur la machine (callback metier) pour borner le point de rupture.
- Une instrumentation utile minimum pour un drag: `pointerdown.before`, `pointerdown.after-send`, `commit.before-callback`, `commit.after-callback`.
- Eviter de supposer que les logs existants en service suffisent si le nouveau composant remplace le chemin precedent.

## 2026-04-25 — Si l'utilisateur demande un nouveau composant separe, ne pas refactorer l'existant

- Quand la demande explicite est "nouveau composant, nouveau fichier", appliquer cette separation strictement pour permettre comparaison legacy vs nouveau.
- Pour une contrainte "tout via XState local", supprimer toute orchestration React (`useEffect`, `useMemo`) du nouveau chemin et utiliser une initialisation machine par remount controle.
- En cas de plainte interactivite (drag/resize), prioriser une architecture minimale et testable (nouveau composant isole) avant d'accumuler des correctifs dans le composant historique.

## 2026-04-25 — Regression position: corriger l'architecture de projection, pas le calcul pixel

- Quand le besoin metier est "position par grille", eviter de projeter le cadre via matrices XY; dupliquer la grille parente et positionner le frame en `grid-row/grid-column`.
- Garder le moteur de drag XState/service, mais separer clairement l'orchestration (machine) du mode de rendu (projection grille native).
- En cas de correction utilisateur explicite sur la direction architecturale, conserver l'ancien chemin en legacy desactive plutot que le supprimer.

## 2026-04-25 — Selection frame: eviter `offsetWidth` pour la precision visuelle

- Pour un cadre overlay aligne au pixel (surtout sur elements tres fins), ne pas baser `w/h` sur `offsetWidth/offsetHeight` (arrondis entiers).
- Utiliser `getBoundingClientRect().width/height` pour la taille affichee du frame; reserver les tailles entieres aux besoins layout non visuels.
- Un diagnostic `dx/dy=0` avec `dw/dh!=0` indique un probleme de mesure de taille, pas de position.

## 2026-04-25 — Sync editeur: ne jamais dependre du token seul

- Un `syncToken` peut changer sans swap de node, mais l'inverse est aussi vrai (node remplace sans nouveau token).
- Pour les overlays relies au DOM (`usePositionRuntime`), inclure la reference `element` dans la synchro machine (ou synchroniser sur props completes) pour eviter un frame stale.
- Eviter les remounts forces par `key` comme mecanisme principal de sync quand la source de verite est un node DOM vivant.

## 2026-04-25 — Scope debug: verifier le type de node actif (item vs capsule)

- Sur les cas d'edition position, le node actif peut etre `capsule__*` (si `content.type = capsule`) et non `item__*`.
- Ne pas filtrer les logs debug uniquement par `itemId`; inclure l'id de node effectivement resolu dans `active.node`.
- Si aucun log n'apparait, verifier d'abord la resolution de node (`buildNodeId("item")` vs `buildNodeId("capsule")`) avant de supposer un probleme d'instrumentation.

## 2026-04-25 — Quand un fix frame ne suffit pas: instrumenter la chaine complete

- Si la correction proposee ne regle pas la regression visuelle, passer immediatement en mode debug avec logs avant/apres commit, pas seulement sur un point du flux.
- Tracer les 4 etapes ensemble: service de drag (commit), controleur (patch decor), machine (resync), rendu frame overlay.
- Pour les regressions ciblees, activer un scope debug item-specifique (ex: `item__104`) afin d'eviter le bruit global.

## 2026-04-25 — Position runtime sync: token parent > deps manuelles

- Eviter les listes de dependances longues dans `usePositionRuntime` pour `props.sync`: elles finissent incompletes et fragiles.
- Piloter la resync depuis le parent avec un `syncToken` explicite (et remount si necessaire) pour fiabiliser le recalage du cadre.
- En correction de regression de frame, privilegier un signal de sync unique et intentionnel plutot qu'un couplage aux rerenders React.

## 2026-04-25 — Position editor: resync post-commit pilote par machine

- Ne pas faire dependre la coherence du cadre de position d'un rerender React (`props.sync`) quand le commit provoque un flush asynchrone du player.
- En mode `position`, declencher un resync DOM multi-frame apres `drag.end` depuis la machine XState pour absorber la propagation layout/CSS apres commit.
- Garder le cycle de vie des services DOM dans les machines (creation + dispose), et laisser React en adaptateur de rendu/evenements.

## 2026-04-25 — Regressions: localiser d'abord, proposer ensuite

- Face a une regression, commencer par identifier le commit/cause precise (blame + diff) avant de proposer un nouveau mecanisme.
- Eviter les solutions structurelles lourdes tant que le comportement pre-regression peut etre restaure proprement.
- Employer un vocabulaire technique concret et verifiable; bannir les formulations floues qui ne decrivent pas un mecanisme observable.

## 2026-04-25 — Editor runtime: React mince, XState central

- Dans `visual-transform-grid`, eviter de faire porter a React la coordination runtime (memo de paquets de props, derivees runtime memoisees) ; deleguer l'orchestration a XState.
- Garder React comme adaptateur de rendu DOM + forwarding d'evenements (`props.sync`, pointer handlers), avec des services DOM singletons explicites.
- Quand une revue signale une derive architecturale, corriger d'abord la structure du flux (qui pilote l'etat) avant d'ajouter des rustines comportementales.

## 2026-04-04 — Orchestrateur gestuel sans logique metier

- Quand on factorise des interactions pointer (clic/glisse), l'orchestrateur doit rester strictement gestuel: collecte des points, seuil de mouvement, cycle start/move/complete/cancel.
- Interdiction d'ajouter des branches metier (intro/outro/custom, selection, creation) dans l'orchestrateur partage.
- Toute specialisation de comportement doit vivre dans les adaptateurs appelants (Rubber, Waveform, point editors), via callbacks explicites.

## 2026-04-04 — Eviter les types React deprecies

- Ne pas typer les refs internes avec `MutableRefObject` quand il est deprecie; preferer un type structurel local (`{ current: T }`) partage entre utilitaires.
- Garder les utilitaires (ex: orchestrateur pointer) decouples des details de typage React pour limiter les regressions de version.

## 2026-04-04 — Contrainte d'alignement des points timeline

- Avant d'imposer une piste unique pour les points event, verifier si la contrainte attendue est en fait "centre sur la ligne de texte" en mode multi-lignes.
- Pour Rubber multi-lignes: verrouiller le deplacement des handles sur l'axe horizontal en conservant le Y de leur ligne de texte (row-lock), sans forcer un Y global.
- Eviter le row-lock absolu sur la ligne de depart: il doit rester possible de changer de ligne par deplacement vertical, puis verrouiller horizontalement sur la ligne cible (snap de rangee).

## 2026-04-04 — Reselection item et stabilite du cue

- Ne pas recalculer `cue` sur `selection.item.requested` quand l'item ne change pas et qu'aucun `cue/event/action` explicite n'est fourni; conserver la valeur active courante.
- Sinon, un rebuild player peut ecraser le cue d'un event tout juste selectionne et annuler l'effet de seek attendu.

## 2026-04-05 — Position zones: precedence claire des classes

- En capsule `position`, la selection d'une zone via `SlotEditor` doit nettoyer les anciens tokens de placement (`cell-span`, `cell-r`, `cell_layout_auto`, `liste-r`) pour eviter des classes concurrentes.
- Quand une classe de zone est presente, la generation CSS doit prioriser la zone et ignorer les definitions de placement legacy du meme decor.
- Les definitions live de zones doivent etre dedupees par `className` pour eviter des regles redondantes en edition.
- Cote rendu player, eviter le stripping agressif des tokens de placement: la normalisation doit se faire en amont (patch decor), pour ne pas casser les fallback CSS legacy.
- Convention de nommage: utiliser `ed-zone-<slug(name)>` pour la classe cible d'une zone; ne pas se reposer sur des suffixes numeriques opaques (`ed-zone-04`) pour la selection.
- Pour ne pas casser l'existant, garder une phase de compatibilite avec alias CSS (classe legacy + classe slug) tant que tous les decors ne sont pas migres.

## 2026-04-05 — Regression selection: corriger le contrat, pas ajouter un garde

- En cas d'incoherence selection/player sur un custom-event, corriger d'abord le calcul d'ancre de selection (source de verite), pas bloquer les emissions avec un garde ad hoc.
- Un garde anti-duplication ne doit intervenir qu'apres preuve qu'il traite la cause racine et pas seulement le symptome.

## 2026-04-05 — FLIP: se mefier des caches de geometrie

- Un cache de dimensions/position inter-transition (`lastEndCoords`) peut masquer un etat stale et produire des sauts width/height.
- Avant de conserver ce type de cache, instrumenter la pipeline (`seek`, snapshot apply/capture, old/new rect) et prevoir un switch runtime pour desactiver le cache pendant le diagnostic.
- Sur un `seek`, purger les snapshots/transitoires accumules; sinon des valeurs capturees a un temps precedent peuvent etre reappliquees au mauvais keyframe.
- En lecture avant (time croissant), ne pas reappliquer un `snapshot` de fenetre precedente: cela reintroduit des dimensions temporaires (width/height) et casse le FLIP suivant.
- Ne pas inverser la semantique des fenetres de changement (`prev->curr`) sans validation playback: le contrat runtime reste `curr->next`, sinon les keyframes futures s'appliquent trop tot (intro/slot casse).
- Ne pas etirer un FLIP jusqu'au keyframe suivant lointain: borner la progression a `DEFAULT_DURATION` (ou `next` si plus court) et nettoyer les styles inline du FLIP precedent au switch de fenetre.
- Nettoyer aussi les styles inline FLIP des que la transition atteint 100% en lecture avant, pas seulement au prochain changement de fenetre.
- Reinitialiser les conteneurs runtime du player (`persoPositions`, `transitions`, `setters`, `previousTime`) a chaque `seek`/`replay`/`revert`; sinon les relectures accumulees reutilisent des etats stale et degradent les placements.
- Dans le player, ne jamais traiter un `className` action `{add/remove}` comme remplacement total de `element.className`; l'appliquer comme patch sur les classes existantes pour conserver les tokens structurels (`bg-picture`, `ed-item`).
- Respecter strictement le contrat d'interface: en V1, `{ add/remove }` signifie patch (ajout/retrait) et ne doit jamais declencher un comportement de remplacement total reserve a un autre mode/version.
- Ne pas "aplatir" un seek en appliquant tous les keyframes <= t: pour conserver les etats intermediaires d'une transition, reconstruire l'etat de base a `curr` puis rejouer la transition active a la progression du temps cible.
- Ne pas changer les comparateurs de bornes FLIP (`<=`/`<`) sans preuve tracee du defaut exact; ces changements peuvent casser un contrat runtime deja valide.
- Ne pas changer le referentiel de mesure geometrie (viewport vs offset-parent) sans preuve tracee sur le cas reel; privilegier un diagnostic old/nex + expected/actual avant toute bascule.
- Si `old/nex` sont corrects mais la largeur effective saute au seed (delta `dw` massif), verifier les contraintes CSS globales (ex: preflight `img{max-width:100%}`) qui peuvent annuler l'interpolation width/height FLIP.

## 2026-04-05 — Repro precise avant fix de boucle React

- En cas de "Maximum update depth exceeded", verrouiller d'abord le scenario exact utilisateur (ex: changement de position d'un custom-event sur item cible) avant d'optimiser un chemin plus large.
- Sur les flux seek/edition, ne jamais declencher de flush sequence depuis des updates de progression seules; reserver les flushs aux triggers telco semantiques (`action/cue/event/itemId`).

## 2026-04-05 — Geometrie DOM: pas de state derive en boucle

- Ne pas stocker en `useState` une geometrie DOM derivee (`anchors`) calculee dans un `useEffect`; c'est un anti-pattern qui boucle facilement en mode strict.
- Pour les evenements externes (resize viewport), preferer `useSyncExternalStore` puis recalculer la geometrie directement au render.
- Si un `setState` geometrique reste necessaire, il doit etre strictement idempotent et borne a un flux d'evenement explicite.

## 2026-04-05 — Decor patchs: interdire les no-op emissifs

- Avant d'emettre `decor-patch-requested`, comparer `className/area` avec le decor courant et annuler l'emission si le patch est vide.
- Dans les effets de controleur (mode position), ne pas forcer une normalisation de classe si elle ne produit aucun changement effectif.
- Sinon on peut recreer le controller, relancer l'effet, et boucler indéfiniment sans stackoverflow explicite.
- La comparaison de no-op doit se faire sur le **decor cible reel** (`payload.id`) et non sur un decor de contexte (item/event) pour eviter de filtrer un patch valide.
- Quand un token `ed-zone-*` est present, assainir les classes de placement concurrentes (`cell-span`, `cell-r`, `cell_layout_auto`, `liste-r`) avant persistance pour eviter des classes mixtes incoherentes.
- Pour creation asynchrone de decor custom-event: emettre `decor-created` avec le patch deja fusionne (className/area/style), sinon un etat seed intermediaire peut reintroduire `cell-span-fill`.
- Pour les intents SlotEditor sur custom-event sans decor, ne pas laisser un garde no-op bloquer `decor-patch-requested`: il faut d'abord materialiser un decor dedie, puis appliquer la classe de slot.

## 2026-04-05 — Custom-event: collision de name et contrainte DB

- Le modele DB impose `@@unique([itemId, name])` sur les events: un custom-event ne doit pas persister avec un `name` deja utilise sur le meme item.
- Au lieu de laisser echouer la persistence (500), suffixer automatiquement le nom en cas de collision (`<name>-2`, `<name>-3`, ...) pour garder un custom-event nomme.

## 2026-04-05 — Styles de sequence: source unique builder

- Ne pas injecter de balises `<style>` ad hoc depuis les editeurs (zones/position) pour des regles de sequence.
- Les regles CSS de placement doivent venir uniquement du style unique produit par le builder.
- Proscrire aussi les nettoyages defensifs de tags live: la correction doit supprimer le canal de generation, pas le masquer.
- Quand on introduit des alias de classes (`ed-zone-<slug>`), le builder doit generer la regle CSS pour **chaque alias**, pas seulement pour la classe canonique stockee.
- Publier les definitions de toutes les zones de capsule dans le style builder, et conserver aussi les defs de fallback placement tokens presents (`cell-span-*`, `cell-span-fill`).
- Sur le flux SlotEditor, la sanitation des tokens de placement doit inclure `cell-span-fill`; sinon des classes mixtes (`cell-span-fill ed-zone-*`) persistent et la position selectionnee peut etre ignoree.
- Eviter les classes de placement implicites injectees a la creation d'item (ex: `cell-span-fill`) sans demande explicite: ces defaults caches perturbent la selection de zone et rendent le debug difficile.

## 2026-04-05 — SlotEditor: selection stable par identite

- Ne pas piloter un select de zones par `className` (aliases/legacy causent des decallages); utiliser `zone.id` comme valeur UI et calculer la classe cible depuis la zone selectionnee.
- En presence de legacy, prevoir une migration donnees (`cardZones` + `decor.className`) vers une convention unique `ed-zone-<slug(name)>` pour supprimer les offsets nom/classe.
- Si une zone par defaut couvre toute la capsule, ne pas auto-selectionner de zone dans ZoneBuilder et garder la selection explicite via la liste SlotEditor.
- La creation de zone doit etre refusee sur surface occupee (overlap interdit), pour conserver des zones disjointes et predictibles.

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

- Quand une `area` explicite est appliquee en live, supprimer les classes de placement auto-layout (`cell_layout_auto_*`, `liste-rN`) en meme temps; sinon l'ordre CSS peut conserver l'ancien placement visuel.
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

## 2026-03-13 — Selection event et seek editeur

- Lors d'un `active-set` avec `action: "seek"` declenche par la selection d'event (ex: premier clic `outro`), ne jamais laisser le `sequence flush` vider `itemId/contentId/event`.
- Regle: si le seek vient d'une synchro de selection editeur, conserver la selection meme sans flags `*Touched`.
- Eviter d'assimiler tous les `seek` a des changements de sequence equivalents a `play/rewind`; la selection UI doit rester stable pendant l'edition.

## 2026-03-13 — Regle coeur: process auto custom-event

- Le deplacement `auto` d'un custom-event est la regle nominale du produit, pilotee par la configuration builder; l'absence d'auto est une exception explicite.
- Ne pas reutiliser le mot-cle `auto` pour des semantiques differentes dans la meme chaine metier (process deplacement vs autres modes), sinon ambiguite produit.
- Si une intervention reduit/neutralise le process auto nominal, le signaler explicitement a l'utilisateur avant livraison.

## 2026-03-13 — Contexte build: pas de legacy a proteger

- Tant que l'application est en phase de construction, ne pas introduire de contraintes legacy/fallback "ancienne version" par defaut.
- Avec accord explicite utilisateur, les champs DB de test peuvent etre renommes/modifies directement pour simplifier le modele cible.
- Ne basculer en strategie de compatibilite descendante qu'au passage en phase stable.

## 2026-03-13 — Contexte build: legerete plutot que defense programming

- En phase de construction, eviter le defensive programming systematique (gardes et validations de forme excessives) sur les fonctions internes.
- Privilegier un code simple, lisible, facilement refactorable, en supposant des contrats d'entree maitrises dans le flux applicatif.
- Reporter le durcissement (validation extensive, blindage des formes) a la phase de consolidation/stabilisation.

## 2026-03-13 — Event context comme source unique

- Intro/outro/custom doivent suivre le meme contrat d'edition: en contexte event actif, les modifications ciblent le decor de cet event.
- Eviter les circuits doubles (decor resolu d'affichage vs decor cible de persistance) non arbitres; conserver une seule source de verite et deriver le reste.
- Ne pas creer de decor event a la simple selection: creation paresseuse uniquement au premier changement reel (style/position/class/area).

## 2026-03-13 — Rappel auto-event sans intro/outro declares

- En absence d'intro/outro declares (auto-event), les transitions viennent de la capsule parente, sans creation de decor dedie.
- Les modifications du premier event (intro, ou premier custom-event si intro absent) s'appliquent au decor item.
- Ne pas forcer la creation d'un decor event pour ces cas par defaut.

## 2026-03-18 — AGENTS: check-in avant implementation

- Quand une tache est non triviale, appliquer strictement la sequence AGENTS: plan ecrit -> check-in utilisateur -> implementation.
- Ne pas enchaîner directement apres la creation du plan, meme si la direction semble claire.
- Ajouter un garde-fou personnel en debut d'execution: tant que le check-in n'a pas ete envoye, aucun `apply_patch`/modification de code.

## 2026-03-18 — Modele DB: ne pas persister les valeurs derivees

- Si la spec dit qu'une valeur (ex: duree) doit etre lue depuis des events fallback, ne pas creer de colonne dediee en base.
- Verifier explicitement l'emplacement cible demande (ex: `content.timestamp` vs `scene_content.timestamp`) avant migration.
- Avant livraison, comparer chaque champ ajoute au schema avec la phrase source du besoin pour eviter un mauvais placement de donnee.

## 2026-03-20 — Operations couteuses: demander avant escalation

- Si la demande est une comparaison/analyse, rester en mode lecture et ne pas lancer de charges lourdes (agent massif, batterie de commandes, scans larges) sans accord explicite.
- Definir un seuil personnel d'escalade: des que l'action depasse la lecture ciblee de quelques fichiers/commandes, faire un check-in utilisateur avant d'executer.
- En cas d'incertitude, proposer une option par defaut frugale (logs/docs locaux) et expliquer ce qui changerait avec l'option couteuse.

## 2026-03-20 — Source de verite contenus audio (SceneEdit)

- Pour les selecteurs de contenu (ex: audio SceneEdit), reutiliser la meme source de donnees que Chutier: merge `allContents` (loader) + `state.context.contents`, puis filtrage `groupedContents.sound`.
- Ne pas supposer que `state.context.contents` contient tout le catalogue; il peut etre limite aux contenus deja lies a la scene.
- En cas de divergence UI entre deux zones (Chutier vs SceneEdit), aligner d'abord le pipeline de donnees avant de toucher l'affichage.

## 2026-03-20 — Whisper word timestamps: verifier le bon artefact modele

- Le prerequis "word timestamps" doit etre valide avec `return_timestamps: "word"` sur le modele exact configure en production, pas seulement sur l'API generale.
- Pour Whisper ONNX communautaire, utiliser les variantes `_timestamped` quand les attentions croisees sont requises; les variantes standards peuvent echouer avec `output_attentions` manquant.
- En verification, inclure un test runtime explicite qui echoue si `chunks` mot-a-mot n'est pas retourne.

## 2026-03-20 — SceneEdit: minimiser l'etat React

- Ne pas dupliquer l'etat global XState dans `useState` local (`titleDraft`, `durationDraft`) quand la valeur peut venir directement du store.
- Eviter `useMemo` pour des derivees simples (ex: filtrage sons) quand la lisibilite est meilleure en calcul direct.
- Sortir la logique metier (normalisation, persistance patch scene) hors du composant React pour garder une UI declarative et mince.

## 2026-03-20 — ItemEdit: limiter `use*` au strict necessaire

- Dans les panneaux d'edition relies a XState, eviter `useCallback`/`useMemo` par defaut; les utiliser seulement si un probleme mesurable de perf le justifie.
- Preferer des fonctions metier pures hors composant (ex: resolution decor, plan de mutation style, construction de cles de sync).
- Garder les hooks React pour l'integration (ex: `useSelector`, `useRef`, `useEffect`, `useMachine`) et non pour encapsuler la logique metier courante.

## 2026-03-20 — Scene-logic: isoler les appels reseau en modules annexes

- Quand on ajoute des flux reseau dans `scene-logic`, deplacer les methodes HTTP dans un fichier annexe dedie (ex: `scene-logic.api.ts`) au lieu d'encombrer la machine.
- La machine XState doit orchestrer (events/actions/transitions), pas porter les details bas niveau des requetes.
- Pour les composants `item-edit`, toute operation reseau doit transiter par `send(...)` vers la machine; aucun `fetch` direct dans les composants.

## 2026-03-20 — Eviter les refs miroir pour etat XState

- Si une valeur provient deja du store XState, privilegier la lecture depuis la source (`actorRef.getSnapshot()`) au moment d'execution plutot qu'un `useRef` miroir synchronise par `useEffect`.
- Garder `useRef` seulement pour les etats locaux non reactifs (ex: promesse en cours), pas pour dupliquer `item`/`node` issus du contexte machine.

## 2026-03-20 — Boucles React: stabiliser les dependances machine

- Ne jamais dependre d'un objet `props` entier dans un `useEffect` qui envoie un event machine (`props.sync`), sinon boucle de render potentielle.
- Memoizer les objets derives envoyes aux machines (`runtimeInput`, `editableVisualState`) pour eviter les transitions inutiles en continu.
- Stabiliser les callbacks passes aux composants editeurs sensibles aux refs (`onCommit`, `onStyleChange`, etc.) quand ils pilotent des sous-machines.

## 2026-03-20 — Auto durations: toujours deriver des cues effectifs

- Pour la duree auto des items, ne pas se baser uniquement sur `sceneContent.events` (peut etre stale/default).
- Utiliser la meme priorite de source partout: `cues` -> `timestamp` -> `events` (`getSceneContentCues`).
- Quand la scene est reliee a un son apres creation, les fenetres auto doivent suivre la plage temporelle des cues audio, pas la fallback duration historique.

## 2026-03-20 — Round-trip UI des refs d'effets

- Quand une config est stockee en JSON dans `event.ref`, verifier explicitement le round-trip DB -> parser UI -> controles pour des scenes reelles (ex: scene 8) apres implementation.
- Rendre le parser tolerant aux variantes historiques (`in/out`, `initial/final`, scalaires ou tableaux) pour eviter des reglages "perdus" a la relecture.

## 2026-03-20 — Ne pas sur-generaliser sans besoin explicite

- Eviter d'ajouter de la compatibilite de format non demandee (parser permissif) quand le contrat attendu est deja precise.
- Prioriser une implementation stricte et lisible du schema requis, puis elargir seulement si un cas legacy est explicitement valide.

## 2026-03-20 — Builder: standard events sans ancrage explicite

- Quand un standard event depend d'un intervalle (ex: `sustain`) et que `intro/outro` ne sont pas explicitement persistes, le builder doit calculer un fallback auto (borne scene + durees de transition), sinon aucun trigger n'est produit.

## 2026-03-25 — Son de scene: contrat runtime prioritaire

- Pour les medias lies a la scene, valider le contrat runtime courant avant implementation (ex: `VIDEO` au lieu de `SOUND`, `hidden`, autoplay media) afin d'eviter des itérations correctives.
- Quand la spec evoque "video/son", implementer les scripts runtime sur les deux selecteurs DOM (`video, audio`) pour couvrir le present et les transitions de modele.

## 2026-03-25 — Preferer le contrat CSS sans wrapper quand demande

- Si le besoin est un remplissage media "par defaut" et que l'utilisateur veut eviter les wrappers, prioriser une classe runtime dediee (`ed-video`) appliquee par builder plutot qu'une refonte DOM.
- Aligner le contrat editeur avec le rendu runtime: si `video` doit partager les reglages image (cover/contain), exposer les memes controles dans `StyleEditor` et mapper vers `object-fit` au build/runtime.

## 2026-03-25 — Eviter la duplication classe + inline

- Quand une classe CSS porte deja les proprietes par defaut (ex: `ed-video` pour `width/height/display`), ne pas reinjecter ces memes valeurs en inline style depuis le builder.
- Garder l'inline style pour les variations metier (ex: `object-fit`, `object-position`, overrides explicites), afin d'eviter les conflits et la redondance.

## 2026-03-25 — Event media params: persistance dans `event.ref`

- Quand un parametre event est demande comme persiste en base via `event.ref`, ne pas introduire un champ runtime parallele (`event.media`) comme source principale.
- Encapsuler les extensions dans `ref` en JSON tout en preservant les semantiques existantes (`transition ref`, `sustain ref`, `custom move options`) pour eviter les regressions.

## 2026-03-25 — Media seek: enrichir MediaParams avant patch runtime

- Avant de corriger la logique de seek media, verifier que `MediaParams` porte toutes les ancres temporelles necessaires (ex: `changeAt` par defaut a 0) pour eviter un patch symptome dans le player.

## 2026-03-26 — Player telco: dedupliquer les unsubscribe

- Quand un meme bloc d'unsubscribe est repete dans un controleur (`toggle/play/pause/seek`), extraire une fonction locale unique (ex: `subscribeOnce`) pour garder une logique de nettoyage coherente.
- Pour les abonnements ponctuels, centraliser `unsubscribe` + `resubscribe` dans le helper afin d'eviter les oublis lors des futurs ajouts de branches d'action.

## 2026-03-26 — Duree timeline vs outro

- Ne pas confondre `outroStart` (debut de transition finale) avec la fin de timeline utilisee pour la lecture audio/video.
- Garder la fin de timeline alignee sur la duree cues/son, meme si l'outro commence plus tot (`end - DEFAULT_DURATION`).

## 2026-03-26 — `content.timestamp`: evoluer sans ecraser

- Quand `content.timestamp` devient un objet extensible (`{ words, visemes, custom, ... }`), ne jamais ecrire le champ complet a partir d'un seul sous-ensemble.
- Regle d'ecriture: lire l'objet existant, merger, puis modifier uniquement la propriete cible (`words`) pour preserver les autres donnees futures.
- Regle de lecture: en phase de migration explicite, accepter temporairement les deux formats; sinon garder uniquement le format cible valide par l'utilisateur.

## 2026-03-26 — Contexte build: ne pas maintenir de legacy non demande

- Si l'utilisateur confirme qu'il n'y a pas de legacy a maintenir, supprimer les branches de compatibilite au lieu de conserver des lectures multi-format.
- Aligner rapidement la base (schema + migration des valeurs) avec le format cible pour garder un contrat unique et simple.

## 2026-03-26 — Ecritures DB: check-in obligatoire

- Ne jamais executer une migration SQL sur `dev.db` sans demande explicite de l'utilisateur.
- Si une correction implique une ecriture base, faire d'abord toutes les modifs code/schema non bloquantes puis demander une validation unique pour l'operation DB.

## 2026-03-26 — Boundary modules: `config` valeurs uniquement

- Ne pas ajouter de nouveaux modules metier/fonctionnels dans `app/config`; ce dossier reste reserve aux valeurs/definitions de configuration.
- Pour la logique de serialisation/merge des payloads d'event, centraliser dans un module partage neutre (`app/lib/*`) ou `event-edit` si strictement local UI, pas dans `config`.

## 2026-03-26 — Placement module: ne pas supposer l'orchestrateur

- Ne pas placer un module dans `scene-logic` par defaut sans verifier qu'il est reellement pilote par XState.
- Pour une logique partagee entre API, builder et UI, choisir un module neutre (`app/lib/*`) plutot qu'un dossier d'orchestration specifique.

## 2026-03-26 — Discipline plan: zero changement hors plan

- Interdiction stricte: ne jamais ajouter une modification qui n'est pas explicitement capturee dans un plan actif.
- Avant toute edition de code/schema/tests, mettre a jour la checklist du plan pour inclure exactement ce changement.
- Si un besoin emerge pendant l'implementation, stopper, re-planifier, puis seulement modifier le code.

## 2026-03-26 — Canvas: eviter la boucle de derive largeur

- Ne pas mesurer la largeur depuis le parent puis la re-appliquer en `canvas.style.width` dans un effet de redraw: en layout flex auto, cela peut creer une retroaction d'agrandissement.
- Pour les redraw frequents (progress player), mesurer la largeur CSS sur le canvas (`canvas.clientWidth`) et ne synchroniser que la taille bitmap (`canvas.width`/`canvas.height`).
- Garder la taille CSS du canvas declarative (classes), sans ecriture inline dynamique de largeur a chaque frame.

## 2026-03-27 — Mapping progress->mot: gerer trous et echelle explicite

- Ne jamais supposer une timeline de mots continue; `resolveActiveIndex` doit traiter les trous temporels et revenir au dernier mot termine si aucun segment ne couvre le temps courant.
- Pour un mapping progress fiable, autoriser une duree timeline explicite (source player/scene) au lieu de deduire uniquement depuis le dernier cue.
- Quand l'utilisateur corrige une constante d'echelle, l'appliquer a la source unique (`DEFAULT_PIXELS_PER_SECOND`) et retirer les overrides locaux pour eviter les ecarts.

## 2026-03-27 — Editeur de points: couvrir tout le scope event et decoupler

- Quand la spec parle de "tous les points", inclure explicitement `intro` + `outro` + tous les `custom`, et exclure seulement les actions precisees (ici `sustain`).
- Conserver strictement les payloads metier existants lors d'une refonte UI de manipulation (aucun nouveau contrat de donnees implicite).
- Si une prochaine etape prevoit la reutilisation sur une autre vue (ex: waveform), extraire des maintenant un composant d'edition context-agnostic au lieu de l'imbriquer dans la vue courante.

## 2026-03-27 — Layout edition: conserver la structure meme sans selection

- Si l'utilisateur demande d'eviter les decallages visuels, ne jamais masquer tout le panneau parent: garder un conteneur vide de largeur stable.
- Pour les controles de position event, ne pas laisser de double source de verite (formulaire + drag handles): retirer les radios quand le placement visuel devient la reference unique.
- Meme sans item selectionne, garder les composants de timeline rendus pour la continuite visuelle; seuls les controles d'edition doivent etre conditionnels.
- Si un switch de vue est un controle global (ex: Rubber/Waveform), le laisser visible meme sans selection d'item pour eviter de "perdre" l'etat courant de la vue.
- Pour les poignees intro/outro, ne pas inventer de fallback visuel: si elles ne sont pas definies dans les events (nom absent/invalide), ne pas les afficher.

## 2026-03-27 — Position event: default metier = start

- Ne pas utiliser `middle` comme fallback implicite pour `event.position`; la valeur par defaut metier est `start`.
- Garder `middle` uniquement quand il est explicitement choisi (ou derive d'un snap explicite), pas comme valeur de secours silencieuse.
- Verifier tous les chemins de calcul temporel (builder, selection, active-cue, tris UI) pour eviter des defaults incoherents.
- Pour un drag-and-snap fiable, calculer le point de snap final depuis la position reelle au `pointerup` (pas uniquement depuis un state React potentiellement en retard).
- Si une poignee est "recree" depuis les events, ne pas hardcoder sa position d'ancrage (intro=start, outro=end) sans lire `event.position`; sinon chaque rerender ecrase le choix utilisateur.
- Quand un champ doit rester modifiable pour tous les events, ne pas le filtrer au persist backend (sinon la synchro serveur remet des valeurs par defaut a chaque persist).
- Quand le produit demande un snap moins "agressif" sur `middle`, appliquer un biais explicite de scoring (penalite middle) au lieu de changer les donnees de position.
- Les couches visuelles de bornage (ex: griser hors intro/outro) doivent etre conditionnees au contexte d'edition actif; sans item selectionne, ne pas appliquer de masque.
- Dans un trou inter-mots, les preferences de snap dependent de la poignee: `intro` doit preferer le `start` du mot suivant, `outro` le `end` du mot precedent.
- Pour les indications timeline multi-items, reutiliser `resolveCueWindows` (avec comportements capsule) plutot que les seuls events explicites, afin que les placements auto restent synchronises dynamiquement.
- Toujours valider la semantique visuelle avec le produit: le niveau de gris "plus leger" peut representer la couche "moins selectionnee" meme si cela inverse une convention precedente.
- Les panneaux d'edition paralleles (`ContentInfos`, `EventParams`) doivent conserver leur emprise visuelle meme sans item selectionne; rendre un conteneur vide plutot que masquer le bloc.
- Pour une deselection sur zone vide d'un panneau liste/tree, declencher l'action seulement si `event.target === event.currentTarget` pour ne pas casser les clics d'item existants.

## 2026-03-27 — Waveform positions: nommage stable et fusion read-only

- Pour des cues techniques references par `name`, choisir un prefixe structurel reserve (distinct des cues Whisper) et conserver ce `name` lors des deplacements.
- Clarifier explicitement la fusion multi-sources: aggregation uniquement cote editeur/read-model; ne jamais re-persister une vue fusionnee dans une source DB unique.
- En projection waveform ponctuelle, ne pas reutiliser des regles de snap `start/middle/end` de timelines segmentaires; travailler en ancrage temporel point-a-point.
- Ne pas encoder l'item dans la cle `name` des cues techniques: la cle doit rester globale pour supporter des triggers synchrones sur plusieurs items.
- Quand `intro/outro` sont absents en waveform, conserver un mode de creation progressive sur fond vide (clic1 intro, clic2 outro) et un mode drag initial qui cree les deux bornes en une action.
- Ajouter un garde-fou d'ordre apres toute edition `outro`: si `outro < intro`, inverser les references pour conserver `intro <= outro`.
- Appliquer le garde-fou d'ordre dans les deux sens (`intro` deplacee apres `outro` ou `outro` deplacee avant `intro`) et sur les deux vues (`Rubber` + `Waveform`).
- Ne pas propager globalement des cues techniques ponctuels (`start=end`) dans les listes de mots Rubber; reserver leur fusion aux vues qui en ont besoin (waveform editor).
- Quand on retire des cues techniques du rendu principal, garder un chemin de compat edition (cues fusionnes en lecture uniquement) pour ne pas faire "disparaitre" les anciens events en cours de migration.
- Si le produit veut visualiser les cues techniques dans Rubber, les rendre avec un code visuel distinct (sans texte) au lieu de les traiter comme des mots.
- Quand un handle reference un cue legacy introuvable, ne pas le masquer silencieusement: fournir un ancrage de recuperation pour maintenir l'edition possible.
- Les conditions de creation intro/outro ne doivent pas se baser sur la simple presence du `name` en event, mais sur l'existence effective d'une poignee resolue dans la vue.
- Pour "fusionner" des marqueurs techniques adjacents sans casser l'edition, preferer une fusion visuelle (overlap/gap) en conservant un element DOM par cue.
- Sur editeurs de poignees, ne jamais emettre de mutation quand la position finale est identique (guard no-op), sinon on peut declencher des boucles autosave/seek inutiles.
- Dans l'orchestrateur de sync edit, bloquer les reseek quand la signature de selection est identique et que l'etat actif est deja `seek`; sinon un drift de cue peut entretenir une boucle.
- Plus robuste: ne seek que sur changement de signature de selection (`eventAction:cueSec`) et ignorer totalement les variations `activeAction/activeCue` tant que la signature reste identique.
- Cote reducer `active-set`, ne pas reimposer `action: seek` sur un event deja selectionne si le cue n'a pas change; sinon un clic redundant peut relancer une boucle player->sync.
- Cote UI des poignees, ignorer `onSelect` si l'action cible est deja active pour couper les emissions redondantes a la source.

## 2026-03-27 — Boucle sync machine: references stables uniquement

- Un `useEffect` qui envoie `sync.request` vers une machine ne doit jamais dependre d'objets reconstruits a chaque render (ex: decor merge), sinon cycle `request -> rerender -> request`.
- Pour les resolutions composites (`resolveDecorSelection`), memoiser au niveau composant avant de construire les payloads machine (`EditableVisualState`).
- En debug de boucle, separer clairement les causes: `dispatch-seek` (player) vs `dispatch-project` (reactive rerender local) via traces et IDs d'instance.

## 2026-03-27 — Instrumentation de bug: progression par paliers

- Commencer par une instrumentation minimale sur un seul segment du circuit suspect, puis etendre seulement si le signal reste ambigu.
- Eviter d'instrumenter toute la chaine d'un coup: trop de logs masque le pattern utile et augmente le bruit de lecture.
- Une fois la cause racine confirmee, retirer immediatement les logs/debuggers temporaires pour revenir a un flux normal.

## 2026-03-27 — Respect strict des marqueurs inline

- Si un commentaire dit explicitement de conserver un log/debug (`NE PAS RETIRER`), ne jamais le supprimer pendant un refactor sans demande explicite.
- Avant cleanup, verifier les marqueurs inline critiques dans le fichier cible et les traiter comme contraintes fonctionnelles.

## 2026-04-03 — Git: ne pas en parler sans demande

- Si l'utilisateur impose "tu ne t'occupes jamais de git", ne jamais proposer commit/branch/push ni next steps git spontanement.
- Rester strictement sur le code et la verification fonctionnelle tant que l'utilisateur ne demande pas explicitement une action git.

## 2026-04-03 — API de generation de classes: rester minimal

- Sur un prototype de generateur de classes, eviter les couches "profil/context/policy" si non demandees.
- Aligner la proposition sur les patterns existants du codebase: token simple (`cell-rX-cY`, `cell-span-...`) + fonction de definition dediee.
- Favoriser des entrees de donnees directes (`row`, `col`, `rowSpan`, `colSpan`) et de petites fonctions pures.

## 2026-04-03 — Regles @media: factoriser au niveau moteur

- Quand des variantes `@media` peuvent concerner plusieurs kinds, ne pas dupliquer l'enveloppe media dans chaque definition de kind.
- Preferer un state interne du generateur (base rules + media buckets) puis une emission unique du stylesheet avec regroupement par query.
- Sur les appels de generation, garder des inputs metier (donnees) et laisser le routage base/media au moteur global.

## 2026-04-03 — Config classes: expliciter le nom de classe

- Eviter les flags implicites de type `prefixed` dans les rules.
- Exposer explicitement le `className` racine (ex: `cell-span`) et separer clairement la partie variable (`suffix`).
- Garder la logique de prefixe globale, hors config de rule, pour une lecture plus claire en prototype.

## 2026-04-03 — Donnees position: utiliser `style.itemPosition`

- Ne pas proposer un nouveau champ BDD dedie (`class_input`) tant que le besoin peut rester dans `decor.style`.
- Pour ce projet, stocker les variables metier de classes de position sous `decor.style.itemPosition`.
- Prevoir l'adaptation des fonctions de sanitization/persist pour ne pas perdre `itemPosition`.

## 2026-04-04 — Composants: logique hors React

- Sur ce projet, respecter le pattern: logique metier dans une classe dediee + orchestration d'etat via machine XState.
- Limiter React aux hooks minimum (wiring local/UI), eviter d'embarquer la logique lourde dans le composant.
- Pour un nouveau mode d'edition (ex: zones card), construire dans de nouveaux fichiers dedies plutot que d'etendre un composant de demo.

## 2026-04-04 — Overlay zones: etapes visuelles strictes

- Quand la demande dit "premiere etape: clone exact", ne pas ajouter d'interactions (boutons/liste/grille clickable) dans la meme iteration.
- Pour valider une superposition, partir d'une copie visuelle minimale de la capsule (meme classe CSS, sans enfants) avec la meme mecanique de frame que le cadre existant.
- Reporter le tracage rectangle et l'edition metier a l'etape suivante, apres validation visuelle de l'alignement.

## 2026-04-04 — Interdiction state React sur composant metier

- Si l'utilisateur demande explicitement "sans state React", ne pas utiliser `useState`/`useReducer` dans le composant cible.
- Basculer l'etat et la logique dans une machine XState + classe service, puis limiter React au wiring (`useSelector`, `useMachine`, `useEffect` de sync).
- Quand la contrainte architecture est explicite, la traiter comme un critere bloquant de definition of done.

## 2026-04-04 — Overlay et scroll: alignement viewport strict

- Si la geometrie overlay vient de `getBoundingClientRect`, le host overlay doit etre en `position: fixed` pour rester dans le meme referentiel viewport.
- Pour eviter les desynchronisations au scroll, gerer le tracking de rect dans le service (pas dans le composant) avec cleanup centralise.
- Ecouter a la fois `window` (resize/scroll capture) et `visualViewport` (resize/scroll) quand disponible.

## 2026-04-04 — Interface zones: point d'entree SlotEditor

- Si la demande parle de "cote item-edit" avec gestion de zones, l'entree UI doit etre `SlotEditor` (pas un composant lateral parallele).
- Pour type capsule `position`, preferer remplacer la branche de rendu `SlotEditor` par le gestionnaire de zones.
- Les operations minimales attendues sur liste de zones: rename, delete, duplicate.

## 2026-04-04 — Validation nom zone: ne pas perturber la saisie

- Eviter toute correction automatique du texte pendant la frappe (ex: normalisation/unique en temps reel).
- Appliquer le controle de doublon a la sortie d'edition (`blur`) et signaler visuellement (rouge) au lieu de muter la valeur saisie.
- Preserver les ajustements UI manuels recents de l'utilisateur lors des itérations suivantes.

## 2026-04-04 — ZoneBuilder: discipline useEffect

- Suivre `plans/use-effects-README.md`: eviter les effets pour des transitions purement locales quand un event machine peut porter l'intention.
- Pour les ponts React -> machine, limiter les `useEffect` a la synchronisation externe (props vers machine, DOM/style tag, cleanup).
- Pour la persistence/API de zones, emettre sur des moments de commit (`pointerup`, `blur`, delete/duplicate) et pas pendant la frappe.

## 2026-04-04 — Revue ZoneBuilder: effets minimaux

- Si la machine peut orchestrer une transition (persist, sync style, tracking), ne pas la reproduire dans `useEffect`.
- Cibler un seul effet de sync props -> machine dans le composant, et deleguer le reste aux actions machine/service.
- Eviter les gardes a base de refs dans React pour du commit metier: preferer des actions explicites sur les evenements de commit.

## 2026-04-08 — Reponse scope: distinguer impact et demande

- Quand on mentionne un effet de bord potentiel (tests/logs/nommage), expliciter que c'est une information d'impact observable, pas une tache ajoutee au scope.
- Eviter les formulations ambiguës qui peuvent faire croire a une extension implicite de la demande.
- Si l'utilisateur demande une reformulation, fournir une version directe avec trois points: ce que c'est, ce que ca change visiblement, ce que je ne vais pas implementer.

## 2026-04-08 — Evenements globaux: ne pas proposer de scope item

- Ne pas proposer de lier les noms d'actions runtime a `itemId` quand le modele produit dit explicitement que les events restent globaux et partages.
- Pour diagnostiquer des collisions, verifier d'abord la canonicalisation du nom d'event (ex: suffixes `-middle`/`-end`) avant toute idee de scoping par item.
- Prioriser des corrections perennes sur la cause (normalisation/contrat de nommage) et eviter les propositions de "durcissement" defensif.

## 2026-04-08 — Communication: plan en langage courant + exemple concret

- Quand l'utilisateur signale une incomprehension, reformuler immediatement le plan en vocabulaire courant, sans jargon interne.
- Donner un exemple de resultat attendu (avant/apres) pour lever toute ambiguite.
- Eviter les redites: un seul plan net, centre sur la correction racine, sans variantes non demandees.

## 2026-04-08 — Seek vs lecture: source unique obligatoire

- Ne pas corriger uniquement les bornes d'un seul chemin (`seek` ou lecture): la selection d'etat temporel doit passer par une fonction partagee.
- Si un cache runtime (`lastEndCoords`) existe, eviter toute purge asymetrique entre modes de lecture; sinon `seek` et lecture reconstruisent des etats differents.
- Avant patch, ecrire une mini-repro de frontiere (`t == next`) pour verifier la parite seek/lecture et eviter les regressions globales.

## 2026-04-08 — FLIP cleanup vs styles persistants

- Le nettoyage de fin de transition FLIP ne doit pas effacer `transform` quand l'action transporte un style transform persistant (ex: `rotate` sur outro).
- Ajouter un marqueur de changement (`preserveTransform`) depuis la phase static-changes pour guider le cleanup runtime.
- Sur `seek/replay/revert`, repartir d'un reset explicite depuis `initial` pour eviter la conservation de styles inline stale entre lectures.

## 2026-04-08 — Validation reelle scene/item avant conclure

- Avant d'annoncer "corrige", verifier le cas utilisateur exact (scene + item) et pas seulement un cas synthetique.
- Si le symptome est temporel (`seek`, `rewind`, `outro`), verifier explicitement les frontieres (`t=0`, arrivee d'etat) et pas seulement les smokes globaux.

## 2026-04-08 — Contrat frontiere keyframe

- Pour garantir la parite lecture/seek, utiliser des fenetres half-open `[curr, next)` dans la selection d'etat actif.
- Dans le runtime update, ne pas declencher de bascule quand `currentTime == curr` pour le changement deja actif (`< curr`, pas `<= curr`).

## 2026-04-08 — Debug runtime: pas de rustines dans Player

- Ne pas laisser de fonctions de tracing temporaires (`seek-trace`, baselines, hooks ad hoc) dans `Player`.
- Garder `Player` proche du contrat de branche de depart et sortir le diagnostic dans des scripts/tests externes.
- Eviter les duplications de reset (`hardReset*` vs `revert`) : factoriser un seul chemin de remise a l'etat initial.

## 2026-04-08 — Parite seek/lecture: verifier les sauts de fenetre

- Ne pas supposer que `setNextChange` peut sauter directement a la fenetre active sans effet de bord: des changements intermediaires peuvent porter des `move` string structurants.
- Pour la stabilite, quand un tick saute plusieurs fenetres, resynchroniser via le chemin seek canonique plutot que de perdre des transitions structurelles.
- Les positions timeline style-only (ex: outro) doivent rester dans les fenetres statiques, sinon les frontieres de fin d'etat disparaissent et creent des incoherences de sortie.

## 2026-04-08 — Edition d'event sans decor dedie

- Pour un event non-intro selectionne avec `decorId = null`, forcer la creation d'un decor dedie des la premiere edition (pas seulement pour les patches de placement).
- Sinon l'UI peut afficher un style "effectif" (herite des events precedents) et donner l'impression de modifier le mauvais event.
