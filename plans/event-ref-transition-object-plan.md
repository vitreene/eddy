# Event ref transition object plan

## Spec cible

- `event.ref` devient une colonne JSON en base (schema Prisma + migration SQL).
- La transition est desormais stockee sous la cle `transition` (et non plus `ref`).
- Format cible minimal intro/outro: `{ "transition": "fade" }`.
- Le meme objet peut porter d'autres cles (`media`, puis futures extensions), sans ecrasement des cles inconnues.
- L'ecriture des payloads `event.ref` est centralisee dans une seule fonction utilitaire (source unique de verite), hors dossier `config`.

## Checklist

- [x] Cartographier les points lecture/ecriture actuels de `event.ref` et verifier le cas reel `event.id = 104`.
- [x] Migrer le schema DB/Prisma pour `event.ref` en JSON:
  - `prisma/schema.prisma`: `Event.ref` passe de `String?` a `Json?`.
  - migration SQL de conversion des lignes existantes vers JSON valide.
  - regeneration du client Prisma et ajustement des types TS impactes.
- [x] Creer un module central de serialization/merge `event.ref` dans un module partage (ex: `app/lib/event-ref.ts`, hors `config` et hors `scene-logic`) avec API explicite:
  - `readEventRefObject(raw)`
  - `readEventTransition(raw, action)`
  - `writeEventTransition(raw, transition, action)`
  - `writeEventMedia(raw, media)`
  - `normalizeEventRefForPersist(raw, action)`
- [x] Refactorer les ecritures pour passer uniquement par ce module central:
  - `app/api/db.ts` (`normalizeTransitionRefWithMedia`, `addEventToContent`)
  - `app/config/event-media.ts` (retirer/relayer la logique actuelle vers le module partage)
  - `app/parts/event-edit/index.tsx` (`onChangeTransition`, `resolveTransitionRefValue`, media update)
- [x] Refactorer les lectures runtime/builder pour lire `transition`:
  - `app/player/builder/events.ts` (selection de preset intro/outro)
  - autres parseurs de transition evenement si presents.
- [x] Corriger explicitement le bug generateur du cas `event.id=104`: remplacer toute emission de `{ ref: ... }` par `{ transition: ... }`.
- [x] Ajouter/adapter des tests smoke ciblant:
  - serialisation transition + media,
  - non-regression custom/sustain,
  - persistance payload intro/outro avec cle `transition`.
- [x] Valider en local (typecheck + test(s) ciblant scene 9 / event media behavior).
- [x] Preparer le script de migration DB (sans l'executer sans feu vert):
  - convertir les intro/outro string bruts vers `{ "transition": string }`,
  - convertir les objets `{ "ref": ... }` vers `{ "transition": ... }`,
  - preserver `media` et toutes les autres proprietes existantes,
  - serialiser en JSON compatible avec la nouvelle colonne `Json`.
- [x] Check-in explicite avant ecriture DB effective (conformement aux lessons du projet).

## Strategie migration DB (proposee)

- Cible SQL: table `event`, colonne `ref` (type JSON/JSON-compatible selon SQLite, exposee en `Json?` Prisma).
- Scope de migration: events standards `intro`/`outro` prioritairement; ne pas casser les payloads custom/sustain.
- Transformation logique:
  - `"fade"` -> `{"transition":"fade"}`
  - `{"ref":"fade","media":...}` -> `{"transition":"fade","media":...}`
  - `{"transition":"fade",...}` -> inchange
- Ajouter une verification post-migration (compteurs par forme JSON + echantillons).

## Review

- Module central ajoute: `app/lib/event-ref.ts` (`writeEventRef` centralise l'ecriture; `writeEventTransition`/`writeEventMedia` deleguent).
- `app/config/event-media.ts` retire; imports migrés vers `app/lib/event-ref.ts`.
- Lecture builder migrationnee vers `transition` via `readEventTransitionValue(...)`.
- `addEventToContent(...)` normalise desormais intro/outro en objet `{ transition: ... }` et remappe legacy `{ ref: ... }` -> `{ transition: ... }`.
- Schema Prisma migre (`Event.ref: Json?`), client regenere, migration SQL preparee: `prisma/migrations/20260326183000_event_ref_json/migration.sql`.
- Migration DB appliquee sur `prisma/dev.db` apres validation utilisateur; `event.ref` est maintenant en `JSONB` et toutes les valeurs non-null sont JSON valides.
- Cas cible valide: `event.id=104` est migre en `{"media":{"action":"pause","offset":0},"transition":"fade"}`.
- Verification: `npm run typecheck` OK, smoke `content-api` et `builder-capsule` OK.
- Verification complementaire: smoke `event-selection-scene1` OK apres migration.
- Test ajoute: `tests/event-ref-smoke.ts` (serialisation transition/media + normalisation persist).
