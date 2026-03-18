# Plan d'action — Scene sans son, duree par defaut en cascade

## Objectif

Corriger le mode automatique pour qu'une scene sans son (duree par defaut 5s) genere bien des events intro/outro sur les items de capsule en repartissant la fenetre temporelle.

## Plan detaille

- [x] **1. Corriger la derivation auto quand il n'y a pas de sceneContent exploitable**
  - Supprimer le blocage qui empeche `applyCapsuleDefaultItemEvents` de tourner sans `sceneContent`.
  - Faire fonctionner `resolveCueWindows` meme sans cues persistes.

- [x] **2. Appliquer la duree par defaut scene (5s) au calcul des fenetres**
  - Ajouter un fallback explicite de bornes scene a 5s quand aucune cue n'existe.
  - Verifier que la distribution auto des items utilise bien cette fenetre.

- [x] **3. Verification ciblee**
  - Ajouter/adapter un smoke test pour une scene sans son avec capsule auto + 4 items.
  - Executer le test cible et documenter le resultat.

## Review (a completer apres implementation)

- Resultat: le mode auto fonctionne desormais sans son lie; la fenetre scene fallback (5s) est appliquee et distribuee aux items de capsule.
- Resultat: quand aucun `sceneContent` n'existe, un `sceneContent` runtime derive est injecte pour porter les cues auto et permettre le mapping des events.
- Tests/commandes executes: `npx tsx tests/scene-default-duration-cascade-smoke.ts` (OK); `npx tsx -e "import './app/player/builder/derivation.ts'; import './app/scene-runtime/visibility/resolve-cue-windows.ts';"` (OK).
- Limites connues: les cues auto fallback existent en runtime (snapshot derive) et ne sont pas persistes tant qu'aucune operation API de cues n'est declenchee.
