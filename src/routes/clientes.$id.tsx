import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Mail, MapPin, Pencil, Phone, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState, PageHeader, StatusBadge } from "@/components/common";
import { ClienteFormDialog } from "@/components/ClienteFormDialog";
import { api, fmtDate, money, pedidoNum, qk } from "@/lib/smartlar";

export const Route = createFileRoute("/clientes/$id")({
  head: () => ({
    meta: [
      { title: "Detalhes do cliente — SmartLar" },
      { name: "description", content: "Dados e pedidos do cliente." },
      { property: "og:title", content: "Detalhes do cliente — SmartLar" },
      { property: "og:description", content: "Dados e pedidos do cliente." },
    ],
  }),
  component: ClienteDetalhe,
});

function ClienteDetalhe() {
  const { id } = Route.useParams();
  const c = useQuery({ queryKey: [...qk.clientes, id], queryFn: () => api.cliente(id) });
  const pedidos = useQuery({ queryKey: qk.pedidos, queryFn: api.pedidos });
  const [open, setOpen] = useState(false);

  if (c.isLoading) return <LoadingState />;
  if (c.isError || !c.data) return <ErrorState error={c.error} onRetry={() => c.refetch()} />;
  const cli = c.data;
  const seus = (pedidos.data ?? []).filter((p) => p.cliente_id === id);

  return (
    <>
      <Link to="/clientes" className="mb-3 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
        <ArrowLeft className="h-4 w-4" /> Clientes
      </Link>
      <PageHeader
        title={cli.nome}
        description={`Cliente desde ${fmtDate(cli.created_at)}`}
        actions={
          <Button variant="outline" onClick={() => setOpen(true)}>
            <Pencil className="h-4 w-4" /> Editar
          </Button>
        }
      />
      <div className="grid gap-6 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-3"><CardTitle className="text-base">Contato</CardTitle></CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="flex items-start gap-2"><Phone className="mt-0.5 h-4 w-4 text-primary" /> {cli.telefone}</p>
            <p className="flex items-start gap-2"><Mail className="mt-0.5 h-4 w-4 text-primary" /> {cli.email || "—"}</p>
            <p className="flex items-start gap-2"><MapPin className="mt-0.5 h-4 w-4 text-primary" /> {cli.endereco || "—"}</p>
          </CardContent>
        </Card>
        <Card className="lg:col-span-2">
          <CardHeader className="flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Pedidos ({seus.length})</CardTitle>
            <Button size="sm" asChild>
              <Link to="/pedidos/novo" search={{ cliente: id }}><Plus className="h-4 w-4" /> Novo pedido</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {pedidos.isLoading ? (
              <LoadingState />
            ) : pedidos.isError ? (
              <ErrorState error={pedidos.error} onRetry={() => pedidos.refetch()} />
            ) : seus.length === 0 ? (
              <EmptyState title="Este cliente ainda não possui pedidos" />
            ) : (
              <ul className="divide-y">
                {seus.map((p) => (
                  <li key={p.id}>
                    <Link to="/pedidos/$id" params={{ id: p.id }} className="-mx-2 flex items-center gap-3 rounded-md px-2 py-3 hover:bg-muted/50">
                      <div className="flex-1">
                        <p className="font-medium">{pedidoNum(p.numero)}</p>
                        <p className="text-xs text-muted-foreground">Criado em {fmtDate(p.created_at)}</p>
                      </div>
                      <StatusBadge status={p.status} />
                      <span className="w-28 text-right font-semibold">{money(p.valor_total)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
      <ClienteFormDialog open={open} onOpenChange={setOpen} cliente={cli} />
    </>
  );
}
