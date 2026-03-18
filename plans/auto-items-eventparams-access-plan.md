# Plan d'action — Acces EventParams sans rubber

## Objectif

Permettre de parametrer les transitions intro/outro des items en mode automatique meme sans cues/rubber (scene sans son), en donnant acces a `EventParams` pour intro/outro.

## Plan detaille

- [x] **1. Corriger la selection d'event active pour intro/outro par defaut**
  - Quand intro/outro est selectionne mais absent de `context.events[itemId]`, exposer un event virtuel pour afficher `EventParams`.

- [x] **2. Maintenir la persistence existante**
  - Conserver `events-update` pour creer/mettre a jour intro/outro avec `ref` sans dependre d'un cue name.

- [x] **3. Verification ciblee**
  - Verifier compilation du module `event-edit`.
  - Documenter le comportement attendu sur scene sans son.

## Review (a completer apres implementation)

- Resultat: `EventParams` est accessible pour intro/outro meme quand l'event n'existe pas encore en contexte (cas sans rubber/cues).
- Resultat: la mise a jour de transition continue d'utiliser `events-update`, qui cree/met a jour intro/outro a la persistence.
- Tests/commandes executes: `npx tsx -e "import './app/parts/event-edit/index.tsx';"`.
- Limites connues: sans cues, le repere (`name`) reste vide jusqu'a attribution explicite; ce correctif cible l'acces aux refs de transition.
