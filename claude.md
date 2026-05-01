# 🚀 Multi-Asset Zenith (MAZ) Dashboard Project

> **Project Goal:** 4개 코인 거래소와 1개 증권사의 자산을 실시간으로 통합하여 시각화하는 미니멀 대시보드 구축

---

## 1. 🛠 Technical Stack

- **Frontend:** Next.js 14+ (App Router), Tailwind CSS
- **UI Components:** Shadcn/ui, Framer Motion (Animations)
- **State Management:** TanStack Query (React Query)
- **Data Visualization:** Recharts (Donut & Area Charts)
- **Backend:** Node.js (Express) or Next.js API Routes
- **Libraries:**
  - `ccxt`: Crypto Exchange Integration (OKX, Bybit, BingX)
  - `bithumb-node-api`: Bithumb Integration
  - `axios`: Mirae Asset Open API calls

---

## 2. 📱 UI/UX Design Concept

- **Style:** Dark Mode & Glassmorphism (Inspired by pizzint.watch)
- **Color Palette:**
  - Background: `#0d1117` (Deep Charcoal)
  - Card: Semi-transparent Black with Backdrop Blur
  - Accent (Up): `#00ff88` (Neon Green)
  - Accent (Down): `#ff3e3e` (Vibrant Red)
- **Layout:**
  - **Top:** Total Net Worth & 24h Change Summary
  - **Middle:** 5-Exchange Asset Cards (Grid Layout)
  - **Bottom:** Integrated Asset Inventory Table

---

## 3. 🔌 API Integration List

| Platform        | Protocol       | Data Points                           |
| :-------------- | :------------- | :------------------------------------ |
| **OKX**         | CCXT (REST/WS) | Spot/Funding Balance, Real-time Price |
| **Bybit**       | CCXT (REST/WS) | Unified Account Balance               |
| **BingX**       | CCXT (REST)    | Account Balance, Position Data        |
| **Bithumb**     | Public API     | KRW Balance, Coin Holdings            |
| **Mirae Asset** | Open API       | Domestic/Overseas Stock Balance, P&L  |
| **FX Rate**     | KEXIM API      | USD/KRW Exchange Rate                 |

---

## 4. 📂 Project Structure (Proposed)

```text
/src
  /app
    /api/assets/route.ts   # Unified API Aggregator
    /dashboard/page.tsx    # Main UI
  /components
    /cards/AssetCard.tsx   # Individual Exchange Card
    /charts/AssetPie.tsx   # Distribution Chart
  /lib
    /exchanges.ts          # CCXT & Stock API Config
  /hooks
    /useAssets.ts          # Data Fetching Hook
```
