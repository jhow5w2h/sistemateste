create type public.app_role as enum ('admin','user');
create type public.order_status as enum ('aguardando_pagamento','pago','cancelado');
create type public.event_status as enum ('ativo','inativo','arquivado');

create table public.profiles (
  id uuid primary key,
  full_name text not null default '',
  whatsapp text not null default '',
  email text,
  created_at timestamptz not null default now()
);
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  role app_role not null,
  unique(user_id, role)
);
create table public.events (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text not null default '',
  event_date date not null,
  event_time text not null default '',
  location text not null default '',
  poster_url text,
  status event_status not null default 'ativo',
  created_at timestamptz not null default now()
);
create table public.ticket_types (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  price numeric(10,2) not null default 0,
  total_quantity int not null default 0,
  sold int not null default 0,
  active boolean not null default true,
  payment_link text,
  created_at timestamptz not null default now()
);
create table public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  event_id uuid not null references public.events(id) on delete cascade,
  ticket_type_id uuid not null references public.ticket_types(id) on delete cascade,
  quantity int not null check (quantity > 0),
  unit_price numeric(10,2) not null,
  total numeric(10,2) not null,
  status order_status not null default 'aguardando_pagamento',
  receipt_path text,
  paid_at timestamptz,
  paid_by uuid,
  payment_reference text,
  created_at timestamptz not null default now()
);
create table public.tickets (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  user_id uuid not null,
  event_id uuid not null references public.events(id) on delete cascade,
  code text not null unique default upper(substr(replace(gen_random_uuid()::text,'-',''),1,12)),
  checked_in_at timestamptz,
  created_at timestamptz not null default now()
);
create table public.settings (
  id int primary key default 1 check (id = 1),
  receiver_name text not null default 'BECO42',
  support_whatsapp text not null default '',
  payment_message text not null default 'Pague pelo link oficial e envie o comprovante para agilizar a conferência.'
);
insert into public.settings (id) values (1);

grant select, insert, update on public.profiles to authenticated;
grant select on public.user_roles to authenticated;
grant select on public.events, public.ticket_types, public.settings to anon, authenticated;
grant insert, update, delete on public.events, public.ticket_types to authenticated;
grant update on public.settings to authenticated;
grant select, update on public.orders to authenticated;
grant select on public.tickets to authenticated;
grant all on public.profiles, public.user_roles, public.events, public.ticket_types, public.orders, public.tickets, public.settings to service_role;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.events enable row level security;
alter table public.ticket_types enable row level security;
alter table public.orders enable row level security;
alter table public.tickets enable row level security;
alter table public.settings enable row level security;

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create policy "own profile read" on public.profiles for select to authenticated using (id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "own profile insert" on public.profiles for insert to authenticated with check (id = auth.uid());
create policy "own profile update" on public.profiles for update to authenticated using (id = auth.uid());
create policy "own roles read" on public.user_roles for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "public events" on public.events for select using (status = 'ativo' or public.has_role(auth.uid(),'admin'));
create policy "admin events" on public.events for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "public tickets types" on public.ticket_types for select using (true);
create policy "admin ticket types" on public.ticket_types for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));
create policy "own orders" on public.orders for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "admin orders update" on public.orders for update to authenticated using (public.has_role(auth.uid(),'admin'));
create policy "own tickets" on public.tickets for select to authenticated using (user_id = auth.uid() or public.has_role(auth.uid(),'admin'));
create policy "public settings" on public.settings for select using (true);
create policy "admin settings" on public.settings for update to authenticated using (public.has_role(auth.uid(),'admin'));

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, whatsapp, email)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', ''),
          coalesce(new.raw_user_meta_data->>'whatsapp',''), new.email);
  insert into public.user_roles (user_id, role) values (new.id, 'user');
  if not exists (select 1 from public.user_roles where role = 'admin') then
    insert into public.user_roles (user_id, role) values (new.id, 'admin');
  end if;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.create_order(_ticket_type_id uuid, _quantity int)
