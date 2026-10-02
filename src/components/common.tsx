import type { ReactNode } from "react";
import { AlertTriangle, Inbox, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { STATUS_LABEL, errMsg, type Status } from "@/lib/smartlar";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-foreground">{title}</h1>
        {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2">{actions}</div>}
    </div>
  );
}

const statusClasses: Record<Status, string> = {
  orcamento: "bg-status-orcamento/12 text-status-orcamento border-status-orcamento/25",
  aprovado: "bg-status-aprovado/12 text-status-aprovado border-status-aprovado/25",
  agendado: "bg-status-agendado/15 text-status-agendado border-status-agendado/30",
  em_andamento: "bg-status-em_andamento/12 text-status-em_andamento border-status-em_andamento/25",
  concluido: "bg-status-concluido/12 text-status-concluido border-status-concluido/25",
  cancelado: "bg-status-cancelado/12 text-status-cancelado border-status-cancelado/25",
};

export function StatusBadge({ status }: { status: string }) {
  const s = status as Status;
  return (
    <span
      className={cn(
        "inline-flex items-center whitespace-nowrap rounded-full border px-2.5 py-0.5 text-xs font-semibold",
        statusClasses[s],
      )}
    >
      {STATUS_LABEL[s] ?? status}
    </span>
  );
}

export function LoadingState({ label = "Carregando..." }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
      <Loader2 className="h-4 w-4 animate-spin" /> {label}
    </div>
  );
}

export function EmptyState({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-dashed bg-card px-6 py-12 text-center">
      <Inbox className="mb-3 h-8 w-8 text-muted-foreground" />
      <p className="font-medium text-foreground">{title}</p>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function ErrorState({ error, onRetry }: { error: unknown; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center rounded-lg border border-destructive/30 bg-destructive/5 px-6 py-10 text-center">
      <AlertTriangle className="mb-3 h-7 w-7 text-destructive" />
      <p className="font-medium text-foreground">Não foi possível carregar os dados</p>
      <p className="mt-1 text-sm text-muted-foreground">{errMsg(error)}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4" onClick={onRetry}>
          Tentar novamente
        </Button>
      )}
    </div>
  );
}

export function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return <p className="mt-1 text-xs font-medium text-destructive">{msg}</p>;
}
