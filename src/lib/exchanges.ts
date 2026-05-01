import crypto from "crypto";
import ccxt, { type Exchange } from "ccxt";
import axios from "axios";
import type { ExchangeData, AssetHolding, FuturesPosition } from "./types";

// ─── Bybit V5 직접 호출 (ccxt 통합계정 감지 우회) ──────────────────────────

async function bybitV5Request<T = unknown>(
  apiKey: string,
  secret: string,
  endpoint: string,
  params: Record<string, string> = {},
): Promise<{ retCode: number; retMsg: string; result: T }> {
  const timestamp = Date.now().toString();
  const recvWindow = "5000";
  const queryString = new URLSearchParams(params).toString();
  const signPayload = `${timestamp}${apiKey}${recvWindow}${queryString}`;
  const signature = crypto
    .createHmac("sha256", secret)
    .update(signPayload)
    .digest("hex");

  const { data } = await axios.get(
    `https://api.bybit.com${endpoint}${queryString ? `?${queryString}` : ""}`,
    {
      headers: {
        "X-BAPI-API-KEY": apiKey,
        "X-BAPI-SIGN": signature,
        "X-BAPI-TIMESTAMP": timestamp,
        "X-BAPI-RECV-WINDOW": recvWindow,
      },
      timeout: 10000,
    },
  );
  return data;
}

// ─── OKX 직접 REST 호출 ────────────────────────────────────────────────────

async function okxSignedGet<T = unknown>(
  apiKey: string,
  secret: string,
  passphrase: string,
  path: string,
  params: Record<string, string> = {},
): Promise<T> {
  const ts = new Date().toISOString();
  const qs = Object.keys(params).length
    ? "?" + new URLSearchParams(params).toString()
    : "";
  const sign = crypto
    .createHmac("sha256", secret)
    .update(`${ts}GET${path}${qs}`)
    .digest("base64");
  const { data } = await axios.get(`https://www.okx.com${path}${qs}`, {
    headers: {
      "OK-ACCESS-KEY": apiKey,
      "OK-ACCESS-SIGN": sign,
      "OK-ACCESS-TIMESTAMP": ts,
      "OK-ACCESS-PASSPHRASE": passphrase,
    },
    timeout: 10000,
  });
  return data;
}

type OKXRawPosition = {
  instId: string;
  posSide: "long" | "short" | "net";
  pos: string;
  avgPx: string;
  markPx: string;
  upl: string;
  uplRatio: string;
  lever: string;
  notionalUsd: string;
  ctVal: string; // 계약 단위 (예: BTC-USDT-SWAP = "0.01")
};

// ─── FX Rate ────────────────────────────────────────────────────────────────

export async function getUSDKRWRate(): Promise<number> {
  try {
    const { data } = await axios.get(
      "https://quotation-api-cdn.dunamu.com/v1/forex/recent?codes=FRX.KRWUSD",
      { timeout: 5000 },
    );
    const rate = data?.[0]?.basePrice;
    if (rate && rate > 0) return rate;
  } catch {
    // fallback to KEXIM
  }
  try {
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const { data } = await axios.get(
      `https://www.koreaexim.go.kr/site/program/financial/exchangeJSON?authkey=${process.env.KEXIM_API_KEY}&searchdate=${today}&data=AP01`,
      { timeout: 5000 },
    );
    const usd = (data as { cur_unit: string; deal_bas_r: string }[]).find(
      (r) => r.cur_unit === "USD",
    );
    if (usd) return parseFloat(usd.deal_bas_r.replace(",", ""));
  } catch {
    // ignore
  }
  return 1370; // hardcoded fallback
}

// ─── OKX ────────────────────────────────────────────────────────────────────

