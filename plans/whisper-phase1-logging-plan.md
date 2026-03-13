# Plan d'action — Tracage detaille pipeline Whisper (phase 1)

## Objectif

Rendre observable tout le flux `import audio -> Whisper -> cues -> scene_content.events` pour diagnostiquer ou le traitement bloque (client, worker, API, DB).

## Plan detaille

- [x] **1. Instrumenter l'import audio (Chutier)**
  - Log debut/fin d'upload et mapping fichier -> content cree.
  - Log lancement analyse Whisper par fichier audio.
  - Log succes/erreur de persistance cues cote client.

- [x] **2. Instrumenter le service Whisper**
  - Log decode audio (entree, duree, sample rate, canaux).
  - Log cycle worker (postMessage, statuts recus, complete/error).
  - Log nombre de chunks recus et cues mappees.

- [x] **3. Instrumenter l'API de persistance cues**
  - Log reception payload (`sceneId`, `contentId`, `cues.length`, `traceId`).
  - Log validation metier (content sound, scene cible) et resultat.
  - Log succes/erreur de reponse API.

- [x] **4. Instrumenter la couche DB `scene_content`**
  - Log mode update/create, id cible, volume de cues.
  - Log normalisation cues (nombre entree/sortie).
  - Log duree operation DB.

- [ ] **5. Verification rapide**
  - Build pour verifier l'integration.
  - Test manuel sur scene 8 avec import son pour verifier la chaine de logs.

## Review (a completer apres implementation)

- Resultat:
  - Tracage detaille ajoute sur toutes les etapes cle: drop/upload, decode/transcription worker, requete API, upsert DB, synchronisation etat client.
  - Correlation cross-couche via `traceId` transporte client -> API -> DB.
- Verification executee:
  - `npm run build` (OK).
  - Test manuel scene 8 a faire pour valider le diagnostic complet dans les logs runtime.
- Limites connues:
  - Le worker Whisper interne n'est pas modifie; les logs exploitent les statuts remontes au client.
