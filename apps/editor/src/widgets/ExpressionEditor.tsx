import { useMemo, type JSX } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { autocompletion, type CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import { javascript } from "@codemirror/lang-javascript";
import { EditorView } from "@codemirror/view";
import type { Data } from "@g6k4ever/schema";

interface ExpressionEditorProps {
  value: string;
  onChange: (next: string) => void;
  data: Data[];
  editable: boolean;
  /** Hauteur min/max (par défaut auto compacte). */
  height?: string;
  placeholder?: string;
}

/**
 * Éditeur d'expression jsep avec codemirror :
 *
 *   - Syntax highlight JavaScript (jsep parse un sous-ensemble JS).
 *   - **Autocomplétion `#`** : quand l'utilisateur tape `#`, suggère
 *     `#<id>` parmi les Data du simulateur avec leur nom comme étiquette.
 *   - Autocomplétion des fonctions standard (defined, sum, floor, max, min,
 *     count, year, date, strftime).
 *
 * Reste utilisable en read-only (editable=false) — la valeur s'affiche en
 * syntax highlight sans pouvoir être éditée.
 */
export function ExpressionEditor(props: ExpressionEditorProps): JSX.Element {
  const { value, onChange, data, editable, height = "auto", placeholder } = props;

  const extensions = useMemo(
    () => [
      javascript(),
      autocompletion({
        override: [buildCompletionSource(data)],
        activateOnTyping: true,
      }),
      EditorView.lineWrapping,
    ],
    [data],
  );

  return (
    <div
      style={{
        border: "1px solid var(--border-default-grey)",
        borderRadius: 4,
        overflow: "hidden",
        background: editable ? "white" : "var(--background-default-grey)",
      }}
    >
      <CodeMirror
        value={value}
        height={height}
        minHeight="28px"
        editable={editable}
        readOnly={!editable}
        extensions={extensions}
        onChange={onChange}
        basicSetup={{
          lineNumbers: false,
          foldGutter: false,
          highlightActiveLine: false,
          autocompletion: true,
          bracketMatching: true,
          closeBrackets: true,
          dropCursor: false,
          highlightSelectionMatches: false,
        }}
        placeholder={placeholder}
        style={{ fontSize: "0.9rem" }}
      />
    </div>
  );
}

const STANDARD_FUNCTIONS = [
  { label: "defined", detail: "(x) — vrai si x est défini et non vide", type: "function" },
  { label: "sum", detail: "(...args) — somme variadique", type: "function" },
  { label: "floor", detail: "(x) — partie entière inférieure", type: "function" },
  { label: "max", detail: "(...args) — maximum variadique", type: "function" },
  { label: "min", detail: "(...args) — minimum variadique", type: "function" },
  { label: "count", detail: "(...args) — nombre d'arguments définis", type: "function" },
  { label: "year", detail: "(date) — millésime", type: "function" },
  { label: "date", detail: "(iso) — parse une date ISO", type: "function" },
  { label: "strftime", detail: "(date, format) — formatage", type: "function" },
] as const;

function buildCompletionSource(data: Data[]) {
  return (context: CompletionContext): CompletionResult | null => {
    // Détection : on cherche soit `#xxx` soit un identifiant alphanumérique.
    const before = context.matchBefore(/#\d*/);
    const word = context.matchBefore(/\w+/);

    // Autocomplétion sur `#`
    if (before) {
      return {
        from: before.from,
        options: data.map((d) => ({
          label: `#${d.id}`,
          detail: `${d.name} (${d.type})`,
          info: d.label,
          type: "variable",
          apply: `#${d.id}`,
        })),
      };
    }

    // Autocomplétion sur les fonctions standard
    if (word && word.text.length >= 1) {
      const lowerSearch = word.text.toLowerCase();
      const matches = STANDARD_FUNCTIONS.filter((f) => f.label.toLowerCase().startsWith(lowerSearch));
      if (matches.length === 0) return null;
      return {
        from: word.from,
        options: matches.map((f) => ({
          label: f.label,
          detail: f.detail,
          type: f.type,
          apply: `${f.label}()`,
        })),
      };
    }

    return null;
  };
}
