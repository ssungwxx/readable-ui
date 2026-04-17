# Spec — Component Catalog (v1)

readable-ui v1에서 허용되는 컴포넌트 전체 목록과 각 컴포넌트의 Markdown 직렬화 규약을 정의한다.

> 결정 근거: [ADR 0007](../adr/0007-layout-and-component-catalog.md), [ADR 0009](../adr/0009-envelope-extensions-and-serialization-refinements.md), [ADR 0011](../adr/0011-sidebar-and-topbar-page-layouts.md), [ADR 0015](../adr/0015-table-as-container-directive.md)

## 카탈로그 밖은 전부 금지

- 본 문서에 없는 이름의 컴포넌트를 `defineDualComponent`로 등록하면 **error**.
- built-in 이름을 override하는 것만 허용 (시각 스타일 교체 용도).

## Shell

### Page

페이지의 최상위 쉘. `layout`·`nav`는 **props**로 받는다 (카탈로그 확장이 아님 — ADR 0011).

- Markdown: envelope YAML 뒤에 이어지는 body. nav가 있으면 body 맨 앞에 `## Navigation` (scope=section일 때 `## Section navigation`) 섹션 flush.
- **nav 우선순위** (ADR 0014): envelope `nav.items` > Page prop `nav` > (없음). 둘 다 주어지면 envelope 우선 + 불일치 시 warning. 신규 작성 시 envelope에 선언 권장.
- HTML: `layout` 값에 따라 `<main>` 또는 `<aside>+<main>` / `<header>+<main>` 쉘 분기.
- Props:
  - `layout?: "flow" | "sidebar" | "topbar"` — envelope `layout`과 일치해야 함 (불일치 시 warning, 미선언 시 `flow`)
  - `nav?: NavItem[]` — `NavItem = { label: string; href: string; active?: boolean }` (하위호환, envelope `nav.items` 사용 권장)
  - `children: block nodes`
- 직렬화 예 (layout=sidebar, nav 3개):
  ```markdown
  ## Navigation

  - [Users](/users) · current
  - [Roles](/roles)
  - [Audit log](/audit)

  <body blocks>
  ```
- 규약:
  - `active: true` 항목은 링크 뒤 ` · current` suffix. 다수 허용, 1개 권장.
  - heading은 `##` 고정, 텍스트는 `Navigation` 고정 (i18n v2).
  - 좌/위 배치 차이는 시각 전용 — Markdown 출력 동일.
  - `nav`가 비어 있거나 `layout="flow"` 면 prepend 없음 — `flow` 와 완전히 동일한 body 출력.

## Atomic

### Heading

- Markdown: `# Text` ~ `###### Text` (레벨 1~6)
- HTML: `<h1>`~`<h6>`
- Props: `level: 1~6`, `children: string`
- Note: container 내부에서는 parent heading 레벨 + 1로 자동 조정 가능

### Paragraph

- Markdown: 빈 줄로 구분된 텍스트 블록
- HTML: `<p>`
- Props: `children: inline nodes`

### Link

- Markdown: `[label](url)` 또는 `[label](mcp://tool/X?params)`
- HTML: `<a href>`
- Props: `href: string`, `children: string`, (action 전용) `tool: string`, `params: object`
- Note: `mcp://tool/*`는 envelope `tools[]`에 선언된 이름만 허용

### Image

- Markdown: `![alt](url)`
- HTML: `<img>`
- Props: `src: string`, `alt: string` (required)

### CodeSpan

- Markdown: `` `code` ``
- HTML: `<code>`
- Props: `children: string`

### Emphasis / Strong

- Markdown: `*em*` / `**strong**`
- HTML: `<em>` / `<strong>`

### Divider

- Markdown: `---`
- HTML: `<hr>`

## Block

### List

- Props: `ordered?: boolean`, `items: Array<string | ListItem>`
- 3 variants:

**Unordered**
- Markdown: `- item`
- HTML: `<ul><li>`

**Ordered**
- Markdown: `1. item`
- HTML: `<ol><li>`

**Task**
- Markdown: `- [ ] todo` / `- [x] done`
- HTML: `<ul><li><input type=checkbox>`
- Props: each item has `checked: boolean`

