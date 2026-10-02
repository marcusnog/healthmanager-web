import { useQuery } from "@tanstack/react-query";
import { useEffect, useId, useState } from "react";
import type { PatientResponse } from "@/generated";
import { DefaultService } from "@/services/api";

const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("pt-BR").trim();

export function PatientSearch({ patients, value, onChange }: {
  patients: PatientResponse[];
  value: string;
  onChange: (patient: PatientResponse | null) => void;
}) {
  const id = useId();
  const [search, setSearch] = useState<string | null>(null);
  const [chosen, setChosen] = useState<PatientResponse | null>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  useEffect(() => {
    if (open && active >= 0) document.getElementById(`${id}-option-${active}`)?.scrollIntoView?.({ block: "nearest" });
  }, [active, id, open]);
  const term = value ? "" : search?.trim() ?? "";
  const [debounced, setDebounced] = useState("");
  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(term), 250);
    return () => window.clearTimeout(timer);
  }, [term]);
  const query = useQuery({
    queryKey: ["appointment-patient-search", debounced],
    queryFn: () => DefaultService.patientsList(1, 20, debounced, "name", "asc"),
    enabled: open && term.length > 0 && term === debounced,
  });
  const selected = patients.find(patient => patient.id === value) ?? (chosen?.id === value ? chosen : null);
  const candidates = [...new Map([...patients, ...(term === debounced ? query.data?.items ?? [] : [])].filter(patient => patient.id).map(patient => [patient.id, patient])).values()];
  const matches = candidates.filter(patient => normalize(patient.name ?? "").includes(normalize(term))).slice(0, 20);
  const loading = term.length > 0 && (term !== debounced || query.isFetching);
  const select = (patient: PatientResponse) => {
    setChosen(patient);
    onChange(patient);
    setSearch(null);
    setOpen(false);
    setActive(-1);
  };

  return <div className="relative min-w-40 flex-1">
    <input
      aria-label="Paciente"
      role="combobox"
      aria-autocomplete="list"
      aria-expanded={open}
      aria-controls={`${id}-list`}
      aria-activedescendant={open && matches[active] ? `${id}-option-${active}` : undefined}
      autoComplete="off"
      className="input-field w-full"
      placeholder="Digite o nome do paciente"
      value={value ? selected?.name ?? "" : search ?? ""}
      onFocus={() => setOpen(true)}
      onBlur={() => { setOpen(false); setActive(-1); }}
      onChange={event => { setSearch(event.target.value); onChange(null); setOpen(true); setActive(-1); }}
      onKeyDown={event => {
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          event.preventDefault();
          setOpen(true);
          setActive(index => matches.length ? event.key === "ArrowDown" ? Math.min(index + 1, matches.length - 1) : index <= 0 ? matches.length - 1 : index - 1 : -1);
        } else if (event.key === "Enter" && open) {
          event.preventDefault();
          if (matches[active]) select(matches[active]);
        } else if (event.key === "Escape") {
          event.preventDefault(); setOpen(false); setActive(-1);
        }
      }}
    />
    {open ? <div className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-y-auto rounded-md border border-[var(--border)] bg-[var(--surface)] shadow-sm">
      <ul id={`${id}-list`} role="listbox" aria-label="Pacientes encontrados">
        {matches.map((patient, index) => <li key={patient.id} role="option" id={`${id}-option-${index}`} aria-selected={index === active}>
          <button type="button" tabIndex={-1} className={`block min-h-11 w-full px-3 py-2 text-left text-sm hover:bg-[var(--brand-wash)] ${index === active ? "bg-[var(--brand-wash)]" : ""}`} onMouseDown={event => event.preventDefault()} onClick={() => select(patient)}>
            <span className="block font-medium">{patient.name}</span>
            {" "}<span className="block text-xs text-[var(--muted)]">{patient.details?.medicalRecordNumber ?? patient.cpf ?? patient.phone ?? patient.id}</span>
          </button>
        </li>)}
      </ul>
      <p role="status" className="px-3 py-2 text-xs text-[var(--muted)]">
        {loading ? "Buscando pacientes..." : query.isError && term === debounced ? "Não foi possível buscar todos os pacientes. Tente novamente." : matches.length ? "Selecione um paciente da lista." : "Nenhum paciente encontrado."}
      </p>
    </div> : null}
  </div>;
}
