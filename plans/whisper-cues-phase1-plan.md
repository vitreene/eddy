# Plan d'action — Phase 1 Whisper vers cues Rubber

## Objectif de la phase 1

Prouver le flux minimum suivant: lorsqu'un son est importe, il est envoye au moteur Whisper (sans utiliser l'UI demo), puis on recupere une liste de cues exploitable par l'application (`TextTime[]`) et visible dans Rubber.

## Perimetre

- Inclus
  - Integration technique Whisper dans l'app (pipeline + API applicative).
  - Transformation sortie Whisper -> cues `scene_content.events`.
  - Affichage des cues dans Rubber une fois disponibles.
  - Verification fonctionnelle du flux audio -> cues.
- Exclu (phases suivantes)
  - Association explicite son <-> sequence depuis item-edit.
  - Deplacement/migration de `scene_events` vers content.
  - Fallback graphique audio si absence de voix.

## Cartographie constatee

- Whisper est actuellement isole sous `app/whisper` (hook `useTranscriber`, `worker.js`, composants demo).
- L'import audio existant passe par `app/parts/chutier/index.tsx` puis `POST /api/upload`.
- Rubber lit les cues depuis `sceneContents.events`.
- Le chargement DB parse deja `scene_content.events` en `TextTime[]`, mais le chemin d'ecriture de ces cues reste a ajouter pour la phase 1.

## Plan detaille

- [x] **1. Definir le contrat de donnees cues pour Whisper**
  - Confirmer le format cible `TextTime[]` (`name`, `text`, `start`, `end`).
  - Definir la normalisation (timestamps null, tri, unicite de `name`).
  - Specifier la regle de generation de `name` stable et deterministic.

- [x] **2. Extraire une API Whisper reutilisable sans UI**
  - Creer une facade applicative (service/hook) qui prend un `File` ou `AudioBuffer`.
  - Reutiliser le worker Whisper existant (`app/whisper/worker.js`) et `useTranscriber`.
  - Exposer une promesse `transcribeToCues(...) -> Promise<TextTime[]>`.

- [x] **3. Brancher le flux import audio vers Whisper**
  - Intercepter les fichiers audio a l'import (Chutier).
  - Lancer l'analyse Whisper de facon non bloquante pour l'UX d'upload.
  - Relier le resultat au bon `scene_content` cible (regle explicite si plusieurs contenus).

- [x] **4. Ajouter l'endpoint API de persistance des cues**
  - Creer endpoint dedie (ex: `POST /api/scene-content/:id/cues`).
  - Valider et persister la liste dans `scene_content.events` (JSON).
  - Retourner les cues persistees normalisees.

- [x] **5. Rafraichir l'etat scene pour rendre visible dans Rubber**
  - Mettre a jour l'etat client apres persistance (reload scene ou patch local).
  - Verifier que `app/parts/rubber/index.tsx` affiche les cues sans adaptation structurelle.
  - Verifier que `event-edit` consomme correctement les nouveaux cues.

- [ ] **6. Verification de bout en bout (obligatoire)**
  - Cas nominal: import audio avec voix -> liste de cues visible dans Rubber.
  - Cas robustesse: Whisper renvoie un `end` manquant -> cues valides quand meme.
  - Cas performance UX: upload non bloque pendant transcription.
  - Traces minimales (logs techniques) pour diagnostiquer echec worker/API.

## Risques et garde-fous

- Dependances Whisper potentiellement manquantes dans l'app principale (a verifier au build).
- Ambiguite de ciblage si plusieurs `scene_content` audio existent pour une sequence.
- Contrat `name` des cues critique pour les events `intro/outro/custom`.
- Whisper peut produire des segments sans `end`: normalisation defensive obligatoire.

## Definition de fini (phase 1)

- Importer un son declenche automatiquement une analyse Whisper cote app.
- Une liste de cues est recuperee, normalisee et persistee dans `scene_content.events`.
- Les cues apparaissent dans Rubber sans passer par l'interface demo Whisper.
- Verification manuelle completee et resultat documente.

## Review (a completer apres implementation)

- Resultat:
  - Pipeline phase 1 implemente: import audio -> transcription Whisper via worker -> mapping `TextTime[]` -> persistance `scene_content.events` -> injection dans `scene-logic` pour affichage immediate.
  - API ajoutee: `POST /api/scene-content/cues` avec validation `sceneId/contentId/cues` et upsert de la piste scene_content cible.
- Tests/commandes executes:
  - `npm run build` (OK).
  - `npx tsx tests/content-api-smoke.ts` (OK).
  - `npm run typecheck` (KO sur erreurs existantes dans `app/whisper/components/*`, non introduites par cette phase).
- Limites connues:
  - Ciblage `scene_content`: la phase 1 met a jour la premiere entree de la scene (ou cree si absente) puis remplace `contentId`; gestion multi-sources sera traitee en phase 2.
  - Verification UI manuelle Rubber/event-edit reste a faire pour clore le point 6.
- Suites recommandees (phase 2+):
  - Introduire la relation explicite sequence <-> son (selector dans item-edit) puis cesser la strategie "premiere entree scene_content".
  - Preparer fallback waveform quand Whisper ne detecte pas de voix exploitable.
