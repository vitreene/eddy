# Rubber Zero Duration Artifacts Plan

## Contexte

- Regression observee: des artefacts de mots `0s` apparaissent dans le rendu Rubber.
- Cause suspectee: cues techniques waveform ponctuels (`start=end`) qui remontent dans les cues rendus.

## Checklist

- [x] Confirmer la source des artefacts dans le pipeline cues (timestamp words vs scene_content.events techniques).
- [x] Empêcher l'affichage des cues ponctuels techniques dans Rubber.
- [x] Reclarifier la fusion cues: reservee a l'editeur waveform, pas injectee globalement dans les cues words de base.
- [x] Verifier typecheck.

## Verification

- [x] Relecture diff des fichiers scene-content/db/apis + rubber + waveform.
- [x] Validation statique: plus de cues `0s` rendus dans Rubber.

## Review

- Cause racine identifiee: les cues techniques waveform (`__wfpos__*`, ponctuels `start=end`) etaient injectes dans les cues rendus par Rubber via fusion globale.
- Correction de structure: retour des cues "base" a `timestamp.words` dans les chargements/upserts scene-content; fusion `timestamp + events` maintenue uniquement dans l'editeur waveform.
- Correction de rendu: dans Rubber, les cues `__wfpos__*` sont affiches dans un style dedie (marqueurs visuels sans texte), distinct des mots.
- Les vrais mots conservent leur rendu habituel; les cues de duree nulle non-techniques restent exclus.
- Typecheck valide (`npm run typecheck`).
