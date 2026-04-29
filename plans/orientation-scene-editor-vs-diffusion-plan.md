# Plan — Orientation: separer preview editeur et diffusion player

## Objectif

Introduire l'orientation portrait/paysage avec une separation stricte:

- **Editeur**: bouton de bascule pour simuler l'orientation et tester les sequences.
- **Diffusion**: code produit par le builder pour execution hors editeur (device reel), sans dependance au toggle editeur.

Le systeme doit rester **non-invasif**:

- tant qu'un decor n'a qu'une seule position, comportement courant;
- dual-context active seulement a la demande (creation de 2e position);
- pas de melange entre contextes dans l'editeur visuel.

## Decisions validees

- Orientation preview editeur par defaut: **`landscape`** (UI label: paysage), definie en config.
- Toggle orientation: **visible uniquement en edition**, positionne a droite de la telecommande.
- Toggle orientation: **persist localement** (preference utilisateur).
- Preview orientation: **change aussi le ratio visuel** (`landscape` vs `portrait`).
- Diffusion: rendue par le player hors editeur via **orientation device reelle** (`@media (orientation: ...)`).
- Portee dual-context: **decor item + decor event** (meme logique).
- Activation dual-context (lazy): au **1er commit** dans l'orientation opposee.
- Seed 2e contexte: copie du contexte existant, sauf debordement total hors grille.
- Debordement total hors grille: fallback sur **zone par defaut** (1ere zone par id).
- Si aucune zone: **creation auto de zone** puis usage immediat.
- Variante incomplete: **fallback classique**.
- Retour mode simple: action dediee, retour orientation par defaut config + suppression variante opposee.
- Nommage technique: **`portrait` / `landscape`**.

## Decision d'architecture (recommandee)

### 1) Zones nommees: classe unique + definitions orientees

- Conserver une seule classe semantique par zone: `ed-zone-hero`.
- `decor.className` conserve ce token unique (pas de suffixes orientation).

### 2) Source de verite zones: capsule profil

- Les variantes orientation des zones sont stockees dans la definition de zone capsule (profil), pas dans le decor.
- Mode classique: definition unique.
- Mode oriente: deux definitions (`portrait`, `landscape`) pour la meme zone.
- Si paire incomplete: fallback classique.

### 3) Builder diffusion-first

- Le builder genere la feuille CSS de diffusion avec `@media`:
  - `@media (orientation: portrait) { .ed-zone-hero{...} }`
  - `@media (orientation: landscape) { .ed-zone-hero{...} }`
- Si zone non orientee: regle simple `.ed-zone-hero{...}`.

### 4) Simulation editeur sans polluer la diffusion

- En mode editeur, ajouter une surcouche CSS preview (non export diffusion):
  - `.ed-preview-orientation--portrait ...`
  - `.ed-preview-orientation--landscape ...`
- Cette surcouche permet de tester sur desktop sans dependre de l'orientation reelle du device.
- Le toggle editeur met a jour un etat UI local (preference), valeur initiale config = `landscape`.
- La diffusion ne depend pas de cet etat UI.

### 5) Contrat editeur visuel de position (anti-melange)

- Le visual editor lit/ecrit **uniquement** la variante du contexte actif (`portrait` ou `landscape`).
- Aucun commit de drag/resize ne doit ecrire simultanement dans les deux variantes.
- Le changement de contexte ne modifie pas la variante inactive.
- En mode simple, comportement courant inchange.

### 6) Cell/span hors zones

- Tu demandes aussi le dual-context pour `cell-r*` / `cell-span*`.
- Le stockage doit rester en `className` (pas `style`).
- Strategie retenue: introduire un **encodage inline unique** pour porter les deux variantes dans la meme donnee decor.
- Le format exact sera defini dans l'implementation spec (parser + serializer + tests) en garantissant:
  - lecture/edition strictement par contexte actif,
  - absence de melange,
  - fallback classique si donnee incomplete.

## Pourquoi c'est la meilleure strategie

