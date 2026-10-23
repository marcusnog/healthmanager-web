import { useState } from "react";
import { fireEvent, screen } from "@testing-library/react";
import { renderWithProviders } from "@/test/render";
import { PrescriptionContentField } from "./prescription-content-field";

it("inserts the chosen heading at the cursor without removing the existing recipe", () => {
  function Editor() {
    const [value, setValue] = useState("Texto anterior\nTexto posterior");
    return <PrescriptionContentField label="Receita" value={value} onChange={setValue} />;
  }
  renderWithProviders(<Editor />);
  const input = screen.getByLabelText("Receita") as HTMLTextAreaElement;
  input.setSelectionRange(15, 15);
  fireEvent.change(screen.getByLabelText("Cabeçalho da receita"), { target: { value: "ORIENTAÇÕES" } });
  fireEvent.click(screen.getByRole("button", { name: "Inserir cabeçalho" }));
  expect(input).toHaveValue("Texto anterior\nORIENTAÇÕES\nTexto posterior");
});
