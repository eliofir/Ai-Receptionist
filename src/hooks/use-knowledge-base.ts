import { useQuery } from "@tanstack/react-query";
import { db } from "@/integrations/neon/client";
import type { KbEntry } from "@/lib/assistant";

/** The assistant's knowledge base, ordered for the FAQ page. */
export function useKnowledgeBase() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["knowledge_base"],
    queryFn: async () => {
      const { data, error } = await db
        .from<KbEntry[]>("knowledge_base")
        .select("slug,topic,question,answer,keywords")
        .order("sort_order", { ascending: true });
      if (error) throw new Error(error.message);
      return data ?? [];
    },
    staleTime: 5 * 60_000,
  });
  return { kb: data ?? [], isLoading, error };
}