- Evite les collisions de tokens de placement sur `decor.className`.
- Garde la semantique stable: un nom de zone = une intention metier.
- Respecte la contrainte produit: editeur = simulation, diffusion = rendu runtime reel.
- Minimise les regressions sur le pipeline slot existant (`cell-*`, `ed-zone-*`).

## Alternatives (et pourquoi moins bonnes)

1. **Prefix classes par orientation dans les decors** (`ed-portrait-*`/`ed-paysage-*`)
   - Plus fragile (classes concurrentes), complexifie normalisation et resolution.

2. **Tout piloter par classe scene manuelle uniquement**
   - Bon pour preview, mais insuffisant seul pour diffusion device-native.

## Strategie de mise en oeuvre

- [x] Ajouter config orientation preview (`landscape`) + persistance locale.
- [x] Ajouter le bouton orientation a droite de la telecommande (edition only) + ratio dynamique preview.
- [x] Etendre zones capsule pour variantes orientation (`portrait`/`landscape`) + compat mode simple.
- [x] Implementer activation lazy dual-context au 1er commit orientation opposee.
- [ ] Implementer fallback debordement total -> zone par defaut (1ere id), ou creation auto zone si none.
- [x] Etendre builder CSS zones en `@media` pour diffusion.
- [x] Definir et implementer l'encodage inline unique className pour dual-context `cell/span`.
- [x] Brancher editor position/slot pour lecture/ecriture contextuelle stricte (item + event decors).
- [x] Ajouter action "retour mode simple" (retour orientation defaut config + suppression variante opposee).

## Verrous de non-regression

- [ ] Orientation preview initiale = `landscape` (config) et persist locale.
- [ ] Bouton orientation visible uniquement en edition, positionne a droite de la telecommande.
- [ ] Zone simple non orientee: rendu identique.
- [x] Zone orientee complete: switch preview OK + `@media` diffusion OK.
- [ ] Cell/span dual-context: lecture/ecriture par contexte sans melange.
- [ ] Debordement total: fallback default zone (ou auto-zone) applique correctement.
- [x] Variante incomplete: fallback classique.
- [ ] Retour mode simple: suppression variante opposee + retour orientation config.

## Definition de fini

- Toggle orientation editeur fonctionnel (default `landscape`, persiste localement, edition only).
- Simulation preview fiable (ratio + position) sans pollution du runtime diffusion.
- Builder diffusion genere `@media` pour zones orientees.
- Dual-context active uniquement a la demande, sans regression du mode simple.
- Visual editor ne melange jamais portrait/landscape.

## Review (2026-04-29)

- Toggle orientation player rendu purement UI preview (plus de mutation scene/capsule depuis la telecommande).
- Builder runtime etendu pour appliquer la grille root orientee via `capsule.profil.orientationGrid`:
  - preview editeur: `.ed-preview-orientation--portrait|landscape .root-scene`
  - diffusion runtime: `@media (orientation: portrait|landscape)`.
- Fallback classique conserve quand `orientationGrid` est incomplet (pas de surcouche orientation injectee).
- Tests verifies:
  - `npm run typecheck`
  - `npm run test:regression-lock`
  - `npx tsx tests/builder-capsule-smoke.ts`

## Review (2026-04-29, correction utilisateur)

- Restauration du fallback auto col/row pour la scene root quand une orientation n'est pas personnalisee.
- Ajout d'une resolution centralisee:
  - `resolveSceneGridForOrientation` (fallback explicite -> opposee swappee -> base/default swappee),
  - `resolveSceneGridPairWithFallback` pour produire portrait+landscape en diffusion.
- Branchements:
  - `scene-edit`: lecture `effectiveMainGrid` via fallback auto,
  - `layout-css`: generation root preview + `@media` via paire resolue (inclut variantes incompletes).
- Tests ajoutes/mis a jour:
  - `tests/orientation-grid-fallback-smoke.ts`,
  - `tests/root-orientation-grid-smoke.ts`,
  - `tests/builder-capsule-smoke.ts` (cas variante incomplete -> derivee).
