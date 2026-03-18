# Plan d'action — Item auto disparait apres intro personnalisee

## Objectif

Diagnostiquer puis corriger le cas ou un item en mode auto (ex: item 78) disparait apres personnalisation de l'intro via EventParams.

## Plan detaille

- [x] **1. Reproduire sur les donnees reelles**
  - Inspecter scene 9 (events item 78, cues resolues, timeline builder).
  - Identifier le point exact de perte (ancrage/cue, move, runtimeStart, outro).

- [x] **2. Corriger la resolution auto**
  - Adapter la resolution des events auto explicites (intro/outro partiels, names manquants, fenetres degeneres).
  - Unifier le fallback de fenetre pour tous les items (capsule host et item media) avec meme base de calcul.
  - Garantir qu'un item avec intro personnalisee reste schedulable et visible.

- [x] **3. Verification ciblee**
  - Ajouter un smoke test couvrant item enfant avec intro personnalisee sans cue explicite.
  - Verifier le build timeline.

## Review (a completer apres implementation)

- Resultat: cause racine identifiee sur scene 9/item 78: `intro.name` etait present mais aucun cue correspondant n'existait dans la liste des cues runtime, donc `keyframeMs/runtimeStartMs` restaient `null`.
- Resultat: `resolveCueWindows` complete maintenant aussi les events intro/outro dont le `name` existe mais ne reference aucun cue connu (`cueByName`), en creant le cue fallback au bon timing.
- Resultat: fallback de fenetre unifie pour tous les items (`explicitWindow` ou bornes scene), sans branche speciale capsule vs item.
- Tests/commandes executes: `npx tsx tests/auto-eventparams-stale-cue-name-smoke.ts` (OK); verification directe scene 9 via script `getScene/applyCapsuleDefaultItemEvents/getOrderedEventsForItem` (intro item 78 resolu a `runtimeStartMs:0`, `keyframeMs:500`).
- Tests/commandes executes: `npx tsx tests/auto-eventparams-no-cue-smoke.ts` (OK) ; verification directe scene 9 item 79 + 78 (intro/outro resolves cote capsule host et item).
- Limites connues: les cues fallback restent runtime; leur persistence en base reste optionnelle et depend du flux de persistance des events.
