# ADR 0009 — Envelope extensions, Table row actions, and serialization refinements

- Status: Accepted
- Date: 2026-04-17

## Context

1차 LLM 친화성 검증(팀 에이전트)에서 다음 결함이 드러났다.

- Alert `> [!NOTE]`가 `\[!NOTE]`로 이스케이프되어 GFM alert 파싱 실패
- Button이 ADR 0001이 약속한 link-as-action fallback을 병기하지 않음
- Input/Select가 envelope의 `enum/format/minLength`를 본문에 반영하지 않음
- Table이 없어 row-level `id`와 action 진입점(`[Delete](mcp://tool/...?id=...)`) 부재 → "Bob 삭제" 같은 기본 시나리오 성립 X
- Envelope에 `paths`, `constraints`, `pagination`, tool-level `role` 등이 없어 AI가 페이지 위치·권한·제약을 추측
- Form 내부 Button이 directive + link fallback 둘 다 내보내 AI에게 "두 번 호출인가?" 혼동 유발

## Decision

### 1. Envelope 확장 필드 (page-envelope spec 갱신)

페이지 레벨 추가:

- `paths: { view: string; markdown?: string; api?: string; canonical?: string }`
- `constraints: Array<{ id: string; text: string; severity: "info" | "warn" | "danger" }>`
- `pagination: { page: number; perPage: number; total: number; nextUrl?: string; prevUrl?: string }`
- `updatedAt: string` (ISO8601)
- `extensions: Record<string, unknown>` — GraphQL 선례(구현자 예약 슬롯)

Tool 레벨 추가:

- `title: string` (MCP `title` 대응)
- `role: string | string[]` (readable-ui 확장; MCP 표준 아님 명시)
- `output: JSON Schema` (MCP `outputSchema` 대응)
- `constraints: Array<Constraint>`

### 2. Envelope 검증 (Zod + runtime)

- `@readable-ui/core`가 Zod로 `EnvelopeZ`를 단일 소스로 정의한다. `Envelope` 타입은 `z.infer`에서 파생.
- `renderPage(node, envelope)`는 `parseEnvelope(envelope)`을 선호출해 스키마 위반 시 `EnvelopeError` throw.
- 본문 `::button{action=X}` / `::form{action=X}` / Table `actions[].tool` 이 envelope `tools[]`에 없으면 **error**.
- ajv standalone 빌드-타임 검증은 후속 ADR 대상 (현재는 런타임 Zod만).

### 3. Alert GFM 직렬화

- Alert.toMarkdown은 `{ type: "blockquote", data: { gfmAlert: kind }, children: walk(children) }` 만 반환.
- `@readable-ui/core`의 `serializeTree`가 `blockquote` 핸들러를 override해 `[!KIND]` 헤더를 raw로 조립하고 `containerFlow` 결과와 붙여 blank-line `>` 문제를 제거한다.
- 결과: `> [!CAUTION]\n> body` 이스케이프 없는 형식.

### 4. Button directive + link-as-action 자동 병기 (ADR 0001 이행)

- Button.toMarkdown은 `ctx.fallback`을 읽어 `[leafDirective, paragraph(link)]` 배열을 반환.
- 링크 URL은 `mcp://tool/<name>` (ADR 0002 scheme).
- 토글: `WalkOptions.fallback: "on" | "off" | "link-only"`, 기본 `"on"`.

### 5. Fallback override 메커니즘

- `SerializeContext.walk(node, override?: { fallback?: FallbackMode }): MdNode[]`
- 컨테이너가 자식 walk 시 fallback 전략을 일시 변경할 수 있다.
- `Form.toMarkdown`은 내부를 `ctx.walk(children, { fallback: "off" })`로 walk해 폼 제출 버튼의 link 중복을 억제한다. Form 밖 standalone Button은 기본 `"on"` 유지.

### 6. Table row actions

- `<Table>` 컴포넌트 신설. `columns`, `rows`, `actions?`, `showIdColumn?` props.
- 셀 내부는 **link-as-action만** 허용 (directive 금지) — component-catalog §Table의 "셀 내부 인라인만 허용" 제약과 정합.
- 각 row는 `id` 필드를 필수로 포함. `showIdColumn` 기본 true로 id 컬럼을 렌더.
- action 링크는 `mcp://tool/<tool>?<params>` 완전 URI로 빌드. `params: (row: R) => Record<string, primitive>` 선언형.
- envelope `tools[]`와 교차 참조 — `actions[].tool`이 미선언 시 error.

### 7. Select 신설 + Input 확장

- Select: `{ name, options: string[], label?, required?, multiple? }`. `enum` JSON Schema를 본문 `options="a,b,c"`로 노출.
- Input: `pattern`, `minLength`, `maxLength`, `min`, `max`, `step`, `format` 추가. envelope의 JSON Schema validators를 directive attribute로 반영.
- 모든 boolean attribute는 `""` 값으로 출력돼 directive에서 value 없이(`required` 단독) 찍힌다.

### 8. 셀 이스케이프 수용

- `mdast-util-to-markdown`이 셀 내 `_`, `@`를 이스케이프(`u\_alice\_01`, `bob\@example.com`)하는 것은 GFM 파서 통과 시 원문 복원되는 무손실 동작. 수용.
- Tool 호출 파라미터는 **셀 텍스트가 아니라 action URI의 query**(`?id=u_bob_01`)에서 추출할 것 — spec에 규범 명시.

### 9. Directive + link 중복 의미

- "directive와 link-as-action paragraph는 **동일 호출의 이중 표현**이다. 두 번 호출 아님."
- Form 안에서는 중복이 무의미하므로 Form이 내부 fallback을 off로 전환 (결정 5).

### 10. Table component wrapper 패턴

- 카탈로그의 `Table`은 `<Table<User>>` 제네릭 추론을 제공하기 위해 `TableImpl`(DualComponent, spec 소유) + 외부 generic wrapper `Table<R>` 구조를 쓴다.
- Wrapper가 `TableImpl.spec`를 상속하므로 엔진 walker가 spec을 정상 발견.

## Consequences

**Positive**
- AI가 envelope만 보면 페이지 위치·제약·권한·pagination까지 파악 가능.
- Table row action으로 "Bob 삭제" 류 시나리오가 첫 토큰에서 닫힘.
- ADR 0001이 약속한 link fallback이 실제 구현됨.
- envelope ↔ 본문 스키마 대칭(`enum` → `options`, `format` → attribute).

**Negative**
- Envelope YAML 장황함 증가. 외부 schema 참조(`include: ./tools.yaml`) 미지원은 후속 숙제.
- Table 제네릭 wrapper가 `DualComponent<P>` 단일 시그니처의 타입 표현력을 초과 — 내부 캐스트 의존.
- Directive + link 이중 출력으로 토큰 사용 증가. Form 내부는 off, 밖은 on이라 상황 혼합.

**Neutral**
- 향후 `readable-ui:pagination` fenced block 등 fenced info string 확장은 Open Decision(ADR 추후).

## 관련

- ADR 0001 Directive primary (이행)
- ADR 0002 Action URI scheme (사용)
- ADR 0005 Page envelope (확장)
- ADR 0007 Component catalog (Select/Table 구현 반영)
- ADR 0008 Engine strategy (walk override 추가)
- Spec: [page-envelope.md](../spec/page-envelope.md), [component-catalog.md](../spec/component-catalog.md) 동반 갱신
