# Saju MVP - 오늘 끝낼 작업 리스트

> 사주 매칭 앱 + ts-stack-study 학습 자료 14개 보강 완주.
> 진행 상태: ✅ 완료 / 🔄 진행 중 / ⏳ 대기

## 사전 준비

- [x] 회사 AI 프록시 endpoint 확인 (`https://ccapi.labs.mengmota.com/anthropic/v1`)
- [x] 로컬 Docker (Postgres + Redis) 점검
- [x] 앱 이름 확정 (saju)
- [x] GitHub 레포 생성 (로컬 git init 완료, push는 나중)
- [ ] 구글 OAuth 콘솔 등록 → CLIENT_ID/SECRET 발급
- [ ] AI 프록시 API 키 받아서 .env에 채우기

## Day 1 오전 - 모노레포 + 인프라 + 핵심 스키마

- [x] Bun workspace 모노레포 셋업 (apps/api, apps/worker, packages/{db,graphql,saju,ai,shared})
- [x] 루트 통합 dev 스크립트 (`bun run dev` → api + worker + web 동시 부팅, 색깔 프리픽스 로깅)
- [x] frontend Next.js 15 (App Router) 셋업
- [x] infra docker-compose.dev.yml (Postgres 5532 + Redis 6479)
- [x] apps/api Hono 부팅 + /health 엔드포인트
- [x] packages/db Drizzle 셋업 + Postgres 연결 (postgres.js + drizzle ORM)
- [x] ENUM 8종 정의 (auth_provider 단일 google, gender, calendar_type, match_status, message_type, generation_status, job_status, fortune_score)
- [x] users + saju_inputs + saju_charts + user_profiles 테이블 마이그레이션
- [x] Drizzle migrate로 로컬 Postgres 반영 + 더미 INSERT/SELECT/DELETE 동작 확인 (smoke 스크립트)
- [x] 인증 단일화 (구글 OAuth만, 카카오 Phase 2로 이연)

## Day 1 오후 - 인증 + 사주 + 첫 잡

### 학습 보강 먼저

- [x] `packages/shared/env.ts` — zod로 process.env 검증 (07-project §3)
- [x] Branded type 도입: `UserId`, `MatchId` (`packages/shared/src/types.ts`) (01-typescript-boost §5)

### Drizzle 보강