export async function getOKXData(fxRate: number): Promise<ExchangeData> {
  try {
    const missing = ["OKX_API_KEY", "OKX_SECRET", "OKX_PASSPHRASE"].filter(
      (k) => !process.env[k],
    );
    if (missing.length) throw new Error(`환경변수 누락: ${missing.join(", ")}`);
    const exchange = new ccxt.okx({
      apiKey: process.env.OKX_API_KEY!,
      secret: process.env.OKX_SECRET!,
      password: process.env.OKX_PASSPHRASE!,
    });
    const [spot, funding] = await Promise.all([
      exchange.fetchBalance({ type: "spot" }),
      exchange.fetchBalance({ type: "funding" }),
    ]);

    const merged: Record<string, number> = {};
    for (const [sym, bal] of Object.entries(spot.total)) {
      if ((bal as number) > 0)
        merged[sym] = (merged[sym] || 0) + (bal as number);
    }
    for (const [sym, bal] of Object.entries(funding.total)) {
      if ((bal as number) > 0)
        merged[sym] = (merged[sym] || 0) + (bal as number);
    }

    const holdings = await buildHoldings(merged, fxRate, exchange);

    // 선물 포지션: OKX REST API 직접 호출
    const positions: FuturesPosition[] = [];
    try {
      const posRes = await okxSignedGet<{
        code: string;
        data: OKXRawPosition[];
      }>(
        process.env.OKX_API_KEY!,
        process.env.OKX_SECRET!,
        process.env.OKX_PASSPHRASE!,
        "/api/v5/account/positions",
      );
      if (posRes.code === "0") {
        // console.log("[OKX] raw positions:", posRes.data.length, posRes.data.map(p => ({ id: p.instId, pos: p.pos, notionalUsd: p.notionalUsd, markPx: p.markPx, ctVal: p.ctVal })));
        for (const p of posRes.data) {
          const pos = parseFloat(p.pos || "0");
          if (pos === 0) continue;
          const side: "Long" | "Short" =
            p.posSide === "long"
              ? "Long"
              : p.posSide === "short"
                ? "Short"
                : pos > 0
                  ? "Long"
                  : "Short";
          const size = Math.abs(pos);
          const unrealizedPnl = parseFloat(p.upl || "0");
          const rawNotional = Math.abs(parseFloat(p.notionalUsd || "0"));
          const ctVal = parseFloat(p.ctVal || "1");
          // notionalUsd가 0이면 pos × ctVal × markPrice로 직접 계산
          const notionalUSD =
            rawNotional > 0
              ? rawNotional
              : size * ctVal * Math.abs(parseFloat(p.markPx || "0"));
          const leverage = parseFloat(p.lever || "1");
          const margin = leverage > 0 ? notionalUSD / leverage : 0;
          positions.push({
            symbol: p.instId,
            side,
            size,
            entryPrice: parseFloat(p.avgPx || "0"),
            markPrice: parseFloat(p.markPx || "0"),
            unrealizedPnl,
            unrealizedPnlKRW: unrealizedPnl * fxRate,
            pnlPct:
              margin > 0
                ? (unrealizedPnl / margin) * 100
                : parseFloat(p.uplRatio || "0") * 100,
            leverage,
            notionalUSD,
            notionalKRW: notionalUSD * fxRate,
            exchangeId: "okx",
            exchangeName: "OKX",
          });
        }
      } else {
        console.error("[OKX] position error:", posRes.code);
      }
    } catch (e) {
      console.error("[OKX] position fetch exception:", e);
    }

    const spotUSD = holdings.reduce((s, h) => s + h.valueUSD, 0);
    const pnlUSD = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
    const totalUSD = spotUSD + pnlUSD;

    return {
      id: "okx",
      name: "OKX",
      totalKRW: totalUSD * fxRate,
      totalUSD,
      change24h: 0,
      holdings,
      positions,
      lastUpdated: new Date().toISOString(),
    };
  } catch (e: unknown) {
    return errorResult("okx", "OKX", e);
  }
}

// ─── Bybit ──────────────────────────────────────────────────────────────────

type BybitWalletCoin = {
  coin: string;
  walletBalance: string;
  usdValue: string;
};
type BybitWalletAccount = {
  totalEquity: string;
  coin: BybitWalletCoin[];
};
type BybitWalletRes = { list: BybitWalletAccount[] };
type BybitFundCoin = {
  coin: string;
  walletBalance: string;
  transferBalance: string;
};
type BybitFundRes = { balance: BybitFundCoin[] };
type BybitRawPosition = {
  symbol: string;
  side: "Buy" | "Sell" | "None";
  size: string;
  entryPrice: string;
  markPrice: string;
  unrealisedPnl: string;
  leverage: string;
  positionValue: string;
};
type BybitPositionRes = { list: BybitRawPosition[] };

