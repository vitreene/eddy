# Proposition d'architecture - CSSClassGenerator (v1)

## Cadre v1 valide

- Moteur unique: `CSSClassGenerator`.
- Pas de `profileId` pour l'instant.
- Prefixe global hors config (constante projet), par exemple `ITEM_DEFAULT_PREFIX`.
- Les definitions CSS sont calculees a partir de `input` uniquement.
- Les regles `@media` sont gerees globalement par le generateur (pas codees a la main dans chaque definition).
- V1 simple: pas de hash, pas de mecanisme avance.

## API v1

### Types

- `ClassSemanticKind`
  - `grid.container`
  - `grid.area`
  - `grid.span`
  - `grid.zone` (nouveau, ex: `zone-a`)

- `ClassRequest<TKind, TInput>`
  - `kind`
  - `input`

- `ClassArtifact`
  - `token: string`
  - `definition?: string`
  - `kind: ClassSemanticKind`

### Fonctions

- `createCSSClassGenerator(config)`
- `generator.generate(request): ClassArtifact`
- `generator.generateMany(requests): ClassArtifact[]`
- `generator.parse(token): ParsedClass | null`
- `generator.renderStyleSheet(): string`

## Prefixe global (hors config)

- Le prefixe est defini dans une constante globale du projet.
- Le generateur applique ce prefixe selon la regle du `kind`.
- Compatibilite existante: en v1, `grid.area` et `grid.span` restent au format actuel non prefixe (`cell-*`, `liste-*`) pour ne pas casser l'existant.

## Source des donnees (persist)

- Les donnees metier utilisees pour la generation de classes de position vivent dans `decor.style.itemPosition`.
- Les classes/definitions generees ne sont pas persistees en BDD.
- `itemPosition` est un nom applicatif (on evite `position`, mot reserve CSS).

## Exemples strictement issus de l'existant

- `buildEditorGridClassName(3, 2)` -> `ed-grid-w3-h2`
- `classNameToCssDefinition("cell-r2-c1")` -> `.cell-r2-c1{grid-row:2 / span 1;grid-column:1 / span 1;}`
- `gridPlacementClassNameToCssDefinition("cell-span-r2-c3-rs1-cs2")` -> `.cell-span-r2-c3-rs1-cs2{grid-row:2 / span 1;grid-column:3 / span 2;}`
- `gridPlacementClassNameToCssDefinition("cell-span-fill")` -> `.cell-span-fill{grid-row:1 / -1;grid-column:1 / -1;}`

## Nouveau cas cible: zone semantique + orientation

- Entree: `kind: "grid.zone"`, `input: { zone: "zone-a" }`.
- Le token ne porte pas la position.
- La definition est produite depuis les donnees `input`.
- Si le mode orientation global est actif ET que des valeurs orientation sont presentes dans `input`,
  les declarations vont dans des buckets `@media` partages.

Donc, la position peut vivre uniquement dans les regles CSS orientees.

## State interne et factorisation `@media`

`CSSClassGenerator` conserve un state interne:

- `baseRules: Map<string, string>` (token -> declarations)
- `mediaRules: Map<string, Map<string, string>>` (mediaQuery -> token -> declarations)

Flux:

1. `generate({ kind, input })` calcule `token` + declarations.
2. Si orientation globale active et input orientation present:
   - enregistre dans `mediaRules` sous les queries configurees (`portrait`/`landscape`).
3. Sinon:
   - enregistre dans `baseRules`.
4. Dedup automatique par cle (`token` + media).
5. `renderStyleSheet()` emet:
   - d'abord les classes de base,
   - puis un bloc par `@media` (une seule fois par query) contenant toutes les classes concernees.

Cela evite de repeter `@media (...) { ... }` dans chaque regle.

## Configuration v1 (simple)