- [x] `packages/db/src/schema/relations.ts` — relations() 정의 (users ↔ sajuChart/profile/matches/chatRooms 등) (03-drizzle §4)
- [x] saju_charts.fiveElements/tenGods/sipsinCounts/relations/rawChart에 `.$type<{...}>()` 명시 (03-drizzle §7-6)
- [x] 추가 테이블 마이그레이션: personal_readings + compatibility_reports + daily_fortunes + matches + chat_rooms + messages + job_logs (D-4 status 컬럼 포함)
- [x] `db:studio` 한 번 실행해서 UI로 둘러보기 (학습용) (03-drizzle §8) — `bun run db:studio`로 부팅 확인 (https://local.drizzle.studio), 11개 테이블 모두 정상 인식

### Hono + 인증

- [x] `Hono<{ Variables: Variables }>` 타입 안전 컨텍스트 적용 (02-hono §4)
- [x] 라우터 분리: `apps/api/src/routes/{auth,saju}.ts` (02-hono §5)
- [x] `apps/api/src/middleware/auth.ts` — JWT 검증 → context.userId 주입
- [x] `POST /auth/upsert` 라우트 (provider/providerId 받아서 users upsert + JWT 발급)
- [x] `@hono/zod-validator`로 `POST /saju` 입력 검증 (02-hono §6)

### ssaju 도메인 (Day 2 매칭 점수 의존)

- [x] `packages/saju` ssaju 의존성 추가
- [x] `computeSajuChart` 함수 구현 (ssaju wrapper, 입력 → 원국/십신/관계 반환, jsonb $type과 시그니처 일치)

### 사주 입력 흐름

- [x] `POST /saju` 핸들러 — 동기 ssaju 계산 → saju_charts INSERT
- [x] **트랜잭션** 적용: saju_inputs + saju_charts + user_profiles + personal_readings(pending) 한 묶음 (03-drizzle §6)

### BullMQ + AI

- [x] `apps/worker` BullMQ Queue/Worker 분리 + Redis 연결 (06-bullmq §2)
- [x] `packages/ai` Anthropic 클라이언트 (Claude Sonnet 4.5, 사내 프록시 baseURL)
- [x] `ai.profile-reading` 잡 핸들러 (saju_chart → ssaju compactReading + 프롬프트 → LLM → personal_readings UPDATE: status pending→generating→completed/failed)
- [ ] BullMQ FlowProducer로 회원가입 → ai.profile-reading 체이닝 (06-bullmq §5) ← Day 2에서 매칭 잡 체이닝과 함께 작성 예정
- [x] BullMQ jobId idempotency (예: `profile-reading:${userId}:v1`) (06-bullmq §3)
- [x] BullMQ Graceful shutdown (`SIGTERM` 핸들러 + `await worker.close()`) (06-bullmq §7-4)
- [x] 사주 입력 후 ai.profile-reading 잡 자동 enqueue + status='pending'으로 row INSERT 같이

**Day 1 종료 조건**: REST로 사주 입력 → 만세력 계산 즉시 반영 → 백그라운드 LLM 풀이 → personal_readings status 변화 (pending → generating → completed) DB에서 확인.

✅ 검증 완료 (`AI_PROXY_API_KEY` 빈 상태에서 실제 호출):
- POST /auth/upsert → JWT 발급 OK
- POST /saju → 트랜잭션으로 saju_inputs + saju_charts + user_profiles + personal_readings(pending) 일괄 INSERT, 만세력 즉시 응답 (dayMaster=庚, fiveElements 정상)
- BullMQ 잡 자동 enqueue (jobId=`profile-reading:<uid>:v1`로 idempotency 작동, 재시도 시 같은 id 사용)
- Worker가 잡 picking → status `pending` → `generating` → (AI 프록시 404 → `failed`, 키 들어오면 `completed`)
- GET /saju/me로 chart + reading 상태 조회 OK

## Day 2 오전 - GraphQL 인프라

> 🔄 **선행 작업 추가 발생**: `@pothos/plugin-drizzle@0.17`이 drizzle-orm `>=1.0.0-beta.2` peer 요구
> → drizzle-orm 0.45.2 → **1.0-rc.2** 업그레이드 (RQBv2 마이그레이션 포함). 커밋 `7c5a0e5`로 분리.

- [x] `packages/graphql` Pothos 셋업 + 빌더 정의
- [x] Pothos 플러그인 5종 등록: errors, relay, dataloader, scope-auth, drizzle (04-pothos-yoga §7)
- [ ] Yoga를 Hono `/graphql` 라우트에 마운트
- [ ] GraphQL context: JWT 검증 → userId 주입 + db + loaders (07 §4) — 타입은 정의됨, factory 구현 필요
- [ ] Scalar (DateTime, Date) + Enum (모든 enum) 등록
- [ ] User / UserProfile / SajuChart / PersonalReading / DailyFortune 객체 타입
- [ ] DataLoader 직접 작성 1개 (matchesByUserId) (05-dataloader §2)
- [ ] `loadableObject` 1개 (UserType을 loadable로) (05-dataloader §5)
- [ ] Query.me / Query.myReading / Query.myDailyFortune 리졸버
- [ ] Mutation.submitSaju + Mutation.updateProfile 리졸버
- [ ] GraphQL Yoga UI에서 수동 검증 (`/graphql`)

## Day 2 오후 - 매칭 + 일일 운세 + 테스트

### 매칭 도메인

- [ ] `packages/saju/relations.ts` — 천간 합/충, 지지 6합/3합/방합/충/형/파/해 테이블
- [ ] `packages/saju/tenGods.ts` — 십신 매핑 테이블 + 양방향 점수
- [ ] `packages/saju/compatibility.ts` — 점수 산출 4요소 (D-2: 일간합 25 + 오행균형 25 + 십신시너지 25 + 지지관계 25)

### 테스트

- [ ] vitest 셋업 (07 §7)
- [ ] 단위 테스트: 알려진 두 사주 → 점수 검증
- [ ] vitest GraphQL fetch 테스트 1개 (`yoga.fetch(...)` 패턴)

### 잡

- [ ] `match.curate` 잡 (사용자 N명 → 페어별 점수 → 상위 K개 matches INSERT, compatibility_reports row도 status='pending'으로 같이 INSERT)
- [ ] `ai.compatibility` 잡 핸들러 (LLM 호출 → compatibility_reports UPDATE)
- [ ] `ai.daily-fortune` 잡 핸들러
- [ ] **JobScheduler cron** `ai.daily-fortune` 매일 04:00 (06-bullmq §4)
- [ ] 첫 가입자용 즉시 daily_fortune 생성 잡 트리거 (사주 입력 직후)

### GraphQL 매칭

- [ ] Match / CompatibilityReport / ChatRoom GraphQL 타입
- [ ] Query.matches + Query.match(id) 리졸버 (userA/userB 방향 처리)
- [ ] Mutation.likeMatch + Mutation.dismissMatch 리졸버 (양쪽 like 시 chat_rooms 자동 생성)
- [ ] Pothos `scope-auth` 플러그인으로 매칭 본인만 조회/변경 가능 (07 §6)

**Day 2 종료 조건**: 더미 유저 6명 시드 → match.curate 트리거 → matches 생성 → AI 풀이 비동기 채워짐 → GraphQL로 매칭+점수+풀이 조회. 일일 운세 1건 생성 확인.

## Day 3 오전 - 채팅 (WebSocket + Subscription)

- [ ] Hono WebSocket 라우트 (`/ws`) + JWT 검증
- [ ] Redis pub/sub 어댑터 (ioredis) - 채널: `chat:room:<roomId>`
- [ ] `Mutation.sendMessage` (messages INSERT + chat_rooms 메타 UPDATE + Redis pub)
- [ ] `Mutation.markRoomRead` (readByA/readByB UPDATE)
- [ ] `Subscription.messageAdded(roomId)` (Redis sub → 클라이언트 푸시)
- [ ] `Subscription.matchSuggested` (새 매칭 발생 시 푸시)
- [ ] `Subscription.readingReady` (personal_readings status='completed' 시 푸시)
- [ ] `Subscription.reportReady` (compatibility_reports status='completed' 시 푸시)
- [ ] 채팅방 진입 시 system 메시지 자동 표시 (compatibility_reports.firstDateIdeas 활용)
- [ ] 참여자 본인만 메시지 송수신 가능한 가드 (scope-auth)

## Day 3 오후 - 프론트 + 배포

### 프론트

- [ ] Auth.js v5 설치 + 구글 provider
- [ ] Auth.js callbacks.signIn → 백엔드 `/auth/upsert` 호출 → JWT를 session에 저장
- [ ] urql 클라이언트 셋업 + Authorization 헤더 자동 부착
- [ ] urql subscriptionExchange (graphql-ws)
- [ ] 페이지: 로그인 (구글 버튼)
- [ ] 페이지: 사주 입력 폼 (생년월일시 + 양/음력 + 성별)
- [ ] 페이지: 내 사주 풀이 (PersonalReading status별 분기 UI)
- [ ] 페이지: 일일 운세 (오늘자)
- [ ] 페이지: 매칭 피드 (점수 카드 + like/dismiss 버튼)
- [ ] 페이지: 매칭 상세 + 궁합 리포트 (status별 분기 UI)
- [ ] 페이지: 채팅방 리스트 + 채팅방 (메시지 송수신 + Subscription)

### 배포

- [ ] 시드 스크립트: 더미 유저 6명 + 사주 + 매칭 자동 생성 (시연용)
- [ ] OCI Docker Compose: api + worker + postgres + redis (env, volume, healthcheck)
- [ ] OCI 방화벽: API 포트 + WebSocket 포트 개방 확인
- [ ] OCI에 배포 + 동작 확인 (curl + wscat)
- [ ] Vercel에 frontend 배포 + env (백엔드 URL, NEXTAUTH_URL, OAuth secrets)
- [ ] 구글 OAuth 콘솔에 실제 도메인 redirect URI 추가
- [ ] 친구 1명 초대 → 가입 → 매칭 → 채팅 시연

**Day 3 종료 조건**: 실제 도메인에서 구글 로그인 → 사주 입력 → 매칭 → AI 풀이 조회 → 채팅 송수신까지 end-to-end 동작.

## 출시 직후 보강

- [ ] Bull Board (`@bull-board/hono`) 마운트 (06-bullmq §8)
- [ ] 에러 로깅 (Sentry 무료 티어)
- [ ] 헬스체크 모니터링 (UptimeRobot)
- [ ] 사용자 피드백 수집 폼

## ts-stack-study 학습 영역 완주 체크

각 학습 노트의 핵심 주제가 위 todo로 다 커버되는지 최종 점검 (모두 ✅ 되면 학습 완주).

### 01-typescript-boost
- [x] §6 tsconfig strict + noUncheckedIndexedAccess (이미 설정됨)
- [x] §2 typeof + infer ($inferSelect/Insert로 schema/users.ts에서 사용 중)
- [ ] §1 Generic (Pothos builder에서 자연스럽게 사용) ← Day 2
- [x] §3 satisfies (env.ts에서 zod parse 활용; satisfies는 Day 2 builder에서 추가)
- [x] §5 Branded type (UserId, MatchId, ChatRoomId, MessageId 등 packages/shared/src/types.ts)

### 02-hono
- [x] §1-2 Context (`/health`)
- [x] §7 실행 (Bun으로 동작 확인)
- [x] §3 미들웨어 (auth.ts, context.ts)
- [x] §4 Variables 타입 (`Hono<AppEnv>`)
- [x] §5 라우터 분리 (routes/auth.ts, routes/saju.ts, app.route 사용)
- [x] §6 zod-validator (POST /auth/upsert + POST /saju)

### 03-drizzle
- [x] §2 스키마 정의 (ENUM + 11테이블)
- [x] §3 CRUD (smoke 스크립트, upsert/select/delete)
- [x] §5 마이그레이션 (drizzle-kit generate/migrate, 0001 추가 적용 완료)
- [x] §4 Relational query (relations() one/many 정의, with 사용은 Day 2 GraphQL에서)
- [x] §6 트랜잭션 (POST /saju에서 db.transaction 사용)
- [x] §7-6 jsonb $type<> (saju_charts, personal_readings, matches, daily_fortunes, messages, job_logs)
- [x] §8 Studio (`bun run db:studio` 부팅 확인, https://local.drizzle.studio — 11개 테이블 정상)

### 04-pothos-yoga
- [x] §2 builder (`packages/graphql/src/builder.ts` SchemaBuilder<{Context, AuthScopes, DrizzleRelations, ...}>)
- [ ] §3 Object Type
- [ ] §4 Mutation
- [ ] §5 Yoga + Hono 통합
- [x] §7 Plugin 5종 (errors, relay, dataloader, scope-auth, drizzle)

### 05-dataloader
- [ ] §2 createLoaders 직접 작성
- [ ] §3 context per-request 인스턴스
- [ ] §5 loadableObject

### 06-bullmq
- [x] §2 Queue/Worker 분리 (apps/api/src/queues + apps/worker/src/jobs)
- [x] §3 옵션 (attempts: 3, backoff exponential, jobId idempotency, removeOnComplete/Fail)
- [ ] §4 JobScheduler cron (Day 2: ai.daily-fortune)
- [ ] §5 FlowProducer 체이닝 (Day 2: 매칭 잡과 함께)
- [x] §7-4 Graceful shutdown (SIGTERM/SIGINT → worker.close + redis.quit)
- [ ] §8 Bull Board (출시 직후)

### 07-project-structure
- [x] §1 Layered 구조 (Bun workspace)
- [x] §8 Docker compose dev (api+worker+postgres+redis)
- [x] §3 env.ts zod (packages/shared/src/env.ts, 부팅 시점 검증)
- [ ] §4 Context 패턴 (Yoga context factory) ← Day 2
- [x] §5 인증 (Hono 미들웨어 attachUser/requireAuth + JWT)
- [ ] §6 권한 (scope-auth) ← Day 2
- [ ] §7 vitest ← Day 2

## 마인드셋 체크 (학습 README §마인드셋)

코드 작성 중에 항상 체크.

- [ ] **명시성**: `as any` 0건, 타입 회피 0건
- [ ] **DataLoader**: 모든 GraphQL relation 필드가 loader 경유
- [ ] **워커 분리**: API 프로세스에서 잡 처리 안 함, 항상 Queue.add → 별도 worker
- [ ] **env 검증**: 부팅 시점 process.env 검증, 통과 못 하면 즉시 죽음

## 진행 통계 (현재 시점)

- 사전 준비: 4/6 완료
- Day 1 오전: 10/10 완료 ✅
- Day 1 오후: 18/19 완료 ✅ (FlowProducer만 남음 — Day 2 매칭 잡과 함께)
- Day 2 오전: **2/11** (Pothos builder + 플러그인 5종 셋업 완료, Yoga 마운트부터 이어서)
- Day 2 오후: 0/13
- Day 3 오전: 0/10
- Day 3 오후: 0/13
- 출시 직후: 0/4

**전체: 34/86 = 40% 진행**

> 📝 **다음 세션 시작점**: Day 2 오전 Step 2 (Yoga를 Hono `/graphql`에 마운트 + Context factory 구현)
> 직전 커밋: `7ac5e43 feat(graphql): Pothos builder + 플러그인 5종 셋업`

## 진행 순서 (지금부터)

1. env.ts (30분) — 학습 보강 첫 단추
2. Branded type (15분)
3. Drizzle relations + jsonb $type + 추가 테이블 마이그레이션 (1.5h)
4. Hono Variables + 라우터 분리 + 미들웨어 + zod-validator (1h)
5. Auth /upsert + JWT (1h)
6. ssaju wrapper + computeSajuChart (1h)
7. 사주 입력 트랜잭션 + REST (1h)
8. BullMQ Queue/Worker + AI 클라이언트 + ai.profile-reading 잡 + Flow + idempotency + graceful shutdown (2.5h)
9. → Day 1 종료 조건 검증

이후 Day 2/3은 같은 파일에서 이어서 진행.
