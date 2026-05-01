"use client";

import { motion } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { formatKRW, formatChange, isPositive } from "@/lib/utils";
import type { ExchangeData } from "@/lib/types";

const EXCHANGE_COLORS: Record<string, string> = {
  okx: "#1e90ff",
  bybit: "#f7a600",
  bingx: "#11c4b5",
  bithumb: "#e8322f",
};

const EXCHANGE_ICONS: Record<string, string> = {
  okx: "OKX",
  bybit: "BY",
  bingx: "BX",
  bithumb: "BT",
};

interface Props {
  data: ExchangeData;
  index: number;
  totalKRW: number;
}

export default function AssetCard({ data, index, totalKRW }: Props) {
  const color = EXCHANGE_COLORS[data.id] ?? "#888";
  const icon = EXCHANGE_ICONS[data.id] ?? "??";
  const pct = totalKRW > 0 ? (data.totalKRW / totalKRW) * 100 : 0;
  const positive = isPositive(data.change24h);

  // 세그먼트 비율: 매수가능금액 / 증거금 / SPOT
  const STABLES = new Set(["USDT", "USDC", "BUSD", "DAI", "FDUSD", "KRW"]);
  const stableKRW = data.holdings
    .filter((h) => STABLES.has(h.symbol))
    .reduce((s, h) => s + h.valueKRW, 0);
  const spotKRW = data.holdings
    .filter((h) => !STABLES.has(h.symbol))
    .reduce((s, h) => s + h.valueKRW, 0);

  // 증거금 = 포지션별 (notionalKRW ÷ leverage) 합산
  const futureMarginKRW = (data.positions ?? []).reduce(
    (s, p) => s + (p.leverage > 0 ? p.notionalKRW / p.leverage : 0),
    0,
  );
  const marginKRW = Math.min(futureMarginKRW, stableKRW); // 잔고 초과 방지
  const freeKRW   = Math.max(0, stableKRW - futureMarginKRW); // 매수가능금액

  const total      = (freeKRW + marginKRW + spotKRW) || 1;
  const freePct    = (freeKRW   / total) * 100;
  const marginPct  = (marginKRW / total) * 100;
  const spotPct    = (spotKRW   / total) * 100;
  const hasMargin  = marginPct > 0.5;
  const stableLabel = data.id === "bithumb" ? "KRW" : "가용";

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: index * 0.08 }}
      className="glass-card rounded-2xl p-5 flex flex-col gap-3 hover:border-white/15 transition-all duration-300"
    >
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div
            className="w-9 h-9 rounded-lg flex items-center justify-center text-xs font-bold text-white"
            style={{ backgroundColor: color }}
          >
            {icon}
          </div>
          <div>
            <p className="font-semibold text-white">{data.name}</p>
            <p className="text-xs text-muted">{pct.toFixed(1)}% of total</p>
          </div>
        </div>

        {data.change24h !== 0 && (
          <span
            className={`text-sm font-medium ${positive ? "text-[#00ff88]" : "text-[#ff3e3e]"}`}
          >
            {formatChange(data.change24h)}
          </span>
        )}
      </div>

      {/* Total value */}
      <div>
        <p className="text-2xl font-bold text-white">
          {formatKRW(data.totalKRW)}
        </p>
      </div>

      {/* 3단 세그먼트 바: 매수가능금액 / 증거금 / SPOT */}
      <div className="flex flex-col gap-1.5">
        <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden flex gap-px">
          {/* 매수가능금액 (여유 스테이블) */}
          {freePct > 0.5 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${freePct}%` }}
              transition={{ duration: 0.8, delay: index * 0.08 + 0.2 }}
              className="h-full"
              style={{ backgroundColor: "rgba(180,180,200,0.6)" }}
            />
          )}
          {/* SPOT 코인 */}
          {spotPct > 0.5 && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${spotPct}%` }}
              transition={{ duration: 0.8, delay: index * 0.08 + 0.35 }}
              className="h-full"
              style={{ backgroundColor: color }}
            />
          )}
          {/* 증거금 */}
          {hasMargin && (
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${marginPct}%` }}
              transition={{ duration: 0.8, delay: index * 0.08 + 0.5 }}
              className="h-full"
              style={{ backgroundColor: "#f5a623" }}
            />
          )}
        </div>

        {/* 범례 */}
        <div className="flex items-center gap-3 text-[10px] text-muted flex-wrap">
          {freePct > 0.5 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: "rgba(180,180,200,0.8)" }} />
              {stableLabel} {freePct.toFixed(1)}%
            </span>
          )}
          {spotPct > 0.5 && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
              SPOT {spotPct.toFixed(1)}%
            </span>
          )}
          {hasMargin && (
            <span className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: "#f5a623" }} />
              증거금 {marginPct.toFixed(1)}%
            </span>
          )}
        </div>
      </div>

      {/* Error */}
      {data.error && (
        <div className="flex items-center gap-1.5 text-[#ff3e3e] text-xs">
          <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
          <span className="truncate">{data.error}</span>
        </div>
      )}

      {/* Top holdings */}
      {data.holdings.length > 0 && !data.error && (
        <div className="space-y-1.5 pt-1 border-t border-white/5">
          {data.holdings.slice(0, 3).map((h) => (
            <div
              key={h.symbol}
              className="flex items-center justify-between text-xs"
            >
              <span className="text-muted font-medium">{h.symbol}</span>
              <span className="text-white">{formatKRW(h.valueKRW)}</span>
            </div>
          ))}
          {data.holdings.length > 3 && (
            <p className="text-xs text-muted/60">
              +{data.holdings.length - 3}개 더보기
            </p>
          )}
        </div>
      )}
    </motion.div>
  );
}
