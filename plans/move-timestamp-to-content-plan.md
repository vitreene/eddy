# Plan d'action — Deplacer timestamp vers content

## Objectif

Deplacer la source de verite `timestamp` de `scene_content` vers `content`, puis aligner API + couche DB pour lire/ecrire ce nouveau champ.

## Plan detaille

- [x] **1. Schema + migration DB**
  - Ajouter `content.timestamp`.
  - Backfiller `content.timestamp` depuis `scene_content.timestamp`.
  - Retirer `scene_content.timestamp`.
  - Regenerer Prisma client.

- [x] **2. Couche DB/API**
  - Adapter `app/api/db.ts` pour persister `timestamp` dans `content`.
  - Ajuster le flatten pour exposer les cues de `content.timestamp`.
  - Mettre a jour `/api/scene-content/cues` et `/api/scene/:id`.

- [x] **3. Verification**
  - Verifier compilation des modules touches.
  - Documenter le rapport de modifications.

## Review

- Resultat: `timestamp` est deplace en base vers `content.timestamp`, retire de `scene_content`, et `totalDuration` n'est plus persiste en DB.
- Resultat: la duree est derivee runtime/API depuis `timestamp` puis fallback `scene_content.events` (event par defaut), puis 5s si vide.
- Verification executee: `npx prisma generate`; `npx tsx -e "import './app/api/db.ts'; import './app/api/scene-content-cues.ts'; import './app/api/scene-update.ts'; import './app/scene-runtime/scene-content.ts';"`.
- Limites connues: l'historique de migrations contient une etape intermediaire qui ajoute `totalDuration`; la migration suivante la supprime dans l'etat final.
