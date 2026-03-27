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
