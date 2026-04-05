# Plan — SlotEditor zone class cleanup

## Objectif

En mode capsule `position`, quand une zone est choisie via `SlotEditor`, conserver uniquement la classe de zone (`ed-zone-*`) cote placement et eviter les collisions/duplications de definitions CSS de zone.

## Etapes

- [x] Nettoyer `setZoneClass` pour retirer les tokens de placement legacy (`cell-span`, `cell-r`, `cell_layout_auto`, `liste-r`, autres `ed-zone-*`).
- [x] Garder les tokens non-placement intacts.
- [x] Eviter les definitions live dupliquees pour une meme classe de zone.
- [x] Si une classe de zone est presente sur un decor, ignorer les definitions de placement legacy concurrentes lors de la generation CSS.
- [x] Garder le rendu robuste en presence de classes mixtes (ne pas casser les fallback legacy au runtime).
- [x] Verifier typecheck et smokes selection/custom.

## Review

- `SlotEditor` applique maintenant une normalisation de tokens de placement: selection de zone => une seule classe de zone active cote placement.
- `syncLiveZoneClassDefinitions` dedupe les regles par `className` pour eviter les sections live dupliquees.
- `buildPlacementCss` priorise les definitions de zones et ignore les defs legacy concurrentes quand une zone est presente.
- `buildDynamicClassName` conserve les classes persistées; la precedence zone est geree au niveau donnees/patch (pas par stripping runtime), ce qui preserve les fallback legacy.
- Convention renforcee: la classe de zone cible est derivee du slug du `name` avec prefixe `ed-zone-`.
- Compat legacy: les definitions CSS live/runtime exposent alias `className` stocke + `ed-zone-<slug(name)>`.
