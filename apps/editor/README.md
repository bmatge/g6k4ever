# @g6k4ever/editor — le produit

**Back-office no-code React + DSFR.** Composez et publiez des simulateurs sans écrire de code, avec preview live, lock pessimiste, et persistance via l'API.

> 📌 **Phase 7a livrée** (skeleton fonctionnel). Phase 7.2 ajoutera DnD, mode expert codemirror, vérificateur de cohérence, autocomplétion `#var`.

## Lancer en local

```bash
# Terminal 1 — API + DB SQLite
pnpm dev:api                                # http://localhost:3000

# Terminal 2 — éditeur
pnpm --filter @g6k4ever/editor dev          # http://localhost:5174
```

Ouvre l'éditeur, entre un identifiant (placeholder pour l'auth — sera remplacé en Phase 7.3), puis crée un simulateur via « + Nouveau simulateur ».

## Capacités Phase 7a

- **Connexion API** : client typé (list / get / create / update / delete / publish / lock / heartbeat / release / run).
- **Liste des simulateurs** : cards DSFR triées par dernière modification.
- **Création** : template vierge avec 1 Data et 1 Step.
- **Éditeur 2-pane** :
  - LEFT : tabs Métadonnées / Données / Règles (mode guidé) / JSON brut
  - RIGHT : preview live via `@g6k4ever/runtime` (réagit aux saisies)
- **Lock pessimiste** acquis à l'ouverture, heartbeat toutes les 5 min, release au unmount. Force-takeover possible.
- **Save / Publish** via les endpoints API.

## Éditeur de règles (mode guidé)

Le composant `ConditionTree` rend l'arbre `all`/`any`/`none` ⊃ `Condition(operand, operator, value)` avec des selects DSFR. Bascule automatique unaire (`present`/`blank`/`isTrue`/`isFalse`) ⇄ binaire (`=`/`!=`/`<`/etc.) selon l'opérateur choisi.

## Reste pour Phase 7.2

- Ajout/suppression de Data, Sources, Steps, Blocks (actuellement readonly hors JSON brut)
- Drag-and-drop blocs depuis une palette (dnd-kit)
- Éditeur d'actions par règle (showObject / setAttribute / notify...)
- Mode expert codemirror pour les expressions
- Autocomplétion `#<nom-de-data>` dans les textes
- Vérificateur de cohérence temps réel (variable inexistante, étape inaccessible, règle jamais atteignable)

## Règle non négociable

**Toute écriture passe par le schéma Zod.** Le bouton Save → API → `Simulator.safeParse(...)` → DB. Une définition invalide ne peut pas être persistée.
