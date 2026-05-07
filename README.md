# Saju

사주 기반 AI 매칭 + 채팅 앱.

## Stack

- **Backend**: Bun + Hono + Drizzle (Postgres) + Pothos/Yoga GraphQL + BullMQ (Redis)
- **Frontend**: Next.js 15 (Vercel)
- **AI**: Anthropic Claude (Sonnet 4.5) via 사내 프록시
- **사주 엔진**: [ssaju](https://github.com/golbin/ssaju) — 4주 + 십신 + 합충형파해
- **인프라**: OCI (Docker Compose), Vercel

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
├── frontend/                 # Next.js 15
└── infra/                    # Docker Compose, OCI 배포 스크립트
```

## Development

```bash
# Backend
cd backend
bun install
bun run dev        # api + worker 동시 실행

# Frontend
cd frontend
bun install
bun run dev
```

## Docs

설계 문서: [TS 백엔드 프로젝트 - 사주 매칭 앱 (3일 MVP)](https://www.notion.so/indent/TS-35971800c4a5803ca510ed1f31826c5c)