### Alert

- Markdown: `> [!NOTE]` / `> [!TIP]` / `> [!IMPORTANT]` / `> [!WARNING]` / `> [!CAUTION]`
- HTML: `<blockquote>` + 아이콘 class
- Props: `kind: note|tip|important|warning|caution`, `children: block nodes`
- 직렬화: `@readable-ui/core`의 `gfmAlertHandler`가 `blockquote` handler override하여 `[!KIND]` 헤더를 raw로 조립 — 이스케이프(`\[`) 없음, blank-line `>` 없음. mdast 노드에 `data.gfmAlert: kind` 마커 필요.
- GFM alert 5종 고정. `info/success/error`는 의미 매핑(`info→note`, `success→tip`, `error→warning`) 또는 후속 ADR에서 확장.

### CodeBlock

- Markdown: ` ```lang\ncode\n``` `
- HTML: `<pre><code class="language-...">`
- Props: `language?: string`, `meta?: string`, `children: string`
- Note: `language`가 `readable-ui:actions`, `readable-ui:data` 등일 때 envelope 확장 용도 (후속 spec).

## Container (자식 블록 flow)

### Section

- Markdown: Heading + 하위 블록. directive 없이 heading으로만 경계 표현.
- HTML: `<section>`
- Props: `title: string`, `level?: 1~6` (자동 추론 가능)
- 직렬화: `### {title}\n\n{children}`

### Card

- Markdown: `:::card{title="..."}` ... `:::`
- HTML: `<section class="card">`
- Props: `title?: string`, `children: block nodes`
- 직렬화 예:
  ```
  :::card{title=Summary}
  ...
  :::
  ```

### Form

- Markdown: `:::form{action=<toolName>}` ... `:::`
- HTML: `<form>`
- Props: `action: string` (envelope `tools[].name` 중 하나), `children: block nodes`
- Note: `action`이 envelope에 선언되지 않으면 **error** (ADR 0005 검증규칙).
- 내부 walk 시 `formAction` 을 context로 주입한다 (ADR 0013). 자식 Button이 동일 action이면 attribute 생략.

### Table (ADR 0015)

admin 목록 UI의 핵심 컴포넌트. Container directive로 pagination/sort/filter 메타를 데이터와 co-locate한다.

- Markdown:

  ```
  :::table{tool=listUsers page=2 of=7 size=20 sort=createdAt:desc filter-status=active filter-role=admin caption="Active users"}
  | id | name  | email    |
  | -- | ----- | -------- |
  | 1  | Alice | a@x.com |
  :::
  ```

- HTML: `<section class="rui-table">` 안에 `<caption>` + `<table>` + pagination UI.
- Props:
  - `columns: TableColumn<R>[]` — `{ key: keyof R, label: string, align? }`
  - `rows: R[]` — `R`은 `{ id: string | number; ... }` 제약
  - `actions?: TableRowAction<R>[]` — row 단위. 셀에서 `[Label](mcp://tool/<tool>?<params>)` link 로 직렬화 (directive 금지).
  - `showIdColumn?: boolean` — 기본 true
  - `caption?: string` — directive `caption="..."` attribute로 직렬화 (ADR 0015 §2, 현행 누락 회복)
  - `tool?: string` — 이 Table을 생성한 목록 tool 이름. envelope `tools[]` 중 하나. 헤더·페이지 링크의 재호출 대상.
  - `page?: number` (1-index, default 1)
  - `of?: number` — total pages. 명시 시 LLM이 `ceil(total/size)` 계산 불요.
  - `size?: number` — 페이지 크기
  - `total?: number` — total rows. `mode="summary"` 사용 시 권장 (footer "View all N rows" link 생성 기반).
  - `sort?: string` — `KEY:DIR` 단일 컬럼. `DIR`은 `asc|desc` (case-insensitive).
  - `filter?: Record<string, string>` — 필드별 equality. `{ status: "active", role: "admin" }` → `filter-status=active filter-role=admin`.
  - `mode?: "summary"` — summary 모드에서 head N행만 직렬화. `rows.length < total`이면 footer에 `[View all N rows](mcp://tool/<tool>?_page=1&_size=<total>)` link 추가.
