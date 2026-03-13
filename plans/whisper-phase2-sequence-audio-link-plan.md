# Plan d'action — Phase 2 Liaison sequence <-> son

## Objectif

Permettre d'associer explicitement un son (parmi plusieurs contenus audio) a une sequence cible, puis d'utiliser les cues de ce son pour la sequence concernee de facon deterministe.

## Perimetre

- Inclus
  - Contrat de liaison sequence/son dans le modele applicatif.
  - API de lecture/ecriture de cette liaison.
  - UX minimale de selection du son pour une sequence (sans finaliser encore la zone complete item-edit de phase UI avancee).
  - Rechargement runtime pour que Rubber/event-edit lisent les bons cues.
- Exclu (phases suivantes)
  - Migration structurelle de `scene_events` vers content.
  - Fallback waveform si pas de voix.
  - Finalisation UX complete des parametres de sequence dans item-edit.

## Contraintes/decisions proposees

- Source de verite: une liaison explicite par sequence vers un `contentId` de type `sound`.
- Lecture cues: via `scene_content.events` du couple (scene, contentId) associe a la sequence.
- Compatibilite: fallback temporaire sur comportement phase 1 si liaison absente.

## Plan detaille

- [ ] **1. Definir le contrat de liaison sequence/son**
  - Identifier l'entite sequence cible (item/capsule/scene selon architecture actuelle).
  - Definir le champ de liaison (ex: `linkedSoundContentId`) et sa portee.
  - Ecrire regles de validation: content existe, type `sound`, meme scene.

- [ ] **2. Etendre le modele de donnees et la couche DB**
  - Ajouter stockage persistant de la liaison (schema + migration si necessaire).
  - Exposer helpers DB pour set/unset/get de la liaison.
  - Conserver retrocompatibilite pour sequences non configurees.

- [ ] **3. Ajouter endpoint API de liaison**
  - Creer endpoint dedie (set/unset liaison).
  - Verifier payload et retourner objet normalise.
  - Gerer erreurs metier (son invalide, sequence introuvable, conflit).

- [ ] **4. Brancher scene-logic**
  - Ajouter event machine pour mise a jour locale de la liaison.
  - Persister via API et synchroniser contexte.
  - Forcer `sequence-flush` pour propager immediatement les cues associes.

- [ ] **5. UX minimale de selection**
  - Ajouter un select simple sur la sequence active listant les contenus `sound` disponibles.
  - Afficher etat courant (son lie / aucun son).
  - Supporter desassociation explicite.

- [ ] **6. Resolution cues ciblees dans Rubber/event-edit**
  - Faire lire les cues de la source audio liee a la sequence (et non un fallback global ambigu).
  - Garantir coherence entre affichage Rubber et mapping event-edit.
  - Ajouter fallback controle si liaison absente.

- [ ] **7. Verification de bout en bout**
  - Cas 1: deux sons importes, sequence A liee a son 1, sequence B liee a son 2.
  - Cas 2: changement de son lie -> cues visibles mises a jour.
  - Cas 3: deliaison -> fallback defini et stable.
  - Cas 4: persistance apres reload scene.

## Risques et garde-fous

- Ambiguite sur la definition exacte de "sequence" dans le modele actuel.
- Risque de mismatch cues si plusieurs `scene_content` coexistent sans cle explicite.
- Impact potentiel sur logique existante `sceneId match else first sceneContent` a supprimer progressivement.

## Definition de fini

- L'utilisateur peut choisir explicitement un son pour une sequence.
- La liaison est persistee et retrouvee apres reload.
- Rubber/event-edit affichent les cues du son lie a la sequence cible.
- Les cas sans liaison restent fonctionnels avec fallback controle.

## Review (a completer apres implementation)

- Resultat:
- Tests/commandes executes:
- Limites connues:
- Suites recommandees:
