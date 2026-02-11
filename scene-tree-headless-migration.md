# Migration Scene Tree vers Headless Tree

## 0) Cadrage

- [x] Remplacer `SceneTreeView` par une implementation Headless Tree (sans conserver le composant tree custom actuel).
- [x] Viser une UI compacte (densite elevee, lignes plus courtes, moins d'espaces).
- [x] Ignorer le style visuel actuel (ne pas reproduire la charte amber existante).

## 1) Structure des fichiers

- [x] Creer le dossier `app/parts/scene-tree/`.
- [x] Creer `app/parts/scene-tree/index.tsx` avec le composant React principal uniquement.
- [x] Extraire les fonctions secondaires dans des fichiers dedies dans `app/parts/scene-tree/` (ex: mapping data, rendu item, actions DnD, utilitaires).
- [x] Mettre a jour les imports pour consommer `@/parts/scene-tree` depuis la page/les parties qui utilisent l'arbre.

## 2) Base Headless Tree

- [x] Installer et configurer `@headless-tree/core` + `@headless-tree/react`.
- [x] Mettre en place `useTree` avec `syncDataLoaderFeature`.
- [x] Ajouter les features necessaires pour selection + drag-and-drop (+ hotkeys si utile).
- [x] Fournir `rootItemId`, `getItemName`, `isItemFolder`, `dataLoader.getItem`, `dataLoader.getChildren`.

## 3) Mapping metier Scene -> Tree

- [x] Construire un modele de donnees stable (ids string uniques) depuis `scene-logic`.
- [x] Distinguer les types de noeuds: capsule / item.
- [x] Rendre les capsules avec une icone dossier.
- [x] Remplacer la preview media par des icones uniquement (pas de miniature/image/video inline).
- [ ] Utiliser `name` ou `inner` comme libelle d'affichage (meme logique que le Chutier):
  - [x] pour `text`, prioriser `inner`
  - [x] pour les autres types, utiliser `name`
- [ ] Definir un fallback de nom generique si vide, avec compteur par type (ex: `capsule-01`, `image-02`, `son-03`, `video-04`, `texte-05`, `autre-06`).

## 4) Rendu UI compact

- [x] Definir une ligne compacte pour chaque noeud (hauteur reduite, texte tronque, icone, actions).
- [x] Ajouter etat visuel minimal: focus, selection, drag-over, expand/collapse.
- [x] Eviter toute logique de style lourde dans `index.tsx` (factoriser dans helper/style local si necessaire).

## 5) Interactions sans interference

- [x] Separer clairement les zones d'interaction:
  - [x] zone expansion/repli (ouvrir/fermer capsule)
  - [x] zone drag handle (deplacement)
  - [x] zone selection primaire
- [x] S'assurer que cliquer pour expand/collapse ne declenche pas un drag involontaire.
- [x] S'assurer que drag-and-drop ne declenche pas l'action d'expansion/selection par erreur.
- [x] Verifier les evenements clavier (entree/espace/fleches) pour ne pas melanger les actions.

## 6) Actions metier

- [x] Conserver la selection qui met a jour `scene-logic` (`active-set` / `commit` selon flux existant).
- [x] Conserver le deplacement via `tree-move-item` avec mapping source/target correct.
- [x] Ajouter en fin de ligne une action "supprimer" pour les elements (bouton explicite).
- [x] Definir les regles de suppression (quels types supprimables, confirmations, cas bloques).

## 7) Validation

- [ ] Tester ouverture/fermeture capsules + deplacement + selection sans conflit.
- [ ] Tester le rendu des icones pour tous les types (`img`, `sound`, `video`, `text`, `capsule`, autres).
- [ ] Tester performances sur scene avec beaucoup de noeuds.
- [ ] Verifier accessibilite basique (roles/props HT, navigation clavier).

## 8) Bascule finale

- [x] Remplacer l'ancien composant dans le flux principal.
- [x] Supprimer ou deprecie `app/components/ui/tree-view.tsx` si non utilise.
- [x] Faire un nettoyage final (logs, code mort, imports inutiles).

## Notes techniques (scene-logic)

- Les actions tree passent par `scene-logic` via `tree-create-text`, `tree-create-capsule`, `tree-create-from-content`, `tree-delete-item`, `tree-delete-capsule`.
- Les mutations DB sont centralisees sur `/api/tree` puis appliquees localement avec `applyTreeMutation` pour garder `items`, `capsules`, `contents`, `decors`, `events` synchronises.
