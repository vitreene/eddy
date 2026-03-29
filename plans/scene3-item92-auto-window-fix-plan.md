# Scene3 Item92 Auto Window Fix Plan

## Scope

- Corriger le calcul de fenetre capsule quand l'item hote a un seul cue resolvable (intro ou outro manquant).
- Eviter le fallback global scene entiere qui decale les items auto hors de la vie reelle de la capsule.

## Checklist

- [x] Identifier la cause: fallback `sceneBounds` complet si `introCue` OU `outroCue` manque pour capsule hote en main.
- [x] Corriger `resolveCueWindows` pour appliquer un fallback borne par borne (`start` et `end` separes).
- [x] Verifier derive runtime: intro auto item 92 passe de `8650ms` a `2910ms` (demi-vie de capsule hote).

## Verification

- [x] Typecheck.
