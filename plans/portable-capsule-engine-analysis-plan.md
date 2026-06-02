# Plan - Portable capsule engine analysis

- [x] Cartographier l'existant runtime/editor lie aux capsules.
- [x] Identifier les responsabilites a extraire dans un noyau portable.
- [x] Formaliser un contrat d'entree/sortie minimal pour une API TypeScript.
- [x] Proposer une forme d'API permettant edition et recalcul programmatiques.
- [x] Documenter les risques de couplage et la strategie d'extraction.

## Cartographie utile

- `app/config/capsule-types.ts`
  - registre declaratif des types de capsule
  - defaults de layout, timing et transitions
- `app/scene-runtime/visibility/capsule-behavior.ts`
  - derive le comportement temporel par capsule (`distributed` / `fixed`, `fixedSeconds`, outro auto)
- `app/scene-runtime/visibility/resolve-cue-windows.ts`
  - coeur de repartition temporelle des enfants
  - respecte les locks intro/outro explicites
  - genere des cues/events synthetiques si necessaire
- `app/scene-runtime/capsule-layout/layout-css.ts`
  - genere classes de placement auto et definitions CSS associees
- `app/player/builder/styles.ts`
  - compose les classes finales d'un item/capsule et les deltas de classes pendant les events
- `app/player/builder/entities.ts`
  - projette le calcul dans les renderables runtime

## Conclusion d'architecture

- Le bon candidat portable n'est pas une classe unique qui fait UI + runtime + rendu.
- Le noyau portable doit etre un moteur metier pur, sans React, sans DB, sans shape `SceneComp` complet.
- La projection vers l'editeur et vers le builder doit rester dans des adaptateurs minces.

## Contrat portable propose

### Entree

- `capsule`
  - `id`
  - `type`
  - `window: { startMs, endMs }`
  - `params` typés selon le type (`timeMode`, `fixedDurationMs`, `grid`, `orientation`, etc.)
  - `defaults` (`introTransition`, `outroTransition`, `generateDefaultOutro`)
- `children[]`
  - `id`
  - `order`
  - `visible`
  - `placement?:` explicite
  - `events?:` intro/outro/custom explicites
  - `constraints?:` duree mini/maxi, placement force, verrou temporel, verrou de classe
- `typeRegistry`
  - regles declaratives par type de capsule
- `namingPolicy`
  - generation des tokens CSS et des noms d'events/cues

### Sortie

- `children[]` resolves
  - `window: { startMs, endMs }`
  - `classes: { static: string[], event: string[], effective: string[] }`
  - `placement` resolu
  - `events` resolves ou generes
- `artifacts`
  - `cssRules: string[]`
  - `cueDefinitions: ...`
  - `eventPatches: ...`
- `diagnostics`
  - warnings sur collisions, fenetres degeneres, contraintes incompatibles

## API candidate

```ts
type CapsuleAutomationEngine = {
	resolve(input: CapsuleAutomationInput): CapsuleAutomationResult;
	updateCapsule(patch: Partial<CapsuleDefinition>): CapsuleAutomationResult;
	updateChild(childId: string | number, patch: Partial<ChildDefinition>): CapsuleAutomationResult;
	setChildEvent(childId: string | number, action: EventAction, event: ChildEvent | null): CapsuleAutomationResult;
	setChildConstraint(childId: string | number, patch: Partial<ChildConstraints>): CapsuleAutomationResult;
	reorderChildren(childIdsInOrder: Array<string | number>): CapsuleAutomationResult;
	getState(): CapsuleAutomationState;
	getDiff(): CapsuleAutomationDiff;
	toJSON(): CapsuleAutomationState;
};
```

## Regles de conception

- Une seule source de verite interne: etat structure, pas classes concatenees persistées.
- Les classes CSS doivent etre un artefact derive, jamais la donnee metier principale.
- Les evenements explicites priment toujours sur les valeurs auto.
- Les contraintes individuelles doivent etre modelisees comme des verrous ou bornes, pas comme des exceptions implicites.
- Le moteur doit exposer le detail du calcul pour que l'editeur puisse expliquer pourquoi un item commence/termine a tel instant.

## Strategie d'extraction

1. Extraire d'abord les types et algorithmes purs de `capsule-types`, `capsule-behavior`, `resolve-cue-windows`, `layout-css`.
2. Introduire un schema portable plus petit que `SceneComp`.
3. Creer un adaptateur `fromSceneComp` pour l'editeur/builder existants.
4. Garder `entities.ts` et le rendu player hors du package portable.

## Review

- Le coeur existant montre deja que le probleme se separe naturellement en trois etages: policy, resolution, projection.
- Si on saute directement a une grosse classe imperative, on va recréer le couplage actuel sous une autre forme.
- L'API doit donc rester orientee calcul + patchs + artefacts, avec edition programmatique par petites operations.
