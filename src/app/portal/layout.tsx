import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portal do Paciente — HealthManager",
  description: "Acesse suas consultas, documentos e informacoes de saude.",
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
