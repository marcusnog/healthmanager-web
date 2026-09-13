import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DefaultService, type PackageResponse, type ProductResponse } from "@/generated";
import { Modal } from "@/components/ui/modal";
import { formatCurrency } from "@/lib/formatters";

type PackageLine = { productId: string; applicationCount: number };

export function CatalogManager() {
  const queryClient = useQueryClient();
  const productsQuery = useQuery({ queryKey: ["products"], queryFn: () => DefaultService.productsList(1, 100) });
  const packagesQuery = useQuery({ queryKey: ["packages"], queryFn: () => DefaultService.packagesList(1, 100) });
  const products = productsQuery.data?.items ?? [];
  const packages = packagesQuery.data?.items ?? [];
  const [feedback, setFeedback] = useState<string | null>(null);
  const [productOpen, setProductOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<ProductResponse | null>(null);
  const [productName, setProductName] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productApplications, setProductApplications] = useState(1);
  const [packageOpen, setPackageOpen] = useState(false);
  const [editingPackage, setEditingPackage] = useState<PackageResponse | null>(null);
  const [packageName, setPackageName] = useState("");
  const [packagePrice, setPackagePrice] = useState("");
  const [packageLines, setPackageLines] = useState<PackageLine[]>([]);

  const refresh = () => Promise.all([
    queryClient.invalidateQueries({ queryKey: ["products"] }),
    queryClient.invalidateQueries({ queryKey: ["packages"] }),
  ]);
  const saveProduct = useMutation({
    mutationFn: () => {
      const body = { name: productName.trim(), price: Number(productPrice), applicationCount: productApplications, isActive: true };
      return editingProduct?.id ? DefaultService.productsUpdate(editingProduct.id, body) : DefaultService.productsCreate(body);
    },
    onSuccess: async () => { setProductOpen(false); setFeedback("Produto salvo com sucesso."); await refresh(); },
    onError: () => setFeedback("Não foi possível salvar o produto."),
  });
  const savePackage = useMutation({
    mutationFn: () => {
      const body = { name: packageName.trim(), price: Number(packagePrice), items: packageLines, isActive: true };
      return editingPackage?.id ? DefaultService.packagesUpdate(editingPackage.id, body) : DefaultService.packagesCreate(body);
    },
    onSuccess: async () => { setPackageOpen(false); setFeedback("Pacote salvo com sucesso."); await refresh(); },
    onError: () => setFeedback("Não foi possível salvar o pacote."),
  });
  const removeProduct = useMutation({ mutationFn: DefaultService.productsDelete, onSuccess: async () => { setFeedback("Produto excluído."); await refresh(); }, onError: () => setFeedback("Produto vinculado a pacote não pode ser excluído.") });
  const removePackage = useMutation({ mutationFn: DefaultService.packagesDelete, onSuccess: async () => { setFeedback("Pacote excluído."); await refresh(); }, onError: () => setFeedback("Não foi possível excluir o pacote.") });

  const showProduct = (item?: ProductResponse) => {
    setEditingProduct(item ?? null); setProductName(item?.name ?? ""); setProductPrice(String(item?.price ?? "")); setProductApplications(item?.applicationCount ?? 1); setProductOpen(true);
  };
  const showPackage = (item?: PackageResponse) => {
    setEditingPackage(item ?? null); setPackageName(item?.name ?? ""); setPackagePrice(String(item?.price ?? ""));
    setPackageLines(item?.items?.map(x => ({ productId: x.productId ?? "", applicationCount: x.applicationCount ?? 1 })) ?? []); setPackageOpen(true);
  };
  const addLine = () => {
    const product = products.find(x => x.id && !packageLines.some(line => line.productId === x.id));
    if (product?.id) setPackageLines([...packageLines, { productId: product.id, applicationCount: product.applicationCount ?? 1 }]);
  };

  return <div className="grid gap-5 xl:grid-cols-2">
    {feedback && <div className="xl:col-span-2 rounded-md border border-[var(--border)] bg-[var(--brand-wash)] px-4 py-3 text-sm" role="status">{feedback}</div>}
    <CatalogPanel title="Produtos" count={products.length} action="Novo produto" onAction={() => showProduct()} loading={productsQuery.isLoading}>
      {products.map(item => <CatalogRow key={item.id} title={item.name ?? "Produto"} subtitle={`${formatCurrency(item.price ?? 0)} · ${item.applicationCount ?? 1} aplicação(ões)`} onEdit={() => showProduct(item)} onDelete={() => item.id && confirm("Excluir este produto?") && removeProduct.mutate(item.id)} />)}
    </CatalogPanel>
    <CatalogPanel title="Pacotes" count={packages.length} action="Novo pacote" onAction={() => showPackage()} loading={packagesQuery.isLoading}>
      {packages.map(item => <CatalogRow key={item.id} title={item.name ?? "Pacote"} subtitle={`${formatCurrency(item.price ?? 0)} · ${item.items?.length ?? 0} produto(s)`} onEdit={() => showPackage(item)} onDelete={() => item.id && confirm("Excluir este pacote?") && removePackage.mutate(item.id)} />)}
    </CatalogPanel>
    {productOpen && <Modal title={editingProduct ? "Editar produto" : "Novo produto"} onClose={() => setProductOpen(false)}>
      <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); saveProduct.mutate(); }}>
        <label><span className="label">Nome</span><input autoFocus className="input-field" required minLength={2} value={productName} onChange={e => setProductName(e.target.value)} /></label>
        <label><span className="label">Preço</span><input className="input-field" type="number" required min="0.01" step="0.01" value={productPrice} onChange={e => setProductPrice(e.target.value)} /></label>
        <label><span className="label">Aplicações permitidas</span><input className="input-field" type="number" required min="1" step="1" value={productApplications} onChange={e => setProductApplications(Number(e.target.value))} /></label>
        <FormActions pending={saveProduct.isPending} onCancel={() => setProductOpen(false)} />
      </form>
    </Modal>}
    {packageOpen && <Modal title={editingPackage ? "Editar pacote" : "Novo pacote"} onClose={() => setPackageOpen(false)}>
      <form className="flex flex-col gap-4" onSubmit={e => { e.preventDefault(); if (packageLines.length) savePackage.mutate(); }}>
        <label><span className="label">Nome</span><input autoFocus className="input-field" required minLength={2} value={packageName} onChange={e => setPackageName(e.target.value)} /></label>
        <label><span className="label">Preço</span><input className="input-field" type="number" required min="0.01" step="0.01" value={packagePrice} onChange={e => setPackagePrice(e.target.value)} /></label>
        <fieldset className="flex flex-col gap-3"><legend className="label">Produtos e aplicações</legend>
          {packageLines.map((line, index) => <div className="grid grid-cols-[1fr_7rem_auto] items-end gap-2" key={line.productId}>
            <label><span className="sr-only">Produto</span><select className="input-field" value={line.productId} onChange={e => setPackageLines(packageLines.map((x, i) => i === index ? { ...x, productId: e.target.value } : x))}>{products.map(p => <option disabled={packageLines.some((x, i) => i !== index && x.productId === p.id)} key={p.id} value={p.id}>{p.name}</option>)}</select></label>
            <label><span className="label">Aplicações</span><input className="input-field" type="number" min="1" required value={line.applicationCount} onChange={e => setPackageLines(packageLines.map((x, i) => i === index ? { ...x, applicationCount: Number(e.target.value) } : x))} /></label>
            <button className="btn btn-ghost" type="button" aria-label="Remover produto do pacote" onClick={() => setPackageLines(packageLines.filter((_, i) => i !== index))}>Remover</button>
          </div>)}
          <button className="btn btn-ghost self-start" type="button" disabled={packageLines.length >= products.length} onClick={addLine}>Adicionar produto</button>
          {!packageLines.length && <p className="text-sm text-[var(--muted)]">Adicione ao menos um produto.</p>}
        </fieldset>
        <FormActions pending={savePackage.isPending} onCancel={() => setPackageOpen(false)} />
      </form>
    </Modal>}
  </div>;
}

