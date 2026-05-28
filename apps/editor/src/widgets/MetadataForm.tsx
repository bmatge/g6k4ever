import type { JSX } from "react";
import type { Simulator } from "@g6k4ever/schema";

interface MetadataFormProps {
  value: Simulator["metadata"];
  onChange: (next: Simulator["metadata"]) => void;
  /** Le slug est-il modifiable ? (Non si le simulateur est déjà créé en DB.) */
  slugLocked: boolean;
}

export function MetadataForm({ value, onChange, slugLocked }: MetadataFormProps): JSX.Element {
  return (
    <div className="fr-mb-4w">
      <div className="fr-input-group">
        <label className="fr-label" htmlFor="meta-name">
          Slug (nom interne)
          <span className="fr-hint-text">Lettres minuscules, chiffres et tirets uniquement</span>
        </label>
        <input
          className="fr-input"
          id="meta-name"
          type="text"
          value={value.name}
          disabled={slugLocked}
          onChange={(e) => onChange({ ...value, name: e.target.value })}
        />
      </div>
      <div className="fr-input-group">
        <label className="fr-label" htmlFor="meta-label">
          Libellé public
        </label>
        <input
          className="fr-input"
          id="meta-label"
          type="text"
          value={value.label}
          onChange={(e) => onChange({ ...value, label: e.target.value })}
        />
      </div>
      <div className="fr-input-group">
        <label className="fr-label" htmlFor="meta-description">
          Description
        </label>
        <textarea
          className="fr-input"
          id="meta-description"
          rows={3}
          value={value.description ?? ""}
          onChange={(e) => onChange({ ...value, description: e.target.value })}
        />
      </div>
    </div>
  );
}
