---
name: bench-runner
description: readable-ui 전송 계층 벤치 (`bench/` 패키지, `pnpm bench`) 를 **실제로 실행·해석·비교**하는 운영 skill. "벤치 돌려줘", "bench 실행", "pnpm bench 결과 요약", "baseline 이랑 비교", "sizeRatio 회귀 확인", "audit 시나리오만 재측정", "headful-md 만 다시 뽑아줘", "이번 run 을 baseline 으로 고정", "summary.md 해석", "토큰/actionable 변화 보고", "CDP 기반 ax-tree 수치 확인" 등 벤치 **실행·결과 해석·baseline 관리** 의도가 조금이라도 감지되면 **항상 가장 먼저 이 skill을 참조**한다. 기존 `bench` skill(편집·spec·runners 설계)과는 명확히 분리: 이 skill은 spec·코드가 **불변**이라 가정하고 **돌리고 읽는 단계**만 다룬다. 벤치 코드 자체를 수정해야 하면 `bench` skill로 에스컬레이션. 공정성 규칙 드리프트와 baseline 관리가 프로젝트 최대 리스크이므로 실행·비교를 시작하기 전에 이 skill의 사전조건·해석 우선순위·baseline 갱신 기준을 먼저 확인해야 한다.
---

# bench-runner

`bench/` 하니스를 **실제로 돌리고, 결과를 읽고, baseline 과 비교하고, 필요하면 baseline 을 갱신하는** 운영 절차. 설계·코드 변경은 다루지 않는다 — 그건 `bench` skill 영역.

## 0. 이 skill 과 `bench` skill 의 트리거 분계선

| 의도 | skill |
|---|---|
| "벤치 돌려줘", "pnpm bench", "결과 확인", "비교", "baseline 갱신" | **bench-runner** (이 skill) |
| 새 시나리오 추가, 새 transport, runner 구현 수정, spec 개정, actionable 정의 변경, `bench/docs/metrics.md` 편집, ADR 0023 개정 | `bench` skill |
| `.md` 라우트 자체 설계 / apps/example fixture 수정 | `readable-ui-harness` skill |

**원칙**: 이 skill 은 `bench/docs/metrics.md` 와 runner 코드가 **이미 올바르다고 가정**한다. 실행 중 spec 위반 정황이 감지되면 (예: `home.readable-ui` 가 아닌 셀에서 `null`, 3-way 중 한 런너만 상승 없이 폭증) **조사에서 멈추고 `bench` skill 로 에스컬레이션**한다.

## 1. 실행 전 사전 조건

`pnpm bench` 실행 전 다음이 이미 구성돼야 한다. 누락은 **알려진 에러 메시지** 와 함께 바로 드러나므로, 사전 점검은 가볍게 하고 실패 시 아래 표로 해결.

1. 워크스페이스 의존성: `pnpm install` (최초 1회)
2. Playwright Chromium 바이너리: `pnpm --filter @readable-ui/bench exec playwright install chromium` (최초 1회, ~260MiB, **사용자 허용 필요**)
3. 포트 3030 — `apps/example` dev 서버용. 이미 열려 있으면 CLI 가 재사용 (20s reachability poll). 점유 중이면 충돌.
4. Node ≥ 20 (root `package.json` engines)

사전 점검을 능동적으로 하지 말 것 — 실패가 발생했을 때 §5 표에서 해결하는 것이 빠르다. 사용자가 "처음 돌려본다" 는 신호를 주면 그때만 (2) 허가를 받고 설치.

## 2. 실행 레시피

모든 호출은 repo root 에서 `pnpm bench [...]`. 루트 스크립트가 `pnpm --filter @readable-ui/bench run bench` → `tsx src/cli.ts` 로 위임.

| 목적 | 명령 |
|---|---|
| 전체 (7 scenarios × 3 transports, warm-up on) | `pnpm bench` |
| 부분 시나리오 | `pnpm bench --scenario users,audit` |
| 부분 transport | `pnpm bench --transport readable-ui,ax-tree` |
| 디버깅 (warm-up 비활성 — 1회만) | `pnpm bench --no-warmup` |
| 실행 행렬만 출력 | `pnpm bench --plan` |
| 다른 base URL | `pnpm bench --base-url http://localhost:4000` |

**조합 주의**:

