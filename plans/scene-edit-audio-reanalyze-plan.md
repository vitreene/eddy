# Plan d'action — Scene Edit audio reanalyse

## Objectif

Dans `edit-scene`, permettre de:

- selectionner un son parmi les contenus audio disponibles,
- relancer manuellement une analyse Whisper du son selectionne,
- logguer les cues retournes par `transcribeAudioFileToCues` dans la console,
- persister les cues retournes sur `scene_content`.

## Plan detaille

- [x] Ajouter un bouton de reanalyse (icone redo) a cote du select audio.
- [x] Charger le fichier audio depuis `content.path` et appeler `transcribeAudioFileToCues`.
- [x] Ajouter `console.log` des cues retournes pour verification.
- [x] Persister les cues via `POST /api/scene-content/cues`.
- [x] Mettre a jour l'etat scene local (`scene-content-upsert`) et la duree affichee.
- [x] Afficher un retour d'erreur UI simple si la reanalyse echoue.

## Review

- Implementation faite dans `app/parts/item-edit/scene-edit.tsx`.
- Verification executee: `npm run typecheck`.
- Resultat typecheck: erreurs preexistantes hors perimetre (whisper demo components/tests smoke), aucune erreur sur `scene-edit.tsx`.
