# MAZ Dashboard

5개 금융 플랫폼(OKX, Bybit, BingX, 빗썸, 미래에셋)의 통합 자산을 실시간으로 시각화하는 미니멀 대시보드

---

## 요구사항

- **Node.js 18+** — `nvm use 18`
- **npm 10+**

---

## 시작하기

### 1. 환경 변수 설정

```bash
cp .env.local.example .env.local
```

`.env.local`을 열고 사용하는 거래소의 API 키를 입력합니다.

```env
# OKX
OKX_API_KEY=
OKX_SECRET=
OKX_PASSPHRASE=

# Bybit
BYBIT_API_KEY=
BYBIT_SECRET=

# BingX
BINGX_API_KEY=
BINGX_SECRET=

# 빗썸
BITHUMB_API_KEY=
BITHUMB_SECRET=

# 미래에셋
MIRAE_ACCESS_TOKEN=
MIRAE_ACCOUNT_NO=

# KEXIM 환율 API (선택 — 없으면 Dunamu fallback 사용)
KEXIM_API_KEY=
```

> API 키가 없는 거래소는 해당 카드에 에러가 표시되며, 나머지 거래소는 정상 동작합니다.

### 2. 개발 서버 실행

```bash
nvm use 18
npm install   # 최초 1회
npm run dev
```

브라우저에서 [http://localhost:3000](http://localhost:3000) 접속 → `/dashboard`로 자동 이동

### 3. 프로덕션 빌드

```bash
npm run build
npm run start
```

---

## 프로젝트 구조

```
src/
├── app/
│   ├── dashboard/page.tsx       # 메인 대시보드 UI
│   └── api/assets/route.ts      # 5개 거래소 통합 API
├── components/
│   ├── cards/AssetCard.tsx      # 거래소별 자산 카드
│   ├── charts/AssetPie.tsx      # 자산 분포 도넛 차트
│   └── dashboard/
│       ├── TotalSummary.tsx     # 총 자산 & 24h 변동 헤더
│       └── AssetTable.tsx       # 통합 자산 인벤토리 테이블
├── hooks/useAssets.ts           # 1분 자동 갱신 데이터 훅
└── lib/
    ├── exchanges.ts             # 거래소 연동 로직 (ccxt + axios)
    ├── types.ts                 # 공통 타입 정의
    └── utils.ts                 # 포맷 유틸 (KRW, USD, %)
```

---

## 기술 스택

| 분류 | 라이브러리 |
|------|-----------|
| Framework | Next.js 14 (App Router) |
| Styling | Tailwind CSS + Glassmorphism |
| UI | Shadcn/ui, Lucide Icons |
| Animation | Framer Motion |
| Data Fetching | TanStack Query (1분 자동 갱신) |
| Chart | Recharts (Donut Chart) |
| Exchange | ccxt (OKX, Bybit, BingX) |
| HTTP | axios (Bithumb, Mirae Asset) |
