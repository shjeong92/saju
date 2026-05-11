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

- [x] `packages/graphql` Pothos 셋업 + 빌더 정의
- [x] Pothos 플러그인 5종 등록: errors, relay, dataloader, scope-auth, drizzle (04-pothos-yoga §7)
- [x] Yoga를 Hono `/graphql` 라우트에 마운트
- [x] GraphQL context: JWT 검증 → userId 주입 + db + loaders (07 §4) — `createGraphQLContext` factory 분리, JWT/BullMQ 모두 콜백 주입
- [x] Scalar (DateTime, Date) + Enum (모든 enum) 등록 — Enum 7종 (Gender/CalendarType/MatchStatus/MessageType/GenerationStatus/FortuneScore/AuthProvider)
- [x] User / UserProfile / SajuChart / PersonalReading / DailyFortune 객체 타입 — drizzleObject 활용, jsonb는 별도 ObjectType으로 한자→영문 매핑
- [x] DataLoader 직접 작성 1개 (matchesByUserId) (05-dataloader §2)
- [x] `loadableObject` 1개 (LoadableUser) — SajuChart.owner에서 실사용 (05-dataloader §5)
- [x] Query.me / Query.myReading / Query.myDailyFortune 리졸버 (모두 authenticated scope-auth)
- [x] Mutation.submitSaju + Mutation.updateProfile 리졸버 (REST 트랜잭션 패턴 + BullMQ 콜백 주입)
- [x] GraphQL Yoga UI에서 수동 검증 (`/graphql`) — introspection + me/submitSaju/myReading e2e 통과

✅ 검증 완료:
- 인증 X → scope-auth가 `me`/`myReading`/`myDailyFortune` 차단
- JWT Bearer → `me { id name email }` 정상 반환
- `mutation submitSaju` → 만세력 즉시 응답 + ai.profile-reading 잡 enqueue + LoadableUser owner 동시 fetch
- `myReading` → status `pending` 정상 노출

## Day 2 오후 - 매칭 + 일일 운세 + 테스트

### 매칭 도메인

- [x] `packages/saju/relations.ts` — 천간 합/충, 지지 6합/3합/방합/충/형/파/해 테이블
- [x] `packages/saju/tenGods.ts` — 십신 매핑 테이블 + 양방향 점수
- [x] `packages/saju/compatibility.ts` — 점수 산출 4요소 (일간합 25 + 오행균형 25 + 십신시너지 25 + 지지관계 25)

### 테스트

- [x] ~~vitest~~ → `bun:test` 사용 (워크스페이스 일관성, 추가 의존성 0)
- [x] 단위 테스트: relations(11) + tenGods(8) + compatibility(8) = 27 케이스 pass
- [x] GraphQL schema 테스트 1개 (`graphql.execute()` 패턴 — Yoga 없이 직접 schema 실행, 5 케이스 pass)

### 잡

- [x] `match.curate` 잡 (후보 사용자 N명 → 페어별 점수 → matches INSERT, compatibility_reports row도 status='pending'으로 같이 INSERT)
- [x] `ai.compatibility` 잡 핸들러 (LLM 호출 → compatibility_reports UPDATE)
- [x] `ai.daily-fortune` 잡 핸들러
- [x] **JobScheduler cron** `daily-fortune-tick` 매일 04:00 KST (Asia/Seoul tz) — tick이 모든 active 사용자에 daily-fortune 잡 fanout
- [x] 첫 가입자용 즉시 daily_fortune 생성 잡 트리거 (사주 입력 직후 트랜잭션 안에서 row INSERT + 큐 enqueue)

### GraphQL 매칭

- [x] Match / CompatibilityReport / ChatRoom GraphQL 타입 (+ ScoreBreakdown / CompatibilitySummary 보조 objectRef)
- [x] Query.matches + Query.match(id) 리졸버 (userA/userB 방향은 Match.partner/iLiked/theyLiked 필드로 추상화)
- [x] Mutation.likeMatch + Mutation.dismissMatch 리졸버 (양쪽 like 시 chat_rooms onConflictDoNothing INSERT)
- [x] Pothos `scope-auth` 플러그인으로 매칭 본인만 조회/변경 가능 (Query.match는 where에 OR 필터로 자동 권한 체크)

**Day 2 종료 조건**: 더미 유저 6명 시드 → match.curate 트리거 → matches 생성 → AI 풀이 비동기 채워짐 → GraphQL로 매칭+점수+풀이 조회. 일일 운세 1건 생성 확인.

