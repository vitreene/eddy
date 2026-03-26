# Content timestamp words object plan

## Checklist

- [x] Lire le code existant de lecture/ecriture `content.timestamp`.
- [x] Supprimer la compatibilite legacy tableau et lire uniquement le format objet `{ words: [...] }`.
- [x] Restreindre la gestion `timestamp` aux contenus media (`sound`/`video`) dans `db.ts`.
- [x] Mettre a jour le schema Prisma avec `content.timestamp` nullable (default implicite `null`).
- [x] Annuler la migration non sollicitee ajoutee au repo.
- [ ] Corriger l'etat de la base locale (`prisma/dev.db`) pour revenir a un `timestamp` nullable et remettre a `NULL` les contenus non media.
- [x] Verifier les flux API (lecture/ecriture) et le typecheck.

## Review

- `parseContentTimestampWords(...)` lit maintenant uniquement `timestamp.words` (plus de branche legacy tableau).
- `upsertSceneContentCues(...)` refuse explicitement les contenus non media (`sound`/`video`) pour `timestamp`.
- `schema.prisma` repasse `content.timestamp` en nullable (`String?`, default `null`).
- Migration non sollicitee retiree du repo (`prisma/migrations/20260326160000_content_timestamp_words_object`).
- Verification: `npm run typecheck` OK.
- Point bloquant: la base locale a deja ete modifiee; une ecriture DB est necessaire pour realigner `dev.db`.
