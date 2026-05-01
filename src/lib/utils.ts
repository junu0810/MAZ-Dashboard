import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatKRW(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  const abs  = Math.abs(amount);
  if (abs < 1) return `${sign}₩${abs.toFixed(2)}`;
  return `${sign}₩${Math.round(abs).toLocaleString("ko-KR")}`;
}

export function formatUSD(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

export function formatChange(pct: number): string {
  const sign = pct >= 0 ? "+" : "";
  return `${sign}${pct.toFixed(2)}%`;
}

export function isPositive(value: number): boolean {
  return value >= 0;
}

export function formatPrice(price: number): string {
  if (price === 0) return "$0";
  if (price >= 100) {
    return `$${price.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }
  if (price >= 1) return `$${price.toFixed(4)}`;
  const decimals = Math.min(Math.max(4, Math.ceil(-Math.log10(price)) + 2), 10);
  return `$${price.toFixed(decimals)}`;
}
