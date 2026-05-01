"use client";

import { useAssets } from "@/hooks/useAssets";
import TotalSummary from "@/components/dashboard/TotalSummary";
import AssetCard from "@/components/cards/AssetCard";
import AssetPie from "@/components/charts/AssetPie";
import AssetTable from "@/components/dashboard/AssetTable";
import { motion } from "framer-motion";

export default function DashboardPage() {
  const { data, isLoading, isError, error, refetch, isRefetching } =
    useAssets();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-10 h-10 rounded-full border-2 border-[#00ff88]/30 border-t-[#00ff88] animate-spin" />
          <p className="text-muted text-sm">자산 데이터를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (isError) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8 max-w-md text-center">
          <p className="text-[#ff3e3e] font-semibold mb-2">데이터 로드 실패</p>
          <p className="text-muted text-sm mb-4">{error?.message}</p>
          <button
            onClick={() => refetch()}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-colors"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen px-4 sm:px-6 py-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <motion.header
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex items-center justify-between mb-2"
      >
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white">
            MAZ Dashboard
          </h1>
          <p className="text-xs text-muted mt-0.5">Multi-Asset Zenith</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted">
          {isRefetching && (
            <span className="w-1.5 h-1.5 rounded-full bg-[#00ff88] animate-pulse" />
          )}
          갱신:{" "}
          {new Date(data.lastUpdated).toLocaleTimeString("ko-KR", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
          })}
        </div>
      </motion.header>

      {/* Total Net Worth */}
      <TotalSummary
        data={data}
        isRefetching={isRefetching}
        onRefresh={() => refetch()}
      />

      {/* Exchange Cards + Pie Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {data.exchanges.map((ex, i) => (
            <AssetCard
              key={ex.id}
              data={ex}
              index={i}
              totalKRW={data.totalKRW}
            />
          ))}
        </div>

        <div className="lg:col-span-1">
          <AssetPie exchanges={data.exchanges} />
        </div>
      </div>

      {/* Asset Table */}
      <AssetTable data={data} />
    </div>
  );
}