export async function getBybitData(fxRate: number): Promise<ExchangeData> {
  const apiKey = process.env.BYBIT_API_KEY!;
  const secret = process.env.BYBIT_SECRET!;

  try {
    const missing = ["BYBIT_API_KEY", "BYBIT_SECRET"].filter(
      (k) => !process.env[k],
    );
    if (missing.length) throw new Error(`환경변수 누락: ${missing.join(", ")}`);
    const holdings: AssetHolding[] = [];
    let unifiedEquityUSD = 0;

    // 1) UNIFIED 계정 잔액
    const unifiedRes = await bybitV5Request<BybitWalletRes>(
      apiKey,
      secret,
      "/v5/account/wallet-balance",
      { accountType: "UNIFIED" },
    );

    if (unifiedRes.retCode !== 0) {
      // 클래식 SPOT 폴백
      const spotRes = await bybitV5Request<BybitWalletRes>(
        apiKey,
        secret,
        "/v5/account/wallet-balance",
        { accountType: "SPOT" },
      );
      if (spotRes.retCode !== 0)
        throw new Error(`Bybit [${spotRes.retCode}]: ${spotRes.retMsg}`);
      for (const account of spotRes.result?.list ?? []) {
        unifiedEquityUSD += parseFloat(account.totalEquity || "0");
        for (const c of account.coin ?? []) {
          const walletBal = parseFloat(c.walletBalance || "0");
          const usdValue = parseFloat(c.usdValue || "0");
          if (walletBal <= 0 && usdValue <= 0) continue;
          holdings.push({
            symbol: c.coin,
            amount: walletBal,
            valueUSD: usdValue,
            valueKRW: usdValue * fxRate,
            priceUSD: walletBal > 0 ? usdValue / walletBal : 0,
            priceKRW: walletBal > 0 ? (usdValue / walletBal) * fxRate : 0,
          });
        }
      }
    } else {
      for (const account of unifiedRes.result?.list ?? []) {
        unifiedEquityUSD += parseFloat(account.totalEquity || "0");
        for (const c of account.coin ?? []) {
          const walletBal = parseFloat(c.walletBalance || "0");
          const usdValue = parseFloat(c.usdValue || "0");
          if (walletBal <= 0 && usdValue <= 0) continue;
          holdings.push({
            symbol: c.coin,
            amount: walletBal,
            valueUSD: usdValue,
            valueKRW: usdValue * fxRate,
            priceUSD: walletBal > 0 ? usdValue / walletBal : 0,
            priceKRW: walletBal > 0 ? (usdValue / walletBal) * fxRate : 0,
          });
        }
      }
    }

    // 2) Funding 지갑
    const priceMap = new Map(holdings.map((h) => [h.symbol, h.priceUSD ?? 0]));
    let fundTotalUSD = 0;

    const fundRes = await bybitV5Request<BybitFundRes>(
      apiKey,
      secret,
      "/v5/asset/transfer/query-account-coins-balance",
      { accountType: "FUND" },
    );
    if (fundRes.retCode === 0) {
      for (const c of fundRes.result?.balance ?? []) {
        const amount = parseFloat(c.walletBalance || c.transferBalance || "0");
        if (amount <= 0) continue;
        const priceUSD =
          priceMap.get(c.coin) ??
          (c.coin === "USDT" || c.coin === "USDC" || c.coin === "BUSD" ? 1 : 0);
        const usdValue = amount * priceUSD;
        if (usdValue < 0.01) continue;
        fundTotalUSD += usdValue;
        const existing = holdings.find((h) => h.symbol === c.coin);
        if (existing) {
          existing.amount += amount;
          existing.valueUSD += usdValue;
          existing.valueKRW += usdValue * fxRate;
        } else {
          holdings.push({
            symbol: c.coin,
            amount,
            valueUSD: usdValue,
            valueKRW: usdValue * fxRate,
            priceUSD,
            priceKRW: priceUSD * fxRate,
          });
        }
      }
    }

    // 3) 선물 포지션: USDT linear / USDC linear / inverse 병렬 조회
    const positions: FuturesPosition[] = [];
    try {
      const [usdtRes, usdcRes, inverseRes] = await Promise.allSettled([
        bybitV5Request<BybitPositionRes>(apiKey, secret, "/v5/position/list", {
          category: "linear",
          settleCoin: "USDT",
          limit: "200",
        }),
        bybitV5Request<BybitPositionRes>(apiKey, secret, "/v5/position/list", {
          category: "linear",
          settleCoin: "USDC",
          limit: "200",
        }),
        bybitV5Request<BybitPositionRes>(apiKey, secret, "/v5/position/list", {
          category: "inverse",
          limit: "200",
        }),
      ]);

      const parsePositions = (
        res: PromiseSettledResult<{
          retCode: number;
          retMsg: string;
          result: BybitPositionRes;
        }>,
        isInverse: boolean,
      ) => {
        if (res.status !== "fulfilled") return;
        if (res.value.retCode !== 0) return;
        for (const p of res.value.result?.list ?? []) {
          if (p.side === "None") continue;
          const size = parseFloat(p.size || "0");
          if (size <= 0) continue;
          const unrealizedPnl = parseFloat(p.unrealisedPnl || "0");
          const notionalUSD = isInverse
            ? size * Math.abs(parseFloat(p.markPrice || "0"))
            : Math.abs(parseFloat(p.positionValue || "0"));
          const leverage = parseFloat(p.leverage || "1");
          const margin = leverage > 0 ? notionalUSD / leverage : 0;
          positions.push({
            symbol: p.symbol,
            side: p.side === "Buy" ? "Long" : "Short",
            size,
            entryPrice: parseFloat(p.entryPrice || "0"),
            markPrice: parseFloat(p.markPrice || "0"),
            unrealizedPnl,
            unrealizedPnlKRW: unrealizedPnl * fxRate,
            pnlPct: margin > 0 ? (unrealizedPnl / margin) * 100 : 0,
            leverage,
            notionalUSD,
            notionalKRW: notionalUSD * fxRate,
            exchangeId: "bybit",
            exchangeName: "Bybit",
          });
        }
      };

      parsePositions(usdtRes, false);
      parsePositions(usdcRes, false);
      parsePositions(inverseRes, true);
    } catch (e) {
      console.error("[Bybit] position fetch exception:", e);
    }

    // total = UNIFIED 총자산(미실현 PnL 포함) + Funding 코인
    const totalUSD = unifiedEquityUSD + fundTotalUSD;

    return {
      id: "bybit",
      name: "Bybit",
      totalKRW: totalUSD * fxRate,
      totalUSD,
      change24h: 0,
      holdings,
      positions,
      lastUpdated: new Date().toISOString(),
    };
  } catch (e: unknown) {
    return errorResult("bybit", "Bybit", e);
  }
}

