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
      <fieldset className="md:col-span-2 rounded-md border border-[var(--border)] p-4">
        <legend className="px-1 text-sm font-semibold">Anexar produtos e pacotes ao receituário</legend>
        <p className="mb-3 text-xs text-[var(--muted)]">Selecione um item para inserir no texto do receituário e complete as orientações de uso. Cadastros em Produtos e pacotes.</p>
        {productsQuery.isError || packagesQuery.isError ? <p role="alert">Não foi possível carregar produtos ou pacotes. Tente abrir o editor novamente.</p> : productsQuery.isLoading || packagesQuery.isLoading ? <span className="spinner" /> : offers.length ? (
          <div className="grid gap-2 sm:grid-cols-2">
            {offers.map(offer => <div className="flex items-center justify-between gap-3 rounded-md border border-[var(--border)] p-3" key={offer.id}>
              <div><p className="text-sm font-semibold">{offer.label}</p><p className="text-xs text-[var(--muted)]">{offer.detail} · {formatCurrency(offer.price)}</p></div>
              <button className="btn btn-brand-outline btn-sm" disabled={disabled} onClick={() => onSelect(`${offer.label} — ${offer.detail}`)} type="button">Anexar</button>
            </div>)}
          </div>
        ) : <p className="text-sm text-[var(--muted)]">Nenhum produto ou pacote ativo cadastrado.</p>}
      </fieldset>
  );
}
