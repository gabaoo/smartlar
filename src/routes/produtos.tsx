import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2, Pencil, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { EmptyState, ErrorState, FieldError, LoadingState, PageHeader } from "@/components/common";
import { api, errMsg, money, qk, type Produto } from "@/lib/smartlar";

export const Route = createFileRoute("/produtos")({
  head: () => ({
    meta: [
      { title: "Produtos — SmartLar" },
      { name: "description", content: "Catálogo de produtos de automação residencial." },
      { property: "og:title", content: "Produtos — SmartLar" },
      { property: "og:description", content: "Catálogo de produtos de automação residencial." },
    ],
  }),
  component: ProdutosPage,
});

function ProdutosPage() {
  const q = useQuery({ queryKey: qk.produtos, queryFn: api.produtos });
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Produto | null>(null);
  const [open, setOpen] = useState(false);

  const term = search.trim().toLowerCase();
  const list = (q.data ?? []).filter(
    (p) => !term || p.nome.toLowerCase().includes(term) || p.categoria.toLowerCase().includes(term) || (p.descricao ?? "").toLowerCase().includes(term),
  );
  const groups = list.reduce<Record<string, Produto[]>>((acc, p) => {
    (acc[p.categoria] ??= []).push(p);
    return acc;
  }, {});

  return (
    <>
      <PageHeader
        title="Produtos"
        description="Catálogo e preços usados nos pedidos"
        actions={<Button onClick={() => { setEditing(null); setOpen(true); }}><Plus className="h-4 w-4" /> Novo produto</Button>}
      />
      <div className="relative mb-6 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar produto ou categoria" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {q.isLoading ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState title={term ? "Nenhum produto encontrado" : "Nenhum produto cadastrado"} />
      ) : (
        <div className="space-y-8">
          {Object.entries(groups).map(([cat, items]) => (
            <section key={cat}>
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {cat} <span className="font-normal">({items.length})</span>
              </h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {items.map((p) => (
                  <Card key={p.id}>
                    <CardContent className="flex h-full flex-col p-5">
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-semibold text-foreground">{p.nome}</p>
                        <Button variant="ghost" size="icon" className="-mr-2 -mt-2 h-8 w-8" aria-label="Editar" onClick={() => { setEditing(p); setOpen(true); }}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                      </div>
                      <p className="mt-1 flex-1 text-sm text-muted-foreground">{p.descricao || "Sem descrição"}</p>
                      <p className="mt-3 font-display text-lg font-semibold text-primary">{money(p.preco_unitario)}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
      <ProdutoDialog open={open} onOpenChange={setOpen} produto={editing} categorias={[...new Set((q.data ?? []).map((p) => p.categoria))]} />
    </>
  );
}

function ProdutoDialog({ open, onOpenChange, produto, categorias }: { open: boolean; onOpenChange: (o: boolean) => void; produto: Produto | null; categorias: string[] }) {
  const qc = useQueryClient();
  const [f, setF] = useState({ nome: "", categoria: "", preco: "", descricao: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  useEffect(() => {
    if (open) {
      setF({ nome: produto?.nome ?? "", categoria: produto?.categoria ?? "", preco: produto ? String(produto.preco_unitario) : "", descricao: produto?.descricao ?? "" });
      setErrors({});
    }
  }, [open, produto]);

  const m = useMutation({
    mutationFn: () => api.saveProduto({ id: produto?.id, nome: f.nome, categoria: f.categoria, preco_unitario: Number(f.preco.replace(",", ".")), descricao: f.descricao }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: qk.produtos });
      toast.success(produto ? "Produto atualizado" : "Produto cadastrado");
      onOpenChange(false);
    },
    onError: (e) => toast.error(`Erro ao salvar produto: ${errMsg(e)}`),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!f.nome.trim()) er.nome = "Informe o nome";
    if (!f.categoria.trim()) er.categoria = "Informe a categoria";
    const preco = Number(f.preco.replace(",", "."));
    if (!f.preco || isNaN(preco) || preco < 0) er.preco = "Informe um preço válido";
    setErrors(er);
    if (!Object.keys(er).length) m.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader><DialogTitle>{produto ? "Editar produto" : "Novo produto"}</DialogTitle></DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="p-nome">Nome *</Label>
            <Input id="p-nome" value={f.nome} onChange={(e) => setF({ ...f, nome: e.target.value })} />
            <FieldError msg={errors.nome} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="p-cat">Categoria *</Label>
              <Input id="p-cat" list="cats" value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value })} />
              <datalist id="cats">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
              <FieldError msg={errors.categoria} />
            </div>
            <div>
              <Label htmlFor="p-preco">Preço (R$) *</Label>
              <Input id="p-preco" inputMode="decimal" value={f.preco} onChange={(e) => setF({ ...f, preco: e.target.value })} />
              <FieldError msg={errors.preco} />
            </div>
          </div>
          <div>
            <Label htmlFor="p-desc">Descrição</Label>
            <Textarea id="p-desc" rows={3} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} />
          </div>
          {produto && <p className="text-xs text-muted-foreground">Alterar o preço afeta apenas novos pedidos. Pedidos já criados mantêm o preço registrado.</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={m.isPending}>{m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