✅ 검증 완료 (Alice + Bob e2e):
- POST /auth/upsert × 2 → JWT 발급
- POST /saju × 2 → 트랜잭션 + 3종 잡(profile-reading/daily-fortune/match.curate) 자동 enqueue
- Worker 3큐(ai/match/cron) 정상 부팅, `[worker] ready, queues=ai,match,cron`
- match.curate 잡: alice 입장 5 candidates → 5 matches INSERT + 5 ai.compatibility 체이닝
- Alice ↔ Bob 매치 score=71, breakdown notes: `A→B:정재 / B→A:정관`, `일지hae(亥申)`, `월지yukhap(巳申)`
- ai.compatibility 잡: 한국어 풀이 + 데이트 코스 4개 + 대화 주제 5개 LLM 응답 정상 수신
- ai.daily-fortune 잡: alice/bob 모두 score=good, sections 채워짐
- GraphQL `{ matches { id score partner { name } breakdown { notes } iLiked theyLiked } }` 정상
- `mutation likeMatch` Alice → status liked, Bob → status matched + chat_rooms 자동 생성 확인
- 잡은 진짜 버그 1건: BullMQ 5.x jobId 콜론 포함 시 정확히 3토큰 요구 → match-curate/compatibility jobId에 :v1 패딩으로 해결

## Day 3 오전 - 채팅 (WebSocket + Subscription) ✅

- [x] Hono WebSocket 라우트 (`/ws` 대신 `/graphql` 같은 endpoint에 graphql-ws upgrade) + JWT 검증 (connection_init payload)
- [x] Redis pub/sub 어댑터 (ioredis publisher/subscriber 분리) - Topics 헬퍼로 추상화
- [x] `Mutation.sendMessage` (messages INSERT + chat_rooms.lastMessageAt UPDATE + Redis publish)
- [x] `Mutation.markRoomRead` (readByA/readByB UPDATE)
- [x] `Subscription.messageAdded(roomId)` (Redis sub → 클라이언트 푸시)
- [x] `Subscription.matchSuggested` (likeMatch 시 partner에게 publish)
- [x] `Subscription.readingReady` (워커가 profile-reading 완료 시 publish)
- [x] `Subscription.reportReady` (워커가 compatibility 완료 시 publish)
- [x] 채팅방 진입 시 system 메시지 자동 표시 (likeMatch에서 양쪽 like 시 chat_rooms 생성 + system 메시지 INSERT + publish)
- [x] 참여자 본인만 메시지 송수신 가능한 가드 (chatRoom resolver / sendMessage / markRoomRead 모두 userA/B 체크)

✅ 검증 완료:
- graphql-ws connection_init JWT 인증 통과
- Alice ↔ Bob 채팅방 (1e64e90b-5aa9-4575-b4c1-168b4b5431b5) e2e 메시지 송수신
- Redis pub/sub 채널 `chat:room:<roomId>` 라우팅 정상
- likeMatch → chat_rooms onConflictDoNothing INSERT + system 메시지 publish 통과
- 참여자 아닌 사용자 chatRoom 접근 → null 반환 (Block 2에서 검증, "chatRoom not found" fallback UI)

## Day 3 오후 - 프론트 + 배포

### 프론트 (Bottom-up + 블록 단위 진행)

#### Block 1+2: Auth.js v5 + urql + graphql-ws 인프라 ✅ (커밋 4452c0f)
- [x] Auth.js v5 설치 + 구글 provider (next-auth@5.0.0-beta.31)
- [x] Auth.js callbacks.signIn → 백엔드 `/auth/upsert` 호출 → JWT를 session에 저장 (signIn/jwt/session callback chain + types augmentation)
- [x] urql 클라이언트 셋업 + Authorization 헤더 자동 부착 (fetchOptions 콜백 + tokenRef 패턴)
- [x] urql subscriptionExchange (graphql-ws + connectionParams 콜백)
- [x] 페이지: 로그인 (구글 버튼 + dev-login Alice/Bob 버튼 — `AUTH_ALLOW_DEV_LOGIN=true` 가드)
- [x] middleware.ts edge-safe NextAuth + auth.config.ts/auth.ts 분리 (V8 isolate 대응)

