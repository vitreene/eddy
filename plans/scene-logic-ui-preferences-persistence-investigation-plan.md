# Plan d'enquete — Persistance preferences UI (Telco + item-edit)

## Objectif

Verifier si la persistance locale des preferences UI stockees dans `scene-logic` est effectivement implementee et correctement branchee pour:

- la coupure audio Telco,
- l'onglet actif de `item-edit`.

## Etapes

- [x] Identifier les points de stockage dans `scene-logic` (contexte, events, initialisation).
- [x] Tracer les flux d'ecriture/lecture pour Telco mute et item-edit tab.
- [x] Verifier l'usage reel de LocalStorage (ou mecanisme equivalent XState) et la presence d'une restauration au boot.
- [x] Confirmer les ecarts entre implementation attendue et comportement actuel.
- [x] Proposer un diagnostic clair + prochain fix minimal (sans encore coder).

## Review

- Resultat:
  - Aucune persistance locale detectee (`localStorage`/`sessionStorage`) dans le code applicatif.
  - `scene-logic` ne transporte aucun champ de preference UI pour `telco mute` ni `item-edit tab` (`ActiveState` ne contient pas ces cles).
  - Telco mute est seulement gere en etat React local (`useState(false)`), puis reapplique au telco a la re-initialisation du player, sans survive reload/page refresh.
  - Les tabs `item-edit` et `capsule-edit` sont non controles (`defaultValue="presets"`) et non branches sur `scene-logic`; le choix onglet n'est pas restaure.
  - Verdict: fonctionnalite non realisee pour la persistance demandee (mute = partiellement implemente runtime-only; tabs = non implemente).
- Verification executee:
  - Audit statique `scene-logic` (`app/provider/scene-logic.ts`, `app/provider/types.ts`, `app/provider/scene-logic.init.ts`).
  - Audit statique Telco (`app/player/index.tsx`, `app/player/player.ts`).
  - Audit statique tabs item-edit (`app/parts/item-edit/item-edit-panel.tsx`, `app/parts/item-edit/capsule-edit.tsx`, `app/parts/item-edit/index.tsx`).
  - Recherche globale code + plans sur `localStorage`/`sessionStorage`/`persist`/`tab`/`mute`.
