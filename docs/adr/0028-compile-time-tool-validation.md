# ADR 0028 — 컴파일 타임 tool 참조 검증

- Status: Accepted
- Date: 2026-04-18
- Related: [ADR 0005](./0005-page-envelope.md) (envelope 스키마), [ADR 0007](./0007-layout-and-component-catalog.md) (카탈로그 닫힘), [ADR 0008](./0008-engine-react-element-walk.md) (walker 의미론), [ADR 0026](./0026-define-page-dx-layer.md) §3 (보류 근거), [ADR 0027](./0027-mcp-server-bridge.md) (`definePage.tools` handler map — 결합 규약 §결합)

## Context

현재 envelope `tools[]` 에 선언된 tool 이름과 본문 트리의 action 참조 (`<Button action>`, `<Form action>`, `<Table tool>`, `TableRowAction.tool`, `<Link href="mcp://tool/...">`) 의 정합성은 **`renderPage` 런타임** 에서만 검증된다. `packages/core/src/index.ts:307~321` 에서 `usedActions` 를 수집해 envelope.tools 에 없는 이름을 발견하면 `Action "X" is used in the body but not declared in envelope.tools.` 를 throw 한다.

### 한계

- 오탈자가 **페이지를 실제로 렌더하기 전까지** 감지되지 않는다. Next.js App Router 기준, `/users.md` 라우트를 히트하거나 `pnpm bench` 를 돌리기 전까지는 녹색이다.
- Dynamic route (`users/[id]/delete`) 처럼 조건부로만 특정 tool 이 참조되는 페이지는 **모든 branch 를 밟지 않으면** 런타임에도 누락을 놓칠 수 있다.
- 외부 consumer 가 `definePage` 를 거치지 않고 `renderPage(tree, envelope)` 을 직접 호출하는 경우에도 오탈자는 런타임으로 밀린다.

### ADR 0026 §3 에서 보류한 이유

ADR 0026 은 `definePage` 도입 당시 타입 레벨 검증을 3가지 근거로 후속 이관했다:

1. `renderPage` 가 이미 런타임에 동일 검증을 수행.
2. 유니언 추출이 `tools: [...] as const satisfies EnvelopeTool[]` 을 author 에게 요구해 DX 이득을 상쇄.
3. 닫힌 카탈로그(ADR 0007) 때문에 컴포넌트 prop 타입을 "현재 페이지의 tools" 로 **국소적으로** 좁히기 어려운 구조 — `ButtonProps.action` 이 전역 `string` 이다.

본 ADR 은 해당 3가지 제약을 **그대로 수용한 상태에서** 타입 레벨 검증을 추가하는 최소 설계안을 제안한다.

## Decision

### (a) `definePage` 제네릭 확장 — envelope `tools` literal 캡처

```ts
export function definePage<
  Params = void,
  const Tools extends readonly EnvelopeTool[] = readonly EnvelopeTool[]
>(opts: {
  envelope: (Envelope & { tools?: Tools }) | ((p: Params) => Envelope & { tools?: Tools });
  render: (params: Params, bound: BoundCatalog<Tools[number]["name"]>) => ReactElement;
}): DefinedPage<Params>;
```

`const Tools` (TS 5.0+ `const` type parameter) 로 author 가 별도 `as const` 를 쓰지 않아도 tuple literal 이 유지된다. `Tools[number]["name"]` 으로 tool 이름 유니언 `ToolName` 을 추출한다.

### (b) 유니언을 컴포넌트까지 전파하는 3안

React 컴포넌트 타입은 **모듈 스코프 전역**이므로 `ButtonProps["action"]` 을 "현재 페이지의 tools" 로 좁히는 표준 경로가 없다. 아래 3안을 비교한다.

#### 안 1 — Typed proxy (render 2번째 인자)

```ts
render: (params, { Button, Form, Table, Link }) => (
  <Page>
    <Form action="createUser">{/* "createUser" is ToolName */}</Form>
    <Button action="createUsr">{/* ❌ TS2322 */}</Button>
  </Page>
);
```

`definePage` 가 `{ Button: FC<ButtonProps & { action: ToolName }>, ... }` 를 조립해 render 에 주입한다. 글로벌 `Button` export 는 건드리지 않으므로 ADR 0007 카탈로그 닫힘과 충돌 없음.

- 장점: 에러 메시지가 정확 — `Type '"createUsr"' is not assignable to type '"listUsers" | "createUser" | ...'`.
- 단점: import 2원화. author 가 글로벌 `Button` 과 proxy `Button` 을 섞어 쓰면 보호가 샌다.
- 파생: `TableRowAction.tool`, `Link href` 도 proxy 의 typed 버전이 필요.

#### 안 2 — Module augmentation + React Context phantom

```ts
// 라이브러리 측 (한 번만)
declare module "@readable-ui/react/components" {
  interface ButtonProps { action: CurrentPageTools | (string & {}); }
}
```

`definePage` 가 페이지 파일 단위로 `CurrentPageTools` 를 module-local 하게 얹는다. 실무적으로는 **동작하지 않는다** — TS module augmentation 은 페이지별 scope 를 지원하지 않고 전역에 누적된다. Phantom Context 는 타입 관점에서 propagation 이 일어나지 않아 좁히기 실패.

