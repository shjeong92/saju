# Infra

## 로컬 개발

Postgres + Redis 띄우기:

```bash
docker compose -f infra/docker-compose.dev.yml up -d
```

내리기:

```bash
docker compose -f infra/docker-compose.dev.yml down
```

데이터까지 초기화:

```bash
docker compose -f infra/docker-compose.dev.yml down -v
```

## 접속 정보

- Postgres: `postgres://saju:saju@localhost:5532/saju` (호스트 포트 5532, 기본 5432 충돌 회피)
- Redis: `redis://localhost:6479` (호스트 포트 6479, 기본 6379 충돌 회피)

## OCI 배포 (Day 3)

`docker-compose.prod.yml` 추가 예정 — api + worker + postgres + redis 통합 스택.
