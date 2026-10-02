
-- ===== Tabelas =====
CREATE TABLE public.clientes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL CHECK (length(trim(nome)) > 0),
  telefone text NOT NULL CHECK (length(trim(telefone)) > 0),
  email text,
  endereco text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.tecnicos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL,
  telefone text,
  especialidade text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.produtos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  nome text NOT NULL CHECK (length(trim(nome)) > 0),
  categoria text NOT NULL,
  preco_unitario numeric(12,2) NOT NULL CHECK (preco_unitario >= 0),
  descricao text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.pedidos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  numero serial UNIQUE,
  cliente_id uuid NOT NULL REFERENCES public.clientes(id) ON DELETE RESTRICT,
  tecnico_id uuid REFERENCES public.tecnicos(id) ON DELETE RESTRICT,
  status text NOT NULL DEFAULT 'orcamento'
    CHECK (status IN ('orcamento','aprovado','agendado','em_andamento','concluido','cancelado')),
  data_instalacao timestamptz,
  valor_total numeric(12,2) NOT NULL DEFAULT 0,
  forma_pagamento text,
  observacoes text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.pedidos(status);
CREATE INDEX ON public.pedidos(cliente_id);
CREATE INDEX ON public.pedidos(tecnico_id, data_instalacao);

CREATE TABLE public.itens_pedido (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  produto_id uuid NOT NULL REFERENCES public.produtos(id) ON DELETE RESTRICT,
  quantidade integer NOT NULL CHECK (quantidade > 0),
  preco_unitario numeric(12,2) NOT NULL CHECK (preco_unitario >= 0),
  subtotal numeric(12,2) GENERATED ALWAYS AS (quantidade * preco_unitario) STORED
);
CREATE INDEX ON public.itens_pedido(pedido_id);

CREATE TABLE public.historico_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  pedido_id uuid NOT NULL REFERENCES public.pedidos(id) ON DELETE CASCADE,
  status_anterior text,
  status_novo text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX ON public.historico_status(pedido_id);

-- ===== Grants + RLS (sistema de uso interno, sem login nesta fase) =====
GRANT SELECT, INSERT, UPDATE ON public.clientes, public.tecnicos, public.produtos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.pedidos TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.itens_pedido TO anon, authenticated;
GRANT SELECT ON public.historico_status TO anon, authenticated;
GRANT USAGE ON SEQUENCE public.pedidos_numero_seq TO anon, authenticated;
GRANT ALL ON public.clientes, public.tecnicos, public.produtos, public.pedidos, public.itens_pedido, public.historico_status TO service_role;

ALTER TABLE public.clientes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tecnicos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.produtos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pedidos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.itens_pedido ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.historico_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "app read clientes" ON public.clientes FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "app insert clientes" ON public.clientes FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "app update clientes" ON public.clientes FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "app read tecnicos" ON public.tecnicos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "app read produtos" ON public.produtos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "app insert produtos" ON public.produtos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "app update produtos" ON public.produtos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "app read pedidos" ON public.pedidos FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "app insert pedidos" ON public.pedidos FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "app update pedidos" ON public.pedidos FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "app read itens" ON public.itens_pedido FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY "app insert itens" ON public.itens_pedido FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "app update itens" ON public.itens_pedido FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "app delete itens" ON public.itens_pedido FOR DELETE TO anon, authenticated USING (true);
CREATE POLICY "app read historico" ON public.historico_status FOR SELECT TO anon, authenticated USING (true);

-- ===== Seed =====
INSERT INTO public.tecnicos (nome, telefone, especialidade) VALUES
 ('Lucas','(11) 98888-1001','Câmeras, Sensores'),
 ('Pedro','(11) 98888-1002','Fechaduras, Iluminação');

INSERT INTO public.produtos (nome, categoria, preco_unitario, descricao) VALUES
 ('Câmera IP','Segurança',450,'Câmera Wi-Fi Full HD com visão noturna e detecção de movimento.'),
 ('Sensor de presença','Segurança',180,'Sensor infravermelho sem fio para alarmes e automações.'),
 ('Fechadura digital','Segurança',1290,'Fechadura com senha, biometria e abertura pelo app.'),
 ('Lâmpada inteligente','Iluminação',89.90,'Lâmpada LED RGB 10W controlada por app e voz.'),
 ('Interruptor inteligente','Iluminação',220,'Interruptor touch Wi-Fi de 2 canais.'),
 ('Hub de automação','Automação',690,'Central Zigbee/Wi-Fi para integrar dispositivos.'),
 ('Assistente de voz','Automação',399,'Smart speaker com assistente de voz integrado.');

