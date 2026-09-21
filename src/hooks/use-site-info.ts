import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/neon/client";

export type SiteInfo = Record<string, string>;

/** Contact + about copy, keyed by name. */
export function useSiteInfo(): SiteInfo {
  const { data } = useQuery({
    queryKey: ["site_info"],
    queryFn: async () => {
      const { data, error } = await db
        .from<{ key: string; value: string }[]>("site_info")
        .select("key,value");
      if (error) throw new Error(error.message);
      const map: SiteInfo = {};
      for (const row of data ?? []) map[row.key] = row.value;
      return map;
    },
    staleTime: 5 * 60_000,
  });
  return data ?? {};
}