// ─── BingX ──────────────────────────────────────────────────────────────────

export async function getBingXData(fxRate: number): Promise<ExchangeData> {
  try {
    const missing = ["BINGX_API_KEY", "BINGX_SECRET"].filter(
      (k) => !process.env[k],
    );
    if (missing.length) throw new Error(`환경변수 누락: ${missing.join(", ")}`);
    const exchange = new ccxt.bingx({
      apiKey: process.env.BINGX_API_KEY!,
      secret: process.env.BINGX_SECRET!,
    });
    const balance = await exchange.fetchBalance();
    const merged: Record<string, number> = {};
    for (const [sym, bal] of Object.entries(balance.total)) {
      if ((bal as number) > 0) merged[sym] = bal as number;
    }
    const holdings = await buildHoldings(merged, fxRate, exchange);

    // 현물 보유코인별 평균 매수단가: 최근 200건 체결 내역으로 가중평균 계산
    const BX_STABLES = new Set(["USDT", "USDC", "BUSD", "FDUSD", "DAI"]);
    await Promise.allSettled(
      holdings
        .filter((h) => !BX_STABLES.has(h.symbol))
        .map(async (h) => {
          try {
            const trades = await exchange.fetchMyTrades(
              `${h.symbol}/USDT`,
              undefined,
              200,
            );
            const buys = trades.filter((t) => t.side === "buy");
            if (buys.length === 0) return;
            const totalQty = buys.reduce((s, t) => s + (t.amount ?? 0), 0);
            const totalCost = buys.reduce(
              (s, t) => s + (t.cost ?? (t.amount ?? 0) * (t.price ?? 0)),
              0,
            );
            if (totalQty <= 0) return;
            const avgPriceUSD = totalCost / totalQty;
            h.avgBuyPriceKRW = avgPriceUSD * fxRate;
            h.costBasisKRW = avgPriceUSD * h.amount * fxRate;
          } catch {
            // 해당 심볼 거래내역 없거나 API 오류 → 무시
          }
        }),
    );

    // 선물 포지션 시도
    const positions: FuturesPosition[] = [];
    try {
      const rawPositions = await exchange.fetchPositions();
      for (const pos of rawPositions) {
        const contracts = pos.contracts as number | undefined;
        if (!contracts || contracts <= 0) continue;
        const unrealizedPnl = (pos.unrealizedPnl as number) ?? 0;
        const notionalUSD = Math.abs((pos.notional as number) ?? 0);
        positions.push({
          symbol: pos.symbol,
          side: pos.side === "long" ? "Long" : "Short",
          size: contracts,
          entryPrice: (pos.entryPrice as number) ?? 0,
          markPrice: (pos.markPrice as number) ?? 0,
          unrealizedPnl,
          unrealizedPnlKRW: unrealizedPnl * fxRate,
          pnlPct: (pos.percentage as number) ?? 0,
          leverage: (pos.leverage as number) ?? 1,
          notionalUSD,
          notionalKRW: notionalUSD * fxRate,
          exchangeId: "bingx",
          exchangeName: "BingX",
        });
      }
    } catch {
      // BingX 포지션 조회 실패 → 무시
    }

    const spotUSD = holdings.reduce((s, h) => s + h.valueUSD, 0);
    const pnlUSD = positions.reduce((s, p) => s + p.unrealizedPnl, 0);
    const totalUSD = spotUSD + pnlUSD;

    return {
      id: "bingx",
      name: "BingX",
      totalKRW: totalUSD * fxRate,
      totalUSD,
      change24h: 0,
      holdings,
      positions,
      lastUpdated: new Date().toISOString(),
    };
  } catch (e: unknown) {
    return errorResult("bingx", "BingX", e);
  }
}

