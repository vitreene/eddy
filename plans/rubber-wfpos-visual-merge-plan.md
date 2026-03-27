# Rubber Wfpos Visual Merge Plan

## Contexte

- Demande: fusionner visuellement les doubles positions `_wfpos__` cote a cote.
- Contrainte: ne rien casser (pas de changement de donnees/events/anchors).

## Checklist

- [x] Garder chaque cue `_wfpos__` en DOM (pour les ancres/poignees), fusion visuelle seulement.
- [x] Detecter les sequences adjacentes de `_wfpos__` dans le rendu Rubber.
- [x] Ajuster style (suppression de gap visuel, coins fusionnes) pour afficher un bloc continu.
- [x] Verifier typecheck.

## Verification

- [x] Relecture diff sur `app/parts/rubber/rubber.tsx`.
- [x] Validation statique: aucune modif payload/events, fusion uniquement UI.

## Review

- Fusion visuelle pure des `wfpos` adjacents: overlap du gap (`margin-left` negatif) + coins internes non arrondis.
- Chaque cue `wfpos` reste present comme element DOM distinct (`data-rubber-cue`), donc ancres/poignees restent resolvables.
- Aucun changement de donnees/events/payloads; seulement le rendu Rubber.
- Typecheck valide (`npm run typecheck`).
