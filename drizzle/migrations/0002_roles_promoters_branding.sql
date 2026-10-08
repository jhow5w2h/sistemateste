ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'moderator';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'promoter';

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS logo_url text;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS color_1 text;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS color_2 text;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS color_3 text;

CREATE TABLE public.promoters (
  user_id uuid PRIMARY KEY,
  code text NOT NULL UNIQUE,
  goal integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, UPDATE ON public.promoters TO authenticated;
GRANT ALL ON public.promoters TO service_role;
ALTER TABLE public.promoters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "promoter read" ON public.promoters FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.has_role(auth.uid(),'admin'));
CREATE POLICY "admin promoter update" ON public.promoters FOR UPDATE TO authenticated
  USING (public.has_role(auth.uid(),'admin'));

ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS promoter_id uuid;

CREATE OR REPLACE FUNCTION public.has_role_text(_uid uuid, _role text)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (select 1 from public.user_roles where user_id = _uid and role::text = _role)
$$;

CREATE OR REPLACE FUNCTION public.is_staff(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  select exists (select 1 from public.user_roles where user_id = _uid and role::text in ('admin','moderator'))
$$;

CREATE OR REPLACE FUNCTION public.grant_role(_email text, _role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare uid uuid; nm text;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Acesso negado'; end if;
  if _role not in ('admin','moderator','promoter') then raise exception 'Papel inválido'; end if;
  select id, full_name into uid, nm from public.profiles where lower(email) = lower(trim(_email));
  if uid is null then raise exception 'Usuário não encontrado. Peça para criar a conta primeiro.'; end if;
  insert into public.user_roles (user_id, role) values (uid, _role::public.app_role) on conflict do nothing;
  if _role = 'promoter' then
    insert into public.promoters (user_id, code)
    values (uid, upper(substr(regexp_replace(coalesce(nullif(nm,''),'PROMO'),'[^A-Za-z]','','g'),1,6)) || substr(replace(gen_random_uuid()::text,'-',''),1,4))
    on conflict do nothing;
  end if;
end $$;

CREATE OR REPLACE FUNCTION public.revoke_role(_user_id uuid, _role text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Acesso negado'; end if;
  if _user_id = auth.uid() and _role = 'admin' then raise exception 'Você não pode remover seu próprio admin'; end if;
  delete from public.user_roles where user_id = _user_id and role::text = _role;
end $$;

CREATE OR REPLACE FUNCTION public.list_staff()
RETURNS TABLE(user_id uuid, full_name text, email text, role text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Acesso negado'; end if;
  return query select r.user_id, p.full_name, p.email, r.role::text
    from public.user_roles r join public.profiles p on p.id = r.user_id
    where r.role::text <> 'user' order by r.role::text, p.full_name;
end $$;

CREATE OR REPLACE FUNCTION public.check_in_ticket(_code text)
RETURNS json LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare t public.tickets; nm text;
begin
  if not public.is_staff(auth.uid()) then raise exception 'Acesso negado'; end if;
  select * into t from public.tickets where code = upper(trim(_code)) for update;
  if not found then return json_build_object('ok', false, 'message', 'Ingresso não encontrado'); end if;
  if not exists (select 1 from public.orders where id = t.order_id and status = 'pago') then
    return json_build_object('ok', false, 'message', 'Pedido não está pago'); end if;
  select full_name into nm from public.profiles where id = t.user_id;
  if t.checked_in_at is not null then
    return json_build_object('ok', false, 'message', 'Ingresso JÁ USADO em ' || to_char(t.checked_in_at at time zone 'America/Sao_Paulo','DD/MM HH24:MI'), 'name', nm);
  end if;
  update public.tickets set checked_in_at = now() where id = t.id;
  return json_build_object('ok', true, 'message', 'Entrada liberada', 'name', nm);
end $$;

CREATE OR REPLACE FUNCTION public.guest_list(_event_id uuid)
RETURNS TABLE(code text, checked_in_at timestamptz, full_name text, whatsapp text, email text, ticket_type text, atletica text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
begin
  if not public.is_staff(auth.uid()) then raise exception 'Acesso negado'; end if;
  return query select t.code, t.checked_in_at, p.full_name, p.whatsapp, p.email, tt.name, o.atletica
    from public.tickets t
    join public.orders o on o.id = t.order_id and o.status = 'pago'
    join public.ticket_types tt on tt.id = o.ticket_type_id
    left join public.profiles p on p.id = t.user_id
    where t.event_id = _event_id
    order by p.full_name;
end $$;

CREATE OR REPLACE FUNCTION public.staff_events()
RETURNS TABLE(id uuid, name text)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
begin
  if not public.is_staff(auth.uid()) then raise exception 'Acesso negado'; end if;
  return query select e.id, e.name from public.events e where e.status <> 'arquivado' order by e.event_date desc;
end $$;

CREATE OR REPLACE FUNCTION public.set_order_promoter(_order_id uuid, _code text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
declare pid uuid;
begin
  select user_id into pid from public.promoters where code = upper(trim(_code));
  if pid is null or pid = auth.uid() then return; end if;
  update public.orders set promoter_id = pid where id = _order_id and user_id = auth.uid() and promoter_id is null;
end $$;

CREATE OR REPLACE FUNCTION public.promoter_stats(_user_id uuid DEFAULT NULL)
RETURNS TABLE(user_id uuid, full_name text, code text, goal integer, sold bigint, pending bigint, revenue numeric)
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
begin
  if not (public.has_role(auth.uid(),'admin') or (public.has_role_text(auth.uid(),'promoter') and _user_id = auth.uid())) then
    raise exception 'Acesso negado'; end if;
  return query select pr.user_id, p.full_name, pr.code, pr.goal,
    coalesce(sum(o.quantity) filter (where o.status = 'pago'),0)::bigint,
    coalesce(sum(o.quantity) filter (where o.status = 'aguardando_pagamento'),0)::bigint,
    coalesce(sum(o.total) filter (where o.status = 'pago'),0)
    from public.promoters pr
    left join public.profiles p on p.id = pr.user_id
    left join public.orders o on o.promoter_id = pr.user_id
    where _user_id is null or pr.user_id = _user_id
    group by pr.user_id, p.full_name, pr.code, pr.goal
    order by 5 desc;
end $$;