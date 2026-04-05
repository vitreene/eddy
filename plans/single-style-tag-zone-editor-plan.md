# Plan — Zone editor single style tag compliance

## Contexte

- Regression d'architecture: un tag style dedie `eddy-live-zone-definitions` etait injecte par l'editeur de zones.
- Regle projet: toutes les regles de sequence doivent passer par le style unique produit par le builder.

## Actions

- [x] Supprimer le flux `syncLiveStyles` qui injectait des definitions de zones hors builder.
- [x] Retirer l'appel machine a `syncLiveZoneClassDefinitions`.
- [x] Supprimer tout mecanisme de cleanup defensif associe aux tags live zones/areas.
- [x] Verifier typecheck et smokes.

## Review

- Le zone editor n'injecte plus de style de placement de zone hors builder.
- Toute definition de zone vient du style sequence calcule par le builder.
- Aucune logique de cleanup defensif restante: pas de voie parallele de style runtime.
- Le builder publie maintenant les regles de toutes les zones (et aliases slug), afin que les classes `ed-zone-*` appliquees aux items/events soient resolues dans la balise style unique.
