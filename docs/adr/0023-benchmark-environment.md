# ADR 0023 — Benchmark environment (readable-ui · ax-tree · headful-md 3중 비교)

- Status: Accepted
- Date: 2026-04-18
- Related: [ADR 0001](./0001-primary-interaction-syntax.md), [ADR 0002](./0002-action-uri-scheme.md), [ADR 0005](./0005-page-envelope.md), [ADR 0008](./0008-engine-react-element-walk.md), [ADR 0010](./0010-harness-skill.md), [ADR 0012](./0012-dual-render-convention-signals.md), [ADR 0015](./0015-table-as-container-directive.md), [ADR 0022](./0022-table-payload-fenced.md)

## Context

readable-ui 는 ADR 0001 이래로 **"같은 React tree 를 두 표면 (HTML · Markdown envelope) 으로 흘려 보낸다"** 는 이중 표현 전제 위에서 설계됐다. 설계 사이클마다 반복된 주장은 동일하다 — **readable-ui envelope 이 기존 두 대안보다 LLM 토큰 효율 및 actionable density 측면에서 우세**하다:

- **ax-tree** — CDP `Accessibility.getFullAXTree` (Playwright v1.51 에서 `page.accessibility.snapshot` public API 가 제거된 이후 권장되는 경로) 등 일반 브라우저 자동화가 취하는 접근. DOM 의 "보이는 것" 을 JSON tree 로 평면화. 역사적으로 agent tooling (Playwright MCP, Chrome DevTools MCP, browser-use 등) 의 기본 전송.
- **headful-md** — ax-tree 를 휴리스틱 규칙으로 Markdown 으로 변환한 "가벼운 스냅샷" 형식. "LLM 한테는 JSON 보다 Markdown 이 낫다" 라는 중간 가설의 산출.

ADR 0015 §Context·ADR 0022 §Context 는 readable-ui 의 설계 목적을 "admin 자동화의 LLM 토큰·지연 최소화" 로 지속 선언해 왔고, ADR 0011·ADR 0018·ADR 0021 의 layout 결정들도 "LLM 의 첫-N-토큰 안에 actionable 이 들어가는가" 를 준거로 삼았다. 그러나 이 주장들은 **정량 검증** 없이 ADR 내부 추론으로만 지탱된다. LLM 토큰 측정치가 한 번도 문서화된 적 없으며, ax-tree / headful-md 와의 직접 비교도 없다.

ADR 0010 Harness skill 이 도입된 배경 — "ADR 이 앞서고 코드·spec 이 뒤떨어지는 드리프트" — 과 동형의 리스크가 여기에도 있다. "토큰 효율" 주장은 readable-ui 가치 제안의 중심축이고, 이 claim 이 경험 데이터 없이 ADR 들 사이에서 계속 인용되면, 후속 설계 (components 카탈로그 확장, payload 분리 기준, layout 추가) 가 **검증되지 않은 전제** 위에서 누적된다.

본 ADR 은 3 전송 계층을 동일 DOM 상태에서 같은 기준으로 측정하는 **bench 환경** 을 도입한다. 목적은 두 가지:

1. "readable-ui 가 토큰 효율적" claim 의 empirical 검증 또는 반증 근거 생성.
2. 후속 설계 결정 (예: 새 layout 추가, directive 스키마 변경) 이 토큰 밀도에 미치는 영향을 회귀적으로 관찰할 수 있는 비교 계측기 확보.

## Decision

### 1. 독립 패키지 `bench/` 신설

`bench/` 를 pnpm workspace 의 **비공개·빌드 비포함** 패키지로 추가한다. `apps/example` / `packages/*` 에 영향 없음.

- 산출물은 `bench/results/<timestamp>/report.{json,md}` — gitignore 대상. 벤치는 저장소 안에 결과를 커밋하지 않는다.
- CI 에서 자동 실행하지 않는다 (ADR 0023 §Consequences 참조). on-demand 실행만.

### 2. 세 러너 구조

측정 가능한 단위는 3개의 **독립 Runner** 다. 공통 인터페이스:

```ts
interface Runner {
  id: "readable-ui" | "ax-tree" | "headful-md";
  run(scenario: BenchScenario): Promise<RunnerResult>;
}
```

**러너 역할**:

