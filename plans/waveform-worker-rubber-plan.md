# Waveform worker + rubber plan

## Spec cible

- Extraire un waveform de qualite suffisante pour affichage Canvas, sans dependre de `waveform-data.js`.
- Executer le calcul de waveform en arriere-plan via Worker (meme philosophie que Whisper).
- Conserver un pipeline simple: extraction + persistance + affichage (pas de suite fonctionnelle avancee pour l'instant).
- Ne jamais ecraser l'objet complet `content.timestamp`: mise a jour partielle de la seule propriete `waveform`.

## Contrat de donnees propose

- `content.timestamp` (JSON string) contient:
  - `words`: tableau actuel (inchangé)
  - `waveform`: objet minimal, ex:
    - `version: 1`
    - `sampleRate: number`
    - `durationSec: number`
    - `points: number` (nombre de bins)
    - `min: number[]` (valeurs normalisees -1..1)
    - `max: number[]` (valeurs normalisees -1..1)
- Recommandation qualite par defaut: `points = 2048` (ou 4096 pour pistes longues) pour un rendu propre en Canvas.

## Architecture proposee

- **Extraction**
  - Reutiliser la logique de decode audio deja adoptee cote front (comme Whisper), puis deleguer le calcul min/max au Worker.
  - Ajouter un module `app/waveform/extract-to-waveform.ts` qui expose:
    - `extractAudioFileToWaveform(file, options)`
    - `extractAudioBufferToWaveform(audioBuffer, options)`
  - Ajouter un worker dedie `app/waveform/worker.ts` (message in/out simple, transferables pour perf).

- **Persistance**
  - Ajouter un endpoint API de persistance waveform (branche dediee dans `app/api/content.ts` sur `POST /api/content/:id`).
  - Centraliser en DB une fonction de merge partiel `content.timestamp` (pattern identique a `words`):
    - `parseContentTimestampWaveform(...)`
    - `mergeContentTimestampWaveform(...)`
  - Garder la contrainte media-only (`sound`/`video`) pour ce payload.

- **Declenchement background**
  - Dans `app/parts/chutier/index.tsx`, pour chaque son importe:
    - conserver Whisper (`words`) en background,
    - lancer waveform en parallele (Promise independante, gestion d'erreur non bloquante).

- **Affichage Rubber**
  - Ajouter un composant Canvas dedie (ex: `app/parts/rubber/waveform-canvas.tsx`).
  - Lire le `waveform` du contenu actif de scene (via `content.timestamp`).
  - Rendu initial simple:
    - fond + trace min/max verticale par bin,
    - resize observer + redraw,
    - fallback discret si waveform absent.
  - Montage temporaire: afficher ce composant en dessous de `Rubber` dans `event-edit` comme test visuel (pas encore integre au composant `Rubber` lui-meme).

## Checklist

- [x] Etudier l'existant worker/Whisper et le point d'integration upload (`chutier`).
- [x] Implementer extraction waveform en worker (sans librairie externe), avec API TS claire.
- [x] Definir le format JSON `timestamp.waveform` et implementer parse/merge DB sans ecrasement global.
- [x] Ajouter endpoint API de persistance waveform et validation type content.
- [x] Integrer le traitement waveform en background dans `chutier` (parallelise avec Whisper).
- [x] Implementer rendu Canvas waveform de test (version simple, lisible, responsive) via un composant place temporairement sous `Rubber`.
- [ ] Ajouter tests cibles:
  - extraction min/max sur signal synthetique,
  - merge DB `words` + `waveform` sans perte,
  - smoke UI rubber (fallback + affichage data presentes).
- [x] Verifier localement (`npm run typecheck` + smoke tests cibles).

## Risques / arbitrages

- Decodage audio dans Worker n'est pas uniforme selon environnements; on garde un design robuste: decode cote UI, calcul lourd dans Worker.
- Taille JSON: `min/max` longs peuvent grossir; commencer simple (2048 points), puis compacter (Int16/base64) si necessaire.
- UX import: Whisper et waveform en parallele peuvent produire des etats intermediaires; prevoir erreurs non bloquantes.

## Review

- Extraction implementee (`app/waveform/extract-to-waveform.ts` + `app/waveform/worker.ts`) avec fallback main-thread si Worker indisponible.
- Contrat waveform implemente (`app/waveform/payload.ts`) et persistance partielle en DB via merge (`upsertContentWaveform` dans `app/api/db.ts`).
- Endpoint waveform branche sur `POST /api/content/:id` (`app/api/content.ts`) avec validation stricte `WaveformDataV1`.
- Traitement en background integre dans `app/parts/chutier/index.tsx` en parallele de Whisper.
- Composant test Canvas ajoute et monte temporairement sous Rubber:
  - `app/parts/rubber/waveform-canvas-test.tsx`
  - integration dans `app/parts/event-edit/index.tsx`.
- Tests ajoutes et passes:
  - `tests/waveform-compute-smoke.ts`
  - `tests/content-waveform-merge-smoke.ts`
- Verifications passees:
  - `npm run typecheck`
  - `npx tsx tests/waveform-compute-smoke.ts`
  - `npx tsx tests/content-waveform-merge-smoke.ts`
  - `npx tsx tests/player-media-runtime-smoke.ts`
- Reste a faire: smoke UI automatise du composant de test waveform (fallback + rendu), non implemente dans cette passe.