- 직렬화 규약:
  - `:::table{...}` container directive + 내부 GFM pipe table (`| id | ... |`).
  - id 열·actions 열 규칙은 변경 없음 (ADR 0009 §6).
  - actions 셀은 `[Label](mcp://tool/<tool>?<params>)` link-as-action만.
- 엔진이 생성하는 action URI는 **시스템 예약 prefix `_`** 를 사용:
  - `_page`, `_size`, `_sort`, `_filter_<field>` — tool 자체 param과 충돌 방지.
  - 헤더 컬럼 클릭 = 현재 `filter`/`size` 유지, `_sort=<key>:<dir>` 토글, `_page=1` 리셋.
  - 페이지 이동 = 현재 `sort`/`filter`/`size` 유지, `_page=N`만 변경.
- **제약**: rowspan/colspan/중첩 테이블 불가. 복수 sort, range/OR/NOT-EQ filter, 필드당 2개 이상 filter 값은 **v1 금지** — 필요 시 LLM이 새 tool call로 재표현. 200행 초과 시 warning — `readable-ui:data` fenced payload 분리 경로는 후속 ADR.
- 셀 내부 인라인만 허용 (Link, CodeSpan, Emphasis, Strong).
- `tool` 및 `actions[].tool`은 envelope `tools[]`에 선언된 이름이어야 함 (envelope 검증규칙 3).
- envelope `pagination`과 directive `page/of/size`가 공존하면 directive 우선, 불일치 시 warning (ADR 0015 §4).
- **셀 이스케이프 수용**: `u\_alice\_01`, `bob\@example.com` 등은 GFM round-trip에서 원문 복원 — 정상 동작. tool 호출 인자는 URI query에서 추출.
- Generic 사용: `<Table<User> columns={...} rows={users} tool="listUsers" page={2} of={7} .../>`.

### Steps

- Markdown: task list로 fallback 가능하나 기본은 container directive
- 직렬화:
  ```
  :::steps
  ::step[Create account]{status=done}
  ::step[Verify email]{status=current}
  ::step[Finish setup]{status=pending}
  :::
  ```
- Props each step: `label: string`, `status: done|current|pending`

### Tabs

- Markdown: 전부 flush (ADR 0007 §4).
- 직렬화:
  ```
  :::tabs
  ::tab[Info]
  ...
  ::tab[Security]
  ...
  :::
  ```
- UI: 현재 활성 탭만 표시, 나머지 숨김.
- AI: directive를 무시해도 본문 heading으로 전부 접근 가능 (fallback 병기).

### Accordion

- Markdown: 전부 "열린 상태"로 직렬화.
- 직렬화:
  ```
  :::accordion
  ::panel[Billing]
  ...
  ::panel[Notifications]
  ...
  :::
  ```

### Split

- Markdown: 왼쪽 셀 → 오른쪽 셀 세로 나열. 배치 정보는 버림.
- 직렬화:
  ```
  :::split{cols=2}
  ::::cell
  left content
  ::::
  ::::cell
  right content
  ::::
  :::
  ```
- Note: v1에서 `cols=2`만 허용. 3열 이상은 error.

## Interactive (directive primitives)

모든 interactive 컴포넌트는 envelope `tools`에 선언된 action과 연결된다. 독립 실행은 허용하지 않는다 (반드시 `Form` 내부 또는 `Button`의 `action=`으로 연결).

### Button

- Markdown: `::button[Label]{action=<toolName> variant=primary|secondary|danger}`
- HTML: `<button>`
- **Link-as-action fallback 자동 병기** (ADR 0001 이행 / ADR 0009): directive 뒤에 `[Label](mcp://tool/<toolName> "fallback")` paragraph가 함께 출력된다. CommonMark link title `"fallback"` 은 "이 link 는 앞 directive 의 fallback 이다" 는 인스턴스 레벨 신호 (ADR 0012).
- Fallback 토글: `renderMarkdown(node, { fallback: "on" | "off" | "link-only" })`. 기본 `"on"`.
- **Form 내부에서는 fallback 자동 off** — Form이 `ctx.walk(children, { fallback: "off", formAction })`로 내부 walk. 중복 방지.
- **Form 내부 action 생략** (ADR 0013): `ctx.formAction === props.action` 이면 `action` 속성을 생략해 `::button[Label]` 로만 출력. 다른 action은 명시 유지 (Cancel/Save draft 패턴 수용).
- **중복 의미 규범**: directive와 fallback link paragraph는 **동일 호출의 이중 표현**이다. AI는 한 번의 호출로 해석해야 한다.

