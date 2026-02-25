# Chutier - plan de realisation

## 0) Cadrage et structure

- [ ] Creer le composant `Chutier` dans `app/parts` (ex: `app/parts/chutier/index.tsx`).
- [ ] Integrer `Chutier` dans la page Home (`app/routes/home.tsx`) sans casser l'existant.
- [ ] Definir un contrat de donnees minimal pour la vue: `id`, `name`, `type`, `path`, `createdAt` (si disponible).

## 1) Upload de fichiers avec Dropzone (MVP)

- [ ] Installer/ajouter le composant Dropzone shadcn si absent dans le projet.
- [ ] Configurer les types acceptes (images, audio, video) et les limites (`maxSize`, `maxFiles`).
- [ ] Ajouter un endpoint serveur `POST` pour recevoir les fichiers uploades.
- [ ] Enregistrer les fichiers dans `public/assets`.
- [ ] Generer un nom unique pour chaque fichier (uuid/horodatage + extension d'origine).
- [ ] Conserver le nom original du fichier pour l'etape DB (`originalname`).
- [ ] Retourner une reponse claire par fichier (success/error, `path`, `mime`, `originalname`).
- [ ] Gerer les erreurs Dropzone/serveur et afficher un feedback utilisateur.

## 2) Creation d'un `content` en base apres upload reussi

- [ ] Determiner le `type` metier a partir du MIME avec ce mapping: image -> `img`, audio -> `sound`, video -> `video`.
- [ ] Ajouter la logique DB pour creer un `content` avec `type`, `path`, `name`.
- [ ] Ne creer un `content` que si l'ecriture fichier est reussie.
- [ ] Definir le format de `path` stocke (ex: `assets/<fichier-unique.ext>`).
- [ ] Gerer le rollback minimal en cas d'echec DB apres ecriture disque (suppression du fichier orphelin ou log explicite).

## 3) Affichage des `content` dans `Chutier`

- [ ] Informer `scene-logic` lors de la creation d'un `content` et ajouter ce nouveau `content` dans `context.contents`.
- [ ] Utiliser `context.contents` comme source de verite pour alimenter la liste des fichiers du `Chutier`.
- [ ] Ajouter un endpoint/loaders pour recuperer la liste des `content`.
- [ ] Afficher la liste dans `Chutier` groupee par type: image, son, video.
- [ ] Afficher au minimum `name` + `path` (ou preview selon type si simple).
- [ ] Ajouter les etats UI: chargement, vide, erreur.
- [ ] Rafraichir la liste apres upload reussi (revalidation loader ou MAJ locale).

## 4) Evolution schema: colonne `name` dans `content`

- [ ] Mettre a jour le schema Prisma: ajouter `name` a la table/model `content`.
- [ ] Definir `name` obligatoire avec valeur par defaut logique (nom original) au moment de la creation.
- [ ] Generer et appliquer la migration DB sur `dev.db`.
- [ ] Regenerer le client Prisma.
- [ ] Mettre a jour les types/DTO/calls DB impactes par la nouvelle colonne.

## 5) Validation finale

- [ ] Tester upload image/audio/video de bout en bout (drop -> fichier ecrit -> DB creee -> liste visible).
- [ ] Verifier l'unicite des noms physiques dans `public/assets`.
- [ ] Verifier que `name` correspond bien au nom original du fichier en base.
- [ ] Verifier les cas d'erreur (type refuse, taille depassee, echec ecriture, echec DB).
- [ ] Faire une passe de nettoyage: messages utilisateur, logs utiles, code mort.
