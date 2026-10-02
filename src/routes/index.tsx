import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ChevronRight, ClipboardList, Hourglass, Plus, Wallet, TrendingUp } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/common";
import { api, fmtDate, fmtTime, money, pedidoNum, qk } from "@/lib/smartlar";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Dashboard — SmartLar" },
      { name: "description", content: "Indicadores, próximas instalações e orçamentos da SmartLar." },
      { property: "og:title", content: "Dashboard — SmartLar" },
      { property: "og:description", content: "Indicadores, próximas instalações e orçamentos da SmartLar." },
    ],
  }),
  component: Dashboard,
});

function Dashboard() {
  const q = useQuery({ queryKey: qk.pedidos, queryFn: api.pedidos });

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="Visão geral do negócio"
        actions={
          <Button asChild>
            <Link to="/pedidos/novo">
              <Plus className="h-4 w-4" /> Novo pedido
            </Link>
          </Button>
        }
      />
      {q.isLoading ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : (
        <DashboardContent pedidos={q.data ?? []} />
      )}
    </>
  );
}

function DashboardContent({ pedidos }: { pedidos: Awaited<ReturnType<typeof api.pedidos>> }) {
  const now = new Date();
  const doMes = pedidos.filter((p) => {
    const d = new Date(p.created_at);
    return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
  });
  const sum = (arr: typeof pedidos) => arr.reduce((a, p) => a + Number(p.valor_total), 0);
  const faturado = sum(pedidos.filter((p) => p.status === "concluido"));
  const aReceber = sum(pedidos.filter((p) => ["aprovado", "agendado", "em_andamento"].includes(p.status)));
  const pendentes = pedidos.filter((p) => p.status === "aprovado");

  const startToday = new Date(now);
  startToday.setHours(0, 0, 0, 0);
  const in7 = new Date(startToday.getTime() + 8 * 86400000);
  const proximas = pedidos
    .filter(
      (p) =>
        p.data_instalacao &&
        ["agendado", "em_andamento"].includes(p.status) &&
        new Date(p.data_instalacao) >= startToday &&
        new Date(p.data_instalacao) < in7,
    )
    .sort((a, b) => a.data_instalacao!.localeCompare(b.data_instalacao!));
  const orcamentos = pedidos.filter((p) => p.status === "orcamento");

  const kpis = [
    { label: "Pedidos do mês", value: String(doMes.length), icon: ClipboardList },
    { label: "Valor faturado", value: money(faturado), icon: TrendingUp, hint: "Pedidos concluídos" },
    { label: "Valor a receber", value: money(aReceber), icon: Wallet, hint: "Aprovados, agendados e em andamento" },
    { label: "Pendentes de agendamento", value: String(pendentes.length), icon: Hourglass, hint: "Pedidos aprovados" },
  ];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">{k.label}</p>
                <k.icon className="h-4 w-4 text-primary" />
              </div>
              <p className="mt-2 font-display text-2xl font-semibold text-foreground">{k.value}</p>
              {k.hint && <p className="mt-1 text-xs text-muted-foreground">{k.hint}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="h-4 w-4 text-primary" /> Próximas instalações (7 dias)
            </CardTitle>
          </CardHeader>
          <CardContent>
            {proximas.length === 0 ? (
              <EmptyState title="Nenhuma instalação nos próximos 7 dias" />
            ) : (
              <ul className="divide-y">
                {proximas.map((p) => (
                  <li key={p.id}>
                    <Link to="/pedidos/$id" params={{ id: p.id }} className="flex items-start gap-3 py-3 hover:bg-muted/50 -mx-2 px-2 rounded-md">
                      <div className="w-16 shrink-0 rounded-md bg-accent px-2 py-1.5 text-center">
                        <p className="text-xs font-semibold text-accent-foreground">{fmtDate(p.data_instalacao).slice(0, 5)}</p>
                        <p className="text-xs text-accent-foreground/80">{fmtTime(p.data_instalacao)}</p>
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium text-foreground">{p.cliente?.nome}</p>
                        <p className="truncate text-xs text-muted-foreground">{p.cliente?.endereco ?? "Sem endereço"}</p>
                        <p className="mt-0.5 text-xs text-muted-foreground">Técnico: {p.tecnico?.nome ?? "—"}</p>
                      </div>
                      <StatusBadge status={p.status} />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-base">
              <ClipboardList className="h-4 w-4 text-primary" /> Orçamentos aguardando aprovação
            </CardTitle>
          </CardHeader>
          <CardContent>
            {orcamentos.length === 0 ? (
              <EmptyState title="Nenhum orçamento pendente" />
            ) : (
              <ul className="divide-y">
                {orcamentos.map((p) => (
                  <li key={p.id}>
                    <Link to="/pedidos/$id" params={{ id: p.id }} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-3 hover:bg-muted/50">
                      <div className="min-w-0 flex-1">
                        <p className="font-medium text-foreground">
                          {pedidoNum(p.numero)} · {p.cliente?.nome}
                        </p>
                        <p className="text-xs text-muted-foreground">Criado em {fmtDate(p.created_at)}</p>
                      </div>
                      <span className="font-semibold text-foreground">{money(p.valor_total)}</span>
                      <ChevronRight className="h-4 w-4 text-muted-foreground" />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