| id | 입력 | 변환 | 출력 |
|---|---|---|---|
| `readable-ui` | `.md` 엔드포인트 GET (`/users.md` 등) | 서버에서 `renderPage()` 실행 → envelope + body Markdown string | YAML frontmatter + Markdown body |
| `ax-tree` | HTML 라우트 Playwright 접근 → `context.newCDPSession(page)` → CDP `Accessibility.getFullAXTree` (flat node list) → tree 복원 | `JSON.stringify(tree, null, 0)` | JSON 텍스트 |
| `headful-md` | 위 ax-tree 재사용 | 본 ADR `bench/docs/metrics.md §5` 휴리스틱 규칙 | Markdown 텍스트 |

세 런너 모두 같은 underlying DOM state 위에서 측정한다 (`bench/docs/metrics.md §4` fairness 규칙). 신규 시나리오 추가 시 **3 러너가 전부 산출** 을 내야 한다 (적용 불가 명시 케이스 제외 — home 라우트의 readable-ui 처럼).

### 3. 시나리오는 `apps/example` 재사용

`apps/example` 의 7 라우트 (`/`, `/dashboard`, `/users`, `/users/u_alice_01`, `/reports`, `/audit`, `/jobs`) 를 시나리오로 고정. bench 전용 fixture 를 따로 두지 않는다 — ADR 0015/0018/0020/0021/0022 검증에 실제 사용된 라우트라서 **fixture drift** 가 구조적으로 막힌다.

각 시나리오는 `(id, url, title, taskDescription)` 4-튜플. `taskDescription` 은 에이전트가 받을 법한 지시 문장으로, v1 bench 는 이 문장을 **실행하지 않는다** — 토큰 밀도 비교가 우선이고, agent 실행 성공률 벤치는 별도 harness (ADR 0023 §Out of scope).

### 4. Tokenizer — `@anthropic-ai/tokenizer` 단일

**결정**: Claude tokenizer 기준으로 측정한다. readable-ui 는 ADR 0002 에서 MCP (`mcp://tool/...`) scheme 을 채택한 이상 1차 소비자가 Claude 계열 agent 이고, "토큰 효율" 주장의 단위도 이에 맞춰야 일관적이다.

**대안 기각**:

- GPT tokenizer (`gpt-tokenizer` / `js-tiktoken`) — 대상 모델 불일치. readable-ui 의 주 agent 가 아닌 모델 기준으로 측정하면 claim 을 왜곡한다.
- Dual (Claude + GPT) — 보고 가치는 있으나 v1 산출물 복잡도 증가. v2 후보.

### 5. 메트릭 축

각 `RunnerResult` 는 `bytes / chars / tokens / renderTimeMs / actionableElementCount` 5개 raw 값 + `output` 원문을 반환. Aggregator 는 `infoDensity = tokens / actionableElementCount` 와 `sizeRatio = tokens / readableUiTokens` 를 per-scenario 로 계산하고, 시나리오 전반의 중앙값·평균·min·max 를 요약.

**actionableElementCount** 정의는 runner 별로 다르다 (metrics.md §3.1). 의도는 "LLM 입장에서 한 페이지가 제공하는 action 수" 이되, ax-tree 는 interactive role 집합으로, readable-ui 는 `registerAction` 콜백 결과로, headful-md 는 변환 산출물 안의 link/input/button 개수로 각각 측정한다. 같은 DOM 상태를 다르게 보는 것이 의도된 세 전송 계층의 특성이므로, 이 지표는 "같은 숫자" 가 아니라 "각 계층이 드러내는 actionable 의 수" 로 해석한다.

### 6. 살아 있는 문서 — `bench/docs/metrics.md`

구체적 시나리오 표 / 휴리스틱 규칙 / runner 인터페이스 / fairness 규칙 / tokenizer 근거는 `bench/docs/metrics.md` 에 둔다. 본 ADR 은 "bench 를 둔다" 는 결정만, `metrics.md` 는 "무엇을 어떻게 측정하는가" 의 spec 을 담는다.

후속 러너 추가 (예: `dom-text` raw innerText) 또는 시나리오 확장은 **metrics.md 갱신** + (필요 시) 후속 ADR. spec 영역만 변할 때는 ADR 개정 불요 — `bench/docs/metrics.md` 자체가 living document.

### 7. CI 미편입

CI 에서 자동 실행하지 않는다. 근거:

