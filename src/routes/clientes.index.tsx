import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Pencil, Plus, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { EmptyState, ErrorState, LoadingState, PageHeader } from "@/components/common";
import { ClienteFormDialog } from "@/components/ClienteFormDialog";
import { api, qk, type Cliente } from "@/lib/smartlar";

export const Route = createFileRoute("/clientes/")({
  head: () => ({
    meta: [
      { title: "Clientes — SmartLar" },
      { name: "description", content: "Cadastro e consulta de clientes da SmartLar." },
      { property: "og:title", content: "Clientes — SmartLar" },
      { property: "og:description", content: "Cadastro e consulta de clientes da SmartLar." },
    ],
  }),
  component: ClientesPage,
});

function ClientesPage() {
  const q = useQuery({ queryKey: qk.clientes, queryFn: api.clientes });
  const [search, setSearch] = useState("");
  const [editing, setEditing] = useState<Cliente | null>(null);
  const [open, setOpen] = useState(false);

  const term = search.trim().toLowerCase();
  const digits = term.replace(/\D/g, "");
  const list = (q.data ?? []).filter(
    (c) => !term || c.nome.toLowerCase().includes(term) || (digits && c.telefone.replace(/\D/g, "").includes(digits)),
  );

  return (
    <>
      <PageHeader
        title="Clientes"
        description="Gerencie os clientes e seus pedidos"
        actions={
          <Button onClick={() => { setEditing(null); setOpen(true); }}>
            <Plus className="h-4 w-4" /> Novo cliente
          </Button>
        }
      />
      <div className="relative mb-4 max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input className="pl-9" placeholder="Buscar por nome ou telefone" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>

      {q.isLoading ? (
        <LoadingState />
      ) : q.isError ? (
        <ErrorState error={q.error} onRetry={() => q.refetch()} />
      ) : list.length === 0 ? (
        <EmptyState title={term ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"} description={term ? "Tente outro termo de busca." : undefined} />
      ) : (
        <Card className="overflow-hidden">
          <ul className="divide-y">
            {list.map((c) => (
              <li key={c.id} className="flex items-center gap-3 px-4 py-3">
                <Link to="/clientes/$id" params={{ id: c.id }} className="min-w-0 flex-1 hover:underline-offset-2">
                  <p className="font-medium text-foreground">{c.nome}</p>
                  <p className="truncate text-sm text-muted-foreground">
                    {c.telefone}
                    {c.email ? ` · ${c.email}` : ""}
                  </p>
                  <p className="truncate text-xs text-muted-foreground">{c.endereco}</p>
                </Link>
                <Button variant="ghost" size="icon" aria-label="Editar" onClick={() => { setEditing(c); setOpen(true); }}>
                  <Pencil className="h-4 w-4" />
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}
      <ClienteFormDialog open={open} onOpenChange={setOpen} cliente={editing} />
    </>
  );
}
