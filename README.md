# Saju

사주 기반 AI 매칭 + 채팅 앱.

## Stack

- **Backend**: Bun + Hono + Drizzle (Postgres) + Pothos/Yoga GraphQL + BullMQ (Redis)
- **Frontend**: Next.js 15 (Vercel)
- **AI**: Anthropic Claude (Sonnet 4.5) via 사내 프록시
- **사주 엔진**: [ssaju](https://github.com/golbin/ssaju) — 4주 + 십신 + 합충형파해
- **인프라**: OCI K3s + ArgoCD GitOps (backend/worker), Vercel (frontend)

## Structure

```
saju/
├── backend/                  # Bun workspace
│   ├── apps/
│   │   ├── api/              # Hono 서버 (REST + GraphQL + WebSocket)
│   │   └── worker/           # BullMQ 워커
│   └── packages/
│       ├── db/               # Drizzle 스키마 + 마이그레이션
│       ├── graphql/          # Pothos 스키마
│       ├── saju/             # ssaju wrapper + 매칭 로직
│       ├── ai/               # Claude 클라이언트
│       └── shared/           # 공통 타입/유틸
├── frontend/                 # Next.js 15 (Vercel)
└── infra/
    ├── docker-compose.dev.yml   # 로컬 Postgres+Redis
    └── k3s-manifests/           # 운영 K3s GitOps 매니페스트 (ArgoCD)
```

## Production

운영 배포는 K3s + ArgoCD GitOps. 자세한 절차는 [`infra/k3s-manifests/README.md`](infra/k3s-manifests/README.md) 참고.

- API: `https://api.botfolio.cc` (K3s, multi-arch GHCR 이미지)
- Web: `https://saju-web.vercel.app` (Vercel, 프로젝트명에 따라 다를 수 있음)

## Development

```bash
# 1. 의존성 한 번에 설치
bun run install:all

# 2. Postgres + Redis 띄우기 (Docker 필요)
bun run dev:infra

# 3. api(4000) + worker + web(3100) 동시 실행
bun run dev
```

개별 실행: `bun run dev:backend`, `bun run dev:frontend`
인프라 정리: `bun run infra:down` (데이터 유지) / `bun run infra:reset` (전체 초기화)

## Docs

설계 문서: [TS 백엔드 프로젝트 - 사주 매칭 앱 (3일 MVP)](https://www.notion.so/indent/TS-35971800c4a5803ca510ed1f31826c5c)
