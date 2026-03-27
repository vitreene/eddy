# Rubber Permanent + Handle Editor Plan

## Contexte

- `RubberProportionalTest` et `WaveformCanvasTest` deviennent des composants permanents.
- Le switch (deja en place dans `ContentInfos`) reste le point de bascule entre les deux vues.
- Etape demandee: en vue Rubber, reintroduire l'edition des poignees en incluant `intro`, `outro` et tous les events custom disponibles (`sustain` exclu) quand un item est edite.
- Contrainte architecture: logique metier centralisee dans une classe, React limite au rendu; pas de nouvel etat local React non justifie.

## Objectif de design

- Separer nettement:
  - `Rubber` = rendu des segments/texte.
  - `PointEditor` = rendu/interaction des poignees.
- Partager une meme geometrie via la classe de layout pour eviter des calculs dupliques et des divergences d'alignement.
- Conserver un composant d'edition suffisamment decouple de Rubber pour etre reutilisable ensuite avec la vue Waveform.

## Architecture cible

- Etendre la classe `RubberProportionalLayout` pour exposer un `LayoutSnapshot` cache:
  - segments (texte, duree, largeur),
  - index actif (progress),
  - ancres de poignees par cue (`start/middle/end`) en coordonnees logiques partagees.
- Introduire un composant `TimelinePointEditor` distinct (decouple du contexte Rubber):
  - recoit `LayoutSnapshot`, `events`, `activeEvent`, callbacks `send`.
  - affiche poignees intro/outro + custom (sustain exclu) seulement en mode edition item.
  - drag libre puis snap vers `start/middle/end` du mot le plus proche.
  - si relache hors zone, retour anime vers la zone la plus proche (Anime.js).
  - gere update en reutilisant les payloads existants (`events-update` / `custom-event-update` / `active-set`).
- Conserver `RubberProportionalTest` comme container orchestrateur:
  - lit store + calcule snapshot via la classe,
  - rend la timeline,
  - rend `TimelinePointEditor` conditionnellement.

## Checklist

- [x] Stabiliser le statut permanent des composants (naming/intent): Rubber et Waveform restent accessibles via switch existant.
- [x] Etendre `RubberProportionalLayout` avec un snapshot partageable (segments + ancres intro/outro) et cache des calculs invariants.
- [x] Extraire un composant `TimelinePointEditor` distinct qui consomme le snapshot et pilote les updates des points (`intro`, `outro`, customs).
- [x] Reintegrer la logique des poignees avec drag libre + snap `start/middle/end` + animation de retour.
- [x] Afficher l'editeur de points uniquement quand un item est en edition (garde explicite sur `active.itemId`).
- [x] Verifier que le comportement existant de selection/events reste coherent avec la vue proportional Rubber.

## Verification

- [x] Relecture diff ciblee sur les fichiers Rubber (classe + composants).
- [x] Validation statique: une seule source de verite de positions (snapshot classe), pas de calcul duplique dans les composants.
- [ ] Validation fonctionnelle manuelle:
  - switch Rubber/Waveform operationnel,
  - poignees intro/outro/custom visibles seulement en edition item (sustain absent),
  - drag libre + snap sur `start/middle/end`,
  - relache hors zone ramene la poignee vers le point le plus proche avec animation,
  - updates events conformes aux memes payloads metier que Rubber original.

## Review

- `RubberProportionalLayout` expose maintenant des `snapPoints` (`start/middle/end` par mot) caches et reutilisables par un composant d'edition externe.
- Nouveau composant `TimelinePointEditor` decouple de SceneLogic: il recoit `handles`, `snapPoints`, `containerRef`, `onSelect`, `onCommit`.
- Les poignees incluent `intro`, `outro` et tous les custom events existants (sustain exclu), avec drag libre et snap anime via Anime.js au point le plus proche.
- Les updates conservent les payloads metier existants:
  - `events-update` pour intro/outro (via `makeIntroOutroEventPayload`),
  - `custom-event-update` (`name`, `position`, `delay: null`) pour custom.
- Verification de compilation effectuee avec `npm run typecheck` (OK).
- Validation manuelle UI encore a executer pour confirmer le ressenti drag/snap/animation en situation reelle.
