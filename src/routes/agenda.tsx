import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { Clock, MapPin } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/common";
import { StatusActions } from "@/components/StatusActions";
import { api, fmtDate, fmtTime, pedidoNum, qk } from "@/lib/smartlar";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/agenda")({
  head: () => ({
    meta: [
      { title: "Agenda dos técnicos — SmartLar" },
      { name: "description", content: "Instalações agendadas por técnico." },
      { property: "og:title", content: "Agenda dos técnicos — SmartLar" },
      { property: "og:description", content: "Instalações agendadas por técnico." },
    ],
  }),
  component: AgendaPage,
});

function AgendaPage() {
  const tecnicos = useQuery({ queryKey: qk.tecnicos, queryFn: api.tecnicos });
  const pedidos = useQuery({ queryKey: qk.pedidos, queryFn: api.pedidos });
  const [tec, setTec] = useState("");
  const [showDone, setShowDone] = useState(false);

  useEffect(() => {
    if (!tec && tecnicos.data?.length) setTec(tecnicos.data[0].id);
  }, [tecnicos.data, tec]);

  const list = (pedidos.data ?? [])
    .filter((p) => p.tecnico_id === tec && p.data_instalacao)
    .filter((p) => (showDone ? true : ["agendado", "em_andamento"].includes(p.status)))
    .sort((a, b) => a.data_instalacao!.localeCompare(b.data_instalacao!));

  return (
    <>
      <PageHeader title="Agenda" description="Instalações por técnico" />
      {tecnicos.isLoading ? (
        <LoadingState />
      ) : tecnicos.isError ? (
        <ErrorState error={tecnicos.error} onRetry={() => tecnicos.refetch()} />
      ) : (
        <>
          <div className="mb-5 flex flex-wrap items-center gap-2">
            {tecnicos.data?.map((t) => (
              <button
                key={t.id}
                onClick={() => setTec(t.id)}
                className={cn(
                  "rounded-lg border px-4 py-2 text-left transition-colors",
                  tec === t.id ? "border-primary bg-primary text-primary-foreground" : "bg-card hover:border-primary/40",
                )}
              >
                <p className="text-sm font-semibold">{t.nome}</p>
                <p className={cn("text-xs", tec === t.id ? "text-primary-foreground/80" : "text-muted-foreground")}>{t.especialidade}</p>
              </button>
            ))}
            <label className="ml-auto flex items-center gap-2 text-sm text-muted-foreground">
              <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} className="accent-primary" />
              Mostrar concluídas
            </label>
          </div>

          {pedidos.isLoading ? (
            <LoadingState />
          ) : pedidos.isError ? (
            <ErrorState error={pedidos.error} onRetry={() => pedidos.refetch()} />
          ) : list.length === 0 ? (
            <EmptyState title="Nenhuma instalação para este técnico" />
          ) : (
            <div className="space-y-3">
              {list.map((p) => (
                <Card key={p.id}>
                  <CardContent className="flex flex-col gap-4 p-4 md:flex-row md:items-center">
                    <div className="flex w-full items-center gap-3 md:w-32 md:flex-col md:items-start md:gap-0">
                      <p className="font-display text-lg font-semibold">{fmtDate(p.data_instalacao)}</p>
                      <p className="flex items-center gap-1 text-sm text-muted-foreground"><Clock className="h-3.5 w-3.5" /> {fmtTime(p.data_instalacao)}</p>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Link to="/pedidos/$id" params={{ id: p.id }} className="font-semibold hover:text-primary">
                          {p.cliente?.nome} <span className="font-normal text-muted-foreground">{pedidoNum(p.numero)}</span>
                        </Link>
                        <StatusBadge status={p.status} />
                      </div>
                      <p className="mt-1 flex items-start gap-1 text-sm text-muted-foreground"><MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" /> {p.cliente?.endereco || "Sem endereço"}</p>
                      <p className="mt-1 text-sm text-foreground">
                        {p.itens.map((i) => `${i.quantidade}× ${i.produto?.nome}`).join(", ")}
                      </p>
                    </div>
                    <StatusActions pedidoId={p.id} status={p.status} size="sm" />
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </>
  );
}
