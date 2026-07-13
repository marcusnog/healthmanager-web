import "@testing-library/jest-dom/vitest";

if (typeof window !== "undefined") {
  const dialogProto = Object.getPrototypeOf(document.createElement("dialog"));
  if (dialogProto && typeof dialogProto.showModal !== "function") {
    dialogProto.showModal = function () { this.open = true; };
    dialogProto.close = function () { this.open = false; this.dispatchEvent(new Event("close")); };
  }
}
