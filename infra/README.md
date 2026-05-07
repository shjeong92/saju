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

- Postgres: `postgres://saju:saju@localhost:5432/saju`
- Redis: `redis://localhost:6379`

## OCI 배포 (Day 3)

`docker-compose.prod.yml` 추가 예정 — api + worker + postgres + redis 통합 스택.
