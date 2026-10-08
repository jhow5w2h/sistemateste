ALTER TABLE public.promoters ADD COLUMN IF NOT EXISTS atletica text;
UPDATE public.promoters SET code = upper(code);

CREATE OR REPLACE FUNCTION public.set_order_promoter(_order_id uuid, _code text)
 RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
declare pid uuid; pat text;
begin
  select user_id, atletica into pid, pat from public.promoters where upper(code) = upper(trim(_code));
  if pid is null then return; end if;
  update public.orders set promoter_id = pid,
    atletica = coalesce(nullif(atletica,''), nullif(trim(pat),''))
  where id = _order_id and user_id = auth.uid() and promoter_id is null;
end $$;

CREATE OR REPLACE FUNCTION public.atletica_report(_atletica text DEFAULT NULL)
 RETURNS TABLE(atletica text, full_name text, email text, whatsapp text, event_name text, ticket_type text, quantity int, status text, promoter text, created_at timestamptz, checked_in int)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$
declare mine text;
begin
  if public.has_role(auth.uid(),'admin') then
    mine := nullif(trim(_atletica),'');
  elsif public.has_role_text(auth.uid(),'promoter') then
    select nullif(trim(pr.atletica),'') into mine from public.promoters pr where pr.user_id = auth.uid();
    if mine is null then return; end if;
  else raise exception 'Acesso negado'; end if;
  return query select o.atletica, p.full_name, p.email, p.whatsapp, e.name, tt.name, o.quantity, o.status::text,
    pp.full_name, o.created_at,
    (select count(*)::int from public.tickets t where t.order_id = o.id and t.checked_in_at is not null)
  from public.orders o
  join public.events e on e.id = o.event_id
  join public.ticket_types tt on tt.id = o.ticket_type_id
  left join public.profiles p on p.id = o.user_id
  left join public.profiles pp on pp.id = o.promoter_id
  where o.status <> 'cancelado' and coalesce(o.atletica,'') <> ''
    and (mine is null or lower(o.atletica) = lower(mine))
  order by o.atletica, p.full_name;
end $$;

CREATE OR REPLACE FUNCTION public.promoter_info()
 RETURNS TABLE(user_id uuid, code text, atletica text)
 LANGUAGE sql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $$ select user_id, code, atletica from public.promoters $$;
REVOKE EXECUTE ON FUNCTION public.promoter_info() FROM anon, public;