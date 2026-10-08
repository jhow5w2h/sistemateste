import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useStaffEvents() {
  return useQuery({
    queryKey: ["staff-events"],
    queryFn: async () => (await supabase.rpc("staff_events")).data ?? [],
  });
}

export function useGuestList(ev: string) {
  return useQuery({
    enabled: !!ev,
    queryKey: ["guest-list", ev],
    queryFn: async () => (await supabase.rpc("guest_list", { _event_id: ev })).data ?? [],
  });
}

