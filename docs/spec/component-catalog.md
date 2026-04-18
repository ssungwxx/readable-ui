# Spec — Component Catalog (v1)

readable-ui v1에서 허용되는 컴포넌트 전체 목록과 각 컴포넌트의 Markdown 직렬화 규약을 정의한다.

> 결정 근거: [ADR 0007](../adr/0007-layout-and-component-catalog.md), [ADR 0009](../adr/0009-envelope-extensions-and-serialization-refinements.md), [ADR 0011](../adr/0011-sidebar-and-topbar-page-layouts.md), [ADR 0015](../adr/0015-table-as-container-directive.md), [ADR 0021](../adr/0021-detail-page-layout.md), [ADR 0022](../adr/0022-table-payload-fenced.md), [ADR 0024](../adr/0024-admin-metric-and-hierarchy-components.md), [ADR 0025](../adr/0025-tier3-container-components-activation.md)

## 카탈로그 밖은 전부 금지

- 본 문서에 없는 이름의 컴포넌트를 `defineDualComponent`로 등록하면 **error**.
- built-in 이름을 override하는 것만 허용 (시각 스타일 교체 용도).

## Shell

### Page

페이지의 최상위 쉘. `layout`·`nav`·detail 전용 prop(`back`/`meta`/`footer`)은 **props**로 받는다 (카탈로그 확장이 아님 — ADR 0011, ADR 0021).

> DX 권장: ADR 0026 이후 `definePage({ envelope, render })` 를 통해 root `<Page>` 에 `layout` / `nav` / `breadcrumb` 가 envelope 에서 자동 주입되므로, render 내부에서 해당 prop 을 반복 명시할 필요가 없다. `back` / `meta` / `footer` 는 계속 prop 으로 전달한다. `definePage` 는 새 컴포넌트가 아니며 카탈로그에 영향을 주지 않는다.

- Markdown: envelope YAML 뒤에 이어지는 body. nav가 있으면 body 맨 앞에 `## Navigation` (scope=section일 때 `## Section navigation`) 섹션 flush.
- **nav 우선순위** (ADR 0014): envelope `nav.items` > Page prop `nav` > (없음). 둘 다 주어지면 envelope 우선 + 불일치 시 warning. 신규 작성 시 envelope에 선언 권장.
- HTML: `layout` 값에 따라 `<main>` 또는 `<aside>+<main>` / `<header>+<main>` / detail 3영역 (header + body grid + footer) 쉘 분기.
- Props:
  - `layout?: "flow" | "sidebar" | "topbar" | "detail"` — envelope `layout`과 일치해야 함 (불일치 시 warning, 미선언 시 `flow`)
  - `nav?: NavItem[]` — `NavItem = { label: string; href: string; active?: boolean }` (하위호환, envelope `nav.items` 사용 권장)
  - `back?: { label: string; href: string }` — detail layout 전용. main 위에 `← Back to <label>` 링크 1개 (ADR 0021 §2). `breadcrumb` (2+ items) 존재 시 자동 무음 생략 (ADR 0024 §4).
  - `breadcrumb?: Array<{ label: string; href?: string }>` — 계층 경로 (ADR 0024 §4). 2개 이상 항목이어야 출력. envelope `breadcrumb` 존재 시 envelope 우선. 마지막 항목 `href` 생략 = 현재 위치.
  - `meta?: ReactNode` — detail layout 전용. 우측 rail (HTML); Markdown 은 main 뒤로 flush (ADR 0021 §3)
  - `footer?: ReactNode` — detail layout 전용. 하단 액션 영역 (HTML); Markdown 은 meta 뒤로 flush
  - `children: block nodes` — main column 본문
- 직렬화 예 (layout=sidebar, nav 3개):
  ```markdown
  ## Navigation

  - [Users](/users) · current
  - [Roles](/roles)
  - [Audit log](/audit)

  <body blocks>
  ```
- 직렬화 예 (layout=detail, back + meta + footer):
  ```markdown
  ## Navigation

  - [Users](/users) · current

  [← Back to Users](/users)

  # Alice Example

  :::card{title=Profile}
  - **Email**: alice@example.com
  - **Role**: admin
  :::

  :::card{title=Details}
  - **Created**: 2026-04-12
  - **Status**: `active`
  :::

  :::form{action=deleteUserPreview}
  ::input{type=hidden name=id default=u_alice_01}

  ::button[Delete…]{variant=danger}
  :::
  ```
