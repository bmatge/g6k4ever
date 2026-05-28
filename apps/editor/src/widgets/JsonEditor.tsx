import { useState, useEffect, type JSX } from "react";

interface JsonEditorProps<T> {
  value: T;
  onChange: (next: T) => void;
  height?: string;
}

/**
 * Éditeur JSON brut — fallback minimal en attendant un éditeur visuel complet
 * (mode guidé, codemirror...). Pour Phase 7a : suffisant pour démontrer le
 * cycle complet (charger / modifier / sauver / preview).
 *
 * Affiche un textarea, parse à chaque changement, signale les erreurs de
 * parsing en rouge sans interrompre la saisie.
 */
export function JsonEditor<T>({ value, onChange, height = "400px" }: JsonEditorProps<T>): JSX.Element {
  const [text, setText] = useState(() => JSON.stringify(value, null, 2));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Quand `value` est rechargé depuis l'extérieur (ex. récupération API),
    // resynchronise le textarea.
    setText(JSON.stringify(value, null, 2));
    setError(null);
  }, [value]);

  const handleChange = (newText: string): void => {
    setText(newText);
    try {
      const parsed = JSON.parse(newText) as T;
      onChange(parsed);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div>
      <textarea
        className="fr-input"
        style={{ fontFamily: "monospace", fontSize: "0.85rem", width: "100%", height }}
        value={text}
        onChange={(e) => handleChange(e.target.value)}
        spellCheck={false}
      />
      {error ? (
        <p className="fr-error-text" style={{ marginTop: "0.5rem" }}>
          JSON invalide : {error}
        </p>
      ) : null}
    </div>
  );
}
