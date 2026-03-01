## Objectif

Simplifier le rendu image:

- supprimer les modes `img/picture` concurrents,
- garder un seul rendu image natif (`<img>`),
- conserver `sprite` dans l'interface comme variante de fit,
- resoudre la difference via le Builder (`object-fit: cover|contain`).

## Plan d'action

- [x] Retirer le toggle global de rendu image dans le top menu.
- [x] Revenir a une API Builder simple: `buildScene(snapshot)` sans option de mode.
- [x] Rendre `img` en balise `img` (ancien mode picture devenu comportement par defaut).
- [x] Conserver `sprite` dans l'interface, avec distinction de fit geree dans le Builder.
- [x] Mapper `backgroundSize` vers `objectFit` (`cover`/`contain`) et `backgroundPosition` vers `objectPosition`.
- [x] Garder un fallback Builder explicite: `img => cover`, `sprite => contain`.
- [x] Nettoyer les branches UI liees aux anciens modes globaux.
- [x] Adapter les tests smoke Builder aux nouveaux contrats (`img` natif + `sprite` contain).
- [x] Lancer validation technique (`npm run typecheck`, `npm run test:smoke`).

## Journal

- 2026-03-01: Suppression du toggle de mode dans le menu et de l'option `imageRenderMode` dans `buildScene`.
- 2026-03-01: `img` et `sprite` rendus en balise `img`; la difference passe par `objectFit` resolu dans le Builder.
- 2026-03-01: Tests smoke + typecheck passes.