// ─── Bithumb (Open API v1, JWT Bearer) ──────────────────────────────────────

// jsonwebtoken 없이 Node.js crypto만으로 HS256 JWT 생성
function buildBithumbJWT(accessKey: string, secretKey: string): string {
  const header = Buffer.from(
    JSON.stringify({ alg: "HS256", typ: "JWT" }),
  ).toString("base64url");
  const payload = Buffer.from(
    JSON.stringify({
      access_key: accessKey,
      nonce: crypto.randomUUID(),
      timestamp: Date.now(),
    }),
  ).toString("base64url");
  const sig = crypto
    .createHmac("sha256", secretKey)
    .update(`${header}.${payload}`)
    .digest("base64url");
  return `${header}.${payload}.${sig}`;
}

type BithumbAccount = {
  currency: string;
  balance: string;
  locked: string;
  avg_buy_price: string;
  unit_currency: string;
};

export async function getBithumbData(fxRate: number): Promise<ExchangeData> {
  try {
    const missing = ["BITHUMB_ACCESS_KEY", "BITHUMB_SECRET_KEY"].filter(
      (k) => !process.env[k],
    );
    if (missing.length) throw new Error(`환경변수 누락: ${missing.join(", ")}`);
    const accessKey = process.env.BITHUMB_ACCESS_KEY!;
    const secretKey = process.env.BITHUMB_SECRET_KEY!;

    const token = buildBithumbJWT(accessKey, secretKey);

    let accounts: BithumbAccount[];
    try {
      const res = await axios.get("https://api.bithumb.com/v1/accounts", {
        headers: { Authorization: `Bearer ${token}` },
        timeout: 10000,
      });
      accounts = res.data;
    } catch (axiosErr: unknown) {
      if (axiosErr && typeof axiosErr === "object" && "response" in axiosErr) {
        const res = (
          axiosErr as {
            response: {
              status: number;
              data?: { error?: { name?: string; message?: string } };
            };
          }
        ).response;
        const name = res.data?.error?.name ?? String(res.status);
        const msg = res.data?.error?.message;
        throw new Error(`Bithumb [${name}]${msg ? ": " + msg : ""}`);
      }
      throw axiosErr;
    }

    const holdings: AssetHolding[] = [];

    for (const acc of accounts) {
      const total =
        parseFloat(acc.balance || "0") + parseFloat(acc.locked || "0");
      if (total <= 0) continue;

      if (acc.currency === "KRW") {
        holdings.push({
          symbol: "KRW",
          name: "Korean Won",
          amount: total,
          valueKRW: total,
          valueUSD: total / fxRate,
          priceKRW: 1,
          priceUSD: 1 / fxRate,
        });
        continue;
      }

      // 현재가 조회: GET /v1/ticker?markets=KRW-{symbol}
      const market = `KRW-${acc.currency}`;
      const tickerRes = await axios
        .get(`https://api.bithumb.com/v1/ticker?markets=${market}`, {
          timeout: 5000,
        })
        .catch(() => null);
      const priceKRW: number = tickerRes?.data?.[0]?.trade_price ?? 0;

      if (priceKRW > 0) {
        const avgBuyPriceKRW = parseFloat(acc.avg_buy_price || "0");
        const costBasisKRW =
          avgBuyPriceKRW > 0 ? total * avgBuyPriceKRW : undefined;
        holdings.push({
          symbol: acc.currency,
          amount: total,
          valueKRW: total * priceKRW,
          valueUSD: (total * priceKRW) / fxRate,
          priceKRW,
          priceUSD: priceKRW / fxRate,
          avgBuyPriceKRW: avgBuyPriceKRW > 0 ? avgBuyPriceKRW : undefined,
          costBasisKRW,
        });
      }
    }

    const totalKRW = holdings.reduce((s, h) => s + h.valueKRW, 0);
    return {
      id: "bithumb",
      name: "Bithumb",
      totalKRW,
      totalUSD: totalKRW / fxRate,
      change24h: 0,
      holdings,
      lastUpdated: new Date().toISOString(),
    };
  } catch (e: unknown) {
    return errorResult("bithumb", "Bithumb", e);
  }
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function buildHoldings(
  balances: Record<string, number>,
  fxRate: number,
  exchange: Exchange,
): Promise<AssetHolding[]> {
  const holdings: AssetHolding[] = [];

  for (const [sym, amount] of Object.entries(balances)) {
    if (amount <= 0) continue;

    if (sym === "USDT" || sym === "USDC" || sym === "USD") {
      holdings.push({
        symbol: sym,
        amount,
        valueUSD: amount,
        valueKRW: amount * fxRate,
        priceUSD: 1,
        priceKRW: fxRate,
      });
      continue;
    }

    try {
      const ticker = await exchange.fetchTicker(`${sym}/USDT`);
      const priceUSD = ticker.last ?? 0;
      holdings.push({
        symbol: sym,
        amount,
        valueUSD: amount * priceUSD,
        valueKRW: amount * priceUSD * fxRate,
        priceUSD,
        priceKRW: priceUSD * fxRate,
        change24h: ticker.percentage ?? 0,
      });
    } catch {
      holdings.push({
        symbol: sym,
        amount,
        valueUSD: 0,
        valueKRW: 0,
      });
    }
  }

  return holdings.filter((h) => h.valueUSD > 0.01 || h.valueKRW > 10);
}

function errorResult(id: string, name: string, e: unknown): ExchangeData {
  const msg = e instanceof Error ? e.message : String(e);
  return {
    id: id as ExchangeData["id"],
    name,
    totalKRW: 0,
    totalUSD: 0,
    change24h: 0,
    holdings: [],
    error: msg,
    lastUpdated: new Date().toISOString(),
  };
}
