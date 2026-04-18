# bench metrics — readable-ui vs ax-tree vs headful-md

- Status: Living document (soft-owned by researcher; builder updates impl notes after each runner lands)
- Related: [ADR 0023 — Benchmark environment](../../docs/adr/0023-benchmark-environment.md)
- Scope: 세 전송 계층이 **같은 렌더 상태를 입력으로** 받아 각자의 출력을 산출했을 때의 크기·밀도 비교.

본 문서는 `bench/` 패키지의 러너가 공유해야 할 **시나리오 세트**, **측정 항목**, **공정성 규칙**, **러너 인터페이스 계약**을 정의한다. 실행 코드는 builder 가 작성하며 본 문서는 코드가 따라야 하는 spec.

## 1. 비교 대상 세 전송 계층

| id | 이름 | 산출물 | 소스 |
|---|---|---|---|
| `readable-ui` | readable-ui envelope | `renderPage()` 의 `---\n<yaml>\n---\n<markdown>` string | `packages/core` — envelope + component-catalog directive 직렬화 |
| `ax-tree` | raw AX tree | CDP `Accessibility.getFullAXTree` 응답의 JSON 직렬화 (`JSON.stringify(tree, null, 0)`) — flat node list 를 `bench/src/lib/ax-cache.ts` 가 트리로 복원한 산출물 | Playwright v1.59+ via CDP `Accessibility.getFullAXTree` (프리-1.51 `page.accessibility.snapshot` public API 는 v1.51 에서 제거됨) |
| `headful-md` | AX tree → Markdown (휴리스틱) | 위 AX tree 를 규칙 기반으로 Markdown 으로 변환한 텍스트 | 본 문서 §5 의 변환 규칙 |

세 산출물 모두 **동일 URL 의 동일 DOM snapshot** 에서 도출돼야 공정하다. fairness 규칙은 §4.

## 2. 시나리오 세트

`apps/example` 의 기존 라우트를 재사용한다. **신규 fixture/라우트를 만들지 않는다** — 이미 ADR 0011·0015·0018·0019·0020·0021·0022 검증을 거친 페이지가 있으며, 벤치 전용 fixture 를 따로 두면 fixture-drift 가 발생할 수 있다.

| id | URL | 제목 | layout | 과제 시나리오 (에이전트가 받을 법한 지시) |
|---|---|---|---|---|
| `home` | `/` | readable-ui example (index) | flow | "이 사이트에서 Users 관리 페이지로 이동하려면 어떤 링크를 눌러야 하지?" |
| `dashboard` | `/dashboard` | Admin dashboard | topbar | "최근 활동 4건 중 `rotateKey` 이벤트의 타깃 리소스를 알려줘." |
| `users` | `/users` | User management | sidebar | "status 가 active 인 user 목록을 정렬 키 `createdAt:desc` 로 다음 페이지까지 보려면 어떤 호출을 해야 하지?" |
| `user-detail` | `/users/u_alice_01` | User detail (Alice) | detail | "이 사용자 계정을 삭제하려면 어떤 버튼 흐름을 거치지? preview 단계 tool 이름도 알려줘." |
| `reports` | `/reports` | Reports | topbar | "Revenue by plan 표에서 MRR 이 가장 큰 plan 의 id 와 customers 수를 알려줘." |
| `audit` | `/audit` | Audit log | sidebar | "actor=alice@example.com 필터 상태에서 최근 10건 중 `rotateKey` 액션의 건수는?" (240행 payload + head-5 visible rows 시나리오) |
| `jobs` | `/jobs` | Background jobs | sidebar | "status=error 필터 결과가 비어 있다는 사실을 확인하고, 사용 가능한 전체 상태 팔레트 5개를 나열해줘." |

총 7 시나리오. 각 시나리오는 `(id, url, title, taskDescription)` 4-튜플.

