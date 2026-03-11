# Plan d'action — Reset item: hard clear complet

## Objectif

Etendre le bouton `Reset` de `item-edit` pour effectuer un nettoyage complet de l'item selectionne, en conservant uniquement l'item lui-meme.

## Etapes

- [x] Identifier les effets attendus du reset (decors, events custom, intro, tete de lecture).
- [x] Mettre a jour le handler `onReset` de `item-edit` pour appliquer ces effets en sequence.
- [x] Ajouter une non-regression smoke sur la logique de reset (custom supprimes, intro reset, decor reset, focus intro).
- [x] Executer les smoke tests cibles.

## Review

- [x] Tous les custom events de l'item sont supprimes localement et via API.
- [x] Le decor de base revient aux valeurs par defaut.
- [x] Intro/outro reviennent sur les refs de transition par defaut.
- [x] La selection active revient sur `intro` avec un seek.

## Resultats

- `Reset` dans `item-edit` effectue maintenant un hard clear de l'item: suppression des events custom, reset decor de base, reset intro/outro, puis repositionnement sur `intro`.
- Extraction de la logique de reset event dans `app/parts/item-edit/item-edit.reset.ts` pour la rendre testable.
- Non-regression ajoutee dans `tests/item-reset-smoke.ts` et integree a `npm run test:smoke`.
- Verification executee: `tests/item-reset-smoke.ts`, `tests/item-edit-smoke.ts`, `tests/item-edit-live-smoke.ts`.