- 규약:
  - `active: true` 항목은 링크 뒤 ` · current` suffix. 다수 허용, 1개 권장.
  - heading은 `##` 고정, 텍스트는 `Navigation` 고정 (i18n v2).
  - 좌/위/detail rail 배치 차이는 시각 전용 — Markdown 출력 동일.
  - `nav`가 비어 있거나 `layout="flow"` 면 prepend 없음 — `flow` 와 완전히 동일한 body 출력.
  - detail layout 의 직렬화 순서 고정: `nav → breadcrumb → back → main(children) → meta → footer` (ADR 0021 §3 + ADR 0024 §4). main 뒤 meta 순은 "주 내용 우선" 원칙 — 상세 페이지 진입 직후 첫 토큰에 주 내용이 들어가도록.
  - back link 텍스트는 `← Back to <label>` (U+2190 + space + "Back to " + label) 영어 single-source 고정. i18n v2.
  - breadcrumb 는 nav 뒤 · back 앞 paragraph 1줄 (ADR 0024 §4). 항목 구분자는 ` › ` (space + U+203A + space). 각 항목은 `href` 있으면 `[label](href)` link, 없으면 plain text. 2+ items 일 때만 출력 — 1개 또는 미선언이면 무음 skip. breadcrumb 가 2+ items 를 포함하면 같은 페이지의 `back` 은 자동 무음 생략.
  - `back`/`meta`/`footer` 를 `layout!=="detail"` 에서 전달해도 무음 무시 (warning 아님). v2 lint 검토. `breadcrumb` 는 모든 layout 에서 유효.

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
- Note: JSX prop `src` → mdast 필드 `url` (ADR 0017 JSX↔attribute 명명 패턴; `Link.href → url`과 동형).

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

**빈 상태·위험 동작 관용구 (ADR 0019)**:
- `kind=warning`: 리소스 전체 부재(404). Card를 내보내지 않고 Alert 단독.
- `kind=note`: Table `rows: []` 빈 목록. Table 형제 레벨에 배치.
- `kind=caution`: destructive 2단계 전이의 영향 예고. 본문에 List 허용.

### CodeBlock

- Markdown: ` ```lang\ncode\n``` `
- HTML: `<pre><code class="language-...">`
- Props: `language?: string`, `meta?: string`, `children: string`
- Note: `language` 가 `readable-ui:<subtype>` prefix 를 가지면 readable-ui 가 자기 의미를 부여하는 fenced payload 다. 본 카탈로그 §Fenced info string convention 참조.

#### Fenced info string convention (ADR 0022)

readable-ui 가 fenced code block 의 info string 으로 자기 의미를 표시할 때는 다음 단일 토큰 형식을 정본으로 한다:

```
readable-ui:<subtype>
```

CommonMark 0.30 §4.5 의 info string 정의를 그대로 따르며, 콜론(`:`) 은 단일 토큰 내부에서 허용된다. mdast `code.lang` 필드에 `"readable-ui:<subtype>"` 가 그대로 담긴다.

**정본 키 (v1)**:

| info string | 정의 ADR | 등장 위치 | payload 형식 |
|---|---|---|---|
| `readable-ui:data` | ADR 0022 | `:::table{... mode=payload}` 내부 자식 | JSONL — 줄당 한 JSON 객체 |

`readable-ui:actions`, `readable-ui:filters`, `readable-ui:schema` 등 다른 subtype 은 v1 에 정의되지 않는다 — 후속 ADR 개별 결정. 본 prefix 자체는 ecosystem-grabbing 회피 + 짧은 namespace 의 trade-off 로 채택 (ADR 0022 §1 대안 평가).

### Stat (ADR 0024 §1)

수치 지표 카드 (KPI / Statistic). Admin dashboard 전용.

