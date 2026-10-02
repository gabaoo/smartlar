import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { FieldError } from "@/components/common";
import { STATUS_LABEL, TRANSITIONS, api, errMsg, qk, type Status } from "@/lib/smartlar";

type Props = { pedidoId: string; status: string; size?: "sm" | "default" };

export function StatusActions({ pedidoId, status, size = "default" }: Props) {
  const qc = useQueryClient();
  const [confirm, setConfirm] = useState<{ to: Status; label: string; destructive?: boolean } | null>(null);
  const [scheduling, setScheduling] = useState(false);
  const transitions = TRANSITIONS[status as Status] ?? [];

  const m = useMutation({
    mutationFn: (v: { to: Status; extra?: { tecnico_id: string; data_instalacao: string } }) =>
      api.alterarStatus(pedidoId, v.to, v.extra),
    onSuccess: (_d, v) => {
      qc.invalidateQueries({ queryKey: qk.pedidos });
      toast.success(`Pedido atualizado para "${STATUS_LABEL[v.to]}"`);
      setConfirm(null);
      setScheduling(false);
    },
    onError: (e) => toast.error(errMsg(e)),
  });

  if (transitions.length === 0) return null;

  return (
    <>
      <div className="flex flex-wrap gap-2">
        {transitions.map((t) => (
          <Button
            key={t.to}
            size={size}
            variant={t.destructive ? "outline" : "default"}
            className={t.destructive ? "border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive" : ""}
            disabled={m.isPending}
            onClick={() => (t.to === "agendado" ? setScheduling(true) : setConfirm(t))}
          >
            {t.label}
          </Button>
        ))}
      </div>

      <Dialog open={!!confirm} onOpenChange={(o) => !o && setConfirm(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{confirm?.label}?</DialogTitle>
            <DialogDescription>
              O pedido passará de <strong>{STATUS_LABEL[status as Status]}</strong> para{" "}
              <strong>{confirm && STATUS_LABEL[confirm.to]}</strong>. Essa ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirm(null)}>
              Voltar
            </Button>
            <Button
              variant={confirm?.destructive ? "destructive" : "default"}
              disabled={m.isPending}
              onClick={() => confirm && m.mutate({ to: confirm.to })}
            >
              {m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Confirmar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ScheduleDialog
        open={scheduling}
        onOpenChange={setScheduling}
        pending={m.isPending}
        onSubmit={(extra) => m.mutate({ to: "agendado", extra })}
      />
    </>
  );
}

function ScheduleDialog({
  open,
  onOpenChange,
  pending,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  pending: boolean;
  onSubmit: (v: { tecnico_id: string; data_instalacao: string }) => void;
}) {
  const tecnicos = useQuery({ queryKey: qk.tecnicos, queryFn: api.tecnicos, enabled: open });
  const [tecnico, setTecnico] = useState("");
  const [data, setData] = useState("");
  const [hora, setHora] = useState("09:00");
  const [errors, setErrors] = useState<Record<string, string>>({});

  const submit = () => {
    const er: Record<string, string> = {};
    if (!tecnico) er.tecnico = "Selecione o técnico";
    if (!data) er.data = "Informe a data da instalação";
    if (!hora) er.hora = "Informe o horário";
    setErrors(er);
    if (Object.keys(er).length) return;
    // Horário de Brasília (UTC-3)
    onSubmit({ tecnico_id: tecnico, data_instalacao: new Date(`${data}T${hora}:00-03:00`).toISOString() });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agendar instalação</DialogTitle>
          <DialogDescription>Técnico e data são obrigatórios para agendar.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Técnico *</Label>
            <Select value={tecnico} onValueChange={setTecnico}>
              <SelectTrigger aria-invalid={!!errors.tecnico}>
                <SelectValue placeholder={tecnicos.isLoading ? "Carregando..." : "Selecione"} />
              </SelectTrigger>
              <SelectContent>
                {tecnicos.data?.map((t) => (
                  <SelectItem key={t.id} value={t.id}>
                    {t.nome} — {t.especialidade}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <FieldError msg={errors.tecnico} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="s-data">Data *</Label>
              <Input id="s-data" type="date" value={data} onChange={(e) => setData(e.target.value)} aria-invalid={!!errors.data} />
              <FieldError msg={errors.data} />
            </div>
            <div>
              <Label htmlFor="s-hora">Horário *</Label>
              <Input id="s-hora" type="time" value={hora} onChange={(e) => setHora(e.target.value)} aria-invalid={!!errors.hora} />
              <FieldError msg={errors.hora} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending && <Loader2 className="h-4 w-4 animate-spin" />} Agendar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
