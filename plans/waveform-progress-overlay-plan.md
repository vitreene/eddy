# Waveform Progress Overlay Plan

## Contexte

- Le composant `WaveformCanvasTest` doit afficher la progression de lecture.
- Source de verite demandee: `active.progress` depuis le store SceneLogic.
- Rendu attendu: partie ecoulee de la waveform en teinte plus foncee.

## Checklist

- [x] Identifier la source exacte de `active.progress` dans le state SceneLogic et son intervalle (0..100).
- [x] Lire `active.progress` dans `WaveformCanvasTest` via selector dedie.
- [x] Adapter le dessin canvas pour appliquer une teinte sombre sur la portion ecoulee.
- [x] Verifier que le redraw suit `waveform + progress` sans reintroduire de boucle de resize.

## Verification

- [x] Relecture du diff sur `app/parts/rubber/waveform-canvas-test.tsx`.
- [x] Validation statique: usage explicite de `active.progress` et clamp de la valeur.

## Review

- `WaveformCanvasTest` lit maintenant `state.context.active.progress` via selector dedie.
- Le rendu canvas applique deux teintes: sombre pour la portion ecoulee, claire pour la portion restante, avec seuil derive du progress runtime.
- Le progress est borne par `clampProgress` (0..100) pour eviter les artefacts de dessin.
- Le composant reste sans `ResizeObserver`; redraw pilote par `waveform` et `activeProgress` uniquement.
