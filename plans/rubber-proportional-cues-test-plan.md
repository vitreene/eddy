# Rubber Proportional Cues Test Plan

## Contexte

- Besoin: tester une copie de `Rubber` avec des cues affiches proportionnellement a leur duree.
- Echelle imposee: `1px` pour `1/100e` de seconde (soit `100px` pour `1s`).
- Layout impose: cues dans un flux `flex-wrap`, largeur calculee par cue.
- Contraintes architecture: logique metier dans une classe distincte, React limite au rendu.

## Checklist

- [x] Ajouter une classe metier dediee qui transforme les cues en segments de rendu (duree, largeur px, libelle).
- [x] Creer un composant de test `Rubber` (copie) qui lit les cues actifs et render les segments en `flex-wrap` avec largeur calculee.
- [x] Integrer ce composant de test dans `EditEvent` sans casser `Rubber` existant.
- [x] Verifier que le calcul respecte bien l'echelle `1/100s => 1px` et que les valeurs invalides sont bornees.

## Extension Progress

- [x] Recuperer `active.progress` dans `RubberProportionalTest`.
- [x] Deriver le cue actif correspondant au progress via la classe metier (pas dans React).
- [x] Appliquer une teinte differenciee au mot actif.

## Verification

- [x] Relecture diff ciblee des nouveaux fichiers + integration.
- [x] Validation statique: aucun state React ajoute pour cette feature (rendu derive uniquement du store + classe metier).
- [x] Validation statique: `RubberProportionalTest` lit `active.progress` et le style actif est applique sur un seul segment.

## Review

- Ajout d'une classe `RubberProportionalLayout` qui convertit les cues en segments avec duree normalisee et largeur en pixels.
- Echelle appliquee explicitement a `100 px / seconde` (`1/100s = 1px`), avec largeur minimale de `1px` pour eviter les segments invisibles.
- Nouveau composant `RubberProportionalTest` en rendu `flex-wrap`, branche temporairement a la place de `Rubber` dans `EditEvent` pour le test.
- Le mapping progress -> mot actif est calcule dans `RubberProportionalLayout` (`resolveActiveIndex`) puis projete en `isActive` pour le rendu.