- Markdown: `::stat[<value>]{label="..." delta="+12.4%" trend=up unit="MRR"}`
- HTML: `<section class="rui-stat">` — label · 큰 숫자 · (trend badge + delta) 3단 배치.
- Props: `{ label: string, value: string, delta?: string, trend?: "up"|"down"|"flat", unit?: string }`
- 저자 책임: `value` / `delta` 는 포맷 완료된 문자열 (`"$48.2K"`, `"+12.4%"`). 엔진은 해석하지 않음.
- Fallback 병기 (ADR 0012 이중 표현 규약): directive 뒤에 `**value** · delta (label-or-unit)` paragraph. Form 내부 사용은 의미 외 — `renderMarkdown({ fallback: "off" })` 로 억제 가능.

### Progress (ADR 0024 §2)

진행률 / 사용량 바.

- Markdown: `::progress{value=720 max=1000 label=Storage variant=warning}`
- HTML: `<div role="progressbar" aria-valuenow aria-valuemin aria-valuemax>` + 색 bar.
- Props: `{ value: number, max?: number (default 100), label?: string, variant?: "primary"|"success"|"warning"|"danger" }`
- `variant` 팔레트: `primary` 파랑 / `success` 녹 (Alert tip 계열) / `warning` 주황 (Alert warning 계열) / `danger` 빨강 (Alert caution 계열). default `primary`.
- Fallback 병기: `<value> / <max> (<pct>%) — <label>` paragraph. `label` 미선언 시 ` — …` 접미 생략.

## Container (자식 블록 flow)

### Section (v1 편입: ADR 0025)

- Markdown: Heading + 하위 블록. directive 없이 heading으로만 경계 표현.
- HTML: `<section>`
- Props:
  ```ts
  interface SectionProps {
    title: string;
    level: 1 | 2 | 3 | 4 | 5 | 6;  // 필수. 자동 추론은 v2 defer (ADR 0025 §1).
    children: ReactNode;
  }
  ```
