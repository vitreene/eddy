# Plan: Simplification du système Move dans Player

## Statut: TERMINÉ

## Contexte

Le système move existe pour palier l'absence de transitions fluides sur les changements de grille CSS.

**Processus actuel (après simplification):**

1. Mesurer position AVANT changement (before)
2. Appliquer changement de classe CSS
3. Mesurer position APRÈS (after)
4. Créer animation qui compense le décalage
5. Nettoyer les propriétés inline dans `onComplete` de l'animation

## Changements effectués

### 1. Suppression du système de queue

- Supprimé `FrameQueueController` et `createFrameQueue`
- Supprimé la méthode `enqueueMoveTransition`
- Supprimé l'initialisation et le dispose du `moveQueue`
- Retour à un appel direct dans `_moveChange`

### 2. Nettoyage des propriétés

- Le nettoyage des propriétés inline (`width`, `height`, `transform`) se fait maintenant dans le callback `onComplete` de l'animation
- Cela permet à chaque transition de se terminer proprement

### 3. Unification seek/lecture

- Même code exécuté pour les deux cas
- Aucune condition spéciale

### 4. Nettoyage des logs de debug

- Tous les logs de debug ont été supprimés