INSERT INTO public.clientes (nome, telefone, email, endereco) VALUES
 ('Mariana Souza','(11) 99123-4501','mariana.souza@email.com','Rua das Acácias, 120 - Moema, São Paulo/SP'),
 ('Carlos Oliveira','(11) 99123-4502','carlos.oliveira@email.com','Av. Paulista, 1500, ap 82 - Bela Vista, São Paulo/SP'),
 ('Fernanda Lima','(11) 99123-4503','fernanda.lima@email.com','Rua Harmonia, 45 - Vila Madalena, São Paulo/SP'),
 ('Ricardo Alves','(11) 99123-4504','ricardo.alves@email.com','Alameda Santos, 900 - Jardins, São Paulo/SP'),
 ('Juliana Costa','(11) 99123-4505','juliana.costa@email.com','Rua Augusta, 2300 - Cerqueira César, São Paulo/SP');

DO $$
DECLARE
  c text[] := ARRAY(SELECT id::text FROM public.clientes ORDER BY nome);
  lucas uuid := (SELECT id FROM public.tecnicos WHERE nome='Lucas');
  pedro uuid := (SELECT id FROM public.tecnicos WHERE nome='Pedro');
  p_cam uuid := (SELECT id FROM public.produtos WHERE nome='Câmera IP');
  p_sen uuid := (SELECT id FROM public.produtos WHERE nome='Sensor de presença');
  p_fec uuid := (SELECT id FROM public.produtos WHERE nome='Fechadura digital');
  p_lam uuid := (SELECT id FROM public.produtos WHERE nome='Lâmpada inteligente');
  p_int uuid := (SELECT id FROM public.produtos WHERE nome='Interruptor inteligente');
  p_hub uuid := (SELECT id FROM public.produtos WHERE nome='Hub de automação');
  p_ass uuid := (SELECT id FROM public.produtos WHERE nome='Assistente de voz');
  pid uuid;
