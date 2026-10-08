import { useEffect, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [roles, setRoles] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    const load = async (u: User | null) => {
      if (!active) return;
      setUser(u);
      if (u) {
        const { data } = await supabase.from("user_roles").select("role").eq("user_id", u.id);
        if (active) setRoles((data ?? []).map((r) => String(r.role)));
      } else setRoles([]);
      if (active) setLoading(false);
    };
    supabase.auth.getSession().then(({ data }) => load(data.session?.user ?? null));
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setTimeout(() => load(s?.user ?? null), 0);
    });
    return () => {
      active = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const isAdmin = roles.includes("admin");
  const isModerator = roles.includes("moderator");
  const isPromoter = roles.includes("promoter");
  return { user, isAdmin, isModerator, isPromoter, isStaff: isAdmin || isModerator, loading };
}
