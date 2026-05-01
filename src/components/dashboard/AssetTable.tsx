"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { formatKRW, formatPrice } from "@/lib/utils";
import type { DashboardData, AssetHolding, FuturesPosition } from "@/lib/types";

interface FlatHolding extends AssetHolding {
  exchangeName: string;
}

const EXCLUDE_SYMBOLS = new Set([
  "USDT",
  "USDC",
  "BUSD",
  "FDUSD",
  "DAI",
  "KRW",
]);

function flattenHoldings(data: DashboardData): FlatHolding[] {
  const flat: FlatHolding[] = [];
  for (const ex of data.exchanges) {
    for (const h of ex.holdings) {
      flat.push({ ...h, exchangeName: ex.name });
    }
  }
  return flat
    .filter((h) => h.valueKRW > 0 && !EXCLUDE_SYMBOLS.has(h.symbol))
    .sort((a, b) => b.valueKRW - a.valueKRW);
}

function flattenPositions(data: DashboardData): FuturesPosition[] {
  const flat: FuturesPosition[] = [];
  for (const ex of data.exchanges) {
    for (const p of ex.positions ?? []) {
      flat.push(p);
    }
  }
  return flat.sort(
    (a, b) => Math.abs(b.unrealizedPnlKRW) - Math.abs(a.unrealizedPnlKRW),
  );
}

type Tab = "spot" | "futures";

