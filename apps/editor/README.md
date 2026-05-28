# @g6k4ever/editor — le produit

**Back-office no-code React + `@codegouvfr/react-dsfr`.** Produit des définitions de simulateur valides (au sens du schéma Zod), utilisable par un contributeur non-développeur, avec une trappe expert pour les power users.

> 📌 Implémenté en **Phase 7**, dernière étape du MVP. Voir [`ROADMAP.md`](../../ROADMAP.md) et l'agent [`editor-dev`](../../.claude/agents/editor-dev.md).

## Capacités clés

- Composition d'étapes/blocs par glisser-déposer (registre `@g6k4ever/blocks`).
- Règles en **mode guidé** (arbre `all`/`any`/`none` imbriquable) ⇄ **mode expert** (expression texte, codemirror).
- Datasources et fonctions choisies dans les registres ou créées par le power user.
- Textes à variables avec autocomplétion sur `#dataName`.
- **Preview live** via `@g6k4ever/runtime`.
- **Vérificateur de cohérence** temps réel.
- Lock d'édition + versions brouillon/publié + publication.

## Règle

**Aucune définition invalide enregistrable.** `safeParse` du schéma Zod à chaque sauvegarde.
