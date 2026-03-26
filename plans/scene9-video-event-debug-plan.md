# Scene 9 video event debug plan

## Checklist

- [x] Lire `AGENTS.md` et `plans/lessons.md` pour appliquer les contraintes de debug.
- [x] Inspecter les donnees builder de la scene 9 (event map + renderables/actions) pour l'item video.
- [x] Verifier la correspondance entre noms d'events builder et cles d'actions attendues par le player.
- [x] Conclure si le player comprend les infos builder, avec preuves (sorties inspectees).
- [x] Tester au niveau runtime player si `whisper-0004-intro` applique un `media.action=play` sur le node video.
- [x] Isoler le point de rupture event->node avec un test instrumente (setStaticChanges/onUpdate).
- [x] Documenter la conclusion technique et l'impact pour la correction.

## Review

- Scene 9 contient un seul item video (`itemId: 87`).
- Builder genere des cles d'action qui matchent la map d'events runtime (`whisper-0004-intro`, `whisper-0024-outro`) -> le player peut les resoudre via `actions[e.name]`.
- L'action `outro` contient bien `media: { action: "pause", ... }`.
- L'action `intro` ne contient pas de `media.play` (ref DB intro = `"fade"` sans payload media), donc aucun `play` n'est emis au player.
- Conclusion: le player comprend correctement le payload builder; le probleme vient des donnees/actions builder qui n'incluent pas de `play` au moment `intro` pour cet item.
- Test runtime instrumente (`setStaticChanges` + `onUpdateStaticChanges`) sur `item__87`:
  - `persoChanges[1000].change.media.action = "play"` est bien present,
  - le passage de timeline a `1001ms` applique ce change (`_applyChanges` recoit bien `media.play`),
  - mais `videoNode.play()` n'est jamais appelee (`nodePlayCalls = 0`).
- Point de rupture localise: la boucle `onUpdateStaticChanges` n'appelle jamais `applyMediaChanges(...)`; elle applique seulement `_applyChanges`/`_moveChange`.
- Impact: les events media intro/outro existent dans les changes, mais n'atteignent pas le node video en lecture continue.