- Playwright + 브라우저 바이너리 + Next dev server 의 조합은 CI 실행 비용이 크고, 결과 안정성이 런타임 환경에 민감 (JIT, 캐시 워밍, 네트워크).
- bench 는 "회귀 탐지기" 이기보다 "주기적 재측정 도구" — on-demand 로 로컬에서 돌리고 결과 리포트를 ADR 참고자료나 release note 에 첨부.
- v2 에서 nightly GitHub Action 으로 승격 가능성 남김 (Open).

### 8. Skill (후속)

`.claude/skills/readable-ui-bench/` skill 은 본 ADR 후속 Task (#7) 에서 작성한다. 역할: Claude 가 bench 를 실행하려 할 때 "어떤 러너를 어떻게 돌리는지 / 산출물을 어디에 두는지 / 결과 해석 규약" 을 유도. 런타임 강제는 여전히 코드 (CLI) 가 담당 (ADR 0010 의 역할 분리 원칙 재확인).

## Consequences

**Positive**

- readable-ui 의 "토큰 효율" claim 이 empirical 수치로 뒷받침되거나 반증된다. 이후 ADR 들이 이 검증된 baseline 위에서 논증 가능.
- 세 전송 계층이 같은 라우트 / 같은 DOM 상태에서 측정되므로, 후속 설계 결정 (레이아웃 추가, payload 모드 확장, directive attribute 변경) 이 토큰 밀도에 주는 영향을 **회귀적으로** 관찰 가능. 예: ADR 0022 의 payload 모드가 실제로 200 행+ 시나리오에서 토큰을 얼마나 절약하는가.
- `apps/example` 시나리오 재사용 — fixture drift 구조적 차단. apps/example 에 새 라우트가 추가되면 벤치 시나리오도 자연스럽게 따라온다.
- 후속 agent 실행 성공률 벤치 (out of scope) 가 생길 때, 그 harness 도 같은 시나리오 세트를 공유할 수 있도록 시나리오 데이터 모델이 밖으로 뺌 (`BenchScenario`).

**Negative**

- 새 컴포넌트 / 레이아웃 / 시나리오 추가 시 **3 러너 모두 산출을 유지** 해야 한다는 계약이 추가. 한 러너만 지원하는 실험적 기능은 bench 로 측정 불가 (수동 벤치 또는 runner 예외 처리).
- 벤치 의존성 (`playwright`, `@anthropic-ai/tokenizer`) 이 저장소에 추가. 저장소 전체 깊이는 커지되 `bench/` 패키지 scope 로 제한 — `packages/*` / `apps/example` 에는 전파되지 않는다. pnpm workspace 의 filter 로 선택 설치.
- `@anthropic-ai/tokenizer` 0.0.x 버전 — API 안정성 불확실. 러너 스캐폴딩에서 버전 pin 필수, upgrade 시 bench 의존성만 재검증.
- 벤치 실행에 Next dev server + Playwright 브라우저 부팅이 필요 — 러너 1회 실행에 수십 초 이상. 로컬 on-demand 에는 문제 없으나 CI 승격 시 별도 전략.

**Neutral**

- bench 결과 파일 (`bench/results/`) 은 .gitignore 대상. 결과를 공유하려면 수동으로 PR 본문 / release note / ADR 참고자료에 첨부. 자동 리포트 업로드는 v2 후보.
- Home (`/`) 라우트는 envelope 이 없어 readable-ui 러너가 `null` 결과를 낸다. bench 집계는 이 시나리오를 readable-ui 비교에서 제외. 대안 (home 에 envelope 부여) 은 본 ADR 범위 밖 — apps/example 의 home 설계 결정은 별도.

## Alternatives considered

1. **packages/core 안에 bench 모듈 내장** — core 패키지 purity 훼손 (bench 는 Playwright / Next dev server 의존). 기각.
2. **외부 저장소로 bench 분리** — readable-ui 의 구현 변경이 벤치 결과에 주는 파급을 놓치기 쉬움. 같은 저장소 내 pnpm workspace 가 검증 주기 일체성 면에서 우수. 기각.
3. **GPT tokenizer 기반 측정** — 대상 모델 불일치. 기각.
4. **dual tokenizer 동시 측정 (Claude + GPT)** — v1 산출물 복잡도 증가. v2 후보로 보류.
5. **agent 실행 성공률 벤치** — "토큰 밀도 비교" 와 "agent 성공률" 은 다른 계측 목적. 본 ADR 은 전자만. 후자는 별도 eval harness 의 영역 (Codex 연동 등은 후속 Task 에서).
6. **bench 전용 fixture 라우트 신설** — apps/example 과 decoupled 한 측정을 위해 별도 fixture 를 둘지 고민. 기각 — fixture drift 위험이 더 크다.

## Migration

- `bench/` 패키지 신설 (builder, Task #2).
- `bench/docs/metrics.md` 신설 (본 ADR 과 동시, researcher).
- `docs/README.md` Accepted ADRs 에 0023 추가 (본 ADR 과 동시).
- `pnpm-workspace.yaml` 에 `bench` 포함 (Task #2).
- `.gitignore` 에 `bench/results/` 추가 (Task #2).
- Open Decisions 와의 관계: 현재 Open Decisions (#1~#13) 중 벤치 측정이 필요한 항목들 — 특히 #6 정규형, #11 layout 확장 — 의 후속 ADR 에서 bench 수치를 인용할 수 있음. 본 ADR 은 tool 을 설치할 뿐 Open 을 닫지 않는다.

## Out of scope

- **CI 자동화** — on-demand 로컬 실행 한정. nightly action 승격은 Open.
- **Agent 실행 성공률 벤치** — bench 목적은 전송 크기·밀도 비교. agent 가 task 를 실제로 푸는가 여부는 별도 eval harness.
- **dual tokenizer** — Claude + GPT 동시 측정은 v2 후보.
- **첫-N-tokens 안의 actionable 밀도** (`actionableInFirst512Tokens` 등 위치 기반 지표) — v1 은 total tokens 기준. 위치 기반 지표는 후속.
- **dom-text (innerText) / HTML 원문 / a11y tree 가공 변형** 등 다른 전송 계층 비교 — 수요 입증 후 러너 추가 + metrics.md 갱신 (원칙적으로 ADR 개정 불요).
- **payload-heavy 라우트 확장** — audit 외 페이지를 payload 모드로 돌려보는 변형은 apps/example 수정 또는 별도 fixture 시나리오. 본 ADR 범위 밖.

## Open

- **CI 승격 시점** — bench 실행이 안정화된 후, nightly GitHub Action 으로 올릴 것인지. 결과 stability·CI 비용·노이즈 balance 재평가 필요.
- **Dual tokenizer** (Claude + GPT) 동시 리포트 필요성.
- **Agent 성공률 연계** — 토큰 밀도와 agent 성공률의 상관관계 측정. 별도 eval harness 에서 bench scenario 세트를 재사용하되 평가 축이 다름.
- **readable-ui 가 envelope 미보유 홈을 표현할 방법** — 현재 `null` 로 처리. 본 ADR 범위 밖이나 bench 결과 해석에 반복 언급될 가능성.
- **Playwright 가 ax-tree public API 를 재도입하면 CDP → 공식 API 재전환** — v1.51 에서 `page.accessibility.snapshot` 이 제거돼 현재는 CDP `Accessibility.getFullAXTree` 로 우회. 향후 상위 레벨 API 가 복귀하면 CDP 의존 제거 + bench 출력 diff 회귀 검증 필요 (flat node list → tree 복원 단계가 사라지면 직렬화 결과가 미세하게 달라질 수 있음).

## Amendment — 2026-04-18 (ax-tree 스냅샷 결정론)

### Context (재방문)

bench baseline 재실행에서 `bench/results/baseline/outputs/*.ax-tree.txt` 7/7 파일이 byte-level diff 로 잡혔다. 원인은 Chrome CDP 가 세션·run 단위로 **volatile** 한 `nodeId` / `parentId` / `childIds[]` / `backendDOMNodeId` / `frameId` 를 재발급하기 때문으로, 동일 페이지·동일 git sha·동일 fixture 에서도 raw 직렬화는 byte-equal 일 수 없다. 토큰 drift 는 관측상 0.02–0.05% 여서 fairness 영향은 미미하나, "baseline diff 가 regression 신호인가 CDP noise 인가" 를 구분할 수 없어 이후 회귀 탐지에 작동하지 않는다.

### Decision (추가)

ax-tree 런너는 `Accessibility.getFullAXTree` 응답을 트리 복원한 뒤, JSON 직렬화 **직전** 에 위 5개 volatile 식별자 필드를 한 run 내 first-seen DFS 순서로 안정 placeholder 로 치환한다:

- `nodeId` / `parentId` / `childIds[]` → 공유 네임스페이스, `<id-1>`, `<id-2>`, …. 같은 raw id 는 어느 필드에서 나오든 같은 placeholder.
- `backendDOMNodeId` → `<backend-N>` (nodeId 와 다른 네임스페이스, 원본 타입이 number 라 충돌 회피).
- `frameId` → `<frame-N>` (페이지당 1–2 개).

치환은 트리 깊은 복제 위에서 수행되며, AX 노드 최상위 필드뿐 아니라 `name.sources[].nativeSourceValue.relatedNodes[].backendDOMNodeId`·`properties[].value.relatedNodes[].backendDOMNodeId` 같은 **nested CDP back-reference** 도 같은 placeholder 로 포함한다 (`bench/src/lib/ax-cache.ts`의 `normalizeVolatileIds()`, two-pass: pass 1 에서 DFS 로 nodeId 순번을 고정하고 pass 2 에서 JSON deep-walk 로 모든 위치의 volatile 필드를 치환). 캐시에 저장되는 원본 트리는 **정규화 전** 을 유지 — `headful-md` 러너가 `hrefResolver(node.nodeId)` 로 원본 nodeId 를 소비하기 때문 (`bench/src/lib/ax-to-md.ts`). 현재 ax-tree 런너의 `hrefResolver` 기본값은 `() => undefined` 라 링크 추출이 활성화돼 있지 않지만, 차후 활성화되더라도 두 런너 간 contract 불일치가 생기지 않도록 분리한다.

### Fairness 산정 기준 재확인

토큰·바이트·문자 메트릭 (spec §3) 의 **입력 문자열**은 이제 정규화된 JSON 출력이다. 즉:

- `ax-tree` 의 `tokens`·`bytes`·`chars` 는 normalized output 기준.
- `readable-ui` / `headful-md` 은 변경 없음 — 각자의 원래 파이프라인 그대로.
- `actionableElementCount` (spec §3.1) 는 tree 구조/role 만 검사하므로 정규화 여부와 무관.

정규화된 placeholder 문자열 (`"<id-42>"` 5 tokens) 은 raw CDP 숫자 문자열 (`"3447"` 4 tokens) 보다 **노드당 약 1 토큰** 길다. 측정된 7 시나리오 기준 ax-tree 토큰이 baseline (volatile id 그대로) 대비 **+6.8% ~ +11.7%** 증가 — `dashboard` (+10.7%) 와 `home` (+11.7%) 두 시나리오가 fairness 임계값 ±10% (spec §4) 를 근소하게 초과. 이 편차는 **일회성 metric shift** 로 베이스라인을 재고정하면 흡수되며, 이후 run-to-run 은 byte-equal 이라 진짜 regression 과 구분된다. readable-ui / headful-md 는 영향 없음 (0% drift 확인). sizeRatio 의 구조적 해석 (`readable-ui ↔ ax-tree ↔ headful-md` 계층 순서) 은 불변 — ax-tree 가 여전히 readable-ui 대비 20x+ 배 토큰을 사용.

### Consequences (추가)

- **byte-equal 보장**: 같은 git sha + 같은 Node + 같은 Chromium 버전에서 `pnpm bench` 를 두 번 돌리면 `outputs/*.ax-tree.txt` 7 파일 모두 byte-equal 이 된다 (`summary.md` 메타 블록 기준 deterministic 확인 절차가 `bytes/chars/tokens` 뿐 아니라 **파일 diff** 로도 가능).
- baseline 갱신 시 diff 판독이 가능해져 regression 탐지가 실질적 기능.
- Chromium 메이저 업그레이드로 CDP 가 AX tree 의 **구조** (새 필드 등장, 노드 카운트 변화) 를 바꿀 경우에는 여전히 diff 가 발생 — 이는 환경 변화가 실제 측정에 영향을 준 것이므로 baseline 갱신 신호로 기능.
- `headful-md` 경로 계약 (`nodeId`-keyed resolver) 은 영향받지 않음.
- 정규화 로직 자체가 드리프트 원인이 될 여지 (placeholder 포맷 변경 등) 가 생김. 향후 placeholder 포맷을 변경하려면 본 Amendment 를 재개정하고 같은 PR 에서 baseline 을 함께 갱신한다.