returns uuid language plpgsql security definer set search_path = public as $$
declare tt public.ticket_types; ev public.events; oid uuid;
begin
  if auth.uid() is null then raise exception 'Faça login para continuar'; end if;
  if _quantity < 1 or _quantity > 10 then raise exception 'Quantidade inválida'; end if;
  select * into tt from public.ticket_types where id = _ticket_type_id for update;
  if not found or not tt.active then raise exception 'Ingresso indisponível'; end if;
  select * into ev from public.events where id = tt.event_id;
  if ev.status <> 'ativo' then raise exception 'Evento indisponível'; end if;
  if tt.total_quantity - tt.sold < _quantity then raise exception 'Quantidade esgotada'; end if;
  update public.ticket_types set sold = sold + _quantity where id = tt.id;
  insert into public.orders (user_id, event_id, ticket_type_id, quantity, unit_price, total)
  values (auth.uid(), ev.id, tt.id, _quantity, tt.price, tt.price * _quantity) returning id into oid;
  return oid;
end $$;

create or replace function public.set_order_receipt(_order_id uuid, _path text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.orders set receipt_path = _path where id = _order_id and user_id = auth.uid();
end $$;

create or replace function public.mark_order_paid(_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders; i int;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Acesso negado'; end if;
  select * into o from public.orders where id = _order_id for update;
  if o.status <> 'aguardando_pagamento' then raise exception 'Pedido não está aguardando pagamento'; end if;
  update public.orders set status = 'pago', paid_at = now(), paid_by = auth.uid() where id = o.id;
  for i in 1..o.quantity loop
    insert into public.tickets (order_id, user_id, event_id) values (o.id, o.user_id, o.event_id);
  end loop;
end $$;

create or replace function public.revert_order_paid(_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Acesso negado'; end if;
  if exists (select 1 from public.tickets where order_id = _order_id and checked_in_at is not null) then
    raise exception 'Ingresso já usado no check-in'; end if;
  delete from public.tickets where order_id = _order_id;
  update public.orders set status = 'aguardando_pagamento', paid_at = null, paid_by = null where id = _order_id and status = 'pago';
end $$;

create or replace function public.cancel_order(_order_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare o public.orders;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Acesso negado'; end if;
  select * into o from public.orders where id = _order_id for update;
  if o.status = 'cancelado' then return; end if;
  delete from public.tickets where order_id = o.id;
  update public.ticket_types set sold = greatest(sold - o.quantity, 0) where id = o.ticket_type_id;
  update public.orders set status = 'cancelado' where id = o.id;
end $$;

create or replace function public.check_in_ticket(_code text)
returns json language plpgsql security definer set search_path = public as $$
declare t public.tickets; nm text;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Acesso negado'; end if;
  select * into t from public.tickets where code = upper(trim(_code)) for update;
  if not found then return json_build_object('ok', false, 'message', 'Ingresso não encontrado'); end if;
  select full_name into nm from public.profiles where id = t.user_id;
  if t.checked_in_at is not null then
    return json_build_object('ok', false, 'message', 'Ingresso JÁ USADO em ' || to_char(t.checked_in_at at time zone 'America/Sao_Paulo','DD/MM HH24:MI'), 'name', nm);
  end if;
  update public.tickets set checked_in_at = now() where id = t.id;
  return json_build_object('ok', true, 'message', 'Entrada liberada', 'name', nm);
end $$;

create or replace function public.grant_admin(_email text)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid;
begin
  if not public.has_role(auth.uid(),'admin') then raise exception 'Acesso negado'; end if;
  select id into uid from public.profiles where lower(email) = lower(trim(_email));
  if uid is null then raise exception 'Usuário não encontrado. Peça para criar a conta primeiro.'; end if;
  insert into public.user_roles (user_id, role) values (uid, 'admin') on conflict do nothing;
end $$;

create policy "posters read" on storage.objects for select using (bucket_id = 'posters');
create policy "posters admin write" on storage.objects for insert to authenticated with check (bucket_id = 'posters' and public.has_role(auth.uid(),'admin'));
create policy "posters admin update" on storage.objects for update to authenticated using (bucket_id = 'posters' and public.has_role(auth.uid(),'admin'));
create policy "receipts own upload" on storage.objects for insert to authenticated with check (bucket_id = 'receipts' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "receipts read" on storage.objects for select to authenticated using (bucket_id = 'receipts' and ((storage.foldername(name))[1] = auth.uid()::text or public.has_role(auth.uid(),'admin')));

with e as (
  insert into public.events (name, description, event_date, event_time, location)
  values ('UNI SUNSET', 'O pôr do sol mais quente da cidade. Line-up BECO42 do fim de tarde até a madrugada.', '2026-09-06', '16:00', 'Aghata Pub')
  returning id
)
insert into public.ticket_types (event_id, name, price, total_quantity)
select id, 'Lote 1', 40, 150 from e union all
select id, 'VIP', 80, 50 from e;