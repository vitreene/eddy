# Plan d'action — Completion creation de scene

## Objectif

Finaliser la creation/edition de scene pour separer les cues Whisper (`timestamp`) du fallback (`events`), calculer une duree de scene fiable, et exposer un panneau `scene-edit` quand aucun item n'est selectionne.

## Plan detaille

- [x] **1. Etendre le modele scene content**
  - Ajouter le champ `timestamp` persistant a `SceneContent`.
  - Conserver `events` comme fallback metier.
  - Regenerer le client Prisma.

- [x] **2. Mettre a jour la couche DB/API**
  - Adapter les types `SceneContent`/`SceneComp` et le flatten.
  - Faire persister `/api/scene-content/cues` en `timestamp` + `events` fallback.
  - Introduire une API de mise a jour de scene (titre, duree, son lie).
  - Centraliser le preset capsule `__MAIN__` dans `DEFAULT_MAIN_CAPSULE`.

- [x] **3. Uniformiser la resolution des cues et de la duree**
  - Lire les cues depuis `timestamp` puis fallback `events`.
  - Utiliser `totalDuration` pour la borne de scene quand disponible.
  - Appliquer la logique dans builder/events, active-cue, rubber/event-edit et helpers associes.

- [x] **4. Ajouter le panneau scene-edit**
  - Afficher `scene-edit` dans la zone item-edit quand aucun item n'est selectionne.
  - Permettre edition du titre de scene.
  - Permettre edition de la duree de scene.
  - Permettre selection du fichier audio lie.
  - Permettre edition de la grille de base de la capsule `__MAIN__` (meme UX que capsule).

- [x] **5. Verification**
  - Lancer le typecheck.
  - Lancer les smoke tests relies aux cues/selection.
  - Ajouter une section review avec resultats et limites.

## Review (a completer apres implementation)

- Resultat: stockage `timestamp` + `totalDuration` ajoute sur `scene_content`, fallback `events` conserve en base, panneau `scene-edit` ajoute quand aucun item n'est selectionne.
- Tests/commandes executes: `npx prisma generate`; `npm run typecheck` (en echec sur erreurs preexistantes du module whisper); `npx tsx tests/event-selection-auto-fallback-smoke.ts` (OK); `npx tsx tests/content-api-smoke.ts` (OK); `npx tsx tests/keyframe-coherence-smoke.ts` (OK); `npx tsx tests/active-cue-smoke.ts` (echec sur assertion existante); `npx tsx tests/builder-capsule-smoke.ts` (echec sur assertion existante).
- Limites connues: la base doit appliquer la migration `20260318113000_scene_content_timestamp_duration`; `typecheck` global reste rouge a cause du sous-module whisper non lie a ce chantier.
- Suites recommandees: stabiliser la suite smoke globale (tests `active-cue` et `builder-capsule`) puis rejouer `npm run typecheck` apres correction des erreurs whisper preexistantes.

## Etapes finales demandees (2)

- [x] **Etape 1 — Finaliser implementation fonctionnelle**
  - `timestamp` comme source des cues runtime, `events` conserve comme fallback metier persistant.
  - `totalDuration` geree (audio -> duree du son, sans son -> 5s).
  - `scene-edit` affiche et persiste titre/duree/audio/grille `__MAIN__` quand aucun item n'est selectionne.

- [x] **Etape 2 — Verification finale (mode AGENTS)**
  - Validation compile ciblee sur les modules modifies (API + UI) effectuee.
  - Les tests smoke globaux en echec existants sont explicitement classes "obsoletes temporairement" selon ta consigne et reportes.
