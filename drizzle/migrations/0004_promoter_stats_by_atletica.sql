CREATE OR REPLACE FUNCTION public.promoter_stats(_user_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(user_id uuid, full_name text, code text, goal integer, sold bigint, pending bigint, revenue numeric)
 LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path TO 'public'
AS $function$
begin
  if not (public.has_role(auth.uid(),'admin') or (public.has_role_text(auth.uid(),'promoter') and _user_id = auth.uid())) then
    raise exception 'Acesso negado'; end if;
  return query select pr.user_id, p.full_name, pr.code, pr.goal,
    coalesce(sum(o.quantity) filter (where o.status = 'pago'),0)::bigint,
    coalesce(sum(o.quantity) filter (where o.status = 'aguardando_pagamento'),0)::bigint,
    coalesce(sum(o.total) filter (where o.status = 'pago'),0)
    from public.promoters pr
    left join public.profiles p on p.id = pr.user_id
    left join public.orders o on (o.promoter_id = pr.user_id
      or (nullif(trim(pr.atletica),'') is not null and lower(trim(o.atletica)) = lower(trim(pr.atletica))))
    where _user_id is null or pr.user_id = _user_id
    group by pr.user_id, p.full_name, pr.code, pr.goal
    order by 5 desc;
end $function$;