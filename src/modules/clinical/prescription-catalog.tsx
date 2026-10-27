import { useQuery } from "@tanstack/react-query";
import { DefaultService } from "@/services/api";
import { formatCurrency } from "@/lib/formatters";

export function PrescriptionCatalog({ onSelect, disabled = false }: { onSelect: (text: string) => void; disabled?: boolean }) {
  // shortcut: lists the first 100 catalog entries; add search/pagination for larger catalogs.
  const productsQuery = useQuery({ queryKey: ["products"], queryFn: () => DefaultService.productsList(1, 100) });
  const packagesQuery = useQuery({ queryKey: ["packages"], queryFn: () => DefaultService.packagesList(1, 100) });
  const offers = [
    ...(productsQuery.data?.items ?? []).filter(item => item.isActive).map(item => ({ id: `product-${item.id}`, label: item.name ?? "Produto", detail: `${item.applicationCount ?? 1} aplicacao(oes)`, price: item.price ?? 0 })),
    ...(packagesQuery.data?.items ?? []).filter(item => item.isActive).map(item => ({ id: `package-${item.id}`, label: item.name ?? "Pacote", detail: (item.items ?? []).map(product => `${product.productName}: ${product.applicationCount} aplicação(ões)`).join("; "), price: item.price ?? 0 })),
  ];
  return (
      <fieldset className="min-w-0 md:col-span-2 rounded-md border border-[var(--border)] p-4">
        <legend className="max-w-full px-1 text-sm font-semibold [overflow-wrap:anywhere]">Anexar produtos e pacotes ao receituário</legend>
        <p className="mb-3 text-xs text-[var(--muted)]">Selecione um item para inserir no texto do receituário e complete as orientações de uso. Cadastros em Produtos e pacotes.</p>
        {productsQuery.isError || packagesQuery.isError ? <p role="alert">Não foi possível carregar produtos ou pacotes. Tente abrir o editor novamente.</p> : productsQuery.isLoading || packagesQuery.isLoading ? <span className="spinner" /> : offers.length ? (
          <div className="grid max-h-80 min-w-0 grid-cols-[repeat(auto-fit,minmax(min(100%,16rem),1fr))] gap-2 overflow-y-auto pr-1">
            {offers.map(offer => <div className="flex min-w-0 items-center justify-between gap-3 rounded-md border border-[var(--border)] p-3" key={offer.id}>
              <div className="min-w-0 flex-1 [overflow-wrap:anywhere]"><p className="text-sm font-semibold">{offer.label}</p><p className="text-xs text-[var(--muted)]">{offer.detail} · {formatCurrency(offer.price)}</p></div>
              <button className="btn btn-brand-outline btn-sm shrink-0" disabled={disabled} onClick={() => onSelect(`${offer.label} — ${offer.detail}`)} type="button">Anexar</button>
            </div>)}
          </div>
        ) : <p className="text-sm text-[var(--muted)]">Nenhum produto ou pacote ativo cadastrado.</p>}
      </fieldset>
  );
}
