# ADR 0027 — `@readable-ui/mcp` 서버 브리지 (envelope → MCP tools)

- Status: Proposed
- Date: 2026-04-18
- Related: [ADR 0002](./0002-action-uri-scheme.md) (mcp:// URI 규약), [ADR 0005](./0005-page-envelope.md) (envelope as contract), [ADR 0007](./0007-layout-and-component-catalog.md) (카탈로그 닫힘), [ADR 0008](./0008-engine-react-element-walk.md) (walker 의미론), [ADR 0010](./0010-harness-skill.md) (skill 역할 분리), [ADR 0023](./0023-benchmark-environment.md) (byte-equal baseline), [ADR 0026](./0026-define-page-dx-layer.md) (`definePage` DX 층), [ADR 0028](./0028-compile-time-tool-validation.md) (타입 레벨 tool 참조 검증 — 결합 규약 §결합)

## Context

`README.md` Packages 표는 `@readable-ui/mcp` 의 역할을 **"Expose declared actions as MCP tools"** 로 약속한다. 현 실구현은 `packages/mcp/src/index.ts` 한 파일 — `parseActionURI` / `buildActionURI` / `normalizeActionURI` 헬퍼 3 개 뿐이다. URI 문자열을 파싱·조립하는 유틸은 있으되, **MCP 프로토콜 서버 엔드포인트** 는 부재하다. `mcp://tool/<name>` 링크는 지금까지 "LLM 이 *인식* 할 수 있는 형태" 로만 존재했고, 실제로 이 scheme 을 해석해 `tools/call` 로 응답해 줄 주체는 없다 — README 의 약속과 구현 사이에 구조적 공백이 있다.

**중요 관찰**: `packages/core/src/envelope.ts` 의 `EnvelopeToolZ` 가 이미 MCP `tools/list` 응답 shape 과 **구조적으로 동형** 이다.

| envelope field | MCP `tools/list` field | 변환 |
|---|---|---|
| `name` (regex `[A-Za-z0-9._-]+`) | `name` | 그대로 |
| `title` | `title` | 그대로 (MCP 2025-06 spec optional) |
| `description` | `description` | 그대로 |
| `input` (JSON Schema subset) | `inputSchema` | 키 이름만 `input → inputSchema` |
| `output` | `outputSchema` | 동일 — optional |
| `role`, `constraints` | (없음) | annotation 으로 우회 |

ADR 0005 §3 가 "MCP `tools/list` 응답 스키마와 키·형태가 1:1 호환" 을 설계 목표로 못박았던 덕에, 엔벨로프 ↔ MCP tool 변환은 **스키마 재정의 없이 key rename + passthrough** 로 충분하다. 본 ADR 은 이 동형성을 실제 런타임 bridge 로 승격시킨다.

ADR 0002 가 `mcp://` scheme 을 채택한 동기도 "Claude/ChatGPT 의 MCP 클라이언트가 이 scheme 을 이미 인식" 이었다. 서버측 tool 등록이 없으면 이 전제가 "에이전트가 호출할 *대상* 이 어디에도 없는" 상태로 비어 있다. 본 ADR 은 이 공백을 메우는 최소 골격을 제안한다.

## Decision

### (a) 런타임: `@modelcontextprotocol/sdk` 공식 TypeScript SDK 채택

대안 비교:

| 옵션 | Pros | Cons |
|---|---|---|
| **`@modelcontextprotocol/sdk` (공식)** | protocol drift 자동 추종 (spec 개정 시 패키지 업데이트로 흡수), `Server` / `StdioServerTransport` / `SSEServerTransport` 내장, JSON-RPC framing·capability negotiation·progress notification 이 built-in | `zod` peer dep 등 의존성 한 단계 추가, 0.x 버전대 API churn 가능성 |
| 수제 JSON-RPC | 의존성 0 추가, 필요한 메서드(`initialize` / `tools/list` / `tools/call`)만 가볍게 구현 | spec 개정(progress stream, resource subscription 등) 을 직접 추종, 테스트 프로비저닝·샘플 client 부재 |

**채택**: 공식 SDK. readable-ui 의 v1 scope 는 "envelope 동형성 노출" 이며 프로토콜 복잡도는 외주(SDK 에 위임) 하는 것이 ADR 0010 "코드가 런타임을 강제, skill·doc 은 규약만" 원칙과 일치한다. 단 패키지는 `peerDependencies` 가 아닌 **`dependencies`** 로 선언 — 최종 사용자가 MCP 소비 없이 `@readable-ui/core` 만 쓰는 경로를 막지 않도록 `@readable-ui/mcp` 자체의 import 시점에만 로드되게 한다.

### (b) 배치: Next.js route handler (HTTP/SSE) 를 default, stdio binary 를 선택지로

두 안의 trade-off:

| 축 | Next.js route (`app/mcp/route.ts`) | 독립 Node binary (`bin/readable-ui-mcp`) |
|---|---|---|
| Transport | HTTP POST + SSE (MCP Streamable HTTP) | stdio (child process) |
| 배포 | 기존 Next 앱 deploy 파이프라인에 편승 | 별도 프로세스 supervisor 필요 |
| 세션/인증 | Next middleware, cookie, RSC context 재사용 | 독립 — IPC 경계에서 재구성 |
| envelope 수집 | app router 파일시스템 / `definePage` registry 직접 접근 | registry 모듈을 명시 import 해야 함 |
| 사용 시나리오 | 원격 agent (Claude Desktop remote, ChatGPT MCP) | 로컬 dev agent (Claude Desktop local, Codex CLI) |

**Default**: **Next route handler**. 근거 — readable-ui 는 `apps/example` 기준 Next.js 에 이미 밀착돼 있고(ADR 0014, 0021, 0026), envelope 을 소유한 페이지들이 이미 Next app router 안에 있다. 따로 스캔 레이어를 두지 않고도 `definePage` 가 export 한 envelope 에 접근할 수 있다. ADR 0026 의 `definePage` 가 envelope 을 eagerly 검증된 리터럴로 노출하므로, 서버 시작 시점에 registry 를 walk 해 `tools/list` 를 구성할 수 있다.

**Optional binary**: `@readable-ui/mcp/bin` 으로 같은 코어를 stdio transport 에 연결한 thin wrapper 를 제공. Claude Desktop 의 `mcpServers.<name>.command` 로 꽂기 위한 용도. 내부적으로 같은 `createReadableUiMcp({ registry })` 팩토리를 공유하고 transport 만 다르다.

### (c) envelope → MCP tool 변환 규칙

```ts
function envelopeToolToMcp(tool: EnvelopeTool, pageScope: string): McpTool {
  return {
    name: `${pageScope}.${tool.name}`,
    title: tool.title ?? tool.name,
    description: tool.description,
    inputSchema: tool.input ?? { type: "object" },
    // role / constraints 는 MCP 표준 필드가 아니므로 _meta 로
    _meta: {
      "readable-ui/role": tool.role,
      "readable-ui/constraints": tool.constraints,
    },
  };
}
```

**키 매핑**:

| envelope | MCP | 비고 |
|---|---|---|
| `name` | `name` (prefixed) | 다중 페이지 namespace 충돌 해결 (아래) |
| `title` | `title` | MCP 2025-06 기준 optional. 누락 시 `name` 폴백 |
| `description` | `description` | passthrough |
| `input` | `inputSchema` | `undefined` → `{type:"object"}` (MCP 필수 필드) |
| `role` | `_meta["readable-ui/role"]` | annotation — MCP spec `_meta` 범용 컨테이너 |
| `constraints` | `_meta["readable-ui/constraints"]` | 동상 |

**Namespace 충돌**: 여러 페이지가 각자 `tools[]` 를 가지는 구조에서 동일 이름 (`createUser`, `delete` 등) 이 충돌할 수 있다. 해결:

- **Scoped name**: `${pageScope}.${tool.name}` 형태로 MCP 측 `name` 만 prefix. pageScope 는 envelope 이 속한 라우트 path 의 안정화 (예: `/users` → `users`, `/users/[id]` → `users.byId`).
- **envelope 내부 `name` 은 변경하지 않음**: 직렬화된 Markdown (envelope `tools[]` 및 `mcp://tool/<name>` 링크) 는 ADR 0023 byte-equal baseline 이므로 **바이트 단위로 동일**해야 한다. prefix 는 오직 MCP wire format 레이어에서만 적용.
- **역방향 매핑**: `tools/call` 의 `name` 을 받으면 prefix 를 스트립해 registry lookup. prefix 포함 이름도, 스트립된 단축 이름도 허용 (단축 이름이 unique 한 경우에만).

### (d) Tool invocation 핸들러 — `defineTool` 팩토리 + proxy 모드 병행

`tools/call` 이 도착했을 때 "비즈니스 로직이 어디 사는가" 는 두 갈래다:

| 모드 | 정의 위치 | 실행 경로 |
|---|---|---|
| **registered** | `defineTool({ name, handler })` 로 명시 등록 | 서버가 handler 를 직접 호출 |
| **proxy** | 기존 Next route handler / action / API endpoint | 서버가 envelope `paths.api` 또는 convention URL 로 HTTP forward |

**v1 채택**: **두 모드 병행**. 각 페이지가 tool 을 정의할 때 다음 중 택일:

```ts
// 1. registered — readable-ui 가 실행 주체
export const createUserPage = definePage({
  envelope: { ... tools: [{ name: "createUser", input: ... }] ... },
  render: (p) => <Page>...</Page>,
  tools: {
    createUser: defineTool({
      name: "createUser",
      handler: async (input) => { /* 실제 로직 */ },
    }),
  },
});

// 2. proxy — 기존 API endpoint 재사용
export const usersPage = definePage({
  envelope: { ..., paths: { api: "/api/users" }, tools: [...] },
  render: ...,
  // tools 생략 → MCP 서버는 `${paths.api}` 로 JSON POST forward
});
```

**이유**: 라이브 admin 앱 다수가 이미 REST 엔드포인트를 가진다. proxy 만 제공하면 채용 장벽이 낮아진다. 반대로 `defineTool` 이 없으면 envelope-first 으로 새 앱을 시작하는 경로가 장황하다. 둘 다 필요.

`defineTool` 은 `definePage` 와 마찬가지로 **새 카탈로그 항목을 추가하지 않는다** (ADR 0007 위반 없음). 순수 데이터 팩토리.

### (e) Envelope 수집 — `definePage` registry

ADR 0026 의 `definePage` 는 이미 envelope 을 모듈 로드 시점에 parse 한다. 여기에 **암묵적 registry 등록** 을 한 줄 추가한다:

```ts
// packages/react/src/define-page.ts (기존)
export function definePage(opts) {
  const env = typeof opts.envelope === "function" ? null : parseEnvelope(opts.envelope);
  if (env) __readableUiPageRegistry.register(opts); // NEW
  return { Component, GET, toMarkdown, envelope: opts.envelope };
}
```

Registry 는 `@readable-ui/core` 의 내부 module-scoped `Map` 으로 두고, `@readable-ui/mcp` 가 이를 import 해 tools/list 를 구성한다. 대안 비교:

| 대안 | Pros | Cons |
|---|---|---|
| **Registry (채택)** | 정적 import graph 로 수집, 빌드타임에 tree-shaking 된 페이지만 노출됨 | `definePage` 를 쓰지 않은 페이지는 보이지 않음 — ADR 0026 수용 전제로만 동작 |
| Filesystem scan (`app/**/*.md/route.tsx`) | `definePage` 미사용 페이지도 검출 | FS I/O·Next build 경로 depedent, edge/serverless 환경에서 불안정 |
| 수동 선언 (`mcpServer({ pages: [a, b, c] })`) | 의도 명시적 | DX 퇴보 — 페이지 추가마다 두 곳 업데이트 |

Registry 를 default, 수동 선언을 override 로 허용한다. Filesystem scan 은 out of scope (복잡도 대비 이득 낮음).

동적 envelope (`envelope: (params) => ...`) 은 tools/list 에서 **static skeleton** 만 노출 — `name` 과 `description` 은 모든 param variant 에 공통이라는 가정 아래 최초 호출로 평가한 뒤 캐시. variant 별 차이가 있으면 `_meta["readable-ui/dynamic"]: true` 로 표시. 더 정교한 변형은 후속 ADR.

### 경계 명시 (no-op 보증)

본 ADR 이 **변경하지 않는 것**:

- **ADR 0005 envelope 스키마** — `EnvelopeZ` / `EnvelopeToolZ` 필드 추가 없음. MCP 측 annotation 은 `_meta` 로만 전달.
- **ADR 0007 카탈로그 닫힘** — `defineTool` / `createReadableUiMcp` 는 `defineDualComponent` 를 호출하지 않는다. 새 컴포넌트 이름 0 개 추가.
- **ADR 0008 walker 의미론** — Markdown 직렬화 경로는 전혀 건드리지 않는다. MCP 서버는 이미 완성된 envelope 을 읽기만 한다.
- **ADR 0023 fairness / byte-equal** — envelope `tools[].name` 의 **wire bytes 불변**. MCP 측 prefix 는 서버 외부에서만 보인다. bench 의 readable-ui 러너 산출물(`/foo.md`) 은 본 ADR 도입 전/후 byte-equal.
- **ADR 0026 `definePage` DX 층** — 기존 시그니처 유지. `tools` 필드는 **선택적** 으로 추가돼 기존 호출부가 깨지지 않는다.

## Consequences

### Positive

- README 의 `@readable-ui/mcp` 약속이 실체를 얻는다. `mcp://tool/<name>` 링크가 실제로 호출 가능해진다.
- Envelope 을 SSoT 로 한 tool 선언이 **Markdown 직렬화 + MCP tools/list + HTML render** 세 표면 모두에 자동 반영된다. ADR 0005 §3 의 "1:1 호환" 약속이 문서가 아닌 코드로 강제된다.
- `definePage` + `defineTool` 조합이 envelope-first 개발 흐름을 완결시킨다 — 한 파일에서 tool 선언(envelope) 과 handler 구현을 함께 표현.
- MCP spec 개정은 SDK 업데이트로 흡수. 프로토콜 debt 외주.
- bench 결과(ADR 0023) 에 영향 없음 — envelope 직렬화 바이트 불변.

### Negative

- `@modelcontextprotocol/sdk` 의 0.x 버전 API churn 을 `@readable-ui/mcp` 가 완충해야 한다. SDK major bump 마다 본 패키지 대응 필요.
- Next route handler 기반은 Next.js 에 묶인다 — 다른 프레임워크 (Remix, Astro, SvelteKit) 는 core 를 직접 wiring 해야 한다. 단, stdio binary 가 framework-agnostic 대안으로 존재.
- proxy 모드의 일관성 — 원격 API 가 MCP tool 계약과 어긋나게 변경되면 런타임에만 드러난다. 정적 검증은 envelope 스키마 수준에 머무름.
- Registry 접근이 `@readable-ui/core` → `@readable-ui/mcp` 방향 의존을 형성한다. core 가 mcp 를 import 하지 않는 한 순환은 없으나, registry 모듈 위치는 주의.

### Limit

- 파일시스템 기반 envelope 자동 검출 없음 — `definePage` 를 쓰지 않은 legacy 페이지는 수동 등록 필요.
- 동적 envelope 의 variant-per-param tool 노출 없음. skeleton 한 벌.
- Streaming tool result (MCP `progress` notification) 지원 없음. v1 은 request/response.
- Authentication / authorization 없음. envelope `role` 은 `_meta` annotation 으로만 전달되고, 서버 측 enforcement 는 out of scope (Next middleware 또는 proxy target 의 기존 auth 에 위임).

## Migration / Scope

### v1 범위

1. `packages/mcp/src/server.ts` — `createReadableUiMcp({ registry, transport })` 팩토리.
2. `packages/mcp/src/define-tool.ts` — `defineTool({ name, handler })` 팩토리.
3. `packages/mcp/src/bin/stdio.ts` — Claude Desktop 용 stdio wrapper.
4. `packages/react/src/define-page.ts` — registry 등록 한 줄 추가 (ADR 0026 후속).
5. `apps/example/app/mcp/route.ts` — Next route handler 샘플 (HTTP/SSE transport).
6. `apps/example/app/users/page.tsx` 외 1~2 곳을 `defineTool` 로 마이그레이션해 end-to-end 검증.

### v1 제외

- **Authentication** — Next middleware 책임. MCP 서버는 인증 훅만 노출(`onRequest(ctx)`), 실제 검증은 앱측.
- **Streaming tool results** — `progress` / `cancelled` notification 없음.
- **Resource API** (`resources/list`, `resources/read`) — envelope 은 tool 만 다룸. 페이지 Markdown 자체를 resource 로 노출하는 안은 후속 ADR.
- **Prompt API** (`prompts/list`) — readable-ui 의 prompt 는 envelope `purpose` 에만 존재. 별도 노출 없음.
- **Filesystem scan** — Registry 미등록 페이지는 수동.
- **Dual tokenizer bench 반영** (ADR 0023 §Out of scope 와 동일 — 본 ADR 도 bench scope 확장 아님).

## 자체 점검

- ADR 0007 카탈로그 닫힘: `defineDualComponent` 호출 0 — OK.
- ADR 0008 walker: Markdown 경로 무변경 — OK.
- ADR 0023 byte-equal: envelope `tools[].name` wire 표현 불변, prefix 는 MCP layer 에만 — OK.
- ADR 0026 `definePage`: 기존 시그니처에 optional `tools` 필드만 추가. 기존 호출부 비파괴 — OK.

## 결합 — ADR 0028 과의 상호 작용

ADR 0028 이 `definePage<Params, Tools extends readonly EnvelopeTool[]>` 와 render 의 2번째 인자(typed proxy) 로 타입 레벨 검증을 도입하면, 본 ADR 이 추가하는 `opts.tools` (handler map) 의 key 유니언도 **같은 `Tools[number]["name"]` 로 좁혀져야** 한다. 결합된 최종 시그니처 스케치:

```ts
definePage<Params, const Tools extends readonly EnvelopeTool[]>(opts: {
  envelope: { tools: Tools, ... } | ((p: Params) => { tools: Tools, ... });
  render: (p: Params, proxy: TypedProxy<Tools>) => ReactElement;
  tools?: { [K in Tools[number]["name"]]?: ToolHandler<...> }; // 본 ADR
}): ...
```

- 두 ADR 은 `definePage` 를 **서로 다른 축** 에서 확장한다 (handler map vs render proxy). 컴파일 타임 충돌 없음 — 순서 무관하게 구현 가능하나, 두 제안이 모두 Accepted 되는 경우 `opts.tools` 의 key 좁힘은 ADR 0028 의 제네릭 파라미터에 의존한다.
- ADR 0028 가 먼저 Accepted 되고 본 ADR 이 뒤따르면: `opts.tools` 의 key 는 처음부터 유니언으로 좁힐 수 있다.
- 본 ADR 이 먼저 Accepted 되고 ADR 0028 이 뒤따르면: 초기 `opts.tools` 는 `Record<string, ToolHandler>` 로 시작 → ADR 0028 채택 시 한 번 더 시그니처 업데이트. 런타임 동작은 불변.

결합 ordering 의 런타임 영향은 **없음** — 모두 타입 레벨 개선이며, wire bytes / walker / envelope 스키마는 양 ADR 경계 너머에서 그대로 유지된다.

## Open Decisions

- **O-27-1. `pageScope` prefix 정규화 규칙**. 라우트 path `/users/[id]` → `users.byId` vs `users._id` vs `users-id`. MCP `name` regex 는 `[A-Za-z0-9_-]` 계열 허용. dot 사용 여부는 일부 client 호환성과 엮임. v1 prefix 형식 최종 확정 필요.
- **O-27-2. Registry scope — global singleton vs scoped factory**. `__readableUiPageRegistry` 가 process-global 이면 여러 Next zone / microfrontend 에서 충돌. scoped factory(`createRegistry()`) 로 가려면 `definePage` 가 registry 참조를 어떻게 받는지(module augmentation? optional arg?) 결정 필요.
- **O-27-3. Proxy 모드의 request shape**. `tools/call` 의 `arguments` 를 HTTP forward 할 때 `POST ${paths.api}` body 로 그대로 보낼지, `{ tool, input }` envelope 으로 감쌀지, header 로 `x-readable-ui-tool` 을 싣을지. 기존 REST 계약과의 충돌 최소화 방안이 미정.
- **O-27-4. 동적 envelope variant 노출**. `envelope: (params) => ...` 가 param 별로 tool set 을 바꾸는 경우 tools/list 에 어떻게 반영할지. 현재는 skeleton 한 벌 — 실제 수요 관찰 후 재검토.
- **O-27-5. `role` enforcement 위치**. `_meta` annotation 으로 전달된 role 을 MCP 서버가 강제할지, 순수 hint 로 둘지. 강제하면 auth context 주입이 필요 — v1 제외 범위와 연결.

## Harness skill 업데이트 (후속)

본 ADR Accepted 전환 시 `.claude/skills/readable-ui-harness/SKILL.md` §2 동기화 체크리스트에 아래 row 추가 예정:

```
### MCP tool 신규 노출
- [ ] envelope `tools[]` 에 name/input 선언
- [ ] `defineTool({ name, handler })` 또는 `paths.api` proxy 구성
- [ ] `pnpm --filter @readable-ui/mcp typecheck`
- [ ] ADR 0005 / 0007 / 0023 위반 없음 재확인
- [ ] bench baseline 은 envelope 직렬화 byte-equal 확인 후에만 갱신 (ADR 0023)
```

본 ADR 은 skill 파일을 직접 수정하지 않는다 — Accepted 시점에 별도 편집.