BEGIN
  -- 1 orcamento: exemplo obrigatório 2x câmera + 1 sensor = 1080
  INSERT INTO public.pedidos (cliente_id,status,forma_pagamento,observacoes,created_at)
  VALUES (c[1]::uuid,'orcamento','PIX','Cliente quer monitorar entrada e garagem.', now()-interval '1 day') RETURNING id INTO pid;
  INSERT INTO public.itens_pedido (pedido_id,produto_id,quantidade,preco_unitario) VALUES (pid,p_cam,2,450),(pid,p_sen,1,180);

  -- 2 orcamento
  INSERT INTO public.pedidos (cliente_id,status,forma_pagamento,observacoes,created_at)
  VALUES (c[2]::uuid,'orcamento','Cartão de crédito','Automação da sala.', now()-interval '2 days') RETURNING id INTO pid;
  INSERT INTO public.itens_pedido (pedido_id,produto_id,quantidade,preco_unitario) VALUES (pid,p_lam,6,89.90),(pid,p_ass,1,399);

  -- 3 aprovado
  INSERT INTO public.pedidos (cliente_id,status,forma_pagamento,created_at)
  VALUES (c[3]::uuid,'aprovado','Boleto', now()-interval '4 days') RETURNING id INTO pid;
  INSERT INTO public.itens_pedido (pedido_id,produto_id,quantidade,preco_unitario) VALUES (pid,p_fec,1,1290);

  -- 4 aprovado
  INSERT INTO public.pedidos (cliente_id,status,forma_pagamento,created_at)
  VALUES (c[4]::uuid,'aprovado','PIX', now()-interval '3 days') RETURNING id INTO pid;
  INSERT INTO public.itens_pedido (pedido_id,produto_id,quantidade,preco_unitario) VALUES (pid,p_hub,1,690),(pid,p_int,3,220);

  -- 5 agendado (amanhã, Lucas)
  INSERT INTO public.pedidos (cliente_id,tecnico_id,status,data_instalacao,forma_pagamento,created_at)
  VALUES (c[5]::uuid,lucas,'agendado', date_trunc('day', now()) + interval '1 day 9 hours','Cartão de crédito', now()-interval '6 days') RETURNING id INTO pid;
  INSERT INTO public.itens_pedido (pedido_id,produto_id,quantidade,preco_unitario) VALUES (pid,p_cam,4,450),(pid,p_sen,2,180);

  -- 6 agendado (em 3 dias, Pedro)
  INSERT INTO public.pedidos (cliente_id,tecnico_id,status,data_instalacao,forma_pagamento,created_at)
  VALUES (c[1]::uuid,pedro,'agendado', date_trunc('day', now()) + interval '3 days 14 hours','PIX', now()-interval '5 days') RETURNING id INTO pid;
  INSERT INTO public.itens_pedido (pedido_id,produto_id,quantidade,preco_unitario) VALUES (pid,p_fec,1,1290),(pid,p_lam,4,89.90);

  -- 7 em_andamento (hoje, Pedro)
  INSERT INTO public.pedidos (cliente_id,tecnico_id,status,data_instalacao,forma_pagamento,created_at)
  VALUES (c[2]::uuid,pedro,'em_andamento', date_trunc('day', now()) + interval '10 hours','Boleto', now()-interval '8 days') RETURNING id INTO pid;
  INSERT INTO public.itens_pedido (pedido_id,produto_id,quantidade,preco_unitario) VALUES (pid,p_int,4,220),(pid,p_hub,1,690);

  -- 8 concluido (Lucas)
  INSERT INTO public.pedidos (cliente_id,tecnico_id,status,data_instalacao,forma_pagamento,created_at)
  VALUES (c[3]::uuid,lucas,'concluido', date_trunc('day', now()) - interval '2 days' + interval '15 hours','PIX', now()-interval '10 days') RETURNING id INTO pid;
  INSERT INTO public.itens_pedido (pedido_id,produto_id,quantidade,preco_unitario) VALUES (pid,p_cam,2,450),(pid,p_ass,1,399);

  -- 9 concluido (Pedro)
  INSERT INTO public.pedidos (cliente_id,tecnico_id,status,data_instalacao,forma_pagamento,created_at)
  VALUES (c[4]::uuid,pedro,'concluido', date_trunc('day', now()) - interval '5 days' + interval '9 hours','Cartão de crédito', now()-interval '12 days') RETURNING id INTO pid;
  INSERT INTO public.itens_pedido (pedido_id,produto_id,quantidade,preco_unitario) VALUES (pid,p_fec,2,1290);

  -- 10 cancelado
  INSERT INTO public.pedidos (cliente_id,status,forma_pagamento,observacoes,created_at)
  VALUES (c[5]::uuid,'cancelado','PIX','Cliente desistiu.', now()-interval '7 days') RETURNING id INTO pid;
  INSERT INTO public.itens_pedido (pedido_id,produto_id,quantidade,preco_unitario) VALUES (pid,p_lam,10,89.90);

  UPDATE public.pedidos p SET valor_total = COALESCE((SELECT sum(subtotal) FROM public.itens_pedido i WHERE i.pedido_id=p.id),0);
  INSERT INTO public.historico_status (pedido_id,status_anterior,status_novo,created_at)
    SELECT id, NULL, status, created_at FROM public.pedidos;
END $$;

-- ===== Regras de negócio (backend) =====

-- Preço do item vem do catálogo quando não informado
CREATE OR REPLACE FUNCTION public.itens_set_preco()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF NEW.preco_unitario IS NULL THEN
    SELECT preco_unitario INTO NEW.preco_unitario FROM public.produtos WHERE id = NEW.produto_id;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER trg_itens_set_preco BEFORE INSERT ON public.itens_pedido
FOR EACH ROW EXECUTE FUNCTION public.itens_set_preco();

-- Recalcula valor_total do pedido
CREATE OR REPLACE FUNCTION public.recalcular_total_pedido()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE pid uuid := COALESCE(NEW.pedido_id, OLD.pedido_id);
BEGIN
  UPDATE public.pedidos SET valor_total = COALESCE((SELECT sum(subtotal) FROM public.itens_pedido WHERE pedido_id = pid),0)
  WHERE id = pid;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_itens_total AFTER INSERT OR UPDATE OR DELETE ON public.itens_pedido
FOR EACH ROW EXECUTE FUNCTION public.recalcular_total_pedido();

