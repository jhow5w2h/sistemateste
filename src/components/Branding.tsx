import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useBranding() {
  return useQuery({
    queryKey: ["branding"],
    queryFn: async () =>
      (await supabase.from("settings").select("logo_url, color_1, color_2, color_3").eq("id", 1).maybeSingle()).data,
    staleTime: 60_000,
  });
}

/** Applies admin-chosen colors to the theme variables. */
export function BrandingStyles() {
  const { data } = useBranding();
  useEffect(() => {
    const root = document.documentElement.style;
    const set = (k: string, v?: string | null) => (v ? root.setProperty(k, v) : root.removeProperty(k));
    set("--sunset-1", data?.color_1);
    set("--primary", data?.color_1);
    set("--ring", data?.color_1);
    set("--sunset-2", data?.color_2);
    set("--accent", data?.color_2);
    set("--sunset-3", data?.color_3);
  }, [data]);
  return null;
}
