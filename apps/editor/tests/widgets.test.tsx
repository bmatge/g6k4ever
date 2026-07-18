import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MetadataForm } from "../src/widgets/MetadataForm.js";
import { ConditionTree } from "../src/widgets/ConditionTree.js";
import type { Simulator } from "@g6k4ever/schema";

const data: Simulator["data"] = [
  { id: 1, name: "age", label: "Âge", type: "integer" },
  { id: 2, name: "ville", label: "Ville", type: "text" },
];

describe("<MetadataForm>", () => {
  it("rend les champs name / label / description", () => {
    render(
      <MetadataForm
        value={{
          name: "test",
          label: "Test",
          description: "Une description",
          defaultLocale: "fr-FR",
          dateFormat: "dd/MM/yyyy",
          authors: [],
          navigation: "free",
        }}
        onChange={() => undefined}
        slugLocked={false}
      />,
    );
    expect((screen.getByLabelText(/Identifiant URL/i) as HTMLInputElement).value).toBe("test");
    expect((screen.getByLabelText(/Nom du simulateur/i) as HTMLInputElement).value).toBe("Test");
    expect((screen.getByLabelText(/Description/i) as HTMLTextAreaElement).value).toBe(
      "Une description",
    );
  });

  it("désactive le slug quand slugLocked=true", () => {
    render(
      <MetadataForm
        value={{
          name: "test",
          label: "Test",
          defaultLocale: "fr-FR",
          dateFormat: "dd/MM/yyyy",
          authors: [],
          navigation: "free",
        }}
        onChange={() => undefined}
        slugLocked={true}
      />,
    );
    expect((screen.getByLabelText(/Identifiant URL/i) as HTMLInputElement).disabled).toBe(true);
  });

  it("appelle onChange quand on modifie le libellé", () => {
    const onChange = vi.fn();
    render(
      <MetadataForm
        value={{
          name: "t",
          label: "T",
          defaultLocale: "fr-FR",
          dateFormat: "dd/MM/yyyy",
          authors: [],
          navigation: "free",
        }}
        onChange={onChange}
        slugLocked={true}
      />,
    );
    fireEvent.change(screen.getByLabelText(/Nom du simulateur/i), { target: { value: "Nouveau" } });
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ label: "Nouveau" }));
  });
});

describe("<ConditionTree>", () => {
  it("rend une condition élémentaire avec ses 3 selects (opérande, opérateur, valeur)", () => {
    render(
      <ConditionTree
        value={{ kind: "condition", operand: 1, operator: "=", value: "18" }}
        onChange={() => undefined}
        data={data}
      />,
    );
    // 2 selects (opérande, opérateur) + 1 input (valeur)
    expect(screen.getAllByRole("combobox")).toHaveLength(2);
    expect(screen.getByRole("textbox")).toBeDefined();
  });

  it("opérateur unaire 'present' n'affiche pas le champ valeur", () => {
    render(
      <ConditionTree
        value={{ kind: "condition", operand: 1, operator: "present" }}
        onChange={() => undefined}
        data={data}
      />,
    );
    expect(screen.queryByRole("textbox")).toBeNull();
  });

  it("rend un connecteur all avec ses enfants", () => {
    render(
      <ConditionTree
        value={{
          kind: "connector",
          type: "all",
          children: [
            { kind: "condition", operand: 1, operator: "present" },
            { kind: "condition", operand: 2, operator: "present" },
          ],
        }}
        onChange={() => undefined}
        data={data}
      />,
    );
    // 1 select connecteur + 2 × 2 selects condition (opérande + opérateur)
    expect(screen.getAllByRole("combobox").length).toBeGreaterThanOrEqual(5);
    expect(screen.getByText(/\+ Condition/i)).toBeDefined();
    expect(screen.getByText(/\+ Groupe/i)).toBeDefined();
  });

  it("changer l'opérateur de present (unaire) à = (binaire) ajoute la value", () => {
    const onChange = vi.fn();
    render(
      <ConditionTree
        value={{ kind: "condition", operand: 1, operator: "present" }}
        onChange={onChange}
        data={data}
      />,
    );
    const selects = screen.getAllByRole("combobox");
    fireEvent.change(selects[1]!, { target: { value: "=" } });
    expect(onChange).toHaveBeenCalledWith(
      expect.objectContaining({ operator: "=", value: "" }),
    );
  });
});