```ts
type CSSClassGeneratorConfig = {
	naming: {
		"grid.container": (input: { w: number; h: number }) => string;
		"grid.area": (input: { row: number; col: number }) => string;
		"grid.span": (input: { row: number; col: number; rowSpan: number; colSpan: number }) => string;
		"grid.zone": (input: { zone: string }) => string;
	};
	definitions: {
		"grid.container": (args: { token: string; input: { w: number; h: number } }) => string;
		"grid.area": (args: { token: string; input: { row: number; col: number } }) => string;
		"grid.span": (args: {
			token: string;
			input: { row: number; col: number; rowSpan: number; colSpan: number };
		}) => string;
		"grid.zone": (args: { token: string; input: { zone: string } }) => string;
	};
	orientation?: {
		enabled: boolean;
		portraitQuery: string;
		landscapeQuery: string;
	};
	prefixPolicy?: {
		"grid.container"?: "global" | "none";
		"grid.area"?: "global" | "none";
		"grid.span"?: "global" | "none";
		"grid.zone"?: "global" | "none";
	};
};
```

Exemple concret de config alignee sur l'existant:

```ts
const config = {
	naming: {
		"grid.container": ({ w, h }) => `grid-w${w}-h${h}`,
		"grid.area": ({ row, col }) => `cell-r${row}-c${col}`,
		"grid.span": ({ row, col, rowSpan, colSpan }) => `cell-span-r${row}-c${col}-rs${rowSpan}-cs${colSpan}`,
		"grid.zone": ({ zone }) => zone
	},
	definitions: {
		"grid.container": ({ token, input }) => {
			const { w, h } = input;
			return `.${token}{display:grid;${w > 1 ? `grid-template-columns:repeat(${w}, minmax(0, 1fr));` : ""}${h > 1 ? `grid-template-rows:repeat(${h}, minmax(0, 1fr));` : ""}}`;
		},
		"grid.area": ({ token, input }) =>
			`.${token}{grid-row:${input.row} / span 1;grid-column:${input.col} / span 1;}`,
		"grid.span": ({ token, input }) =>
			`.${token}{grid-row:${input.row} / span ${input.rowSpan};grid-column:${input.col} / span ${input.colSpan};}`,
		"grid.zone": ({ token }) => `.${token}{}`
	},
	orientation: {
		enabled: true,
		portraitQuery: "(orientation: portrait)",
		landscapeQuery: "(orientation: landscape)"
	},
	prefixPolicy: {
		"grid.container": "global",
		"grid.area": "none",
		"grid.span": "none",
		"grid.zone": "global"
	}
} as const;
```

Comportement attendu avec prefixe global `ed`:

- `grid.container` + `{w:3,h:2}` -> token `ed-grid-w3-h2`
- `grid.area` + `{row:2,col:1}` -> token `cell-r2-c1`
- `grid.span` + `{row:2,col:3,rowSpan:1,colSpan:2}` -> token `cell-span-r2-c3-rs1-cs2`
- `grid.zone` + `{zone:"zone-a"}` -> token `ed-zone-a` + definition `@media` selon `context`
- `grid.zone` + `{zone:"zone-a"}` -> token `ed-zone-a` + definitions `@media` selon les donnees orientees de `input`

## Mapping direct depuis l'existant

- `buildEditorGridClassName` -> `generate({ kind: "grid.container", input: { w, h } }).token`
- `classNameToCssDefinition` -> `generate({ kind: "grid.area", input: { row, col } }).definition`
- `gridPlacementClassNameToCssDefinition` -> `generate({ kind: "grid.span", input: { row, col, rowSpan, colSpan } }).definition`
- `gridClassNameToCssDefinition` -> `generate({ kind: "grid.container", input }).definition`

## Migration v1

1. Introduire `CSSClassGenerator` et brancher les wrappers sans changer les signatures publiques.
2. Migrer les usages `grid.container`, `grid.area`, `grid.span`.
3. Ajouter `grid.zone` et routing `@media` global par state interne (base/media buckets).
4. Stabiliser par tests golden entree -> token + definition.
