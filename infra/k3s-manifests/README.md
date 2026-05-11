# Saju K3s Manifests

ArgoCD GitOps로 관리되는 saju 서비스의 K8s 매니페스트. botfolio 인프라(`*.botfolio.cc`,
cert-manager `letsencrypt-prod`, Traefik ingress)를 그대로 재활용한다.

## 구조

```
infra/k3s-manifests/
├── argocd/
│   └── 01-applications.yaml    # 5개 Application (postgres/redis/api/worker/ingress)
├── postgres/                   # StatefulSet + PVC (10Gi local-path)
├── redis/                      # StatefulSet + PVC (2Gi)
├── api/                        # Deployment + Service + migrate Job(PreSync hook)
├── worker/                     # Deployment (api-secret 공유)
└── ingress/                    # api.botfolio.cc Traefik Ingress + TLS
```

이미지: `ghcr.io/shjeong92/saju-{api,worker,migrate}` (multi-arch amd64+arm64).
모든 리소스는 `saju` namespace 에 배포.

## 최초 배포 절차 (Day 0)

### 1. 클러스터 사전 점검

```bash
export KUBECONFIG=~/.kube/config-k3s

# argocd-repo-server 가 Unknown 상태일 경우 재시작
kubectl -n argocd get pods
kubectl -n argocd rollout restart deploy/argocd-repo-server

# cert-manager / traefik / clusterissuer 정상 확인
kubectl get clusterissuer letsencrypt-prod
kubectl -n kube-system get svc traefik
```

### 2. saju GitHub repo 생성

GitHub 에서 **public** repo `shjeong92/saju` 생성 후 코드 push.
public 이라 ArgoCD repo credential 등록 불필요.

⚠ `.env*` 와 실제 secret 값이 절대 commit 되지 않게 주의 (`.gitignore` 에 이미 설정됨).
`infra/k3s-manifests/**/*-secret.yaml` 의 `CHANGE_ME` placeholder 는 공개돼도 무방하지만,
실제 운영 값으로 채운 채로 commit 하면 안 됨.

### 3. DNS 확인 (작업 불필요)

`api.botfolio.cc` 는 이미 `146.56.106.186` 으로 resolving 중. 별도 작업 없음.
변경했다면 외부에서 `dig +short api.botfolio.cc @8.8.8.8` 로 확인.

### 4. GHCR 이미지 빌드 (최초 1회)

GitHub Actions(`deploy-backend.yml`)가 자동 빌드하지만, 최초 배포는 main 푸시 트리거가
필요하다. repo 초기 푸시 → Actions 가 돌면서 `ghcr.io/shjeong92/saju-{api,worker,migrate}:latest`
와 `:<sha>` 태그가 생성된다.

GHCR private 이미지인 경우 K3s 가 pull 할 수 있게 imagePullSecret 도 필요.
public 으로 두면 별도 설정 불필요.

```bash
# (옵션) GHCR private 사용 시
kubectl -n saju create secret docker-registry ghcr-pull \
  --docker-server=ghcr.io \
  --docker-username=shjeong92 \
  --docker-password=<github_pat_with_read:packages>
# 그리고 deployment.yaml 에 spec.template.spec.imagePullSecrets: [{name: ghcr-pull}] 추가
```

### 5. 비밀 시크릿 1회 apply (GitOps 동기화 제외 대상)

GitOps 에서는 `directory.exclude` 로 동기화 제외되므로, 손으로 1번 만 apply 한다.
**git 에 실제 비밀값을 커밋하지 말 것.** 로컬에서 sed 또는 별도 vault 에서 받아 apply.