- `--transport headful-md` **단독 실행 불가** — AX 스냅샷 캐시(`PageAxSnapshotCache`) 가 비어 에러. 디버깅이어도 `ax-tree,headful-md` 쌍으로 돌린다. CLI 내부 `transportOrder()` 가 강제로 `readable-ui → ax-tree → headful-md` 순서로 재정렬하므로 입력 순서는 무관.
- `--scenario home --transport readable-ui` 는 **설계상 null** (spec §4.2). 에러가 아니라 의도된 `output: null`.
- `--no-warmup` 결과는 **baseline 비교에 쓰지 말 것**. warm-up 끈 데이터는 spec §4.5 위반 — 디버깅용 한시적 값.

## 3. 결과 아티팩트

완료되면 `bench/results/<ISO-timestamp>/` 디렉터리가 새로 생긴다 (`YYYY-MM-DDTHH-MM-SS-sssZ`, 콜론·점이 대시로 치환됨). 레이아웃:

```
bench/results/<timestamp>/
  summary.md                      — GFM 리포트 (README "Latest baseline run" 의 소스)
  summary.json                    — enrichResults() 가 infoDensity/sizeRatio 를 붙인 원데이터
  outputs/
    <scenario>.<transport>.txt    — 각 셀 raw output (readable-ui null 셀은 빈 파일)
```

`summary.json` 최상위 key: `timestamp`, `scenarios`, `transports`, `results` (각 원소가 `AggregatedResult` — RunnerResult 에 `infoDensity`, `sizeRatio` 포함).

`summary.md` 상단 **메타 블록** (비교 시 반드시 확인):

- 실행 timestamp
- git sha
- Node 버전
- Chromium 버전 + playwright 버전 + CDP 경로
- warm-up: on/off

동일 git sha + 동일 Node 에서 두 run 의 `bytes/chars/tokens/actionable` 이 **identical 해야 deterministic**. `renderTimeMs` 만 변동 허용 (±10–20%, single-machine 측정).

## 4. 결과 해석 순서

새 run 을 읽을 때 다음 순서로 훑는다. 각 단계에서 이상 신호가 없으면 다음으로.

1. **`summary.md` 의 "Takeaways"** — 자동 계산된 요약. 사용자 질문의 80%는 여기서 답이 나온다.
2. **per-scenario 표** — 특정 시나리오 회귀 확인. 관심 메트릭 우선순위:
   - **sizeRatio (median)** — readable-ui vs ax-tree/headful-md 구조적 비율. baseline median 대비 > ±2–3% 편차는 설계 변경 신호.
   - **actionable** — runner 별 수집. readable-ui 가 갑자기 줄면 directive/link 누락 버그 가능. ax-tree 가 늘면 role 재정의 필요.
   - **tokens (절대값)** — baseline 대비 >5% 변화는 component/payload 크기 변경 신호. **`audit` (13k)** 는 outlier 라는 점 기억 — 평균이 오염됨.
   - **infoDensity = tokens/actionable** — **같은 runner 내부 시나리오 랭킹** 에만 사용. 세 runner 간 actionable 정의가 달라 cross-runner 비교는 무효 (spec §3.1).
   - **renderTimeMs** — 절대값 인용 금지. rank 비교 전용. headful-md 가 >1ms 스파이크면 캐시 회귀 의심.
3. **`outputs/<scenario>.<transport>.txt`** — 2 단계에서 의문 나오면 raw 출력 검증 (토큰 편차의 원인 탐색, 빠진 컴포넌트 확인).

**across-scenario 평균 해석**: 비율 메트릭(sizeRatio)은 산술평균 + median 을 병기한다 (ADR 0023). `audit` outlier 때문에 **median 쪽이 더 정직한 실제 비율**. 보고할 때 평균만 인용하지 말고 median 과 나란히.

## 5. 자주 만나는 실패 모드

| 증상 | 원인 | 해결 |
|---|---|---|
| `Executable doesn't exist at .../chrome-headless-shell` | Playwright chromium 바이너리 없음 | `pnpm --filter @readable-ui/bench exec playwright install chromium` (사용자 허용 필요) |
| `Next dev server did not respond on http://localhost:3030 within 20000ms` | 빌드 실패 또는 포트 점유 | 별도 터미널에서 `pnpm --filter example run dev` 실행해 로그 확인. 포트 충돌이면 `--base-url` 로 우회 후 원인 추적 |
| `headful-md requires a cached AX snapshot` | transport 순서가 틀어짐 (ax-tree 없이 headful-md 단독) | `--transport ax-tree,headful-md` 로 함께 실행. 단독은 미지원 |
| `home.readable-ui` 가 `null` | 설계대로 (`/` 에 `.md` 라우트 없음) | 실패 아님 (spec §4.2). sizeRatio 계산에서 제외됨 |
| `@anthropic-ai/tokenizer` ABI/버전 충돌 | 0.0.x API 불안정 | `0.0.4` **pin** 유지. 업그레이드 필요하면 `bench` skill + ADR 개정 동반 |
| 두 run 의 `tokens` 가 같은 sha 에서 다름 | deterministic 깨짐 (버그 신호) | `bench` skill 로 에스컬레이션 — runner/aggregator 조사 필요 |

