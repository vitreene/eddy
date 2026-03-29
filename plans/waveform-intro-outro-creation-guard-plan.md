# Waveform Intro/Outro Creation Guard Plan

## Contexte

- Regression: en waveform, la creation intro/outro via interactions directes n'a plus le comportement attendu.
- Comportement voulu:
  - si intro/outro absents: 1er clic cree intro, 2e clic cree outro,
  - si 1ere interaction est un click-drag (avec intro/outro absents): creer intro + outro en une fois,
  - guard: lors de creation/modification de `outro`, si `outro < intro`, swap des valeurs (intro toujours avant outro).
- Extension: appliquer le meme guard sur `Rubber` et couvrir aussi le cas `intro > outro` (swap immediat).

## Checklist

- [x] Ajouter une interaction de fond sur la ligne waveform pour creation intro/outro quand poignees absentes.
- [x] Implementer la logique click vs drag initial (intro seule vs intro+outro).
- [x] Appliquer un guard d'ordre sur update `outro` (swap intro/outro si besoin).
- [x] Conserver les updates de selection (`active-set`) coherentes avec ContentInfos.
- [x] Verifier typecheck.
- [x] Appliquer le meme dispositif de guard d'ordre sur `Rubber`.

## Verification

- [x] Relecture diff sur `app/parts/rubber/waveform-canvas.tsx`.
- [x] Validation statique: guard `intro <= outro` sur creation/modification `outro`.
- [x] Relecture diff sur `app/parts/rubber/rubber.tsx`.
- [x] Validation statique: swap immediat si `intro > outro` apres drag intro/outro.

## Review

- Ajout d'un mode creation par clic fond waveform: 1er clic cree `intro`, clic suivant cree `outro` si absent.
- Ajout d'un mode creation par drag initial (quand intro/outro absents): creation en une passe de `intro` et `outro` entre les deux points.
- Guard applique sur update `outro` et `intro`: toute situation `intro > outro` declenche une inversion immediate des references intro/outro.
- Les selections UI suivent les creations/modifications (`active-set` vers intro/outro) pour synchroniser ContentInfos.
- Typecheck valide (`npm run typecheck`).
- Meme garde-fou porte sur `Rubber` pour retablir la parite de comportement entre les deux vues.

## Reopen - Rubber intro/outro handle availability

### Checklist

- [x] Reouvrir le bug: intro/outro impossibles a creer depuis Rubber quand events absents.
- [x] Corriger la resolution des handles intro/outro pour fallback deterministe sur 1er/dernier cue meme sans event.
- [x] Aligner Rubber sur les events/cues resolves (`generateMissingEvents`) pour couvrir le mode auto-events.
- [x] Considerer les cues techniques auto-generes (`__auto_*`) comme renderables dans Rubber.
- [ ] Verifier manuellement: item auto-events sans intro/outro persistes -> poignees visibles.
- [ ] Verifier manuellement: item texte sans intro/outro -> poignees visibles et creation possible apres drag.
- [x] Activer une trace ciblee Rubber (projection/anchors/binding handles) pour diagnostiquer les cas restants.

### Review

- `resolveCueNameForHandle` ne retourne plus `null` quand `name` est absent pour intro/outro; fallback deterministic sur debut/fin timeline.
- Les poignees intro/outro restent donc editables meme en absence d'events persistes, ce qui restaure la creation depuis Rubber.
- Rubber derive maintenant `cues` et `events` depuis `resolveCueWindows(..., generateMissingEvents: true)`, ce qui couvre explicitement les items en mode auto-events.
- Les cues auto-generes de `resolveCueWindows` (`__auto_*`) sont maintenant rendus comme cues valides, ce qui evite un timeline vide et restaure les ancres de poignees.
