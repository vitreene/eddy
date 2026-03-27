# Rubber Gap Snap Preference Plan

## Contexte

- Nuance demandee sur le snap des poignees dans les trous entre mots.
- Si la poignee `intro` est relachee entre le `end` d'un mot et le `start` du suivant, preferer `start`.
- Pour `outro`, comportement inverse: preferer `end`.
- Objectif UX: eviter les situations ou la poignee est placee au bord d'un mot non reellement dans la selection percue.

## Checklist

- [x] Ajouter une logique de detection de gap inter-mots au moment du resolve de snap.
- [x] Appliquer la preference conditionnelle `intro -> start` et `outro -> end` uniquement en cas de gap detecte.
- [x] Conserver le fallback existant (nearest anchor + biais middle) hors cas gap.
- [x] Valider typecheck.

## Verification

- [x] Relecture diff sur `app/parts/rubber/timeline-point-editor.tsx`.
- [x] Validation statique: comportement intro/outro preferentiel uniquement entre deux mots.

## Review

- Le resolve de snap tente d'abord une detection de gap inter-mots sur la meme ligne visuelle (tolerance Y).
- En gap detecte: `intro` choisit `start` du mot suivant, `outro` choisit `end` du mot precedent.
- Hors gap, le comportement existant reste actif (distance + penalite middle).
- Typecheck valide (`npm run typecheck`).
