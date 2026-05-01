"use client";

import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, RefreshCw } from "lucide-react";
import { formatKRW, formatUSD, formatChange, isPositive } from "@/lib/utils";
import type { DashboardData } from "@/lib/types";

interface Props {
  data: DashboardData;
  isRefetching?: boolean;
  onRefresh?: () => void;
}

export default function TotalSummary({ data, isRefetching, onRefresh }: Props) {
  const positive = isPositive(data.change24h);

  return (
    <motion.div
      initial={{ opacity: 0, y: -16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="glass-card rounded-2xl px-8 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
    >
      <div>
        <p className="text-xs font-medium tracking-widest uppercase text-muted mb-1">
          Total Net Worth
        </p>
        <div className="flex items-baseline gap-3">
          <span className="text-4xl font-bold tracking-tight text-white">
            {formatKRW(data.totalKRW)}
          </span>
          <span className="text-lg text-muted">
            {formatUSD(data.totalUSD)}
          </span>
        </div>
      </div>

      <div className="flex items-center gap-6">
        <div className="text-right">
          <p className="text-xs text-muted mb-1">24h 변동</p>
          <div
            className={`flex items-center gap-1 text-xl font-semibold ${
              positive ? "text-[#00ff88]" : "text-[#ff3e3e]"
            }`}
          >
            {positive ? (
              <TrendingUp className="w-5 h-5" />
            ) : (
              <TrendingDown className="w-5 h-5" />
            )}
            {formatChange(data.change24h)}
          </div>
        </div>

        <div className="text-right">
          <p className="text-xs text-muted mb-1">환율</p>
          <span className="text-sm font-medium text-white">
            ₩{data.fxRate.toLocaleString("ko-KR")}
          </span>
        </div>

        <button
          onClick={onRefresh}
          disabled={isRefetching}
          className="p-2 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50"
          title="새로고침"
        >
          <RefreshCw
            className={`w-4 h-4 text-muted ${isRefetching ? "animate-spin" : ""}`}
          />
        </button>
      </div>
    </motion.div>
  );
}
