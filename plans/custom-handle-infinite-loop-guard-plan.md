# Custom Handle Infinite Loop Guard Plan

## Contexte

- Bug: selection d'une poignee custom (scene 1) declenche une boucle d'edition.
- Hypothese principale confirmee partielle: le no-op commit n'etait pas l'unique cause.
- Cause probable residuelle: `editor-sync` peut redispatch `seek` en boucle sur une selection custom stable quand `activeCueSec` derive legerement.

## Checklist

- [x] Ajouter un garde no-op sur TimelinePointEditor: ne pas appeler `onCommit` si ancre finale identique a la position actuelle.
- [x] Ajouter un garde no-op equivalent sur WaveformPointEditor (delta temps negligeable).
- [x] Ajouter un garde anti-reseek dans `editor-sync.machine`: ne pas reseek tant que la signature de selection est identique et que l'action active est deja `seek`.
- [x] Ajouter un garde dans `scene-logic` pour ne pas forcer `action: seek` si l'event/cue n'ont pas change.
- [x] Eviter de re-emettre `active-set { event }` quand la poignee cliquee est deja active.
- [x] Verifier typecheck.

## Verification

- [x] Relecture diff sur `timeline-point-editor.tsx` et `waveform-point-editor.tsx`.
- [x] Validation statique: clic simple selectionne sans mutation event no-op.
- [x] Relecture diff sur `editor-sync.machine.ts`.
- [x] Validation statique: selection custom stable => un seul seek emis.
- [x] Relecture diff sur `scene-logic.ts` et callbacks `onSelect` Rubber/Waveform.
- [x] Validation statique: clic sur poignee deja active n'entraine plus de reseek force.

## Review

- Cause retenue: combinaison no-op commit + reseek `editor-sync` sur signature stable.
- Garde applique (phase 1): pas de commit si la cible finale est identique (Rubber) ou si le delta temporel est negligeable (Waveform).
- Phase 2 (corrigee): simplification stricte `editor-sync` -> seek uniquement si la signature de selection change (`action:cue`).
- Phase 3: garde metier dans `scene-logic` (seek seulement si changement event/cue ou seek explicite).
- Phase 4: dedupe cote UI (`onSelect`) pour ignorer le clic sur poignee deja active.
- Trace d'action click custom:
  1. `active-set { event: custom-x }` (selection),
  2. `active-set` interne avec `action: seek` (positionnement),
  3. player renvoie `active-set { action: null }` apres seek,
  4. sans garde signature, `editor-sync` pouvait reemettre `seek` en boucle.
  5. avec garde signature, les requetes sync suivantes n'emettent plus de seek tant que la selection ne change pas.
- Typecheck valide (`npm run typecheck`).

## Phase 5 - Trace Circuit + Anti-Crash Debugger

### Checklist

- [x] Instrumenter `item-edit` autour de `sync.request`, `onSeek`, `onProject` pour voir le pont UI -> machine -> active-set.
- [x] Ajouter un `instanceId` machine dans `editor-sync` pour detecter une recreation d'acteur non voulue.
- [x] Etendre les traces `editor-sync` avec `instanceId` et ajouter un loop-breaker sur `dispatch-seek`.
- [x] Instrumenter `WaveformCanvas` (`onSelect`, commit, pointer-down background) pour recouper Rubber vs Waveform.
- [x] Ajouter loop-breaker cote player (`seek-manual` + `sync-from-active.seek`) avec sortie d'urgence `active-set { action: null }`.
- [x] Tracer aussi `active-set` avec `action: null` dans `scene-logic`.
- [x] Exposer des helpers DevTools (`window.__eddyReadLoopTrace`, `window.__eddyClearLoopTrace`) pour capturer la boucle sans parser la console.

### Verification

- [x] Typecheck (`npm run typecheck`).
- [x] Relecture statique des chemins critiques: `rubber/waveform -> scene-logic.active-set -> player.syncFromActive -> item-edit.editor-sync`.

### Review (Phase 5)

- Le traceur couvre maintenant le circuit complet du clic custom jusqu'au seek player.
- Le guard anti-crash place un `debugger` lors de bursts anormaux et coupe le cycle en ramenant `action` a `null` cote player.
- Le `instanceId` permet de confirmer rapidement (ou d'exclure) une recreation de machine `editor-sync` comme cause de boucle.

## Phase 6 - Boucle dispatch-project (root cause)

### Checklist

- [x] Analyser le rapport de trace utilisateur et identifier le pattern reel de boucle.
- [x] Verifier l'hypothese de recreation machine: `instanceId` reste stable (`1`) -> non cause.
- [x] Identifier une source de dependance instable cote `EditItem`.
- [x] Stabiliser la resolution decor (`resolveDecorSelection`) via `useMemo` pour eviter un nouvel objet a chaque render.
- [x] Re-valider statiquement (`npm run typecheck`).

### Review (Phase 6)

- La boucle restante ne vient pas d'un reseek player, mais d'un cycle React local `sync.request -> machine rerender -> nouvel objet decor -> useEffect -> sync.request`.
- `resolveDecorAtEventAction` produit un objet `Decor` merge non memoise (nouvelle reference a chaque render), ce qui faisait changer `editableVisualState` meme a donnees identiques.
- La memoisation en amont de `resolveDecorSelection` stabilise la reference et coupe la boucle `dispatch-project` repetee.

## Phase 7 - Nettoyage post-debug + item-edit

### Checklist

- [x] Retirer l'instrumentation temporaire (`traceLoop`, loop breakers, helpers DevTools) ajoutee pour le debug.
- [x] Supprimer le module de trace temporaire (`app/lib/loop-trace.ts`).
- [x] Nettoyer les logs debug annexes dans `item-edit` et `player`.
- [x] Nettoyer le trigger `useEffect` de sync machine dans `item-edit` via une dedupe par signature.
- [x] Conserver la logique metier utile issue du fix (seek sur changement de signature uniquement).
- [x] Re-valider statiquement (`npm run typecheck`).

### Review (Phase 7)

- Le debug est retire proprement: plus de spam console ni de `debugger` anti-crash.
- `item-edit` garde une orchestration machine explicite, mais n'emet plus `sync.request` en boucle grace a une signature stable (`syncKey|event|cue`).
- Le pattern est documente: instrumentation progressive par paliers, puis retrait immediat apres identification de la cause.
