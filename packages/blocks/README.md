# @g6k4ever/blocks

**Registre de blocs DSFR.** Une définition par bloc, consommée à la fois par le runtime (pour rendre) et par l'éditeur (pour configurer).

> 📌 Implémenté en **Phase 4**. Voir [`ROADMAP.md`](../../ROADMAP.md) et l'agent [`blocks-dev`](../../.claude/agents/blocks-dev.md).

## Interface canonique

```ts
interface Block<TConfig> {
  type: string;
  configSchema: ZodSchema<TConfig>;        // édition guidée dans l'éditeur
  readsDataIds: (config: TConfig) => string[];
  writesDataIds: (config: TConfig) => string[];
  editorMeta: { label: string; icon: string; group: string; description: string };
  render: React.FC<{ config: TConfig; state: SimulatorState }>;
}
```

## Blocs prévus pour le MVP

Champs de saisie (11 types + variant `range`), `text` à variables, `section`/`chapter` conditionnel, `accordion` à items conditionnels, `kpi-card`, `breakdown-table`, `notification`, `footnote`, bouton `reset`.
