import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { FieldError } from "@/components/common";
import { api, errMsg, qk, type Cliente } from "@/lib/smartlar";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  cliente?: Cliente | null;
  onSaved?: (c: Cliente) => void;
};

export function ClienteFormDialog({ open, onOpenChange, cliente, onSaved }: Props) {
  const qc = useQueryClient();
  const [form, setForm] = useState({ nome: "", telefone: "", email: "", endereco: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (open) {
      setForm({
        nome: cliente?.nome ?? "",
        telefone: cliente?.telefone ?? "",
        email: cliente?.email ?? "",
        endereco: cliente?.endereco ?? "",
      });
      setErrors({});
    }
  }, [open, cliente]);

  const m = useMutation({
    mutationFn: () => api.saveCliente({ id: cliente?.id, ...form }),
    onSuccess: (c) => {
      qc.invalidateQueries({ queryKey: qk.clientes });
      qc.invalidateQueries({ queryKey: qk.pedidos });
      toast.success(cliente ? "Cliente atualizado" : "Cliente cadastrado");
      onSaved?.(c);
      onOpenChange(false);
    },
    onError: (e) => toast.error(`Erro ao salvar cliente: ${errMsg(e)}`),
  });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const er: Record<string, string> = {};
    if (!form.nome.trim()) er.nome = "Informe o nome";
    if (!form.telefone.trim()) er.telefone = "Informe o telefone (WhatsApp)";
    else if (form.telefone.replace(/\D/g, "").length < 10) er.telefone = "Telefone inválido (inclua o DDD)";
    if (form.email && !/^\S+@\S+\.\S+$/.test(form.email)) er.email = "E-mail inválido";
    setErrors(er);
    if (Object.keys(er).length === 0) m.mutate();
  };

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{cliente ? "Editar cliente" : "Novo cliente"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4" noValidate>
          <div>
            <Label htmlFor="c-nome">Nome *</Label>
            <Input id="c-nome" value={form.nome} onChange={set("nome")} aria-invalid={!!errors.nome} />
            <FieldError msg={errors.nome} />
          </div>
          <div>
            <Label htmlFor="c-tel">Telefone / WhatsApp *</Label>
            <Input id="c-tel" value={form.telefone} onChange={set("telefone")} placeholder="(11) 99999-0000" aria-invalid={!!errors.telefone} />
            <FieldError msg={errors.telefone} />
          </div>
          <div>
            <Label htmlFor="c-email">E-mail</Label>
            <Input id="c-email" type="email" value={form.email} onChange={set("email")} aria-invalid={!!errors.email} />
            <FieldError msg={errors.email} />
          </div>
          <div>
            <Label htmlFor="c-end">Endereço da instalação</Label>
            <Textarea id="c-end" rows={2} value={form.endereco} onChange={set("endereco")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={m.isPending}>
              {m.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