export default function AssetTable({ data }: { data: DashboardData }) {
  const holdings = flattenHoldings(data);
  const positions = flattenPositions(data);
  const hasFutures = positions.length > 0;
  const [tab, setTab] = useState<Tab>("spot");

  const totalUnrealizedKRW = positions.reduce(
    (s, p) => s + p.unrealizedPnlKRW,
    0,
  );

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="glass-card rounded-2xl p-6"
    >
      {/* 헤더 + 탭 */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold tracking-widest uppercase text-muted">
          Asset Inventory
        </h2>

        {hasFutures && (
          <div className="flex rounded-lg overflow-hidden border border-white/10 text-xs font-medium">
            <button
              onClick={() => setTab("spot")}
              className={`px-3 py-1.5 transition-colors ${
                tab === "spot"
                  ? "bg-white/15 text-white"
                  : "text-muted hover:text-white hover:bg-white/5"
              }`}
            >
              SPOT
            </button>
            <button
              onClick={() => setTab("futures")}
              className={`px-3 py-1.5 transition-colors border-l border-white/10 flex items-center gap-1.5 ${
                tab === "futures"
                  ? "bg-white/15 text-white"
                  : "text-muted hover:text-white hover:bg-white/5"
              }`}
            >
              FUTURES
              <span className="bg-white/10 rounded px-1 py-0.5 text-[10px]">
                {positions.length}
              </span>
            </button>
          </div>
        )}
      </div>

      {/* ── SPOT 테이블 ─────────────────────────────────────── */}
      {tab === "spot" && (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-muted text-xs">
                <th className="text-left pb-3 font-medium">자산</th>
                <th className="text-left pb-3 font-medium">거래소</th>
                <th className="text-right pb-3 font-medium">수량</th>
                <th className="text-right pb-3 font-medium">단가 (KRW)</th>
                <th className="text-right pb-3 font-medium">매수금액 (KRW)</th>
                <th className="text-right pb-3 font-medium">평가금액 (KRW)</th>
                <th className="text-right pb-3 font-medium">평가손익(KRW)</th>
                <th className="text-right pb-3 font-medium">수익률</th>
                <th className="text-right pb-3 font-medium">24h</th>
              </tr>
            </thead>
            <tbody>
              {holdings.map((h, i) => {
                const pnlKRW =
                  h.costBasisKRW != null ? h.valueKRW - h.costBasisKRW : null;
                const pnlPct =
                  h.costBasisKRW != null && h.costBasisKRW > 0
                    ? ((h.valueKRW - h.costBasisKRW) / h.costBasisKRW) * 100
                    : null;
                return (
                  <motion.tr
                    key={`${h.exchangeName}-${h.symbol}-${i}`}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                  >
                    <td className="py-3 font-semibold text-white">
                      {h.symbol}
                    </td>
                    <td className="py-3 text-muted">{h.exchangeName}</td>
                    <td className="py-3 text-right text-white">
                      {h.amount.toLocaleString("ko-KR", {
                        maximumFractionDigits: 6,
                      })}
                    </td>
                    <td className="py-3 text-right text-muted">
                      {h.priceKRW ? formatKRW(h.priceKRW) : "—"}
                    </td>
                    <td className="py-3 text-right text-muted">
                      {h.costBasisKRW != null ? formatKRW(h.costBasisKRW) : "—"}
                    </td>
                    <td className="py-3 text-right text-white font-medium">
                      {formatKRW(h.valueKRW)}
                    </td>
                    <td
                      className={`py-3 text-right font-medium ${
                        pnlKRW == null
                          ? "text-muted"
                          : pnlKRW >= 0
                            ? "text-[#00ff88]"
                            : "text-[#ff3e3e]"
                      }`}
                    >
                      {pnlKRW == null
                        ? "—"
                        : `${pnlKRW >= 0 ? "+" : ""}${formatKRW(pnlKRW)}`}
                    </td>
                    <td
                      className={`py-3 text-right font-medium ${
                        pnlPct == null
                          ? "text-muted"
                          : pnlPct >= 0
                            ? "text-[#00ff88]"
                            : "text-[#ff3e3e]"
                      }`}
                    >
                      {pnlPct == null
                        ? "—"
                        : `${pnlPct >= 0 ? "+" : ""}${pnlPct.toFixed(2)}%`}
                    </td>
                    <td className="py-3 text-right">
                      {h.change24h !== undefined ? (
                        <span
                          className={
                            h.change24h >= 0
                              ? "text-[#00ff88]"
                              : "text-[#ff3e3e]"
                          }
                        >
                          {h.change24h >= 0 ? "+" : ""}
                          {h.change24h.toFixed(2)}%
                        </span>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </motion.tr>
                );
              })}
              {holdings.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-8">
                    보유 자산이 없거나 API 키를 설정해주세요.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* ── FUTURES 테이블 ──────────────────────────────────── */}
      {tab === "futures" && (
        <div className="overflow-x-auto scrollbar-thin">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-muted text-xs">
                <th className="text-left pb-3 font-medium">거래소</th>
                <th className="text-left pb-3 font-medium">심볼</th>
                <th className="text-center pb-3 font-medium">방향</th>
                <th className="text-right pb-3 font-medium">수량</th>
                <th className="text-right pb-3 font-medium">진입가</th>
                <th className="text-right pb-3 font-medium">현재가</th>
                <th className="text-right pb-3 font-medium">
                  미실현 손익 (KRW)
                </th>
                <th className="text-right pb-3 font-medium">수익률</th>
                <th className="text-right pb-3 font-medium">레버리지</th>
              </tr>
            </thead>
            <tbody>
              {positions.map((p, i) => (
                <motion.tr
                  key={`${p.exchangeId}-${p.symbol}-${i}`}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: i * 0.03 }}
                  className="border-b border-white/5 hover:bg-white/[0.03] transition-colors"
                >
                  <td className="py-3 text-muted">{p.exchangeName}</td>
                  <td className="py-3 font-semibold text-white">{p.symbol}</td>
                  <td className="py-3 text-center">
                    <span
                      className={`text-xs font-bold px-2 py-0.5 rounded ${
                        p.side === "Long"
                          ? "bg-[#00ff88]/15 text-[#00ff88]"
                          : "bg-[#ff3e3e]/15 text-[#ff3e3e]"
                      }`}
                    >
                      {p.side === "Long" ? "LONG" : "SHORT"}
                    </span>
                  </td>
                  <td className="py-3 text-right text-white">
                    {p.size.toLocaleString("en-US", {
                      maximumFractionDigits: 6,
                    })}
                  </td>
                  <td className="py-3 text-right text-muted">
                    {formatPrice(p.entryPrice)}
                  </td>
                  <td className="py-3 text-right text-white">
                    {formatPrice(p.markPrice)}
                  </td>
                  <td
                    className={`py-3 text-right font-medium ${
                      p.unrealizedPnl >= 0 ? "text-[#00ff88]" : "text-[#ff3e3e]"
                    }`}
                  >
                    {p.unrealizedPnl >= 0 ? "+" : ""}
                    {formatKRW(p.unrealizedPnlKRW)}
                  </td>
                  <td
                    className={`py-3 text-right font-medium ${
                      p.pnlPct >= 0 ? "text-[#00ff88]" : "text-[#ff3e3e]"
                    }`}
                  >
                    {p.pnlPct >= 0 ? "+" : ""}
                    {p.pnlPct.toFixed(2)}%
                  </td>
                  <td className="py-3 text-right text-muted">{p.leverage}x</td>
                </motion.tr>
              ))}
              {positions.length === 0 && (
                <tr>
                  <td colSpan={9} className="text-center text-muted py-8">
                    열린 선물 포지션이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
            {positions.length > 0 && (
              <tfoot>
                <tr className="border-t border-white/10">
                  <td colSpan={6} className="pt-3 text-xs text-muted">
                    미실현 손익 합계
                  </td>
                  <td
                    className={`pt-3 text-right font-bold text-sm ${
                      totalUnrealizedKRW >= 0
                        ? "text-[#00ff88]"
                        : "text-[#ff3e3e]"
                    }`}
                  >
                    {totalUnrealizedKRW >= 0 ? "+" : ""}
                    {formatKRW(totalUnrealizedKRW)}
                  </td>
                  <td colSpan={2} />
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}
    </motion.div>
  );
}