function CatalogPanel({ title, count, action, onAction, loading, children }: { title: string; count: number; action: string; onAction: () => void; loading: boolean; children: React.ReactNode }) {
  return <section className="panel rounded-lg p-5 md:p-6"><div className="section-heading"><div><h3 className="text-base font-semibold">{title}</h3><p className="mt-1 text-sm text-[var(--muted)]">{count} cadastrado(s)</p></div><button className="btn btn-primary btn-sm" type="button" onClick={onAction}>{action}</button></div>{loading ? <p className="mt-5 text-sm text-[var(--muted)]">Carregando...</p> : <div className="stack-list mt-5">{children}</div>}</section>;
}
function CatalogRow({ title, subtitle, onEdit, onDelete }: { title: string; subtitle: string; onEdit: () => void; onDelete: () => void }) {
  return <div className="data-card flex items-center justify-between gap-3"><div><p className="font-semibold">{title}</p><p className="text-sm text-[var(--muted)]">{subtitle}</p></div><div className="toolbar-inline"><button className="btn btn-ghost btn-sm" type="button" onClick={onEdit}>Editar</button><button className="btn btn-ghost btn-sm text-[var(--danger)]" type="button" onClick={onDelete}>Excluir</button></div></div>;
}
function FormActions({ pending, onCancel }: { pending: boolean; onCancel: () => void }) { return <div className="flex justify-end gap-2"><button className="btn btn-ghost" type="button" onClick={onCancel}>Cancelar</button><button className="btn btn-primary" disabled={pending} type="submit">{pending ? "Salvando..." : "Salvar"}</button></div>; }
