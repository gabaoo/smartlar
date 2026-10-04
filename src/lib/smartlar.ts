import { supabase } from "@/integrations/supabase/client";
import type { Tables } from "@/integrations/supabase/types";

export type Cliente = Tables<"clientes">;
export type Tecnico = Tables<"tecnicos">;
export type Produto = Tables<"produtos">;
export type Pedido = Tables<"pedidos">;
export type ItemPedido = Tables<"itens_pedido">;
export type Historico = Tables<"historico_status">;

export const STATUSES = [
  "orcamento",
  "aprovado",
  "agendado",
  "em_andamento",
  "concluido",
  "cancelado",
] as const;
export type Status = (typeof STATUSES)[number];

export const STATUS_LABEL: Record<Status, string> = {
  orcamento: "Orçamento",
  aprovado: "Aprovado",
  agendado: "Agendado",
  em_andamento: "Em andamento",
  concluido: "Concluído",
  cancelado: "Cancelado",
};

/** Transições válidas — espelham a função transicao_valida() do banco. */
export const TRANSITIONS: Record<Status, { to: Status; label: string; destructive?: boolean }[]> = {
  orcamento: [
    { to: "aprovado", label: "Aprovar orçamento" },
    { to: "cancelado", label: "Cancelar", destructive: true },
  ],
  aprovado: [
    { to: "agendado", label: "Agendar instalação" },
    { to: "cancelado", label: "Cancelar", destructive: true },
  ],
  agendado: [{ to: "em_andamento", label: "Iniciar instalação" }],
  em_andamento: [{ to: "concluido", label: "Concluir instalação" }],
  concluido: [],
  cancelado: [],
};

export const FORMAS_PAGAMENTO = ["PIX", "Cartão de crédito", "Cartão de débito", "Boleto", "Dinheiro"];

const brl = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });
export const money = (v: number | string | null | undefined) => brl.format(Number(v ?? 0));

export const fmtDate = (d: string | null | undefined) =>
  d ? new Date(d).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "—";
export const fmtTime = (d: string | null | undefined) =>
  d
    ? new Date(d).toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit",
        timeZone: "America/Sao_Paulo",
      })
    : "—";
export const fmtDateTime = (d: string | null | undefined) => (d ? `${fmtDate(d)} ${fmtTime(d)}` : "—");
export const pedidoNum = (n: number | null | undefined) => `#${String(n ?? 0).padStart(4, "0")}`;

export function errMsg(e: unknown): string {
  if (e && typeof e === "object" && "message" in e) return String((e as { message: unknown }).message);
  return "Erro inesperado. Tente novamente.";
}

/* ---------- Queries ---------- */

const PEDIDO_SELECT =
  "*, cliente:clientes(id,nome,telefone,endereco,email), tecnico:tecnicos(id,nome), itens:itens_pedido(id,quantidade,preco_unitario,subtotal,produto:produtos(id,nome,categoria))";

export type PedidoFull = Pedido & {
  cliente: Pick<Cliente, "id" | "nome" | "telefone" | "endereco" | "email"> | null;
  tecnico: Pick<Tecnico, "id" | "nome"> | null;
  itens: (Pick<ItemPedido, "id" | "quantidade" | "preco_unitario" | "subtotal"> & {
    produto: Pick<Produto, "id" | "nome" | "categoria"> | null;
  })[];
};

async function unwrap<T>(p: PromiseLike<{ data: T; error: unknown }>): Promise<NonNullable<T>> {
  const { data, error } = await p;
  if (error) throw error;
  return data as NonNullable<T>;
}

export const api = {
  clientes: () => unwrap(supabase.from("clientes").select("*").order("nome")),
  cliente: (id: string) => unwrap(supabase.from("clientes").select("*").eq("id", id).single()),
  tecnicos: () => unwrap(supabase.from("tecnicos").select("*").order("nome")),
  produtos: () => unwrap(supabase.from("produtos").select("*").order("categoria").order("nome")),
  pedidos: () =>
    unwrap(supabase.from("pedidos").select(PEDIDO_SELECT).order("created_at", { ascending: false })) as Promise<
      PedidoFull[]
    >,
  pedido: (id: string) =>
    unwrap(supabase.from("pedidos").select(PEDIDO_SELECT).eq("id", id).single()) as Promise<PedidoFull>,
  historico: (pedidoId: string) =>
    unwrap(
      supabase.from("historico_status").select("*").eq("pedido_id", pedidoId).order("created_at"),
    ),

  saveCliente: async (c: { id?: string; nome: string; telefone: string; email?: string; endereco?: string }) => {
    const payload = {
      nome: c.nome.trim(),
      telefone: c.telefone.trim(),
      email: c.email?.trim() || null,
      endereco: c.endereco?.trim() || null,
    };
    if (c.id) return unwrap(supabase.from("clientes").update(payload).eq("id", c.id).select().single());
    return unwrap(supabase.from("clientes").insert(payload).select().single());
  },
  saveProduto: async (p: { id?: string; nome: string; categoria: string; preco_unitario: number; descricao?: string }) => {
    const payload = {
      nome: p.nome.trim(),
      categoria: p.categoria.trim(),
      preco_unitario: p.preco_unitario,
      descricao: p.descricao?.trim() || null,
    };
    if (p.id) return unwrap(supabase.from("produtos").update(payload).eq("id", p.id).select().single());
    return unwrap(supabase.from("produtos").insert(payload).select().single());
  },
  criarPedido: (args: {
    cliente_id: string;
    forma_pagamento: string;
    observacoes: string;
    itens: { produto_id: string; quantidade: number }[];
  }) =>
    unwrap(
      supabase.rpc("criar_pedido", {
        _cliente_id: args.cliente_id,
        _forma_pagamento: args.forma_pagamento,
        _observacoes: args.observacoes,
        _itens: args.itens,
      }),
    ) as Promise<string>,
  /** O banco valida a transição (trigger pedidos_validar). */
  alterarStatus: (id: string, status: Status, extra?: { tecnico_id: string; data_instalacao: string }) =>
    unwrap(
      supabase
        .from("pedidos")
        .update({ status, ...(extra ?? {}) })
        .eq("id", id)
        .select()
        .single(),
    ),
};

export const qk = {
  clientes: ["clientes"] as const,
  tecnicos: ["tecnicos"] as const,
  produtos: ["produtos"] as const,
  pedidos: ["pedidos"] as const,
  pedido: (id: string) => ["pedidos", id] as const,
  historico: (id: string) => ["pedidos", id, "historico"] as const,
};
