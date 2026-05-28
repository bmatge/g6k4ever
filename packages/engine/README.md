# @g6k4ever/engine

**Moteur d'évaluation TypeScript pur.** Aucune dépendance React, DOM, ou client HTTP. Exécutable côté serveur ET dans un bundle embarqué.

> 📌 Implémenté en **Phase 3**. Golden tests d'abord (`test-engineer`), implémentation ensuite (`engine-dev`). Voir [`ROADMAP.md`](../../ROADMAP.md).

## Signature

```ts
(définition: SimulatorDefinition, entrées: InputState, résolveurs: Resolvers)
  → (état visible: VisibilityState, variables: VariableState, erreurs: Notification[], sorties: Outputs)
```

## Contrats injectés

- `DataSourceResolver` — résout les datasources `inline`/`database`/`api`. Implémentation `InMemoryDataSource` pour les tests.
- `FunctionRegistry` — registre des fonctions standard (`sum`, `floor`, `max`, `count`, `year`, `strftime`, `defined`…) et métier (injectables).

## Règles

- ❌ Pas d'`eval()`, pas de `new Function()`. Expressions évaluées via AST `jsep` borné.
- ❌ Pas d'import de `react`, `react-dom`, `dsfr`, `window`, `document`, `fetch`.
- ✅ Propagation des règles jusqu'à stabilisation (max N itérations configurables, défaut 10).
