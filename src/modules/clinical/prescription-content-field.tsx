import { PrescriptionCatalog } from "./prescription-catalog";
import { useRef, useState } from "react";

export function PrescriptionContentField({ label, value, onChange, required = false }: { label: string; value: string; onChange: (value: string) => void; required?: boolean }) {
  const input = useRef<HTMLTextAreaElement>(null);
  const [catalogError, setCatalogError] = useState("");
  const [heading, setHeading] = useState("PRESCRIÇÃO");
  function insertHeading() {
    const element = input.current;
    const start = element?.selectionStart ?? value.length;
    const end = element?.selectionEnd ?? start;
    const text = `${start && value[start - 1] !== "\n" ? "\n\n" : ""}${heading}\n`;
    const next = value.slice(0, start) + text + value.slice(end);
    if (next.length > 30000) return;
    onChange(next);
    requestAnimationFrame(() => { element?.focus(); element?.setSelectionRange(start + text.length, start + text.length); });
  }
  function appendCatalog(text: string) {
    const next = [value, text].filter(Boolean).join("\n");
    if (next.length > 30000) { setCatalogError("O receituário excederia o limite de 30.000 caracteres."); return; }
    setCatalogError("");
    onChange(next);
  }
  return <div className="space-y-2">
    <div className="flex flex-wrap items-end gap-2"><label className="text-sm">Cabeçalho da receita<select className="input-field" value={heading} onChange={event => setHeading(event.target.value)}>{["RECEITUÁRIO", "PRESCRIÇÃO", "MODO DE USO", "ORIENTAÇÕES", "RETORNO"].map(item => <option key={item}>{item}</option>)}</select></label><button type="button" className="btn btn-ghost" onClick={insertHeading} disabled={value.length + heading.length + 3 > 30000}>Inserir cabeçalho</button></div>
    <label className="block">{label}<textarea ref={input} className="input-field min-h-64" maxLength={30000} required={required} value={value} onChange={event => onChange(event.target.value)} /></label>
    <PrescriptionCatalog onSelect={appendCatalog} />
    {catalogError && <p role="alert">{catalogError}</p>}
    <p className="text-xs text-[var(--muted)]">O cabeçalho é inserido no cursor. Títulos e quebras de linha são preservados na impressão.</p>
  </div>;
}
