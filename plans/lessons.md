# Lessons

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