## 6. Baseline 관리

`bench/results/baseline/` 은 **수동 복사 스냅샷**. 디렉터리 구조는 timestamp dir 과 동일. 갱신은:

```bash
rm -rf bench/results/baseline
cp -R bench/results/<new-timestamp> bench/results/baseline
```

**파괴적 작업이므로 사용자 확인 없이 실행 금지.** 갱신 전에 아래 체크리스트로 자격을 판정한다.

### Baseline 갱신 승인 기준 (YES)

- 코드 변경이 있고 그 영향이 ADR 또는 PR 본문에서 이미 공식화됨
- 3-way 공정성 규칙 유지 확인 (ADR 0023 Consequences)
- 새 시나리오/transport 추가 시 `bench/docs/metrics.md` 개정 + ADR 동반 (→ 이 단계는 `bench` skill 영역)
- 숫자 변화가 **설계 의도와 일치**하는 방향인지 설명 가능

### 보류 기준 (NO)

- 환경 변화뿐 (로컬 재측정). tokens 는 deterministic 이므로 baseline 의미 변화 없음 — 보관만.
- spec 과 코드가 충돌하는 상태. spec 먼저 개정.
- 한 runner 만 유의한 변화 (3-way 공정성 의심). 먼저 raw outputs 로 원인 확인.

갱신 후 `bench/README.md` "Latest baseline run" 표와 takeaways 를 **같은 커밋에서** 업데이트한다 (수치 드리프트 방지).

## 7. 보고 형식

사용자에게 결과를 전달할 때는 `summary.md` 를 그대로 복붙하지 말고 다음 틀을 따른다.

```
## 실행
- timestamp / git sha / warm-up 여부
- 실행한 시나리오·transport 목록 (부분이면 "7 중 2 시나리오", 전체면 생략)

## 주요 수치
(per-scenario 표 또는 — baseline 비교 시 — delta 표: tokens/actionable/sizeRatio 만)

## 해석
- 설계 의도와 일치하는 변화 vs 회귀 의심 신호
- outlier (audit 등) 영향이 있으면 median 병기

## 다음 행동 제안
- baseline 갱신 가부 (§6 기준)
- outputs/ 검증이 필요한 셀
- `bench` skill 로 넘겨야 할 신호 (있다면)
```

절대값 `renderTimeMs` 는 인용하지 않는다. Claude tokenizer 기반이라는 점도 암묵 전제로 두고, GPT/o200k 비율 비교 요구가 오면 ADR 0023 근거로 범위 밖임을 안내.

## 8. 시나리오 레퍼런스 (현재 7개)

| id | url | 한 줄 용도 |
|---|---|---|
| `home` | `/` | 랜딩. readable-ui 런너는 null (spec §4.2) |
| `dashboard` | `/dashboard` | 최근 활동 리스트 + 지표 카드 |
| `users` | `/users` | 페이지네이션·필터·정렬이 살아 있는 테이블 |
| `user-detail` | `/users/u_alice_01` | 단일 엔티티 상세 + 파괴적 액션 흐름 |
| `reports` | `/reports` | 다중 집계 테이블 (MRR/plan 분포) |
| `audit` | `/audit` | 240 rows payload-heavy 테이블 (outlier — 13k tokens readable-ui) |
| `jobs` | `/jobs` | 빈 결과 + 상태 팔레트 노출 |

새 시나리오 추가 요청은 이 skill 이 아니라 **`bench` skill + `readable-ui-harness` skill** 로 간다. 이 skill 은 현재 목록을 **돌리고 해석**하는 데 집중.

## 9. 관련 문서

- `bench/README.md` — 재현·caveats·Latest baseline run
- `bench/docs/metrics.md` — 측정 spec (해석 의문 나오면 최종 참조)
- `docs/adr/0023-benchmark-environment.md` — 의사결정 배경
- `.claude/skills/bench/SKILL.md` — 편집·설계용 skill (이 skill 의 페어)