- 장점: author 코드 변경 0.
- 단점: **기술적으로 실현 불가에 가깝다**. 에러 메시지는 일반 `string` assignable 규칙에 흡수되어 품질 최악.

#### 안 3 — Template literal 검증 유틸 (opt-in)

```ts
export type ToolOf<P extends DefinedPage<any>> =
  Extract<ReturnType<EnvelopeFn<P>>["tools"][number]["name"], string>;

// author
<Button action={"createUser" satisfies ToolOf<typeof usersPage>}>Create</Button>
```

- 장점: 라이브러리 API 표면 최소. 기존 글로벌 컴포넌트 그대로.
- 단점: author 가 매 참조마다 `satisfies` 를 붙여야 함 — 실질 DX 이득 적음. 기존 8페이지 마이그레이션도 부담.

#### 권장: **안 1 (Typed proxy)**

세 안 중 **안 1 을 기본 채택** 한다. 근거:

- 에러 메시지 품질 (유니언 mismatch) 이 가장 명확하다.
- render 의 2번째 인자는 ADR 0026 시그니처의 자연스러운 확장 — 기존 `render: (params) => JSX` 를 `render: (params, c) => JSX` 로 확장하되 2번째 인자를 **쓰지 않아도** 기존 글로벌 컴포넌트가 그대로 동작해 후방 호환.
- 안 2 는 전역 오염으로 사실상 불가. 안 3 은 author cost 가 너무 크다.

### (c) `defineTools()` helper — `as const satisfies` 제거

```ts
export function defineTools<const T extends readonly EnvelopeTool[]>(tools: T): T {
  return tools;
}

// author
const tools = defineTools([
  { name: "listUsers", input: { type: "object" } },
  { name: "createUser" },
]);
// tools[number]["name"] === "listUsers" | "createUser"
```

`const` type parameter 로 literal tuple 이 유지되고, `satisfies EnvelopeTool[]` 가 함수 인자 위치에서 자동 강제된다. author 는 `as const` 도 `satisfies` 도 쓸 필요 없다. `definePage` 의 `envelope.tools` 에 그대로 전달.

### (d) 런타임 검증 유지 — 이중 방어

ADR 0026 §3 의 런타임 throw (`packages/core/src/index.ts:321`) 는 **제거하지 않는다**. 이유:

- 외부 consumer 가 `definePage` 우회 후 `renderPage(tree, envelope)` 를 직접 호출할 수 있다.
- TS 타입은 `as any` / `@ts-expect-error` / 동적 문자열 (`tool={row.action}`) 로 우회 가능.
- 빌드 아티팩트(`.next/`) 가 타입 정보 없이 실행되므로 runtime 계약이 최종 안전망이다.

컴파일 타임 검증은 **DX 개선**이고, 런타임 검증은 **정합성 계약**이다. 두 층을 별개 책임으로 유지한다.

## Consequences

### Positive

- 오탈자 (`createUsr`, `delelteUser`) 가 **IDE 저장 시점** 에 잡힌다. `pnpm --filter example typecheck` 가 페이지 단위로 회귀 방어.
- `defineTools` 로 `as const satisfies` 보일러플레이트 제거 — DX 퇴보 없음.
- `Tools[number]["name"]` 유니언은 autocomplete 으로도 노출 — author 가 tool 이름을 기억하지 않아도 된다.
- 런타임 런웨이 유지 — 외부 consumer 에게도 안전 계약 보장.

### Negative

- 안 1 의 proxy 패턴은 import 가 `const { Button, Form, Table, Link } = c;` 로 바뀐다 — 8 페이지 중 실제 action 참조가 있는 페이지만 대상 (dashboard, users, users/[id], users/[id]/delete, reports, audit 등 6개). 순수 뷰 페이지(components showcase) 는 영향 없음.
- 글로벌 `Button` 과 proxy `Button` 혼용 시 정적 검증이 실패 — lint 규칙(`no-restricted-imports` 의 페이지 내부 제한) 이 필요.
- **에러 메시지 품질**: 안 1 은 `Type '"createUsr"' is not assignable to type '"listUsers" | "createUser" | "updateUser" | ...'` — 명확. 안 2 는 동작 불가. 안 3 은 `satisfies` 실패 시 메시지가 `Type '"X"' does not satisfy the expected type '"listUsers" | ...'` 로 안 1 과 유사하나 **매 사용처마다** 반복되는 부담.
- TypeScript 5.0+ `const` type parameter 요구 — 본 모노레포 기준 5.9 사용 중이므로 실질 제약 없음.

### Limit

- 동적 tool 참조 (`<Button action={someVar}>`) 는 타입 레벨 검증을 받지 않는다. 런타임 계약이 커버.
- `Link href="mcp://tool/X"` 는 문자열 파싱이 타입 시스템에 어렵다 — Open Decisions 참조.

## Migration

`apps/example` 8 페이지 기준:

1. 각 `page-content.tsx` 의 `definePage({ envelope: { ..., tools: [...] }, render: () => ... })` 를 `render: (_, { Button, Form, Table, Link }) => ...` 로 변경.
2. `Button` / `Form` / `Table` / `Link` import 를 render 인자에서 구조분해로 대체 — 글로벌 import 와 공존 가능하나 **페이지 내부에서는 proxy 버전만** 사용하도록 정리.
3. envelope 의 `tools: [...]` 는 그대로 두되, 재사용되는 tool 묶음은 `defineTools(...)` 로 추출 (선택).
4. `TableRowAction.tool` 은 `actions` prop 이 proxy `Table` 의 `TableProps<R, ToolName>` 을 통해 자동 좁혀지므로 author 수정 불필요.

기존 제네릭 `definePage<Params>` 호출 site 는 **두번째 제네릭을 생략** 해도 기본값 `readonly EnvelopeTool[]` 로 폴백되어 컴파일 깨지지 않는다 — 점진 마이그레이션 가능.

## 경계 명시 (no-op 보증)

본 ADR 이 변경하지 **않는** 것:

- **ADR 0005 envelope 스키마**: `EnvelopeZ` 필드 추가·제거 없음. `EnvelopeTool` shape 불변.
- **ADR 0007 카탈로그 닫힘**: `defineDualComponent` 신규 호출 없음. Proxy 는 이미 등록된 컴포넌트를 **타입만 좁힌 래퍼**로 재export — 카탈로그 이름은 증가하지 않는다.
- **ADR 0008 walker 의미론**: React Context 를 사용하지 않는다. Proxy 는 순수 타입 레이어 + runtime 으로는 원본 컴포넌트를 바로 호출하는 얇은 passthrough. walker 가 보는 `ReactElement.type` 은 원본 `Button` / `Form` / `Table` / `Link` 그대로.
- **ADR 0026 DX 레이어**: `definePage` 기본 시그니처는 하위 호환. 2번째 제네릭 파라미터 / render 의 2번째 인자 모두 생략 가능.
- **런타임 검증**: `packages/core/src/index.ts:321` 의 "used but not declared" throw 는 그대로 유지.

## 결합 — ADR 0027 과의 상호 작용

ADR 0027 이 `definePage` 에 **handler map** `opts.tools: { [name]: handler }` 필드를 추가한다. 본 ADR 의 제네릭 `Tools` 는 `opts.tools` 의 key 유니언도 자연스럽게 좁히는 근거가 된다:

```ts
definePage<Params, const Tools extends readonly EnvelopeTool[]>(opts: {
  envelope: { tools: Tools, ... } | ...;
  render: (p: Params, proxy: TypedProxy<Tools>) => ReactElement;
  tools?: { [K in Tools[number]["name"]]?: ToolHandler<...> }; // ADR 0027
}): ...
```

- 두 ADR 은 **서로 독립적으로 채택 가능** 하되, 함께 적용될 때 `opts.tools` 의 key 는 본 ADR 의 `Tools[number]["name"]` 유니언으로 좁혀진다. 이것은 본 ADR 의 자연스러운 부산물이며 ADR 0027 의 별도 작업을 요구하지 않는다.
- 채택 순서 무관. 런타임 동작 영향 없음 (모두 타입 레벨). 한쪽만 Accepted 된 상태에서도 다른 쪽은 독립적으로 동작.

## Open Decisions

1. **`actions[]` 내부 `TableRowAction.tool` 의 제네릭 전파 범위** — `TableProps<R>` 를 `TableProps<R, ToolName extends string>` 로 확장해 `actions: TableRowAction<R, ToolName>[]` 로 좁힐지, 아니면 proxy `Table` 에서만 좁힐지. 전자는 글로벌 타입 변경이고 후자는 proxy 한정. 본 ADR 은 **후자 (proxy 한정)** 를 기본으로 가정하나 확정 보류.
2. **`Link href="mcp://tool/X"` 의 타입 레벨 파싱** — `` `mcp://tool/${ToolName}${string}` `` template literal 로 강제 가능하나 `href` 의 모든 사용처(외부 URL, 내부 라우트) 에 혼란을 줌. 별도 `<ActionLink tool="X" params={...}>` 신설을 선호하나 이는 ADR 0007 카탈로그 확장이라 본 ADR 범위 밖.
3. **`role` 기반 좁히기** — `tools[].role` 과 현재 viewer role 을 매칭해 "이 사용자가 호출 가능한 tool 만" 유니언으로 좁힐지. 타입 시스템에서 런타임 권한과 혼동될 위험이 커 **명시 보류**.

## 검증 (구현 단계 체크리스트 — 본 ADR 은 설계만)

- [ ] `pnpm --filter @readable-ui/react typecheck` — 새 제네릭이 기존 호출 site 를 깨지 않음.
- [ ] `pnpm --filter example typecheck` — 8 페이지 마이그레이션 후 녹색.
- [ ] 의도적 오탈자 (`action="createUsr"`) 삽입 시 TS2322 재현.
- [ ] `pnpm bench` byte-equal vs ADR 0026 baseline (Markdown 출력 불변).
- [ ] `renderPage` 런타임 검증 그대로 동작 — `as any` 우회 시 "used but not declared" throw 재현.