- 직렬화: `### {title}\n\n{children}` (level에 따라 `#` 개수 변동)
- Fallback 규약: Section 자체는 heading + block 이므로 별도 fallback 병기 없음. 모든 Markdown 뷰어 호환.
- 엣지 케이스:
  - `level` 을 지정하지 않으면 TypeScript 컴파일 오류 — v1 에서는 필수 prop.
  - 중첩 Section 은 저자가 레벨을 명시적으로 올려야 함 (`level={3}` 내부 `level={4}`).
  - Tabs / Accordion 내부에 Section 을 넣으면 Markdown 의 heading 레벨이 외부 문서 outline 과 어긋날 수 있다 — 저자 책임.

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
  - `mode?: "summary" | "payload"` — 단일 enum (상호 배타).
    - `"summary"` 는 head N행만 직렬화하고 `rows.length < total`이면 footer에 `[View all N rows](mcp://tool/<tool>?_page=1&_size=<total>)` link 추가.
    - `"payload"` 는 head `payloadHead` 행만 visible GFM table 로 직렬화하고, **전체 rows (또는 명시 prop `payload`) 를 directive 내부 자식 fenced ` ```readable-ui:data ` JSONL 블록으로 함께 출력** (ADR 0022).
  - `payload?: R[]` — `mode="payload"` 일 때 fenced JSONL 의 source. 미지정 시 `rows` 자체가 source. `rows` 는 시각 head 용, `payload` 는 전체 데이터 용으로 분리하고 싶을 때만 사용.
  - `payloadHead?: number` — `mode="payload"` 에서 visible head row 개수. 기본 5. `0` 허용 (visible 표 없이 payload only — LLM 전용 축약).
- 직렬화 규약:
  - `:::table{...}` container directive + 내부 GFM pipe table (`| id | ... |`).
  - id 열·actions 열 규칙은 변경 없음 (ADR 0009 §6).
  - actions 셀은 `[Label](mcp://tool/<tool>?<params>)` link-as-action만.
  - `mode="payload"` 일 때 directive 자식 순서: visible pipe table → fenced `readable-ui:data` JSONL → (선택) footer link. payload JSONL 의 각 라인은 JSON object 한 개, `id` 필드 필수, key 집합은 `columns[].key ∪ {"id"}` 와 정확히 일치 (extra key 도 missing key 도 throw — ADR 0022 §2).
- 엔진이 생성하는 action URI는 **시스템 예약 prefix `_`** 를 사용:
  - `_page`, `_size`, `_sort`, `_filter_<field>` — tool 자체 param과 충돌 방지.
  - 헤더 컬럼 클릭 = 현재 `filter`/`size` 유지, `_sort=<key>:<dir>` 토글, `_page=1` 리셋.
  - 페이지 이동 = 현재 `sort`/`filter`/`size` 유지, `_page=N`만 변경.
- **제약**: rowspan/colspan/중첩 테이블 불가. 복수 sort, range/OR/NOT-EQ filter, 필드당 2개 이상 filter 값은 **v1 금지** — 필요 시 LLM이 새 tool call로 재표현. 200행 초과 케이스는 `mode="payload"` + fenced `readable-ui:data` JSONL 로 분리 (ADR 0022). 2열 transpose를 단건 상세 용도로 사용 금지 (ADR 0018).
- **셀 인라인 주입 규약 (ADR 0029)**: 셀 값은 primitive 로 강제 (`String(row[col.key])`). 인라인 노드는 아래 **engine-driven 경로** 로만 주입된다:
  1. `columns[0]` (또는 `showIdColumn=true` 의 id 열) — 자동 CodeSpan wrap.
  2. `actions[]` 가 생성하는 row-action Link (`mcp://tool/...`).
  3. ADR 0020 §3 schema-driven enum 매칭 — tool input/output schema 의 enum 과 셀 값이 정확히 일치하면 CodeSpan 으로 wrap.
- 저자 JSX 로 `<Link>` / `<CodeSpan>` / `<Emphasis>` / `<Strong>` 을 셀에 배치하는 것은 v1 에 지원되지 않으며 `[object Object]` 로 출력된다. 이러한 수요는 Table 형제 레벨에 별도 `<List>` 블록을 배치하는 관용구를 사용한다 (apps/example 의 home 페이지 `page-content.tsx` 참조).

**`rows: []` 처리 (ADR 0019 §2 + ADR 0020 §4)**: 엔진은 directive 내부에 placeholder 행을 삽입하지 않는다. `total=0` attribute 명시 권장, 저자가 Table 형제 레벨에 `Alert{kind=note}`를 배치한다. 형제 Alert 부재 시 엔진이 기본 Alert(kind=note, "No results") 을 자동 삽입(directive 외부 형제 노드). `<Table empty="silent">` prop 으로 fallback 옵트아웃.

**행 상태 표기 (ADR 0019 §3 + ADR 0020 §3)**: Table 셀 내부 상태 값은 `CodeSpan`으로 표기한다. 5단계 권고 팔레트(비강제): `active`, `pending`, `archived`, `disabled`, `error`. 도메인 특수 상태도 CodeSpan이면 허용. 엔진은 envelope `tools[]` 의 `input.properties._filter_<col>.enum`·`output` schema enum·또는 `tools[].name` 집합과 셀 값이 정확히 일치하면 자동으로 `inlineCode` 로 wrap 한다 (schema-driven). 신호 부재 시 plain String 유지(후방 호환). v1 시각 강제 없음 — Table React render 는 `String()` plain text, v2 에서 render override 예약.
- `tool` 및 `actions[].tool`은 envelope `tools[]`에 선언된 이름이어야 함 (envelope 검증규칙 3).
- envelope `pagination`과 directive `page/of/size`가 공존하면 directive 우선, 불일치 시 warning (ADR 0015 §4).
- **셀 이스케이프 수용**: `u\_alice\_01`, `bob\@example.com` 등은 GFM round-trip에서 원문 복원 — 정상 동작. tool 호출 인자는 URI query에서 추출.
- Generic 사용: `<Table<User> columns={...} rows={users} tool="listUsers" page={2} of={7} .../>`.

### Steps (v1 편입: ADR 0025)

- Markdown: container directive + 내부 leaf directive 시퀀스.
- HTML: `<div>` + `<div>` 스텝 행들 (done/current/pending 팔레트 각색).
- 직렬화:
  ```
  :::steps
  ::step[Create account]{status=done}
  ::step[Verify email]{status=current}
  ::step[Finish setup]{status=pending}
  :::
  ```
- Props:
  ```ts
  interface StepProps {
    label: string;   // ::step[label] body
    status: "done" | "current" | "pending";
  }
  interface StepsProps {
    children: ReactNode;  // Step 컴포넌트들
  }
  ```
- `status` 팔레트 (Alert 계열 정합):
  - `done` → `tip` 팔레트 (녹색)
  - `current` → `note` 팔레트 (파랑)
  - `pending` → 회색 (neutral)
- 예약어 재사용: `status` (이미 예약됨). 신규 예약 없음.
- Fallback 규약: `:::steps` 는 directive-미지원 뷰어에서 fallback 병기가 없음 — directive 블록이 무시될 경우 내용 소실. v1 에서 acceptable (readable-ui 파서 우선).
- 엣지 케이스:
  - `Steps` 내부에 `Step` 외 컴포넌트가 들어가면 Markdown 에 그대로 emit 됨.
  - `status` 값이 `done|current|pending` 외이면 TypeScript 컴파일 오류.

### Tabs (v1 편입: ADR 0025)

- Markdown: 전부 flush (ADR 0007 §4). 정보 손실 없음.
- HTML: 탭 바 + 활성 탭 패널만 표시 (나머지 `hidden`). `useState` 클라이언트 상태. SSR 초기: 첫 번째 탭 활성.
- 직렬화:
  ```
  :::tabs
  ::tab[Info]

  tab content…

  ::tab[Security]

  tab content…

  :::
  ```
- Props:
  ```ts
  interface TabProps {
    label: string;    // ::tab[label] body
    children: ReactNode;
  }
  interface TabsProps {
    children: ReactNode;  // Tab 컴포넌트들
  }
  ```
- ADR 0007 §4 flush 규약: `::tab[label]` marker leaf directive + children 을 순서대로 emit. 활성 탭 정보는 Markdown 에 없음 — 이는 의도적 설계 (AI 가 전체 탭 내용에 접근해야 한다).
- 예약어: `label` (이미 예약됨). 신규 예약 없음.
- Fallback 규약: 별도 fallback paragraph 없음. `:::tabs` 미파서 뷰어에서 내용이 sequential text 로 흘러나옴 — 이것이 ADR 0007 "전부 flush" 의 의도.
- RSC 주의: `useState` 사용. Next.js App Router RSC 에서 사용 시 `"use client"` 경계 필요.
- 엣지 케이스:
  - `active` prop 은 v1 에서 지원하지 않음 — 초기 활성 탭 선택은 항상 첫 번째 (index 0). v2 `defaultActive` 검토.
  - `Tabs` 내부에 `Tab` 외 컴포넌트가 있으면 탭 바에 표시되지 않지만 Markdown 에는 emit 됨.

### Accordion (v1 편입: ADR 0025)

- Markdown: 전부 "열린 상태"로 직렬화. 정보 손실 없음.
- HTML: 접기/펼치기 패널 목록. `useState` 클라이언트 상태. SSR 초기: 첫 번째 패널 열림.
- 직렬화:
  ```
  :::accordion
  ::panel[Billing]

  billing content…

  ::panel[Notifications]

  notifications content…

  :::
  ```
- Props:
  ```ts
  interface PanelProps {
    label: string;    // ::panel[label] body
    children: ReactNode;
  }
  interface AccordionProps {
    children: ReactNode;  // Panel 컴포넌트들
  }
  ```
- ADR 0007 §4 flush 규약: `::panel[label]` marker leaf directive + children 순서대로 emit. 모든 패널 "열린 상태" 직렬화 — closed 패널도 Markdown 에는 모두 표시.
- `default open` 상태: 첫 번째 패널만 기본 열림. 나머지는 접힘. v1 에서 저자가 바꾸려면 컴포넌트 직접 수정 필요.
- 예약어: `label` (이미 예약됨). 신규 예약 없음.
- RSC 주의: `useState` 사용. Next.js App Router RSC 에서 사용 시 `"use client"` 경계 필요.
- 엣지 케이스:
  - `Accordion` 내부에 `Panel` 외 컴포넌트가 있으면 패널 목록에서 제외되지만 Markdown 에는 emit 됨.

### Split (v1 편입: ADR 0025)

- Markdown: 왼쪽 셀 → 오른쪽 셀 세로 나열. 배치(좌/우) 정보는 버림 (ADR 0007 §5).
- HTML: CSS grid 2열 배치 (`grid-cols-2`). 순수 시각 효과.
- 직렬화:
  ```
  ::::split{cols=2}
  :::cell
  left content
  :::
  :::cell
  right content
  :::
  ::::
  ```
- Props:
  ```ts
  interface CellProps {
    children: ReactNode;
  }
  interface SplitProps {
    cols?: 2;          // v1에서 2만 허용. default 2.
    children: ReactNode;  // Cell 컴포넌트들
  }
  ```
- **외부 container 의 콜론 수는 내부보다 엄격히 많아야 한다 (CommonMark directive 중첩 규칙). 엔진이 자동 보장한다.** 위 샘플은 최소 depth 기준(`::::split` 4개 → `:::cell` 3개). Cell 안에 Card·Steps 등이 중첩되면 엔진이 전체 depth 를 자동 상승시킨다.
- engine 확장 없음: `ctx.walk(children)` 이 `Cell.toMarkdown` 을 호출하고, `Split.toMarkdown` 이 이 결과를 `containerDirective.children` 에 포함. `mdast-util-directive` 가 fence depth 를 실측 기반으로 자동 계산한다.
- `cols=2` 만 v1 허용. `cols=3` 이상은 TypeScript 타입 제약으로 방지.
- Fallback 규약: directive 미지원 뷰어(예: GitHub)에서 `::::split{cols=2}` 마커가 리터럴 텍스트로 드러날 수 있다. 셀 내용은 순서대로 세로 나열 — 배치 정보 손실은 의도적 (ADR 0007 §5). 단순 나열이 필요한 환경에서는 Card 2개 나열을 대안으로 사용.
- 엣지 케이스:
  - `Split` 내부에 `Cell` 외 컴포넌트가 있으면 Markdown 에 그대로 emit 됨.
  - 셀이 1개뿐이면 HTML 에서도 1열로 표시됨.

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

**위험 동작 관용구 (ADR 0019 §1)**: destructive tool(`deleteX`, `archiveX`)은 2단계 페이지 전이 관용구로 호출한다.
- 1단계 진입: `::button[<Verb>…]{variant=danger action=<verb><Resource>Preview}`. 라벨에 `…` suffix, `variant=danger` 필수.
- 2단계: preview tool이 반환한 페이지 — 상세 Card + `Alert{kind=caution}` + Form(`Confirm <verb>` Button + `Cancel` Button).

### Input

- Markdown: `::input{name=<field> type=<html5> label="..." required pattern="..." minlength="n" maxlength="n" min="n" max="n" step="n" format="..." default="..."}`
- HTML: `<input>` — HTML5 validation 속성과 1:1 매핑
- Props: `{ name, type?, label?, required?, placeholder?, pattern?, minLength?, maxLength?, min?, max?, step?, format?, defaultValue? }`
- `type` 허용: `text | email | password | number | url | date | datetime-local | tel | search | hidden`
- `type=hidden` (ADR 0020 §1): 사용자 입력이 아니라 form 제출에 동봉할 사전 설정 값을 전달한다. `name` 과 `default` 만 의미 있음 (`label`/`placeholder`/`required`/`pattern`/`minlength`/`maxlength`/`min`/`max`/`step`/`format` 무시). HTML render 는 label wrapper 없이 `<input type="hidden" name="..." value="...">`. 직렬화: `::input{type=hidden name=id default=u_bob_01}`. Form context 외부 사용은 warning (v2 error 승격 검토).
- JSON Schema 매핑:
  - `format: email` → `type="email"` 또는 attribute `format`
  - `pattern` → `pattern`
  - `minLength` / `maxLength` → `minlength` / `maxlength` (HTML5 lowercase)
  - `minimum` / `maximum` → `min` / `max`
  - `properties.<field>.default` → directive `default` attribute (SSOT: directive)
- Boolean attribute (`required`)는 value 없이(`::input{... required}`) 출력 — `attributes.required = ""`.
- Form context 안에서만 유효.

### Select

- Markdown (single): `::select{name=<field> options="a,b,c" label="..." required default=admin}`
- Markdown (multiple): `::select{name=<field> options="a,b,c" label="..." multiple default="a,b,c"}`
- HTML: `<select>`
- Props: `{ name, options: string[], label?, required?, multiple?, defaultValue? }`
- JSON Schema `enum: [...]`을 본문에 `options="..."`로 노출 — envelope ↔ 본문 스키마 대칭 보장.
- `options` 값에 쉼표 포함 시 향후 JSON 배열 문자열로 표기 권고 (현재 비지원).
- `default` (single): 문자열 하나. `default` (multiple): 쉼표 구분 문자열 — `options` 분리 규약과 동일. 값에 쉼표 포함은 v1 비지원.
- `default`(multiple)는 `options`와 동일한 쉼표 구분 문자열을 쓴다. 값에 쉼표 포함은 v1 비지원 (ADR 0017 §3.1).

### Textarea

- Markdown: `::textarea{name=<field> label="..." placeholder="..." rows=4 minlength=10 maxlength=2000 required default="..."}`
- HTML: `<textarea>`
- Props: `{ name, label?, required?, placeholder?, rows?, minLength?, maxLength?, defaultValue? }`
- `rows` 기본값 4 (render only — toMarkdown에는 명시된 경우만 반영).
- JSON Schema 매핑: `format: "textarea"` 가 primary signal; `maxLength >= 200` 은 heuristic fallback.
- Form context 내 전용, fallback 병기 대상 아님.
- `default` 값에 큰따옴표 포함 시 `mdast-util-directive`가 quoting을 처리한다.
- Textarea `default`는 multi-line 문자열을 수용한다. `mdast-util-directive`의 attribute quoting으로 `\n`은 escape되어 보존되고, 값 내 `"`는 `\"`로 escape된다 (ADR 0017 §3.3).

### Checkbox

- Markdown: `::checkbox{name=<field> label="I agree" checked required}`
- HTML: `<input type=checkbox>`
- Props: `{ name, label?, required?, checked? }`
- `value` 속성 없음 — HTML checkbox의 `value`는 form submit 용도이며 v1 scope 외.
- `checked` 는 boolean attribute (`checked=""`) 규약 준수.
- JSON Schema `type: "boolean"` 매핑.
- `required + checked=false` 조합은 "동의 강제" 관용구 (사용자가 직접 체크해야 통과).
- `checked`는 다른 위젯의 `default`와 동일한 초기값 슬롯이며, boolean 성격으로 `checked` 이름을 유지한다.

### Radio

- Markdown: `::radio{name=<field> value=<value> label=<label> checked required}`
- HTML: `<input type=radio>`
- Props: `{ name, value, label?, required?, checked? }` — `value` 필수.
- 같은 `name` 을 공유하는 Radio directive들이 그룹을 형성.
- JSON Schema `enum` (3~5개) → Radio 그룹, 그 이상 → Select 권장.
- `required` 는 그룹 중 하나에만 붙여도 HTML 표준상 그룹 전체 적용. 첫 번째 Radio에 붙이는 것을 권장.
- `checked`는 다른 위젯의 `default`와 동일한 초기값 슬롯이며, boolean 성격으로 `checked` 이름을 유지한다.

## 공통 규약

1. **모든 directive 이름은 소문자 kebab-case**. multi-word는 `split`, `accordion`처럼 단일 단어 우선, 부득이한 경우 하이픈 (예: `::radio-group`은 v1에 없음).
2. **속성 값 따옴표**: 공백/특수문자 포함 시 큰따옴표 필수. `{title="User management"}`.
3. **예약된 속성**: `action`, `name`, `required`, `label`, `variant`, `status`, `kind`, `cols`, `level`, `options`, `pattern`, `minlength`, `maxlength`, `rows`, `min`, `max`, `step`, `format`, `placeholder`, `multiple`, `tool`, `page`, `of`, `size`, `total`, `sort`, `mode`, `caption`, `value`, `checked`, `default`, `empty`, `payload`, `payloadhead`, `trend`, `delta`, `unit`, `filter-*` (prefix)는 built-in 의미로 예약. 다른 용도로 overload 금지. `type` attribute 의 enum 값은 컴포넌트별 고정 (Input: `text|email|password|number|url|date|datetime-local|tel|search|hidden` — ADR 0020 §1). `variant` enum 은 컴포넌트별 고정 (Button: `primary|secondary|danger` — ADR 0007; Progress: `primary|success|warning|danger` — ADR 0024 §2). Action URI query string에서는 시스템 파라미터를 `_` prefix로 네임스페이스한다: `_page`, `_size`, `_sort`, `_filter_<field>` (ADR 0015 §3).
   JSX prop ↔ Markdown attribute 명명은 [ADR 0017](../adr/0017-jsx-markdown-attribute-naming.md) 참조.
4. **엔티티 이스케이프**: directive content 안에서 `[`, `]`, `{`, `}`는 백슬래시 이스케이프.
5. **Boolean attribute**: `required`, `multiple` 등은 값 없이 단독 출력. mdast attributes JSON에서는 `""` 값으로 표현 (`mdast-util-directive`의 `collapseEmptyAttributes`).
6. **셀 이스케이프 수용**: Table 셀 내부의 `\_`, `\@` 등은 round-trip clean 동작. 버그 아님.
7. **입력 위젯 fallback 정책**: Input/Select/Textarea/Checkbox/Radio는 action을 trigger하지 않으므로 fallback link-as-action 병기 대상이 아니다. directive만 출력한다.

8. **단건 상세 관용구 (ADR 0018)**: Read-one / show 화면은 다음 정규형을 따른다.

   ```markdown
   :::card{title="Details"}
   - **Field**: value
   - **Another field**: value
   :::
   ```

   - 컨테이너: Card (title="Details" 또는 의미 제목). Section 단독도 허용.
   - 리스트: unordered. task list / ordered 금지.
   - 각 ListItem 내부: `Strong(field) + ": " + inline value`. 인라인은 text/Emphasis/Strong/CodeSpan/Link만.
   - 빈 값: `*none*`. null/-/"—" 혼용 금지.
   - 2열 Table transpose는 단건 상세 용도 사용 금지 — ADR 0015와 의미 오버로드 회피.
   - JSX convenience wrapper: `<Descriptions title items={[{term, value}]}>` (ADR 0024 §3) — 새 directive name 등록 아님. 내부에서 `<Card>` + `<List>` + `<ListItem>` + `<Strong>` 로 분해되어 Markdown 은 본 정규형과 완전히 동일하게 출력된다. 빈 `value` (null/undefined/"") 는 자동으로 `*none*` 으로 치환.

9. **위험 동작 관용구 (ADR 0019)**: destructive tool은 1단계 `::button[<Verb>…]{variant=danger action=<verb><Resource>Preview}` → 2단계 preview 페이지 (Card + `Alert{kind=caution}` + Form)의 2단계 전이로 호출한다. Button `confirm` 속성은 v1 미지원.

10. **빈 값 표기 (ADR 0018/0019)**:
   - 단건 상세 필드 null: `*none*` (별표 1쌍, 괄호 없음, 소문자, 영어 고정). `*None*`/`*NONE*`/`*"none"*`/`(none)`/`null`/`—`/`N/A` 금지. 로케일 번역 v1 금지.
   - Table 셀 null: 빈 문자열 `""` 또는 `—` 허용 (반복 노이즈 회피).
   - 리소스 전체 부재: `Alert{kind=warning}`.
   - Table 전체 빈 상태: `Alert{kind=note}` (Table 형제 레벨).

## 미정 / 후속

- **info/success/error** alert 확장 — GFM 5종 외 추가 여부.
- **Radio/Checkbox 그룹 컨테이너** — 현재 개별 directive. 그룹 필요성 재검토 대상.
- **Media 컴포넌트** (Video, Audio) — v1 미포함.
- **Empty state** 결정 완료 (ADR 0019). **Loading / Error state** 표현 — 후속 ADR.
- **v1 편입 (ADR 0025)**: Section, Steps, Tabs, Accordion, Split 5종이 ADR 0025 에 의해 v1 에 편입됐다. 위 각 항목에 Props 시그니처·직렬화·엣지 케이스가 정의되어 있다.
