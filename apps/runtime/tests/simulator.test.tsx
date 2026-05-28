import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Simulator } from "../src/Simulator.js";
import { fraisLocataireInline } from "../src/frais-locataire-inline.js";
import { createStandardRegistry } from "@g6k4ever/functions";

const functions = createStandardRegistry();

describe("<Simulator> — runtime intégration", () => {
  it("rend l'étape avec son label", () => {
    render(<Simulator definition={fraisLocataireInline} functions={functions} />);
    expect(screen.getByText(/Vérifier le zonage/i)).toBeDefined();
  });

  it("rend le champ de saisie avec son label et son hint", () => {
    render(<Simulator definition={fraisLocataireInline} functions={functions} />);
    expect(screen.getByLabelText(/Code INSEE de la commune/i)).toBeDefined();
    expect(screen.getByText(/5 chiffres/i)).toBeDefined();
  });

  it("au démarrage, aucune section de résultat n'est visible", () => {
    render(<Simulator definition={fraisLocataireInline} functions={functions} />);
    expect(screen.queryByText(/n'est pas en zone tendue/i)).toBeNull();
    expect(screen.queryByText(/est en zone tendue/i)).toBeNull();
    expect(screen.queryByText(/est en zone très tendue/i)).toBeNull();
  });

  it("avec initialInput Paris (75056), affiche la section très tendue avec interpolation", () => {
    render(
      <Simulator
        definition={fraisLocataireInline}
        functions={functions}
        initialInput={{ commune: "75056" }}
      />,
    );
    // #3 = "Paris" interpolé dans la section zone-2
    expect(screen.getByText(/Paris est en zone très tendue/i)).toBeDefined();
    // Les autres sections sont masquées
    expect(screen.queryByText(/Paris n'est pas en zone tendue/i)).toBeNull();
  });

  it("avec initialInput Rennes (35238), affiche la zone tendue", () => {
    render(
      <Simulator
        definition={fraisLocataireInline}
        functions={functions}
        initialInput={{ commune: "35238" }}
      />,
    );
    expect(screen.getByText(/Rennes est en zone tendue/i)).toBeDefined();
    expect(screen.queryByText(/Rennes est en zone très tendue/i)).toBeNull();
  });

  it("avec initialInput Mende (48095), affiche la zone reste du territoire", () => {
    render(
      <Simulator
        definition={fraisLocataireInline}
        functions={functions}
        initialInput={{ commune: "48095" }}
      />,
    );
    expect(screen.getByText(/Mende n'est pas en zone tendue/i)).toBeDefined();
  });

  it("changement de saisie déclenche un re-render avec le bon résultat", () => {
    render(<Simulator definition={fraisLocataireInline} functions={functions} />);
    const input = screen.getByLabelText(/Code INSEE/i) as HTMLInputElement;
    fireEvent.change(input, { target: { value: "75056" } });
    expect(screen.getByText(/Paris est en zone très tendue/i)).toBeDefined();
    fireEvent.change(input, { target: { value: "48095" } });
    expect(screen.getByText(/Mende n'est pas en zone tendue/i)).toBeDefined();
    expect(screen.queryByText(/Paris est en zone très tendue/i)).toBeNull();
  });
});
