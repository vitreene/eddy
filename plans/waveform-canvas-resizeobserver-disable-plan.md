# WaveformCanvasTest ResizeObserver Disable Plan

## Contexte

- Bug au chargement: le canvas de `WaveformCanvasTest` est redessine en boucle avec une largeur qui augmente progressivement.
- Effet observe: consommation memoire qui explose puis navigateur bloque.
- Premiere action demandee: desactiver `ResizeObserver` pour couper la boucle de resize/redraw.

## Checklist

- [x] Localiser le circuit de sizing/draw de `WaveformCanvasTest` et confirmer l'usage de `ResizeObserver`.
- [x] Modifier le composant pour supprimer l'abonnement `ResizeObserver` et conserver un sizing initial stable sans boucle.
- [x] Verifier la coherence du rendu (pas de logique hook supplementaire introduite, draw declenche seulement quand donnees + largeur disponibles).

## Verification

- [x] Relecture diff ciblee sur `app/parts/rubber/waveform-canvas-test.tsx`.
- [x] Validation statique: aucun `ResizeObserver` restant dans le composant.

## Review

- `ResizeObserver` retire de `WaveformCanvasTest`; le canvas prend maintenant une largeur unique mesuree depuis le conteneur pendant le draw.
- Suppression de hooks non essentiels (`useMemo`, `useState`) pour respecter la contrainte de minimisation des hooks React.
- Le draw est declenche uniquement sur variation du waveform; plus de boucle observee de resize/redraw auto-induite dans le composant.
