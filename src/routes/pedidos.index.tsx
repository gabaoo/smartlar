import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/common";
import { STATUSES, STATUS_LABEL, api, fmtDate, fmtDateTime, money, pedidoNum, qk, type Status } from "@/lib/smartlar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/pedidos/")({
  validateSearch: (s: Record<string, unknown>): { status?: Status } =>
    STATUSES.includes(s.status as Status) ? { status: s.status as Status } : {},
  head: () => ({
    meta: [
      { title: "Pedidos — SmartLar" },
      { name: "description", content: "Gestão de pedidos, orçamentos e instalações." },
      { property: "og:title", content: "Pedidos — SmartLar" },
      { property: "og:description", content: "Gestão de pedidos, orçamentos e instalações." },
    ],
  }),
  component: PedidosPage,
});

function PedidosPage() {
  const { status } = Route.useSearch();
  const navigate = useNavigate();
  const q = useQuery({ queryKey: qk.pedidos, queryFn: api.pedidos });
  const all = q.data ?? [];
  const list = status ? all.filter((p) => p.status === status) : all;
  const count = (s?: Status) => (s ? all.filter((p) => p.status === s).length : all.length);

  return (
    <>
      <PageHeader
        title="Pedidos"
        description="Acompanhe orçamentos e instalações"
        actions={<Button asChild><Link to="/pedidos/novo"><Plus className="h-4 w-4" /> Novo pedido</Link></Button>}
      />
      <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
        {([undefined, ...STATUSES] as (Status | undefined)[]).map((s) => (
          <Link
            key={s ?? "todos"}
            to="/pedidos"
            search={s ? { status: s } : {}}
            className={cn(
              "whitespace-nowrap rounded-full border px-3 py-1.5 text-sm font-medium transition-colors",
              status === s ? "border-primary bg-primary text-primary-foreground" : "bg-card text-muted-foreground hover:text-foreground",
            )}
          >
            {s ? STATUS_LABEL[s] : "Todos"} <span className="opacity-70">({count(s)})</span>
          </Link>
        ))}
      </div>

      {q.isLoading ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState title="Nenhum pedido encontrado" description={status ? "Não há pedidos com este status." : undefined} />
      ) : (
        <>
          <Card className="hidden overflow-hidden md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nº</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Instalação</TableHead>
                  <TableHead>Criado em</TableHead>
                  <TableHead className="text-right">Valor</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {list.map((p) => (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate({ to: "/pedidos/$id", params: { id: p.id } })}>
                    <TableCell className="font-medium">{pedidoNum(p.numero)}</TableCell>
                    <TableCell>{p.cliente?.nome}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell>{p.tecnico?.nome ?? "—"}</TableCell>
                    <TableCell>{fmtDateTime(p.data_instalacao)}</TableCell>
                    <TableCell>{fmtDate(p.created_at)}</TableCell>
                    <TableCell className="text-right font-semibold">{money(p.valor_total)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
          <div className="space-y-3 md:hidden">
            {list.map((p) => (
              <Link key={p.id} to="/pedidos/$id" params={{ id: p.id }} className="block rounded-lg border bg-card p-4">
                <div className="flex items-center justify-between">
                  <span className="font-semibold">{pedidoNum(p.numero)}</span>
                  <StatusBadge status={p.status} />
                </div>
                <p className="mt-1 font-medium">{p.cliente?.nome}</p>
                <div className="mt-2 flex justify-between text-sm text-muted-foreground">
                  <span>{p.data_instalacao ? `${fmtDateTime(p.data_instalacao)} · ${p.tecnico?.nome ?? ""}` : `Criado ${fmtDate(p.created_at)}`}</span>
                  <span className="font-semibold text-foreground">{money(p.valor_total)}</span>
                </div>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
