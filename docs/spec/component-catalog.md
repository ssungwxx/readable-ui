# Spec — Component Catalog (v1)

readable-ui v1에서 허용되는 컴포넌트 전체 목록과 각 컴포넌트의 Markdown 직렬화 규약을 정의한다.

> 결정 근거: [ADR 0007](../adr/0007-layout-and-component-catalog.md)

## 카탈로그 밖은 전부 금지

- 본 문서에 없는 이름의 컴포넌트를 `defineDualComponent`로 등록하면 **error**.
- built-in 이름을 override하는 것만 허용 (시각 스타일 교체 용도).

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

### Table

- Markdown: GFM table
- HTML: `<table>`
- Props: `columns: Column[]`, `rows: Row[]`, `align?: "left"|"center"|"right"[]`
- **제약**: rowspan/colspan/중첩 테이블 불가. 200행 초과 시 warning — fenced JSON payload + preview 표로 분리 권장 (후속 spec).
- 셀 내부 인라인만 허용 (Link, CodeSpan, Emphasis, Strong).

### Alert

- Markdown: `> [!NOTE]` / `> [!TIP]` / `> [!IMPORTANT]` / `> [!WARNING]` / `> [!CAUTION]`
- HTML: `<blockquote>` + 아이콘 class
- Props: `kind: note|tip|important|warning|caution`, `children: block nodes`
- Note: GFM alert 5종 고정. `info/success/error`는 의미 매핑(`info→note`, `success→tip`, `error→warning`) 또는 후속 ADR에서 확장.

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
- Fallback(ADR 0001 예정 자동 병기): `[Label](mcp://tool/<toolName>)`

### Input

- Markdown: `::input{name=<field> type=text|email|password|number|url|date|datetime-local required}`
- HTML: `<input>`
- Note: form context 안에서만 유효.

### Select

- Markdown: `::select{name=<field> options="a,b,c" required}`
- HTML: `<select>`

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
3. **예약된 속성**: `action`, `name`, `required`, `label`, `variant`, `status`, `kind`, `cols`, `level`은 built-in 의미로 예약. 다른 용도로 overload 금지.
4. **엔티티 이스케이프**: directive content 안에서 `[`, `]`, `{`, `}`는 백슬래시 이스케이프.

## 미정 / 후속

- **데이터 헤비 Table**의 JSON payload 분리 규약 (200행+ 권장).
- **info/success/error** alert 확장 — GFM 5종 외 추가 여부.
- **Radio/Checkbox 그룹 컨테이너** — 현재 개별 directive. 그룹 필요성 재검토 대상.
- **Media 컴포넌트** (Video, Audio) — v1 미포함.
- **Empty / Loading / Error state** 표현 — 후속 ADR.
