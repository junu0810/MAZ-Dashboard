import { useQuery } from "@tanstack/react-query";
import type { DashboardData } from "@/lib/types";

async function fetchAssets(): Promise<DashboardData> {
  const res = await fetch("/api/assets", { cache: "no-store" });
  if (!res.ok) throw new Error(`API error: ${res.statusText}`);
  return res.json();
}

export function useAssets() {
  return useQuery<DashboardData, Error>({
    queryKey: ["assets"],
    queryFn: fetchAssets,
    refetchInterval: 10_000,
    staleTime: 8_000,
    refetchOnWindowFocus: false,
  });
}
