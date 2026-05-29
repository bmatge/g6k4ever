import type { JSX, ReactNode } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";

interface SortableBlockProps {
  id: string;
  disabled?: boolean;
  children: (handleProps: {
    attributes: ReturnType<typeof useSortable>["attributes"];
    listeners: ReturnType<typeof useSortable>["listeners"];
    isDragging: boolean;
  }) => ReactNode;
}

/**
 * Wrapper Sortable pour un élément (bloc, étape...) — fournit les listeners
 * d'un drag handle au children. Les `attributes` et `listeners` doivent être
 * branchés sur un bouton ou une zone dédiée (drag handle), pas sur tout le
 * conteneur, sinon les clicks sur les boutons internes (Supprimer, etc.) sont
 * intercepés.
 */
export function SortableBlock({ id, disabled, children }: SortableBlockProps): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
    cursor: isDragging ? "grabbing" : "default",
  };

  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes, listeners, isDragging })}
    </div>
  );
}
