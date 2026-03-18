# Plan d'action — Resolution anticipee des events auto + EventParams

## Objectif

Faire en sorte que des events intro/outro configures via `EventParams` (ex: `ref` renseignee) restent fonctionnels en mode auto meme sans cues/rubber, en resolvant assez tot dans le builder des ancrages temporels fallback.

## Plan detaille

- [x] **1. Resoudre les ancrages intro/outro manquants dans le builder**
  - Dans `resolveCueWindows`, detecter les events intro/outro existants sans `name`.
  - Leur assigner des cues runtime via fenetre de visibilite resolue (ou fallback scene pour items du main).

- [x] **2. Conserver l'heritage auto existant**
  - Ne pas casser la generation auto actuelle des events pour les items enfants.
  - Appliquer uniquement un remplissage des noms de cues manquants.

- [x] **3. Verification ciblee**
  - Ajouter un smoke test qui reproduit: scene sans son + intro/outro avec `ref` mais `name` vide.
  - Verifier que le builder produit des timings utilisables.

## Review (a completer apres implementation)

- Resultat: les events intro/outro existants sans `name` sont maintenant completes tres tot dans `resolveCueWindows` avec des cues runtime fallback.
- Resultat: le mode auto continue de generer les events manquants pour les enfants, et ajoute en plus les anchors manquants pour les events explicites.
- Tests/commandes executes: `npx tsx tests/auto-eventparams-no-cue-smoke.ts` (OK); `npx tsx -e "import './app/scene-runtime/visibility/resolve-cue-windows.ts';"` (OK).
- Limites connues: les noms de cues fallback sont runtime et ne sont pas persistes tant qu'aucune persistance explicite d'events n'est declenchee.
