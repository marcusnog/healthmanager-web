import { Modal } from "@/components/ui/modal";

export function ClinicalPanel({ inline = false, title, children, onClose, size = "lg" }: { inline?: boolean; title: string; children: React.ReactNode; onClose: () => void; size?: "md" | "lg" | "xl" }) {
  if (!inline) return <Modal title={title} size={size} onClose={onClose}>{children}</Modal>;
  return <section aria-label={title} className="rounded-lg border border-[var(--border)] p-5">
    <div className="mb-4 flex items-center justify-between gap-3"><h3 className="font-semibold">{title}</h3><button type="button" className="btn btn-ghost btn-sm" onClick={onClose}>Fechar seção</button></div>
    {children}
  </section>;
}
