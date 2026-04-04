# Plan — Gesture orchestrator Rubber/Waveform

## Objectif

Refactoriser l'interaction pointer pour Rubber et Waveform avec une orchestration commune purement gestuelle.

## Contraintes

- Aucun conditionnel metier dans l'orchestrateur.
- Toute specialisation intro/outro/custom reste dans les adaptateurs (Rubber, Waveform, point editors).
- Nettoyer l'instrumentation temporaire de debug.

## Etapes

- [x] Auditer les duplications pointer dans Rubber/Waveform et les point editors.
- [x] Creer un orchestrateur generique de geste pointer (start/move/complete/cancel + moved flag).
- [x] Refactorer `TimelinePointEditor` pour utiliser l'orchestrateur.
- [x] Refactorer `WaveformPointEditor` pour utiliser l'orchestrateur.
- [x] Refactorer le background Rubber (creation intro/outro) avec orchestrateur.
- [x] Refactorer le background Waveform (creation intro/outro) avec orchestrateur.
- [x] Extraire la geometrie d'ancrage timeline partagee (anchors + nearest) hors des adaptateurs.
- [x] Contraindre les points event Rubber a un deplacement horizontal tout en restant centres verticalement sur leur ligne de texte.
- [x] Retirer les logs d'instrumentation temporaire.
- [x] Verifier typecheck et smokes selection.
- [x] Mettre a jour `plans/lessons.md` avec la regle d'architecture demandee.

## Verification cible

- `npm run typecheck`
- `npx tsx tests/event-selection-scene1-smoke.ts`
- `npx tsx tests/selection-contract-lock-smoke.ts`

## Review

- Orchestrateur partage introduit dans `pointer-gesture-orchestrator.ts` avec API pure geste (pas de regle metier intro/outro).
- Adaptateurs Rubber/Waveform gardent l'entierete des decisions de creation/edition (`tap` vs `drag`, `intro/outro`, selection).
- Geometrie timeline factorisee dans `timeline-anchor-geometry.ts` pour eviter la duplication Rubber / TimelinePointEditor.
- Contrainte corrigee: les points event Rubber restent centres verticalement sur leur ligne de texte (multi-lignes), se deplacent horizontalement sur la rangee active, et peuvent changer de rangee via un glisse vertical (snap vers la ligne la plus proche).
- Signatures Rubber harmonisees sur `TimelineCuePoint` pour eviter les types inline repetes.
- Instrumentation temporaire retiree des composants Rubber/Waveform.
- Verification locale: `npm run typecheck`, `npx tsx tests/event-selection-scene1-smoke.ts`, `npx tsx tests/selection-contract-lock-smoke.ts`, `npx tsx tests/event-selection-auto-fallback-smoke.ts`, `npx tsx tests/custom-events-smoke.ts`.