#### Block 3: GraphQL Codegen ✅ (커밋 ef4617c)
- [x] @graphql-codegen/cli + client-preset 셋업 (introspection over HTTP)
- [x] codegen.ts + package.json scripts (codegen / codegen:watch)
- [x] src/gql/ 자동 생성 (gitignore)
- [x] Playground.tsx의 gql`...` → graphql(`...`) 마이그레이션
- [x] typecheck 검증: 일부러 오타/nullable 미처리 → 컴파일 에러로 잡힘 확인

#### Block 4: 사주 입력 페이지 ✅ (커밋 1b71d3c)
- [x] 페이지: 사주 입력 폼 (생년월일시 + 양/음력 + 성별 + 매칭 선호도, 10필드)
- [x] enum 처리 정통 패턴 (`as const satisfies readonly { value: Enum; label: string }[]`)
- [x] 클라이언트 검증 (필수값, 연령 범위)
- [x] 제출 후 router.push('/reading')
- [x] e2e 검증: Alice 폼 제출 → DB 4개 테이블(saju_inputs/saju_charts/user_profiles/personal_readings) INSERT/UPDATE + BullMQ enqueue

#### Block 5: 내 사주 풀이 + 일일 운세 ✅ (커밋 bf1110e)
- [x] 페이지: 내 사주 풀이 (PersonalReading status별 분기 UI: pending/generating/completed/failed)
- [x] 페이지: 일일 운세 (오늘자, score별 색깔 매핑 + sections)
- [x] polling 패턴 정립 (isInProgress 인 동안 setInterval(refetch, 5000) + useEffect cleanup)
- [x] `as const satisfies Record<Enum, ...>` 패턴 (SCORE_META 모든 enum 값 빠짐없이 다루는지 컴파일 강제)
- [x] e2e 검증: 백엔드 → 워커 → AI(Claude) → DB → 프론트 데이터 흐름 통과

#### Block 6: 매칭 피드 + 매칭 상세 ✅
- [x] 백엔드: `Match.compatibilityReport` field 노출 (`t.relation(...)` 1줄, drizzle relation 자동 join)
- [x] 페이지: 매칭 피드 `/matches` (점수 카드 리스트 + breakdown 4 metric + like/dismiss + matched 알림 + 채팅방 링크)
- [x] 페이지: 매칭 상세 `/matches/[id]` (Next.js 15 dynamic route `params: Promise<...>`, 점수 세부 + AI 풀이 5섹션 + status 분기 + polling + like/dismiss)
- [x] `MatchStatus` enum 5종 `as const satisfies Record<...>` 패턴 (suggested/liked/matched/dismissed/expired)
- [x] e2e 검증: Alice 매칭 5건(matched 1 + suggested 4) 정상 렌더, like mutation DB+UI 갱신, polling cleanup, matched UX(채팅방 링크)

#### Block 7: 채팅방 ✅
- [x] 페이지: 채팅방 리스트 `/chat` (myChatRooms query + 카드 리스트 + unread blue dot/border + 빈 상태)
- [x] 페이지: 채팅방 본 `/chat/[roomId]` (Next.js 15 dynamic route, 메시지 송수신 + graphql-ws Subscription + 본인/상대 좌우 정렬 + system 메시지 가운데 + 자동 스크롤)
- [x] mutation alias: SendRoomMessage/RoomMessageAdded (Playground.tsx 와 type collision 회피)
- [x] markRoomRead useEffect (마지막 메시지가 상대 메시지면 호출 → 백엔드 readByA/B = now())
- [x] 메시지 합성: useQuery(초기 100건) + useSubscription(신규) + mutation 응답 — id dedup으로 머지
- [x] 홈 네비 링크 5개 (사주 입력 / 내 풀이 / 오늘의 운세 / 매칭 피드 / 채팅방)
- [x] e2e 검증: Alice/Bob 2탭 양방향 실시간 송수신 + markRoomRead로 unread 자동 해제

#### 마무리 ⏳
- [ ] 로그인 페이지 prod 디자인 (현재 임시 버튼만)

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
- [x] §2 builder (packages/graphql/src/builder.ts)
- [x] §3 Object Type (drizzleObject 5종 + objectRef 보조 타입)
- [x] §4 Mutation (submitSaju + updateProfile)
- [x] §5 Yoga + Hono 통합 (apps/api/src/routes/graphql.ts)
- [x] §7 Plugin 5종 (errors, relay, dataloader, scope-auth, drizzle)

### 05-dataloader
- [x] §2 createLoaders 직접 작성 (matchesByUserId)
- [x] §3 context per-request 인스턴스 (createGraphQLContext에서 매 요청 생성)
- [x] §5 loadableObject (LoadableUser, SajuChart.owner에서 사용)