```bash
# 예: 환경변수에서 비밀값 받아 직접 적용
POSTGRES_PASSWORD=$(openssl rand -base64 24)
JWT_SECRET=$(openssl rand -base64 32)
AI_PROXY_API_KEY="실제_키"

cat <<EOF | kubectl apply -f -
apiVersion: v1
kind: Namespace
metadata: { name: saju }
---
apiVersion: v1
kind: Secret
metadata: { name: postgres-secret, namespace: saju }
type: Opaque
stringData:
  POSTGRES_DB: saju
  POSTGRES_USER: saju
  POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
---
apiVersion: v1
kind: Secret
metadata: { name: api-secret, namespace: saju }
type: Opaque
stringData:
  DATABASE_URL: postgres://saju:${POSTGRES_PASSWORD}@postgres.saju.svc.cluster.local:5432/saju
  REDIS_URL: redis://redis.saju.svc.cluster.local:6379
  JWT_SECRET: ${JWT_SECRET}
  AI_PROXY_API_KEY: ${AI_PROXY_API_KEY}
EOF
```

### 6. ArgoCD Application 등록 → 자동 sync

```bash
kubectl apply -f infra/k3s-manifests/argocd/01-applications.yaml
```

이후 ArgoCD 가 알아서:

1. `saju-postgres` sync → StatefulSet+PVC 생성
2. `saju-redis` sync → StatefulSet+PVC 생성
3. `saju-api` PreSync hook → `api-migrate` Job 실행 (drizzle migrate)
4. `saju-api` sync → Deployment+Service 생성
5. `saju-worker` sync → Deployment 생성
6. `saju-ingress` sync → Ingress 생성 → cert-manager 가 LetsEncrypt 인증서 발급

진행 상황:

```bash
kubectl -n argocd get applications
kubectl -n saju get all
kubectl -n saju get certificate
kubectl -n saju logs job/api-migrate
```

### 7. 검증

```bash
# api health
curl -sS https://api.botfolio.cc/health
# => {"ok":true,"service":"api"}

# WebSocket (graphql-ws) 핸드셰이크 (선택)
# wscat -c wss://api.botfolio.cc/graphql?token=...
```

## 일상 운영

### 백엔드 코드 변경

`main` 브랜치에 push → `deploy-backend.yml` 가 자동:

1. multi-arch 이미지 3개 빌드 → GHCR push (`:<sha>`, `:latest`)
2. `api/03-deployment.yaml`, `worker/02-deployment.yaml`, `api/05-migrate-job.yaml`
   의 `image:` 태그를 새 SHA 로 sed → commit & push
3. ArgoCD 가 변경 감지 → 자동 sync → rolling update (migrate 가 PreSync 로 먼저 실행)

### 비밀값 변경

```bash
# 1) secret 만 다시 apply (위 5단계 방식)
# 2) api / worker 강제 재시작 (env reload)
kubectl -n saju rollout restart deployment/api deployment/worker
```

### 수동 마이그레이션 (예외 상황)

PreSync hook 이 실패하거나 수동 적용이 필요한 경우:

```bash
kubectl -n saju delete job api-migrate --ignore-not-found
kubectl -n saju apply -f infra/k3s-manifests/api/05-migrate-job.yaml
kubectl -n saju logs -f job/api-migrate
```

### PostgreSQL 접속

```bash
kubectl -n saju exec -it postgres-0 -- psql -U saju -d saju
```

### 로그 확인

Loki/Grafana 가 promtail 로 자동 수집. `grafana.botfolio.cc` 에서:

```
{namespace="saju"} |= ""
{namespace="saju", container="api"} |= "error"
```

## 트러블슈팅

| 증상 | 점검 |
|---|---|
| Ingress 만들었는데 `certificate not ready` | `kubectl -n saju describe certificate saju-api-tls`. DNS A record 가 외부에서 보이는지, traefik http01 challenge 가 80 포트로 들어오는지 확인 |
| api Pod `CrashLoopBackOff` | `kubectl -n saju logs deploy/api`. env validation(@saju/shared/env) 실패 가능성 — DATABASE_URL/REDIS_URL/JWT_SECRET 확인 |
| migrate Job 무한 Retry | drizzle-kit migrate 가 schema 충돌 시 실패. `kubectl -n saju logs job/api-migrate` 로 SQL 에러 확인 |
| GHCR pull 403 | 이미지가 private 인데 imagePullSecret 누락. 위 4단계 ghcr-pull secret 참조 |
| ArgoCD Application `OutOfSync` 안 풀림 | `argocd-repo-server` 상태 확인. `kubectl -n argocd rollout restart deploy/argocd-repo-server` |
