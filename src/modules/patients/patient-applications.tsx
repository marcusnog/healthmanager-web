import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { DefaultService, PatientApplicationsService } from "@/generated";
import { Modal } from "@/components/ui/modal";
import { readStoredSessionState } from "@/lib/auth-session";
import { apiErrorMessage } from "@/lib/api-error";
import { formatDateTime } from "@/lib/formatters";

export function PatientApplicationsModal({
  patientId,
  patientName,
  onClose,
}: {
  patientId: string;
  patientName: string;
  onClose: () => void;
}) {
  const queryClient = useQueryClient();
  const role = readStoredSessionState()?.role;
  const canGrant = role === "Admin" || role === "Secretary" || role === "PlatformAdmin";
  const canApply = role === "Doctor";

  const [feedback, setFeedback] = useState<string | null>(null);

  const balancesQuery = useQuery({
    queryKey: ["patient-applications-balance", patientId],
    queryFn: () => PatientApplicationsService.patientApplicationBalanceList(patientId),
    enabled: !!patientId,
  });
  const historyQuery = useQuery({
    queryKey: ["patient-applications", patientId],
    queryFn: () => PatientApplicationsService.patientApplicationsList(patientId),
    enabled: !!patientId,
  });
  const productsQuery = useQuery({ queryKey: ["products"], queryFn: () => DefaultService.productsList(1, 100) });
  const packagesQuery = useQuery({ queryKey: ["packages"], queryFn: () => DefaultService.packagesList(1, 100) });

  const products = productsQuery.data?.items ?? [];
  const packages = packagesQuery.data?.items ?? [];
  const balances = balancesQuery.data ?? [];
  const history = historyQuery.data ?? [];

  const refresh = () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ["patient-applications-balance", patientId] }),
      queryClient.invalidateQueries({ queryKey: ["patient-applications", patientId] }),
    ]);

  const [grantSource, setGrantSource] = useState<"package" | "individual">("package");
  const grant = useMutation({
    mutationFn: () =>
      PatientApplicationsService.patientApplicationBalanceGrant(patientId, {
        source: grantSource,
        packageId: grantSource === "package" ? grantPackageId ?? packages[0]?.id ?? "" : null,
        productId: grantSource === "individual" ? grantProductId ?? products[0]?.id ?? "" : null,
      }),
    onSuccess: async () => {
      setFeedback("Saldo concedido com sucesso.");
      await refresh();
    },
    onError: (error) => setFeedback(apiErrorMessage(error, "Não foi possível conceder o saldo.")),
  });
  const [grantPackageId, setGrantPackageId] = useState<string | null>(null);
  const [grantProductId, setGrantProductId] = useState<string | null>(null);

  const [applyProductId, setApplyProductId] = useState<string | null>(null);
  const [applyQuantity, setApplyQuantity] = useState(1);
  const [applyNotes, setApplyNotes] = useState("");
  const applyApplication = useMutation({
    mutationFn: () =>
      PatientApplicationsService.patientApplicationsCreate(patientId, {
        productId: applyProductId ?? applyableProducts[0]?.productId ?? "",
        quantity: applyQuantity,
        notes: applyNotes || null,
      }),
    onSuccess: async () => {
      setFeedback("Aplicação registrada com sucesso.");
      setApplyNotes("");
      await refresh();
    },
    onError: (error) => setFeedback(apiErrorMessage(error, "Não foi possível registrar a aplicação.")),
  });

  const applyableProducts = balances.filter((b) => (b.remainingUnits ?? 0) > 0);

  return (
    <Modal title={`Aplicações — ${patientName}`} onClose={onClose} size="xl">
      <div className="grid gap-5 xl:grid-cols-3">
        <section className="xl:col-span-2 space-y-5">
          {feedback ? (
            <div className="rounded-md border border-[var(--border)] bg-[var(--brand-wash)] px-4 py-3 text-sm" role="status">
              {feedback}
            </div>
          ) : null}

          <section className="panel rounded-lg p-5">
            <h3 className="text-base font-semibold">Saldo disponivel</h3>
            {balancesQuery.isLoading ? (
              <div className="flex items-center justify-center py-12"><span className="spinner" /></div>
            ) : balances.length === 0 ? (
              <div className="empty-state py-6">
                <p className="text-sm font-semibold">Nenhum saldo concedido para este paciente.</p>
              </div>
            ) : (
              <div className="stack-list mt-4">
                {balances.map((b) => (
                  <div className="data-card" key={b.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">{b.productName ?? "Produto"}</p>
                        <p className="text-sm text-[var(--muted)]">
                          {b.source === "Package"
                            ? `Pacote ${b.packageName ?? ""}`
                            : "Venda individual"}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">{b.remainingUnits ?? 0} restante(s)</p>
                        <p className="text-sm text-[var(--muted)]">
                          {(b.usedUnits ?? 0)} de {(b.purchasedUnits ?? 0)} usado(s)
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="panel rounded-lg p-5">
            <h3 className="text-base font-semibold">Historico de aplicacoes</h3>
            {historyQuery.isLoading ? (
              <div className="flex items-center justify-center py-12"><span className="spinner" /></div>
            ) : history.length === 0 ? (
              <div className="empty-state py-6">
                <p className="text-sm font-semibold">Nenhuma aplicacao registrada para este paciente.</p>
              </div>
            ) : (
              <div className="stack-list mt-4">
                {history.map((h) => (
                  <article className="data-card" key={h.id}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold">
                          {h.productName ?? "Produto"} {h.quantity ? `· ${h.quantity}` : ""}
                        </p>
                        <p className="text-sm text-[var(--muted)]">
                          {h.appliedAt ? formatDateTime(h.appliedAt) : ""}
                          {h.doctorName ? ` · ${h.doctorName}` : ""}
                        </p>
                        {h.notes ? <p className="mt-1 text-sm text-[var(--muted)]">{h.notes}</p> : null}
                      </div>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </section>

        <aside className="panel rounded-lg p-5 xl:self-start">
          {canApply ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                if (applyableProducts.length) applyApplication.mutate();
              }}
            >
              <h3 className="text-base font-semibold">Registrar aplicacao</h3>
              {applyableProducts.length === 0 ? (
                <p className="text-sm text-[var(--muted)]">Sem saldo disponivel para aplicar.</p>
              ) : (
                <>
                  <label>
                    <span className="label">Produto</span>
                    <select className="input-field" value={applyProductId ?? applyableProducts[0].productId ?? ""} onChange={(e) => setApplyProductId(e.target.value)}>
                      {applyableProducts.map((b) => (
                        <option key={b.id} value={b.productId}>{b.productName ?? "Produto"}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    <span className="label">Quantidade</span>
                    <input className="input-field" type="number" min="1" step="1" value={applyQuantity} onChange={(e) => setApplyQuantity(Number(e.target.value))} />
                  </label>
                  <label>
                    <span className="label">Observacoes</span>
                    <textarea className="input-field min-h-20" value={applyNotes} onChange={(e) => setApplyNotes(e.target.value)} />
                  </label>
                  <button className="btn btn-primary" disabled={applyApplication.isPending} type="submit">
                    {applyApplication.isPending ? "Registrando..." : "Registrar aplicacao"}
                  </button>
                </>
              )}
            </form>
          ) : null}

          {canGrant ? (
            <form
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                grant.mutate();
              }}
            >
              <h3 className="text-base font-semibold">Conceder saldo</h3>
              <label>
                <span className="label">Origem</span>
                <select className="input-field" value={grantSource} onChange={(e) => setGrantSource(e.target.value as "package" | "individual")}>
                  <option value="package">Pacote</option>
                  <option value="individual">Venda individual</option>
                </select>
              </label>
              {grantSource === "package" ? (
                <label>
                  <span className="label">Pacote</span>
                  <select className="input-field" value={grantPackageId ?? packages[0]?.id ?? ""} onChange={(e) => setGrantPackageId(e.target.value)}>
                    {packages.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </label>
              ) : (
                <label>
                  <span className="label">Produto</span>
                  <select className="input-field" value={grantProductId ?? products[0]?.id ?? ""} onChange={(e) => setGrantProductId(e.target.value)}>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name}</option>
                    ))}
                  </select>
                </label>
              )}
              <button className="btn btn-primary" disabled={grant.isPending} type="submit">
                {grant.isPending ? "Concedendo..." : "Conceder saldo"}
              </button>
            </form>
          ) : null}

          {!canApply && !canGrant ? (
            <p className="text-sm text-[var(--muted)]">Apenas visualizacao da ficha.</p>
          ) : null}
        </aside>
      </div>
    </Modal>
  );
}