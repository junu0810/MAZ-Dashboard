export type ExchangeId = "okx" | "bybit" | "bingx" | "bithumb";

export interface AssetHolding {
  symbol: string;
  name?: string;
  amount: number;
  valueKRW: number;
  valueUSD: number;
  priceKRW?: number;
  priceUSD?: number;
  change24h?: number;
  avgBuyPriceKRW?: number;  // 평균 매수가 (KRW)
  costBasisKRW?: number;    // 매수금액 = avgBuyPriceKRW × amount
}

export interface FuturesPosition {
  symbol: string;
  side: "Long" | "Short";
  size: number;
  entryPrice: number;
  markPrice: number;
  unrealizedPnl: number;
  unrealizedPnlKRW: number;
  pnlPct: number;
  leverage: number;
  notionalUSD: number;
  notionalKRW: number;
  exchangeId: ExchangeId;
  exchangeName: string;
}

export interface ExchangeData {
  id: ExchangeId;
  name: string;
  totalKRW: number;
  totalUSD: number;
  change24h: number;
  holdings: AssetHolding[];
  positions?: FuturesPosition[];
  error?: string;
  lastUpdated: string;
}

export interface DashboardData {
  totalKRW: number;
  totalUSD: number;
  change24h: number;
  exchanges: ExchangeData[];
  fxRate: number;
  lastUpdated: string;
}