### 06-bullmq
- [x] §2 Queue/Worker 분리 (apps/api/src/queues + apps/worker/src/jobs, ai/match/cron 3큐)
- [x] §3 옵션 (attempts: 3, backoff exponential, jobId idempotency, removeOnComplete/Fail) + jobId 3토큰 규칙(BullMQ 5.x)
- [x] §4 JobScheduler cron (`upsertJobScheduler` daily-fortune-tick 04:00 KST)
- [ ] §5 FlowProducer 체이닝 — match.curate → ai.compatibility 체이닝은 **콜백 enqueue 패턴**으로 대체 (FlowProducer는 부모-자식 관계가 강제되어 단순 트리거에 과함, 출시 후 재평가)
- [x] §7-4 Graceful shutdown (SIGTERM/SIGINT → 3 worker.close + 2 queue.close + redis.quit)
- [ ] §8 Bull Board (출시 직후)

### 07-project-structure
- [x] §1 Layered 구조 (Bun workspace)
- [x] §8 Docker compose dev (api+worker+postgres+redis)
- [x] §3 env.ts zod (packages/shared/src/env.ts, 부팅 시점 검증)
- [x] §4 Context 패턴 (createGraphQLContext factory, JWT/BullMQ 콜백 주입)
- [x] §5 인증 (Hono 미들웨어 attachUser/requireAuth + JWT)
- [x] §6 권한 (scope-auth: authenticated scope, Query.me/myReading/myDailyFortune/matches/match + Mutation 5종 적용)
- [x] §7 ~~vitest~~ → bun:test (saju 27 + graphql 5 = 32 케이스 pass)

## 마인드셋 체크 (학습 README §마인드셋)

코드 작성 중에 항상 체크.

- [x] **명시성**: `as any` 0건, 타입 회피 0건 (`as ReturnType<...>` 패턴도 await + null check로 정리)
- [x] **DataLoader**: GraphQL relation 필드 loader 경유 (LoadableUser + matchesByUserId + drizzleField 자동 batching)
- [x] **워커 분리**: API 프로세스에서 잡 처리 0건, 항상 Queue.add → 별도 worker (3큐: ai/match/cron)
- [x] **env 검증**: 부팅 시점 process.env zod 검증, 통과 못 하면 즉시 죽음 (api + worker 양쪽)

## 진행 통계 (현재 시점)

- 사전 준비: 4/6 완료
- Day 1 오전: 10/10 완료 ✅
- Day 1 오후: 18/19 완료 ✅ (FlowProducer는 콜백 enqueue로 대체)
- Day 2 오전: 11/11 완료 ✅
- Day 2 오후: 13/13 완료 ✅
- Day 3 오전: 10/10 완료 ✅
- Day 3 오후: 13/13 완료 ✅ (Block 1~7: 인프라 + 폼 + 풀이/운세 + 매칭 + 채팅) — 마무리(로그인 prod 디자인) 1건 + 배포 잔여
- 출시 직후: 0/4

**전체: 79/86 = 92% 진행**

> 📝 **다음 세션 시작점**: 마무리 (로그인 페이지 prod 디자인) → 배포 (시드 스크립트 + OCI Docker Compose + Vercel)
>
> 직전 커밋: `3295f31 feat(frontend): 매칭 피드 + 매칭 상세 페이지 — Day 3 오후 Block 6` → Block 7 통합 커밋 추가 예정

## Day 2 오후 — 잡은 진짜 버그 회고

typecheck/단위테스트 통과만 보고 끝낸 게 아니라 e2e 시연 한 번에 다음 4건이 새로 드러남:

1. `@pothos/plugin-drizzle@0.17.4`이 `drizzle-orm@0.45.2`를 sub-deps로 끌어와 동일 이름 타입 충돌 → `package.json` overrides로 1.0.0-rc.2 단일화
2. drizzle 1.0의 RQB는 `where` 콜백 형태(`(t, ops) => ne(t.id, x)`) 폐기, 객체 패턴(`{ NOT: { id: x } }`)만 지원
3. drizzleField resolve의 `as ReturnType<...>` 캐스팅이 exactOptionalPropertyTypes와 충돌 → `await + null check` 패턴으로 통일
4. **BullMQ 5.x: jobId에 콜론 포함 시 정확히 3토큰만 허용** (e2e 시연 안 했으면 못 잡았을 함정 — `match-curate:<uid>` → `match-curate:<uid>:v1`)
