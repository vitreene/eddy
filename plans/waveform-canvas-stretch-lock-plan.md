# Waveform Canvas Stretch Lock Plan

## Contexte

- Bug critique: `WaveformCanvasTest` se redessine en boucle avec une largeur qui derive (canvas qui s'etire) pendant l'edition d'item.
- Impact: fuite memoire, blocage navigateur.
- Exigence: bloquer strictement le comportement de derive.

## Hypothese racine

- La largeur de rendu est mesuree depuis le conteneur puis reinjectee en inline sur le canvas (`style.width`), ce qui peut re-influencer la largeur du parent dans un layout flex auto et provoquer une boucle d'agrandissement.

## Checklist

- [x] Supprimer la boucle de retroaction de layout: ne plus ecrire `style.width` calcule depuis le parent.
- [x] Mesurer la largeur de dessin depuis le canvas (`clientWidth`) et synchroniser uniquement la taille bitmap (`canvas.width/height`).
- [x] Garder un rendu stable sur `waveform + progress` sans `ResizeObserver` ni state React local.
- [x] Ajouter un lesson learned dans `plans/lessons.md` suite a la correction utilisateur.

## Verification

- [x] Relecture de `app/parts/rubber/waveform-canvas-test.tsx` pour confirmer absence de `style.width` dynamique.
- [x] Validation statique: aucune reference `ResizeObserver` dans le composant.

## Review

- Suppression de la source de derive: plus de mesure parent -> reinjection `style.width` sur le canvas.
- Le composant lit maintenant sa largeur/hauteur CSS via `canvas.clientWidth/clientHeight` puis ajuste seulement la resolution bitmap.
- Le redraw reste pilote par `waveform` et `activeProgress` avec taille CSS stable (`h-[72px] w-full`).