### Input

- Markdown: `::input{name=<field> type=<html5> label="..." required pattern="..." minlength="n" maxlength="n" min="n" max="n" step="n" format="..."}`
- HTML: `<input>` — HTML5 validation 속성과 1:1 매핑
- Props: `{ name, type?, label?, required?, placeholder?, pattern?, minLength?, maxLength?, min?, max?, step?, format? }`
- `type` 허용: `text | email | password | number | url | date | datetime-local | tel | search`
- JSON Schema 매핑:
  - `format: email` → `type="email"` 또는 attribute `format`
  - `pattern` → `pattern`
  - `minLength` / `maxLength` → `minlength` / `maxlength` (HTML5 lowercase)
  - `minimum` / `maximum` → `min` / `max`
- Boolean attribute (`required`)는 value 없이(`::input{... required}`) 출력 — `attributes.required = ""`.
- Form context 안에서만 유효.

### Select

- Markdown: `::select{name=<field> options="a,b,c" label="..." required multiple}`
- HTML: `<select>`
- Props: `{ name, options: string[], label?, required?, multiple? }`
- JSON Schema `enum: [...]`을 본문에 `options="..."`로 노출 — envelope ↔ 본문 스키마 대칭 보장.
- `options` 값에 쉼표 포함 시 향후 JSON 배열 문자열로 표기 권고 (현재 비지원).

### Textarea

- Markdown: `::textarea{name=<field> rows=4 required}`
- HTML: `<textarea>`

### Checkbox

- Markdown: `::checkbox{name=<field> label="I agree"}`
- HTML: `<input type=checkbox>`

### Radio

- Markdown: `::radio{name=<field> value=<value> label=<label>}`
- HTML: `<input type=radio>`

## 공통 규약

1. **모든 directive 이름은 소문자 kebab-case**. multi-word는 `split`, `accordion`처럼 단일 단어 우선, 부득이한 경우 하이픈 (예: `::radio-group`은 v1에 없음).
2. **속성 값 따옴표**: 공백/특수문자 포함 시 큰따옴표 필수. `{title="User management"}`.
3. **예약된 속성**: `action`, `name`, `required`, `label`, `variant`, `status`, `kind`, `cols`, `level`, `options`, `pattern`, `minlength`, `maxlength`, `min`, `max`, `step`, `format`, `multiple`, `tool`, `page`, `of`, `size`, `total`, `sort`, `mode`, `caption`, `filter-*` (prefix)는 built-in 의미로 예약. 다른 용도로 overload 금지. Action URI query string에서는 시스템 파라미터를 `_` prefix로 네임스페이스한다: `_page`, `_size`, `_sort`, `_filter_<field>` (ADR 0015 §3).
4. **엔티티 이스케이프**: directive content 안에서 `[`, `]`, `{`, `}`는 백슬래시 이스케이프.
5. **Boolean attribute**: `required`, `multiple` 등은 값 없이 단독 출력. mdast attributes JSON에서는 `""` 값으로 표현 (`mdast-util-directive`의 `collapseEmptyAttributes`).
6. **셀 이스케이프 수용**: Table 셀 내부의 `\_`, `\@` 등은 round-trip clean 동작. 버그 아님.

## 미정 / 후속

- **데이터 헤비 Table**의 JSON payload 분리 규약 (200행+ 권장).
- **info/success/error** alert 확장 — GFM 5종 외 추가 여부.
- **Radio/Checkbox 그룹 컨테이너** — 현재 개별 directive. 그룹 필요성 재검토 대상.
- **Media 컴포넌트** (Video, Audio) — v1 미포함.
- **Empty / Loading / Error state** 표현 — 후속 ADR.
