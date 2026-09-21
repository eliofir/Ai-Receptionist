import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/neon/client";

export type AdminAppointment = { id: string; status: string; appointment_date: string };

/** Lightweight appointment rows for the dashboard counters. */
export function useAdminAppointments() {
  return useQuery({
    queryKey: ["admin_appointments_summary"],
    queryFn: async () => {
      const { data, error } = await db
        .from<AdminAppointment[]>("appointments")
        .select("id,status,appointment_date");
      if (error) throw new Error(error.message);
      return data ?? [];
    },
  });
}
