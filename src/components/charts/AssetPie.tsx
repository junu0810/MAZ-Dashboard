"use client";

import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from "recharts";
import { motion } from "framer-motion";
import { formatKRW } from "@/lib/utils";
import type { ExchangeData } from "@/lib/types";

const COLORS: Record<string, string> = {
  okx: "#1e90ff",
  bybit: "#f7a600",
  bingx: "#11c4b5",
  bithumb: "#e8322f",
};

interface Props {
  exchanges: ExchangeData[];
}

interface TooltipPayload {
  name: string;
  value: number;
}

function CustomTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: { payload: TooltipPayload }[];
}) {
  if (!active || !payload?.length) return null;
  const item = payload[0].payload;
  return (
    <div className="glass-card rounded-xl px-4 py-3 text-sm">
      <p className="font-semibold text-white">{item.name}</p>
      <p className="text-muted mt-0.5">{formatKRW(item.value)}</p>
    </div>
  );
}

export default function AssetPie({ exchanges }: Props) {
  const data = exchanges
    .filter((e) => e.totalKRW > 0)
    .map((e) => ({ name: e.name, value: e.totalKRW, id: e.id }));

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay: 0.2 }}
      className="glass-card rounded-2xl p-6 flex flex-col gap-4"
    >
      <h2 className="text-sm font-semibold tracking-widest uppercase text-muted">
        Asset Distribution
      </h2>

      <div className="flex items-center gap-6">
        <ResponsiveContainer width={160} height={160}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={50}
              outerRadius={75}
              paddingAngle={3}
              dataKey="value"
            >
              {data.map((entry) => (
                <Cell
                  key={entry.id}
                  fill={COLORS[entry.id] ?? "#888"}
                  stroke="transparent"
                />
              ))}
            </Pie>
            <Tooltip content={<CustomTooltip />} />
          </PieChart>
        </ResponsiveContainer>

        <div className="flex flex-col gap-2">
          {data.map((entry) => {
            const total = data.reduce((s, d) => s + d.value, 0);
            const pct = total > 0 ? ((entry.value / total) * 100).toFixed(1) : "0";
            return (
              <div key={entry.id} className="flex items-center gap-2 text-sm">
                <span
                  className="w-2.5 h-2.5 rounded-sm flex-shrink-0"
                  style={{ backgroundColor: COLORS[entry.id] ?? "#888" }}
                />
                <span className="text-white font-medium w-24 truncate">
                  {entry.name}
                </span>
                <span className="text-muted text-xs">{pct}%</span>
              </div>
            );
          })}
        </div>
      </div>
    </motion.div>
  );
}
