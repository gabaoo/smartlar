import { useEffect, useMemo, useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Check, Loader2, Minus, Plus, Trash2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { EmptyState, ErrorState, FieldError, LoadingState, PageHeader } from "@/components/common";
import { ClienteFormDialog } from "@/components/ClienteFormDialog";
import { FORMAS_PAGAMENTO, api, errMsg, money, qk } from "@/lib/smartlar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pedidos/novo")({
  validateSearch: (s: Record<string, unknown>): { cliente?: string } =>
    typeof s.cliente === "string" ? { cliente: s.cliente } : {},
  head: () => ({
    meta: [
      { title: "Novo pedido — SmartLar" },
      { name: "description", content: "Crie um novo orçamento para um cliente." },
      { property: "og:title", content: "Novo pedido — SmartLar" },
      { property: "og:description", content: "Crie um novo orçamento para um cliente." },
    ],
  }),
  component: NovoPedido,
});

const STEPS = ["Cliente", "Produtos", "Resumo"];

function NovoPedido() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const qc = useQueryClient();
  const clientes = useQuery({ queryKey: qk.clientes, queryFn: api.clientes });
  const produtos = useQuery({ queryKey: qk.produtos, queryFn: api.produtos });

  const [step, setStep] = useState(0);
  const [clienteId, setClienteId] = useState(search.cliente ?? "");
  const [novoCli, setNovoCli] = useState(false);
  const [itens, setItens] = useState<{ produto_id: string; quantidade: number }[]>([]);
  const [prodSel, setProdSel] = useState("");
  const [qtd, setQtd] = useState("1");
  const [pagamento, setPagamento] = useState("");
  const [obs, setObs] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => { if (search.cliente) setClienteId(search.cliente); }, [search.cliente]);

  const prodMap = useMemo(() => new Map((produtos.data ?? []).map((p) => [p.id, p])), [produtos.data]);
  const linhas = itens.map((i) => {
    const p = prodMap.get(i.produto_id);
    const preco = Number(p?.preco_unitario ?? 0);
    return { ...i, nome: p?.nome ?? "", preco, subtotal: preco * i.quantidade };
  });
  const total = linhas.reduce((a, l) => a + l.subtotal, 0);
  const cliente = clientes.data?.find((c) => c.id === clienteId);

  const addItem = () => {
    const n = parseInt(qtd, 10);
    const er: Record<string, string> = {};
    if (!prodSel) er.prod = "Selecione um produto";
    if (!n || n < 1) er.qtd = "Quantidade mínima: 1";
    setErrors(er);
    if (Object.keys(er).length) return;
    setItens((prev) => {
      const ex = prev.find((i) => i.produto_id === prodSel);
      if (ex) return prev.map((i) => (i.produto_id === prodSel ? { ...i, quantidade: i.quantidade + n } : i));
      return [...prev, { produto_id: prodSel, quantidade: n }];
    });
    setProdSel("");
    setQtd("1");
  };
  const setQ = (id: string, q: number) => setItens((prev) => prev.map((i) => (i.produto_id === id ? { ...i, quantidade: Math.max(1, q) } : i)));
  const remove = (id: string) => setItens((prev) => prev.filter((i) => i.produto_id !== id));

  const next = () => {
    if (step === 0 && !clienteId) return setErrors({ cliente: "Selecione ou cadastre um cliente" });
    if (step === 1 && itens.length === 0) return setErrors({ itens: "Adicione pelo menos um produto" });
    setErrors({});
    setStep((s) => s + 1);
  };

  const m = useMutation({
    mutationFn: () => api.criarPedido({ cliente_id: clienteId, forma_pagamento: pagamento, observacoes: obs.trim(), itens }),
    onSuccess: (id) => {
      qc.invalidateQueries({ queryKey: qk.pedidos });
      toast.success("Orçamento criado com sucesso");
      navigate({ to: "/pedidos/$id", params: { id } });
    },
    onError: (e) => toast.error(`Erro ao salvar pedido: ${errMsg(e)}`),
  });

  const salvar = () => {
    if (!pagamento) return setErrors({ pagamento: "Selecione a forma de pagamento" });
    setErrors({});
    m.mutate();
  };

  if (clientes.isLoading || produtos.isLoading) return <LoadingState />;
  if (clientes.isError || produtos.isError)
    return <ErrorState error={clientes.error ?? produtos.error} onRetry={() => { clientes.refetch(); produtos.refetch(); }} />;

  return (
    <>
      <PageHeader title="Novo pedido" description="O pedido será criado com status Orçamento" />

      <ol className="mb-6 flex items-center gap-2">
        {STEPS.map((s, i) => (
          <li key={s} className="flex flex-1 items-center gap-2">
            <span className={cn("flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
              i < step ? "border-primary bg-primary text-primary-foreground" : i === step ? "border-primary text-primary" : "text-muted-foreground")}>
              {i < step ? <Check className="h-4 w-4" /> : i + 1}
            </span>
            <span className={cn("text-sm font-medium", i === step ? "text-foreground" : "text-muted-foreground")}>{s}</span>
            {i < STEPS.length - 1 && <span className="h-px flex-1 bg-border" />}
          </li>
        ))}
      </ol>

      {step === 0 && (
        <Card>
          <CardHeader><CardTitle className="text-base">1. Cliente</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Cliente existente</Label>
              <Select value={clienteId} onValueChange={setClienteId}>
                <SelectTrigger aria-invalid={!!errors.cliente}><SelectValue placeholder="Selecione um cliente" /></SelectTrigger>
                <SelectContent>
                  {clientes.data?.map((c) => <SelectItem key={c.id} value={c.id}>{c.nome} — {c.telefone}</SelectItem>)}
                </SelectContent>
              </Select>
              <FieldError msg={errors.cliente} />
            </div>
            {cliente && (
              <div className="rounded-md bg-muted p-3 text-sm">
                <p className="font-medium">{cliente.nome}</p>
                <p className="text-muted-foreground">{cliente.telefone} · {cliente.endereco || "Sem endereço"}</p>
              </div>
            )}
            <Button variant="outline" onClick={() => setNovoCli(true)}><UserPlus className="h-4 w-4" /> Cadastrar novo cliente</Button>
          </CardContent>
        </Card>
      )}

      {step === 1 && (
        <Card>
          <CardHeader><CardTitle className="text-base">2. Produtos</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_110px_auto] sm:items-start">
              <div>
                <Label>Produto</Label>
                <Select value={prodSel} onValueChange={setProdSel}>
                  <SelectTrigger aria-invalid={!!errors.prod}><SelectValue placeholder="Selecione um produto" /></SelectTrigger>
                  <SelectContent>
                    {produtos.data?.map((p) => <SelectItem key={p.id} value={p.id}>{p.nome} — {money(p.preco_unitario)}</SelectItem>)}
                  </SelectContent>
                </Select>
                <FieldError msg={errors.prod} />
              </div>
              <div>
                <Label htmlFor="qtd">Quantidade</Label>
                <Input id="qtd" type="number" min={1} value={qtd} onChange={(e) => setQtd(e.target.value)} aria-invalid={!!errors.qtd} />
                <FieldError msg={errors.qtd} />
              </div>
              <Button className="sm:mt-6" onClick={addItem}><Plus className="h-4 w-4" /> Adicionar</Button>
            </div>

            {linhas.length === 0 ? (
              <EmptyState title="Nenhum produto adicionado" description="Selecione um produto e a quantidade acima." />
            ) : (
              <ItensTable linhas={linhas} total={total} onQty={setQ} onRemove={remove} editable />
            )}
            <FieldError msg={errors.itens} />
          </CardContent>
        </Card>
      )}

      {step === 2 && (
        <Card>
          <CardHeader><CardTitle className="text-base">3. Resumo</CardTitle></CardHeader>
          <CardContent className="space-y-5">
            <div className="rounded-md bg-muted p-3 text-sm">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">Cliente</p>
              <p className="font-medium">{cliente?.nome}</p>
              <p className="text-muted-foreground">{cliente?.telefone} · {cliente?.endereco || "Sem endereço"}</p>
            </div>
            <ItensTable linhas={linhas} total={total} />
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label>Forma de pagamento *</Label>
                <Select value={pagamento} onValueChange={setPagamento}>
                  <SelectTrigger aria-invalid={!!errors.pagamento}><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>{FORMAS_PAGAMENTO.map((f) => <SelectItem key={f} value={f}>{f}</SelectItem>)}</SelectContent>
                </Select>
                <FieldError msg={errors.pagamento} />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="obs">Observações</Label>
                <Textarea id="obs" rows={3} value={obs} onChange={(e) => setObs(e.target.value)} placeholder="Ex.: instalar câmera na garagem" />
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="mt-6 flex justify-between">
        <Button variant="outline" onClick={() => (step === 0 ? navigate({ to: "/pedidos" }) : setStep(step - 1))}>
          {step === 0 ? "Cancelar" : "Voltar"}
        </Button>
        {step < 2 ? (
          <Button onClick={next}>Continuar</Button>
        ) : (
          <Button onClick={salvar} disabled={m.isPending}>{m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar orçamento</Button>
        )}
      </div>

      <ClienteFormDialog open={novoCli} onOpenChange={setNovoCli} onSaved={(c) => { setClienteId(c.id); setErrors({}); }} />
    </>
  );
}

function ItensTable({
  linhas, total, editable, onQty, onRemove,
}: {
  linhas: { produto_id: string; nome: string; quantidade: number; preco: number; subtotal: number }[];
  total: number;
  editable?: boolean;
  onQty?: (id: string, q: number) => void;
  onRemove?: (id: string) => void;
}) {
  return (
    <div className="overflow-hidden rounded-md border">
      <div className="divide-y">
        {linhas.map((l) => (
          <div key={l.produto_id} className="flex flex-wrap items-center gap-3 px-4 py-3 text-sm">
            <div className="min-w-0 flex-1">
              <p className="font-medium">{l.nome}</p>
              <p className="text-xs text-muted-foreground">{money(l.preco)} cada</p>
            </div>
            {editable ? (
              <div className="flex items-center gap-1">
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onQty?.(l.produto_id, l.quantidade - 1)} aria-label="Diminuir"><Minus className="h-3 w-3" /></Button>
                <Input className="h-8 w-14 text-center" type="number" min={1} value={l.quantidade} onChange={(e) => onQty?.(l.produto_id, parseInt(e.target.value, 10) || 1)} />
                <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onQty?.(l.produto_id, l.quantidade + 1)} aria-label="Aumentar"><Plus className="h-3 w-3" /></Button>
              </div>
            ) : (
              <span className="text-muted-foreground">× {l.quantidade}</span>
            )}
            <span className="w-28 text-right font-semibold">{money(l.subtotal)}</span>
            {editable && (
              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive" onClick={() => onRemove?.(l.produto_id)} aria-label="Remover"><Trash2 className="h-4 w-4" /></Button>
            )}
          </div>
        ))}
      </div>
      <div className="flex items-center justify-between bg-muted px-4 py-3">
        <span className="font-semibold">Valor total</span>
        <span className="font-display text-lg font-semibold">{money(total)}</span>
      </div>
    </div>
  );
}