```ts
interface BenchScenario {
  id: string;                 // kebab-case, primary key
  url: string;                // apps/example 내 라우트 (leading /, no origin)
  title: string;              // envelope.title 과 일치
  taskDescription: string;    // agent 지시 문장 (영/한 혼용 허용)
}
```

## 3. 메트릭

각 `run(scenario)` 는 아래 필드를 모두 채운 `RunnerResult` 를 반환한다.

| 필드 | 타입 | 측정 대상 | 비고 |
|---|---|---|---|
| `bytes` | `number` | UTF-8 인코딩한 output string 의 바이트 길이 | `Buffer.byteLength(output, "utf8")` |
| `chars` | `number` | output string 의 code point 수 | `[...output].length` (서러게이트 페어 보정) |
| `tokens` | `number` | Claude tokenizer 로 인코딩한 토큰 수 | §6 선택 근거 참조 |
| `renderTimeMs` | `number` | 런너가 "입력 DOM 상태 → output string" 에 소비한 wall-clock ms | §4 의 공정성 규칙 참조 |
| `actionableElementCount` | `number` | 출력 안에서 LLM 이 호출할 수 있는 action 의 개수 | §3.1 |
| `infoDensity` | `number` | `tokens / actionableElementCount` (actionable 0 이면 `null`) | 낮을수록 action 당 비용 적음 |
| `sizeRatio` | `number` | `tokens / readableUiTokens` — `readable-ui` baseline 대비 비율 | baseline 자신은 `1.0` |
| `output` | `string` | 산출 원문 (디버깅·스냅샷용) | 결과 파일에 저장 |

### 3.1 actionableElementCount 정의

세 런너 공통 기준:

- **readable-ui**: envelope `tools[].name` 의 개수가 아니라, 본문에 실제 등장한 action 의 개수. 구현은 `renderPage` 내부 `registerAction` 콜백으로 수집하거나, 산출 Markdown 을 파싱해 `mcp://tool/<name>` URL · `::button{action=…}` directive · `:::form{action=…}` · `:::table{tool=…}` · row action link 를 합쳐 중복 제거 없이 합산. Fallback `"on"` 모드의 directive+link paragraph 이중 표현은 **하나로 카운트** (동일 호출의 이중 표기, ADR 0012).
- **ax-tree**: `role ∈ { "button", "link", "textbox", "combobox", "checkbox", "radio", "menuitem", "tab", "switch" }` 인 노드 수. `disabled: true` 도 포함 (에이전트 입장에서 "보이는 액션" 의 수).
- **headful-md**: 변환 산출물의 `[text](url)` + 입력 라인 (`- <label>: ___`) + 버튼 라인 (`[<label>]`) 개수. ax-tree 에서 유도되므로 ax-tree 와 근접하지만, 변환 규칙(§5)에 따라 비활성 노드 제외 가능.

### 3.2 집계 지표

러너별 결과가 모이면 aggregator 는 다음을 리포트에 포함한다 (CLI 가 계산, 본 문서는 spec):

- per-scenario 표: `bytes / chars / tokens / renderTimeMs / actionableElementCount / infoDensity / sizeRatio` 세로 열, runner id 가로 열.
- across-scenario 요약: 각 메트릭의 **중앙값 · 평균 · min · max**.
- `readable-ui` 대비 `ax-tree` 와 `headful-md` 의 토큰 감축/증가율 — **산술평균 + 중앙값을 병기**한다.

> [!NOTE]
> sizeRatio 같은 비율 지표는 geometric mean 이 이론적으로 더 적합하지만, v1 은 해석 용이성을 위해 산술평균을 유지하고 **median 병기로 outlier 왜곡을 노출**한다. `audit` 같은 payload-heavy 시나리오는 단독으로 평균을 크게 이동시키므로 per-scenario 표와 together 로 읽어야 한다. geomean 전환은 open (§9).

## 4. 공정성 규칙

세 런너는 **같은 underlying rendered DOM state** 에서 출력한다:

1. **같은 Next dev server**: `apps/example` 를 `next dev` 로 실행. 세 런너 모두 이 서버에 HTTP 로 접근.
2. **readable-ui 런너**: 라우트의 `.md` 엔드포인트 (`/users.md` 등) 를 GET — 동일 라우트의 `page.tsx` 가 만드는 React tree 를 `renderPage()` 가 직렬화한 결과 (ADR 0005 envelope + body). 단, home `/` 는 envelope 이 없으므로 **별도 처리**: 홈 인덱스는 Next app router 의 일반 `page.tsx` — envelope 부재. readable-ui 런너는 `renderPage` 를 이 경로에 적용할 수 없으므로 `home` 시나리오에서는 "readable-ui representation 없음" 을 나타내는 `null` 결과를 내고 sizeRatio 계산에서 제외. 대안으로 builder 단계에서 home 용 envelope/component tree 를 신설할 수도 있으나 본 ADR 범위 밖.
3. **ax-tree / headful-md 런너**: 동일 라우트의 **HTML 경로** (`/users` 등) 를 Playwright 로 열고 `page.waitForLoadState("networkidle")` 뒤 `context.newCDPSession(page)` 로 CDP 세션을 붙여 `Accessibility.getFullAXTree` 를 호출. CDP 응답은 flat node list (`{ nodes: AXNode[] }`) 이므로 `bench/src/lib/ax-cache.ts` 가 `parentId`/`childIds` 를 따라 tree 로 복원한 뒤 직렬화한다. headful-md 는 같은 복원 tree 를 input 으로 재사용 (두 번 측정하지 않음).
4. **timing 기준**: `renderTimeMs` 는 "입력 → output string" 단계만 측정한다. 즉 ax-tree 런너는 `Accessibility.getFullAXTree` CDP 호출부터 tree 복원 + `JSON.stringify` 완료까지, headful-md 는 위 복원 tree 를 받은 시점부터 Markdown 문자열 반환까지, readable-ui 는 HTTP fetch 부터 body 수신 완료까지. 네트워크·브라우저 부팅 + CDP 세션 attach 시간은 bench 외부 (warm-up 1회 실행 후 본 측정).
5. **warm-up**: 각 시나리오를 2회 실행하고 첫 회는 폐기한다 (Node JIT + Next RSC 캐시 워밍). 본 측정은 2회차.
6. **randomness 금지**: `apps/example` fixture 는 deterministic (audit 의 240 rows 도 `makeAuditEvents(240)` 결정적). 날짜·ID 등은 fixture 레벨에서 고정.
7. **ax-tree volatile identifier 정규화** (ADR 0023 amendment 2026-04-18): CDP 가 Chrome 재시작마다 재발급하는 `nodeId` / `parentId` / `childIds[]` / `backendDOMNodeId` / `frameId` 는 `bench/src/lib/ax-cache.ts` 의 `normalizeVolatileIds()` 가 **한 run 내 first-seen DFS 순서**로 안정 placeholder (`<id-N>` / `<backend-N>` / `<frame-N>`) 로 치환된다. 같은 노드가 여러 필드에서 참조될 때 **동일 placeholder** 로 일관. 정규화는 AX 노드 최상위 필드뿐 아니라 `name.sources[].nativeSourceValue.relatedNodes[].backendDOMNodeId`, `properties[].value.relatedNodes[].backendDOMNodeId` 같은 **nested CDP back-reference** 도 포함해 JSON 구조 전체를 deep-walk 한다. 토큰·바이트·문자 산정은 **정규화된 출력 문자열** 을 입력으로 받으며, 따라서 같은 git sha · 같은 페이지 상태에서는 ax-tree 산출이 byte-equal 하다. `headful-md` 는 캐시된 원본 tree (비정규화) 를 입력으로 사용하므로 nodeId-keyed resolver 계약 (`ax-to-md.ts` hrefResolver) 이 유지된다.

## 5. headful(ax→md) 변환 규칙 (휴리스틱 v1)

