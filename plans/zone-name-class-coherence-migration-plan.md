# Plan — Zone name/class coherence (SlotEditor)

## Signal

- Decalage observe entre noms de zones et classes appliquees dans SlotEditor (liste/selection/title).
- Symptomes associes: selection de zone qui cible le mauvais slot et confusion sur les classes generees.

## Causes

- SlotEditor pilotait les options par classe, pas par identite de zone (`id`), ce qui devient fragile quand aliases/legacy coexistent.
- Des donnees legacy contenaient `cardZones.className` non aligne avec `ed-zone-<slug(name)>`.
- Les decors item/event references gardaient les anciens tokens, creant un offset visuel et logique.

## Fix applique

- [x] SlotEditor passe en selection par `zone.id` (stable) et applique la classe generee depuis le nom.
- [x] `title` de liste zone aligne sur la classe generee depuis le nom (plus de mismatch name/title).
- [x] Migration de coherence au chargement scene: rewrite `cardZones.className` -> `ed-zone-<slug(name)>` + rewrite des `decor.className` references dans la scene.
- [x] Persistance DB de la migration (capsule profil + decors modifies).
- [x] ZoneBuilder: suppression de l'auto-selection initiale de zone (selection explicite via liste).
- [x] ZoneBuilder: creation de zone uniquement sur surface vide (overlap interdit).
- [x] Verification typecheck + smokes.

## Review

- Le mapping zone selectionnee -> classe appliquee est maintenant deterministe (id -> generated class).
- Les donnees scene convergent vers une convention unique de nommage de classe de zone.
