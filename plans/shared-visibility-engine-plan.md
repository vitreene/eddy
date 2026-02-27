# Plan factorisation visibility (builder + active-cue)

## Objectif

Factoriser le calcul des fenetres de visibilite et des events auto dans un moteur unique partage entre le builder et `computeActiveCue`, pour supprimer les derives de comportement lors des evolutions futures.

## Etapes

- [x] **Cadrage du contrat commun**
  - [x] Definir les entrees/sorties du moteur partage (snapshot scene, options, resultat).
  - [x] Lister les regles a couvrir: events explicites, auto reparti, `__auto_maximal__`, visibilite item/capsule.
  - [x] Definir les invariants (parite builder/active-cue sur les memes donnees).

- [x] **Creer le module central de resolution**
  - [x] Ajouter un module `app/player/visibility/resolve-cue-windows.ts`.
  - [x] Extraire les structures utilitaires (cue map, chaine parent, fenetres item/capsule).
  - [x] Exposer une API claire (ex: `resolveVisibility(snapshot)` retourne fenetres + events derives).

- [x] **Migrer la logique auto-events du builder**
  - [x] Remplacer la logique inline de `applyCapsuleDefaultItemEvents` par le module partage.
  - [x] Conserver les conventions de nommage (`__auto_...`, `__auto_maximal__...`).
  - [x] Verifier la compatibilite avec le filtrage visibilite actuel (items/capsules masques).

- [x] **Migrer `computeActiveCue` sur le moteur partage**
  - [x] Remplacer la derive locale des fenetres dans `active-cue.ts`.
  - [x] Utiliser les fenetres resolues pour calculer le cue actif.
  - [x] Supprimer la logique dupliquee devenue inutile.

- [x] **Nettoyage et simplification**
  - [x] Retirer les helpers obsoletes des anciens modules.
  - [x] Homogeneiser les types partages (fenetre, lock, cue).
  - [x] Documenter les points d'extension pour futures regles.

- [x] **Tests de non-regression et parite**
  - [x] Ajouter tests de parite builder vs active-cue sur cas standard.
  - [x] Ajouter cas limites: fenetre degenerée -> `__auto_maximal__`.
  - [x] Ajouter cas visibilite: item masque, capsule masquee, heritage runtime.
  - [x] Verifier scene reelle (scene 1) sur items texte et capsules.

- [x] **Validation finale**
  - [x] Lancer `npm run typecheck`.
  - [x] Lancer `npm run test:smoke`.
  - [x] Verifier manuellement les interactions edition tree + player.

## Journal de suivi

- 2026-02-27: Plan cree, en attente du demarrage implementation.
- 2026-02-27: Pause etape 1 finie (creation moteur partage `resolve-cue-windows`, contrat commun et API de sortie).
- 2026-02-27: Pause etape 2 finie (builder migre sur moteur partage, conventions `__auto__` et `__auto_maximal__` conservees).
- 2026-02-27: Pause etape 3 finie (`active-cue` migre, logique dupliquee retiree, typecheck + smoke + verification scene 1 OK).
