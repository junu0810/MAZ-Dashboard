import { NextResponse } from "next/server";
import {
  getUSDKRWRate,
  getOKXData,
  getBybitData,
  getBingXData,
  getBithumbData,
} from "@/lib/exchanges";
import type { DashboardData } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET() {
  try {
    const fxRate = await getUSDKRWRate();

    const [okx, bybit, bingx, bithumb] = await Promise.all([
      getOKXData(fxRate),
      getBybitData(fxRate),
      getBingXData(fxRate),
      getBithumbData(fxRate),
    ]);

    const exchanges = [okx, bybit, bingx, bithumb];

    const totalKRW = exchanges.reduce((s, e) => s + e.totalKRW, 0);
    const totalUSD = totalKRW / fxRate;

    const weighted24h =
      exchanges.reduce((s, e) => s + e.change24h * e.totalKRW, 0) /
      (totalKRW || 1);

    const result: DashboardData = {
      totalKRW,
      totalUSD,
      change24h: weighted24h,
      exchanges,
      fxRate,
      lastUpdated: new Date().toISOString(),
    };

    return NextResponse.json(result, {
      headers: {
        "Cache-Control": "no-store",
      },
    });
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