**최소 표면**만 정의. 규칙이 커버하지 않는 AX role 은 무시 (ignore) 하고 children 만 재귀적으로 펼친다. 목적은 "ax-tree 를 markdown-flavored 로 정리했을 때의 토큰 효율" 비교이지, 완전한 accessibility serializer 를 만드는 것이 아니다.

> [!NOTE]
> 아래 규칙은 tree 형태의 AXNode (role / name / value / children / …) 가 전제다. 실제 입력은 CDP `Accessibility.getFullAXTree` 가 돌려주는 flat node list 로, `bench/src/lib/ax-cache.ts` 의 복원기가 `parentId`/`childIds` 를 따라 tree 로 재구성한 결과를 사용한다.

| AX role | 변환 규칙 |
|---|---|
| `WebArea` | root — 무 prefix, children 을 순차 walk |
| `heading` (with `level`) | `#` × level + ` ` + `name` |
| `paragraph`, `text`, `StaticText` | `name` 을 일반 텍스트로 (인접 노드와 space 조인) |
| `link` (has `name` + extracted href via `evaluate`) | `[name](href)` — href 가 없으면 `name` 만 텍스트로 |
| `button` | `[name]` — 한 줄 (disabled 면 앞에 `~~` strike 처리) |
| `textbox`, `combobox`, `searchbox` | `- <label-or-name>: ___` (value 존재 시 `___<value>___`) |
| `checkbox` | `- [ ] name` / `- [x] name` (checked 기준) |
| `radio` | `- ( ) name` / `- (x) name` |
| `list` | children 을 `- ` prefix 리스트로 flatten |
| `listitem` | `- ` + inline children |
| `navigation`, `region`, `banner`, `main`, `contentinfo`, `complementary` (landmark) | `## <name or role>` heading 으로 승격 후 children |
| `table` | GFM pipe table — `columnheader` 들로 header row, `row` 들로 body rows, `cell` 값은 name |
| `columnheader`, `row`, `cell` | table 내부에서만 의미, 외부 등장 시 cell 의 name 만 |
| `menu`, `menuitem` | list + listitem 와 동일 처리 |
| `img` | `![alt](src)` (src 가 없으면 `![alt]()`) |
| `separator` | `---` |
| `tab`, `tablist`, `tabpanel` | v1 미지원 — children 펼침 |
| 그 외 role | 무시하고 children walk |

**공통 규약**:

- `name` 누락 노드는 children 만 walk.
- `disabled: true` 인 interactive 노드는 `~~...~~` strike 로 감싼다.
- `value` 필드는 textbox 류에만 특수 처리, 그 외엔 무시.
- 블록 노드 사이는 빈 줄 1개로 구분. 인라인 누적은 space 1개.

## 6. Tokenizer 선택 — `@anthropic-ai/tokenizer`

**결정**: `@anthropic-ai/tokenizer` (npm, Apache-2.0, 0.0.4 현재) 를 사용한다.

**근거**:

1. **Claude 계열 토크나이저와 정렬**: readable-ui 는 MCP (`mcp://tool/...`) URI scheme 을 ADR 0002 에서 채택 — Claude/Anthropic 에이전트가 1차 소비자. 벤치 결과도 Claude 토큰 기준으로 보고해야 claim ("readable-ui 가 토큰 효율적") 의 대상 모델과 단위가 일치한다.
2. **공식 npm 패키지**: Anthropic 이 직접 게시. `tiktoken` wrap.
3. **API 간결**: `countTokens(text: string): number` 한 함수. 비동기 초기화 불요 (WASM 초기화는 내부 1회).

**대안 평가**:

- `gpt-tokenizer` (3.4.x) — GPT-4 / o200k / cl100k base 지원. readable-ui 의 대상 모델이 아니므로 토큰 수가 체계적으로 왜곡될 수 있음 (한국어·이모지·JSON 토큰화 차이). **기각**.
- `js-tiktoken` — cl100k (GPT-4) 기반. 위와 동일 이유. **기각**.
- **dual reporting** (Claude + GPT 둘 다 측정) — 가치는 있으나 v1 산출물 복잡도 증가. v2 후보. 본 ADR 은 단일 tokenizer 로 닫는다.

