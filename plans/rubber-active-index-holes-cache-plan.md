# Rubber Active Index Holes Cache Plan

## Contexte

- Bug sur scene 6: a `progress = 61%`, `resolveActiveIndex` peut renvoyer le dernier mot au lieu du mot attendu.
- Hypothese: presence de trous temporels entre mots (gaps) non geres proprement par la resolution actuelle.
- Objectif: renforcer `resolveActiveIndex` pour approcher le dernier mot prononce quand le curseur est dans un trou.
- Optimisation demandee: persister les calculs invariants (segments derives des cues) dans la classe pendant la vie du composant.

## Checklist

- [x] Refactorer `RubberProportionalLayout` pour mettre en cache les segments derives des cues (signature + segments precomputes).
- [x] Renforcer `resolveActiveIndex` pour gerer les trous temporels: priorite au segment contenant le temps, sinon fallback au dernier segment termine avant le temps courant.
- [x] Supporter une duree timeline explicite (si disponible) pour eviter un mapping degrade quand la duree cues et la duree player divergent.
- [x] Simplifier `RubberProportionalTest` pour utiliser le default de `DEFAULT_PIXELS_PER_SECOND` (sans override local inutile).
- [x] Mettre a jour `plans/lessons.md` suite a la correction utilisateur.

## Verification

- [x] Relecture diff ciblee sur `app/parts/rubber/rubber-proportional-layout.ts`.
- [x] Validation statique: en cas de trou temporel, `resolveActiveIndex` retourne un index stable correspondant au dernier mot prononce.

## Review

- `DEFAULT_PIXELS_PER_SECOND` passe a `240` (soit `1/100s = 2.4px`) comme nouvelle source unique.
- `RubberProportionalLayout` met en cache les segments derives tant que la reference `cues` ne change pas, et met en cache le resultat `isActive` tant que l'index actif reste identique.
- `resolveActiveIndex` couvre maintenant les trous temporels: en dehors des bornes d'un mot, il retourne le dernier mot termine au lieu de deriver vers le dernier segment.
- `RubberProportionalTest` passe une duree scene explicite (`getSceneContentDurationSec`) pour stabiliser le mapping progress -> elapsed.
