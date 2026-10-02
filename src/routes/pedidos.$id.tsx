import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/common";
import { StatusActions } from "@/components/StatusActions";
import { STATUS_LABEL, api, fmtDate, fmtDateTime, money, pedidoNum, qk, type Status } from "@/lib/smartlar";

export const Route = createFileRoute("/pedidos/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do pedido — SmartLar" },
      { name: "description", content: "Itens, valores, instalação e histórico do pedido." },
      { property: "og:title", content: "Detalhes do pedido — SmartLar" },
      { property: "og:description", content: "Itens, valores, instalação e histórico do pedido." },
    ],
  }),
  component: PedidoDetalhe,
});

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
      <p className="mt-0.5 text-sm text-foreground">{children}</p>
    </div>
  );
}

function PedidoDetalhe() {
  const { id } = Route.useParams();
  const q = useQuery({ queryKey: qk.pedido(id), queryFn: () => api.pedido(id) });
  const h = useQuery({ queryKey: qk.historico(id), queryFn: () => api.historico(id) });

  if (q.isLoading) return <LoadingState />;
  if (q.isError || !q.data) return <ErrorState error={q.error} onRetry={() => q.refetch()} />;
  const p = q.data;

  return (
    <>
      <Link to="/pedidos" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Pedidos
      </Link>
      <PageHeader title={`Pedido ${pedidoNum(p.numero)}`} description={`Criado em ${fmtDateTime(p.created_at)}`} actions={<StatusBadge status={p.status} />} />

      <Card className="mb-6 border-primary/30 bg-accent/40">
        <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-foreground">
            Status atual: <strong>{STATUS_LABEL[p.status as Status]}</strong>
            {(p.status === "concluido" || p.status === "cancelado") && " — sem novas ações disponíveis."}
          </p>
          <StatusActions pedidoId={p.id} status={p.status} />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Produtos</CardTitle></CardHeader>
            <CardContent className="overflow-x-auto px-0 pb-2">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="pl-6">Produto</TableHead>
                    <TableHead className="text-center">Qtd</TableHead>
                    <TableHead className="text-right">Unitário</TableHead>
                    <TableHead className="pr-6 text-right">Subtotal</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {p.itens.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="pl-6">{i.produto?.nome}</TableCell>
                      <TableCell className="text-center">{i.quantidade}</TableCell>
                      <TableCell className="text-right">{money(i.preco_unitario)}</TableCell>
                      <TableCell className="pr-6 text-right">{money(i.subtotal)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
                <TableFooter>
                  <TableRow>
                    <TableCell colSpan={3} className="pl-6 font-semibold">Valor total</TableCell>
                    <TableCell className="pr-6 text-right font-display text-base font-semibold">{money(p.valor_total)}</TableCell>
                  </TableRow>
                </TableFooter>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Instalação e pagamento</CardTitle></CardHeader>
            <CardContent className="grid gap-4 sm:grid-cols-2">
              <Info label="Técnico">{p.tecnico?.nome ?? "Não definido"}</Info>
              <Info label="Data de instalação">{fmtDateTime(p.data_instalacao)}</Info>
              <Info label="Forma de pagamento">{p.forma_pagamento || "—"}</Info>
              <Info label="Observações">{p.observacoes || "—"}</Info>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Cliente</CardTitle></CardHeader>
            <CardContent className="space-y-3">
              <Info label="Nome">
                {p.cliente ? <Link to="/clientes/$id" params={{ id: p.cliente.id }} className="text-primary hover:underline">{p.cliente.nome}</Link> : "—"}
              </Info>
              <Info label="Telefone / WhatsApp">{p.cliente?.telefone}</Info>
              <Info label="E-mail">{p.cliente?.email || "—"}</Info>
              <Info label="Endereço da instalação">{p.cliente?.endereco || "—"}</Info>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-base">Histórico de status</CardTitle></CardHeader>
            <CardContent>
              {h.isLoading ? <LoadingState /> : h.isError ? <ErrorState error={h.error} /> : (
                <ol className="relative space-y-4 border-l pl-4">
                  {(h.data ?? []).map((e) => (
                    <li key={e.id}>
                      <span className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full border-2 border-card bg-primary" />
                      <p className="text-sm text-foreground">
                        {e.status_anterior ? `${STATUS_LABEL[e.status_anterior as Status]} → ` : "Criado como "}
                        <strong>{STATUS_LABEL[e.status_novo as Status]}</strong>
                      </p>
                      <p className="text-xs text-muted-foreground">{fmtDate(e.created_at)} {new Date(e.created_at).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })}</p>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </>
  );
}
