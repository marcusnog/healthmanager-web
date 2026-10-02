import { fireEvent, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useState } from "react";
import type { PatientResponse } from "@/generated";
import { renderWithProviders } from "@/test/render";
import { PatientSearch } from "./patient-search";

const { patientsList } = vi.hoisted(() => ({ patientsList: vi.fn() }));
vi.mock("@/services/api", () => ({ DefaultService: { patientsList } }));

function Picker({ patients, value, onChange }: { patients: PatientResponse[]; value: string; onChange: (patient: PatientResponse | null) => void }) {
  const [selected, setSelected] = useState(value);
  return <PatientSearch patients={patients} value={selected} onChange={patient => { setSelected(patient?.id ?? ""); onChange(patient); }} />;
}

describe("PatientSearch", () => {
  beforeEach(() => {
    patientsList.mockReset();
    patientsList.mockResolvedValue({ items: [] });
  });

  it("filters loaded names ignoring accents and clears the old selection while typing", () => {
    const onChange = vi.fn();
    renderWithProviders(<Picker patients={[{ id: "1", name: "João Silva" }, { id: "2", name: "Marina Souza" }]} value="2" onChange={onChange} />);
    const input = screen.getByRole("combobox", { name: "Paciente" });
    fireEvent.change(input, { target: { value: "joao" } });
    expect(onChange).toHaveBeenCalledWith(null);
    expect(screen.getAllByRole("option")).toHaveLength(1);
    expect(screen.getByRole("option")).toHaveTextContent("João Silva");
    fireEvent.keyDown(input, { key: "Escape" });
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("searches beyond loaded patients and selects the correct ID using the keyboard", async () => {
    const remote = { id: "remote-patient", name: "Ana Nova", cpf: "52998224725" };
    patientsList.mockResolvedValue({ items: [remote] });
    const onChange = vi.fn();
    renderWithProviders(<Picker patients={[]} value="" onChange={onChange} />);
    const input = screen.getByRole("combobox", { name: "Paciente" });
    fireEvent.change(input, { target: { value: "Ana" } });
    expect(patientsList).not.toHaveBeenCalled();
    expect(await screen.findByRole("option")).toHaveTextContent("Ana Nova");
    expect(patientsList).toHaveBeenCalledWith(1, 20, "Ana", "name", "asc");
    fireEvent.keyDown(input, { key: "ArrowDown" });
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onChange).toHaveBeenLastCalledWith(remote);
    expect(input).toHaveValue("Ana Nova");
    expect(input).toHaveAttribute("aria-expanded", "false");
  });

  it("keeps homonyms distinct when selecting with the mouse", () => {
    const patients = [{ id: "1", name: "Ana Silva", cpf: "11111111111" }, { id: "2", name: "Ana Silva", cpf: "22222222222" }];
    const onChange = vi.fn();
    renderWithProviders(<Picker patients={patients} value="" onChange={onChange} />);
    fireEvent.focus(screen.getByRole("combobox"));
    expect(screen.getAllByRole("option")).toHaveLength(2);
    fireEvent.click(screen.getByRole("button", { name: "Ana Silva 22222222222" }));
    expect(onChange).toHaveBeenCalledWith(patients[1]);
  });

  it("does not show results from the previous search while a new search is pending", async () => {
    patientsList.mockResolvedValue({ items: [{ id: "1", name: "Ana Silva" }] });
    renderWithProviders(<Picker patients={[]} value="" onChange={vi.fn()} />);
    const input = screen.getByRole("combobox");
    fireEvent.change(input, { target: { value: "Ana" } });
    await screen.findByRole("option");
    fireEvent.change(input, { target: { value: "Bruna" } });
    expect(screen.queryByRole("option")).toBeNull();
    await waitFor(() => expect(patientsList).toHaveBeenCalledWith(1, 20, "Bruna", "name", "asc"));
    expect(await screen.findByText("Nenhum paciente encontrado.")).toBeVisible();
  });
});