-- Valida transições de status
CREATE OR REPLACE FUNCTION public.transicao_valida(_de text, _para text)
RETURNS boolean LANGUAGE sql IMMUTABLE SET search_path = public AS $$
  SELECT (_de, _para) IN (
    ('orcamento','aprovado'),('aprovado','agendado'),('agendado','em_andamento'),
    ('em_andamento','concluido'),('orcamento','cancelado'),('aprovado','cancelado'))
$$;

CREATE OR REPLACE FUNCTION public.pedidos_validar()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status <> 'orcamento' THEN
      RAISE EXCEPTION 'Novos pedidos devem iniciar com status orcamento';
    END IF;
    RETURN NEW;
  END IF;
  IF NEW.status IS DISTINCT FROM OLD.status THEN
    IF NOT public.transicao_valida(OLD.status, NEW.status) THEN
      RAISE EXCEPTION 'Transição de status inválida: % → %', OLD.status, NEW.status;
    END IF;
  END IF;
  IF NEW.status IN ('agendado','em_andamento','concluido') AND (NEW.tecnico_id IS NULL OR NEW.data_instalacao IS NULL) THEN
    RAISE EXCEPTION 'Técnico e data de instalação são obrigatórios para status %', NEW.status;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END $$;
CREATE TRIGGER trg_pedidos_validar BEFORE INSERT OR UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.pedidos_validar();

-- Histórico de status
CREATE OR REPLACE FUNCTION public.pedidos_historico()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.historico_status (pedido_id, status_anterior, status_novo) VALUES (NEW.id, NULL, NEW.status);
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    INSERT INTO public.historico_status (pedido_id, status_anterior, status_novo) VALUES (NEW.id, OLD.status, NEW.status);
  END IF;
  RETURN NULL;
END $$;
CREATE TRIGGER trg_pedidos_historico AFTER INSERT OR UPDATE ON public.pedidos
FOR EACH ROW EXECUTE FUNCTION public.pedidos_historico();

-- Criação atômica de pedido (preços do catálogo)
CREATE OR REPLACE FUNCTION public.criar_pedido(_cliente_id uuid, _forma_pagamento text, _observacoes text, _itens jsonb)
RETURNS uuid LANGUAGE plpgsql SET search_path = public AS $$
DECLARE pid uuid; it jsonb;
BEGIN
  IF _itens IS NULL OR jsonb_array_length(_itens) = 0 THEN
    RAISE EXCEPTION 'O pedido precisa ter pelo menos um produto';
  END IF;
  INSERT INTO public.pedidos (cliente_id, status, forma_pagamento, observacoes)
  VALUES (_cliente_id, 'orcamento', _forma_pagamento, _observacoes) RETURNING id INTO pid;
  FOR it IN SELECT * FROM jsonb_array_elements(_itens) LOOP
    INSERT INTO public.itens_pedido (pedido_id, produto_id, quantidade, preco_unitario)
    SELECT pid, p.id, (it->>'quantidade')::int, p.preco_unitario
    FROM public.produtos p WHERE p.id = (it->>'produto_id')::uuid;
    IF NOT FOUND THEN RAISE EXCEPTION 'Produto não encontrado'; END IF;
  END LOOP;
  RETURN pid;
END $$;
GRANT EXECUTE ON FUNCTION public.criar_pedido(uuid, text, text, jsonb) TO anon, authenticated;

-- ===== Views para n8n =====
CREATE VIEW public.vw_pedidos_detalhados WITH (security_invoker = true) AS
SELECT p.id, p.numero, p.status, p.valor_total, p.forma_pagamento, p.observacoes,
       p.data_instalacao, p.created_at, p.updated_at,
       c.id AS cliente_id, c.nome AS cliente_nome, c.telefone AS cliente_telefone,
       c.email AS cliente_email, c.endereco AS cliente_endereco,
       t.id AS tecnico_id, t.nome AS tecnico_nome, t.telefone AS tecnico_telefone
FROM public.pedidos p
JOIN public.clientes c ON c.id = p.cliente_id
LEFT JOIN public.tecnicos t ON t.id = p.tecnico_id;

CREATE VIEW public.vw_instalacoes_amanha WITH (security_invoker = true) AS
SELECT * FROM public.vw_pedidos_detalhados
WHERE status = 'agendado'
  AND (data_instalacao AT TIME ZONE 'America/Sao_Paulo')::date = ((now() AT TIME ZONE 'America/Sao_Paulo')::date + 1);

GRANT SELECT ON public.vw_pedidos_detalhados, public.vw_instalacoes_amanha TO anon, authenticated, service_role;
