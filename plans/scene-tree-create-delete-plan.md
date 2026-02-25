# Scene Tree - plan d'action creation/suppression

## Etape 1 - Contrat d'evenements scene-logic

- [x] Definir les nouveaux evenements dans `scene-logic` pour couvrir: creation capsule, creation item, creation item depuis media, suppression item.
- [x] Definir les payloads minimaux (source de creation, cible, position, contentId eventuel).
- [x] Garantir que toutes les operations ecrivent en base via les services existants (`/api/item`, `/api/content`, `/api/capsule`) et mettent a jour le contexte local.
- [x] Definir les transitions de selection active apres creation/suppression (quel item/capsule devient actif).

## Etape 2 - Barre d'actions au-dessus du tree

- [x] Ajouter une action bar au-dessus du composant tree (dans `app/parts/scene-tree/index.tsx`).
- [x] Ajouter un bouton `Ajouter capsule`.
- [x] Ajouter un bouton `Ajouter texte`.
- [x] Desactiver intelligemment les boutons si aucun contexte de destination valide n'est disponible.

## Etape 3 - Regles de creation manuelle (boutons Ajouter)

- [x] Implementer la creation de capsule et la creation de texte via `scene-logic` (pas d'appel direct UI -> DB), avec les memes regles de placement:
  - [x] si une capsule est selectionnee -> creer l'element dans cette capsule.
  - [x] si un element est selectionne -> creer le nouvel element (capsule ou texte) juste apres lui (meme capsule, ordre suivant).
  - [x] si aucun element n'est selectionne -> ajouter le nouvel element dans `element-root`, en fin de liste.
- [x] Limiter la creation manuelle depuis la barre d'action a `text` (bouton texte) et a la creation de `capsule` (bouton capsule).
- [x] Lors de creation manuelle, initialiser le content avec un type explicite (`text` pour le bouton texte, `capsule` pour le bouton capsule) et des valeurs par defaut coherentes.
- [x] Ne pas permettre la creation manuelle des autres types (img/sound/video/lottie/rive/three3D), reserves au drag-drop depuis le Chutier.

## Etape 4 - Edition post-creation (preparation)

- [x] Definir le comportement apres creation d'element: selectionner automatiquement le nouvel item pour ouvrir la zone d'edition.
- [x] Preparer les donnees pour le futur selecteur de type de contenu dans la zone d'edition, borne pour l'instant a `text` et `capsule` (implementation UI reportee).
- [x] Verifier que `active-set`/`commit` sont correctement emis apres creation.

## Etape 5 - Creation d'element par drag-drop depuis Chutier

- [x] Definir un format de drag payload depuis Chutier (au minimum `contentId`, `type`, `name`).
- [x] Activer la reception de drag externe dans le tree Headless Tree.
- [x] Mapper le drop externe vers une creation d'item via `scene-logic` (content du nouvel item = media depose).
- [x] Respecter les memes regles de destination/position que la creation manuelle (capsule cible ou insertion apres item cible selon drop).
- [x] Gerer les cas invalides (drop hors cible valide, payload incomplet) avec feedback utilisateur.

## Etape 6 - Suppression d'un item depuis le tree

- [x] Ajouter un bouton `Supprimer` a droite de la ligne item, visible uniquement quand l'item est selectionne.
- [x] Ajouter aussi la suppression d'une capsule selectionnee depuis le tree.
- [x] Au clic, declencher une action `scene-logic` de suppression d'item (pas d'appel direct UI -> DB).
- [x] Supprimer uniquement l'item (et ses references de capsule/order), sans supprimer le media/content associe.
- [x] Pour la suppression capsule: supprimer la branche capsule (items/events/decors et contenus text/capsule), sans supprimer les medias (img/sound/video/lottie/rive/three3D).
- [x] Recalculer l'ordre localement et/ou via endpoint de reorder si necessaire.

## Etape 7 - Persistance et coherence base/contexte

- [x] Verifier que chaque creation/suppression est persistante en base et refletee dans `context.items`/`context.capsules`/`context.contents`.
- [x] Verifier l'absence d'orphelins fonctionnels dans les `itemIds` de capsules apres suppression.
- [x] Verifier que la vue tree se reconstruit correctement (Headless Tree rebuild) apres mutation.

## Etape 8 - Validation fonctionnelle

- [x] Creer capsule via bouton puis verifier apparition immediate dans tree.
- [x] Creer element dans capsule selectionnee puis verifier placement.
- [x] Creer element apres element selectionne puis verifier ordre.
- [x] Sans selection, creer un element puis verifier qu'il est ajoute dans `element-root` en fin de liste.
- [x] Drag-drop d'un media depuis Chutier vers tree puis verifier nouvel item et liaison `contentId`.
- [x] Supprimer un item depuis le bouton contextuel puis verifier que le media reste present dans Chutier.
- [x] Verifier la selection active et l'ouverture de l'edition apres chaque action.

## Etape 9 - Nettoyage

- [x] Retirer logs de debug temporaires.
- [x] Ajouter un court commentaire technique dans la doc de migration pour les nouvelles actions `scene-logic`.
- [x] Mettre a jour la checklist globale de migration avec les cases completees.
