import { fireEvent, render, screen } from "@testing-library/react";
import { vi } from "vitest";
import { Modal } from "./modal";

it("only closes the top dialog when Escape cancels a nested modal", () => {
  const closeParent = vi.fn();
  const closeChild = vi.fn();
  render(<Modal title="Atendimento" onClose={closeParent}><Modal title="Receituário" onClose={closeChild}>Receita</Modal></Modal>);
  fireEvent(screen.getAllByRole("dialog")[1], new Event("cancel", { cancelable: true }));
  expect(closeChild).toHaveBeenCalledOnce();
  expect(closeParent).not.toHaveBeenCalled();
});