**의존성 경고**: `@anthropic-ai/tokenizer` 는 0.0.x 버전 — 향후 API 변경 가능. 러너 스캐폴딩 시 버전 pin 권장 (`"@anthropic-ai/tokenizer": "0.0.4"`).

## 7. 러너 인터페이스 계약

세 런너가 구현해야 하는 TS 타입:

```ts
export interface BenchScenario {
  id: string;
  url: string;
  title: string;
  taskDescription: string;
}

export interface RunnerResult {
  runnerId: "readable-ui" | "ax-tree" | "headful-md";
  scenarioId: string;
  output: string | null;              // null = runner does not apply to this scenario
  bytes: number;
  chars: number;
  tokens: number;
  renderTimeMs: number;
  actionableElementCount: number;
  // infoDensity / sizeRatio 는 aggregator 단계에서 계산 — runner 는 raw 3개만 보장
}

export interface Runner {
  id: "readable-ui" | "ax-tree" | "headful-md";
  run(scenario: BenchScenario): Promise<RunnerResult>;
}
```

**계약 의무**:

- 같은 `scenario` 로 여러 번 호출되어도 `output` 과 `bytes/chars/tokens/actionableElementCount` 는 deterministic (fixture 가 결정적이므로 값 동일). `renderTimeMs` 만 변동.
- 실패는 throw — 부분 결과 (`NaN`/`-1`) 반환 금지. aggregator 는 try/catch 로 러너별 실패를 per-scenario 로 기록.
- `output` 이 `null` 이면 나머지 수치는 `0` 으로 채우고 aggregator 는 집계에서 제외.

## 8. 확장 규칙 (bench 시나리오·runner 추가 시)

ADR 0023 Consequences: **새 시나리오 추가 시 3 runner 모두 산출**돼야 한다. 한 runner 만 지원하는 시나리오는 비교 의미가 없으므로 bench 에서 제외. 단 `home` 처럼 runner-out-of-applicability 가 명시적으로 받아들여지는 경우 (readable-ui 가 envelope 없는 홈을 렌더할 수 없음) 는 예외적으로 `null` 결과 허용.

새 runner 추가 (예: `dom-text` raw innerText) 는 본 문서에 §1 표 엔트리 추가 + §3 actionableElementCount 기준 추가 + ADR 0023 개정 (또는 후속 ADR).

## 9. 아직 열린 항목

- **dual tokenizer** (Claude + GPT 동시) — v2 후보.
- **streaming chunk 지표** — first-N-tokens 에 들어가는 actionable 개수 (`actionableInFirst512Tokens`). 현재 뒤따를 수 있는 단순 계산이나 본 v1 에는 미포함.
- **agent task 실행 성공률** — bench 의 목적은 전송 크기·밀도 비교이지 agent 성공률 벤치가 아니다. 성공률은 별도 eval harness 의 영역 (Codex 연동은 ADR 0023 §Consequences 에 명시 예고만).
- **payload-heavy 라우트 확장** — audit 외에 reports 를 payload 모드로 돌려보는 변형. 현재는 audit 만 payload 모드.
- **geometric mean 전환** — sizeRatio 의 집계를 geomean 으로 바꾸면 outlier 왜곡이 줄지만 해석 난이도가 오른다. v1 은 arithmetic + median 병기로 절충. geomean 전환은 takeaway 문구와 재현 자료까지 함께 검토 필요.
- **`ax-tree` 필터링 변형** — 현재 `Accessibility.getFullAXTree` 는 full tree. production agent 의 일반적 입력에 가깝게 하려면 ignored/hidden 제거 필터링 변형을 `ax-tree-filtered` 로 추가하는 옵션. 3-way → 4-way 가 되고 ADR 0023 개정 수반.
