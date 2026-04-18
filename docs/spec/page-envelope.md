# Spec — Page Envelope

readable-ui로 변환된 모든 Markdown 문서는 **반드시** 최상단에 YAML frontmatter로 된 envelope을 가진다. 본 문서는 envelope의 필드·검증 규칙·에러 케이스를 정의한다.

> 결정 근거: [ADR 0005](../adr/0005-page-envelope.md), [ADR 0009](../adr/0009-envelope-extensions-and-serialization-refinements.md), [ADR 0011](../adr/0011-sidebar-and-topbar-page-layouts.md), [ADR 0012](../adr/0012-dual-render-convention-signals.md), [ADR 0014](../adr/0014-nav-as-envelope-metadata.md), [ADR 0015](../adr/0015-table-as-container-directive.md), [ADR 0020](../adr/0020-close-crud-idiom-gaps.md)

## 구조

```yaml
---
title: <string, required>
purpose: <string, optional>
role: <string | string[], optional>
layout: <layout-id, optional>
intent: <"destructive-confirm", optional>  # ADR 0020 §5
paths:
  view: <string, required within paths>
  markdown: <string, optional>
  api: <string, optional>
  canonical: <string, optional>
constraints:
  - id: <string, required>
    text: <string, required>
    severity: info | warn | danger
pagination:
  page: <int ≥ 1>
  perPage: <int ≥ 1>
  total: <int ≥ 0>
  nextUrl: <string, optional>
  prevUrl: <string, optional>
updatedAt: <ISO8601, optional>
tools:
  - name: <string, required>
    title: <string, optional>
    description: <string, optional>
    input: <JSON Schema, optional>
    output: <JSON Schema, optional>
    role: <string | string[], optional>
    constraints:
      - id: <string>
        text: <string>
        severity: info | warn | danger
extensions: <record, optional>  # implementor-reserved
---
```

## 필드 명세

### 페이지 레벨

#### `title` (required, string)

페이지 제목. 기본 렌더러는 envelope의 `title`을 `<title>`과 `<h1>`에 동시 출력한다.

#### `purpose` (optional, string)

페이지의 의도를 한 문장으로. AI가 첫 토큰에 페이지 역할을 파악하도록 돕는다.

#### `role` (optional, string | string[])

페이지를 열람할 수 있는 역할. 지정하지 않으면 public.

#### `nav` (optional, object) — ADR 0014

앱 쉘 네비게이션의 단일 소스. 선언되면 `<Page>` 쉘이 이 값을 본문 맨 앞 `## Navigation` (또는 `## Section navigation`) 섹션으로 flush한다.

```yaml
nav:
  items:
    - { label: Dashboard, href: /dashboard }
    - { label: Users, href: /users, active: true }
    - { label: Roles, href: /roles }
  scope: global  # default; 또는 "section"
```

- `items[].label` / `items[].href` required. `active?: boolean` 은 0개 이상 허용 (1개 권장).
- `scope: "global"` (default) — 앱 전역 쉘. 모든 페이지에서 동일 세트 유지 권장.
- `scope: "section"` — 현재 섹션 내부 서브 nav. Markdown heading 텍스트가 `## Section navigation` 으로 분기.
- envelope `nav` 와 Page prop `nav` 가 둘 다 주어지고 서로 다르면 warning. envelope 우선.

#### `layout` (optional, enum)

허용되는 레이아웃 식별자. 기본값 `flow`.

| id | 설명 | 도입 |
|---|---|---|
| `flow` | 세로 1차원 흐름 (default) | ADR 0007 |
| `sidebar` | 좌측 수직 네비 + 우측 본문 | ADR 0011 |
| `topbar` | 상단 수평 네비 + 하단 본문 | ADR 0011 |

`sidebar`/`topbar` 선택 시 `<Page>` 에 `nav` prop으로 `{label, href, active?}[]` 전달. 좌/위 차이는 시각 전용이며 Markdown 직렬화는 동일 — body 맨 앞에 `## Navigation` + unordered 링크 리스트로 flush한다. 배치 정보는 버리지만 정보 손실은 없다 (ADR 0007 §4 flush 원칙). 상세는 [component-catalog.md §Page](./component-catalog.md#page).

envelope `layout` 과 `<Page layout>` prop은 일치시키는 것이 권장. 불일치 시 warning.

#### `intent` (optional, enum) — ADR 0020 §5

파괴적(destructive) action 의 2단계 confirm 페이지임을 나타내는 envelope 레벨 단일 신호. preview tool 호출이 반환하는 page-envelope 에 둔다.

- 값 enum (v1): `"destructive-confirm"` — preview 응답 페이지. 본문 Form 제출 시 실제 destructive action 이 발생함을 LLM 에 명시.
- envelope `tools[]` 에는 실제 action(예: `deleteUser`) 만 등재. preview tool 은 이미 호출됐으므로 다시 등재할 필요 없음.
- v2 enum 확장 후보: `"reversible-confirm"`, `"bulk-confirm"` 등 (현재 미정).

#### `paths` (optional, object)

- `view` (required within `paths`): 이 페이지의 HTML 뷰 경로
- `markdown` (optional): Markdown 뷰 경로 (관례: `.md` suffix)
- `api` (optional): 이 페이지의 데이터 API 경로
- `canonical` (optional): 절대 URL (외부 참조용)

AI가 자기 위치를 파악하고 다른 페이지와 교차 참조할 수 있게 한다.

#### `constraints` (optional, Constraint[])

페이지 전역 제약·주의사항. `id`는 페이지 내 유일해야 한다. severity는 `info | warn | danger`.

#### `pagination` (optional, object)

목록성 페이지의 현재 페이지 상태. `total`은 선언형 — 실제 데이터 fetch 결과와 일치해야 한다.

**ADR 0015 의미 강등**: Table directive가 페이지에 있으면 directive의 `page/of/size`가 SSOT이다. 본 envelope `pagination`은 (a) Table이 0개 또는 1개인 페이지에서 선언하는 호환 shortcut으로만 유지된다. directive와 공존·불일치 시 warning (directive 우선). Table이 2개 이상이고 envelope `pagination`이 선언되면 warning.

#### `updatedAt` (optional, ISO8601)

페이지 콘텐츠의 마지막 갱신 시점. AI가 "이 정보가 얼마나 최신인가" 판단.

#### `tools` (optional, Tool[])

페이지 안의 directive `action=` 또는 Link `mcp://tool/<name>` 또는 Table `actions[].tool`이 참조할 수 있는 action 목록.

#### `extensions` (optional, record)

구현자 예약 슬롯. GraphQL 응답의 `extensions`와 동일한 철학. readable-ui 자체 기능은 원칙적으로 이 필드를 해석하지 않는다.

##### `extensions.conventions` (표준 서브키)

ADR 0012에서 신설. readable-ui 런타임이 `renderPage` 시 기본값을 자동 주입하는 몇 개의 관행 키를 담는다. 사용자가 envelope에 다른 값을 지정하면 override.

| 키 | 값 | 의미 |
|---|---|---|
| `duplicate-button-link` | `"dual-render"` (default) | Button directive 뒤에 오는 `mcp://tool/X` link paragraph는 **동일 호출의 이중 표현**이며 두 번 호출이 아님. 인스턴스 레벨 신호로 link title `"fallback"` 이 함께 출력됨 (ADR 0012). |
| `form-inner-button-action` | `"inherit"` (default) | `:::form{action=X}` 내부에서 `action=` 속성이 없는 `::button[...]` 은 감싸는 Form의 action `X`를 상속해 **같은 tool을 1회 호출**한다. 명시적으로 다른 `action=Y` 를 선언한 Button은 자기 action을 별도로 호출 (cancel / save-draft 패턴) (ADR 0013). |
| `uri-query-encoding` | `"percent-decoded-match"` (default) | `mcp://tool/...?k=v&...` URI의 query value 매칭은 **percent-decoded 결과 기준**. 따라서 `_sort=createdAt:desc` 와 `_sort=createdAt%3Adesc` 는 의미적으로 동일. 엔진 serializer 출력의 정규형은 `%3A` (ADR 0002). |
| `form-default-ssot` | `"directive"` (default) | 폼 입력 위젯의 `default` attribute와 envelope `default` 공존 시 directive를 SSOT로 사용. envelope는 schema hint로만 보존 (ADR 0016 §4, ADR 0017 §3.2). |

추가 규범은 후속 ADR에서 확장.

### Tool 항목

- **`name`** (required, string) — `/^[A-Za-z0-9._-]+$/`
- **`title`** (optional, string) — 사람용 짧은 제목
- **`description`** (optional, string)
- **`input`** (optional, JSON Schema subset)
- **`output`** (optional, JSON Schema subset) — MCP `outputSchema` 대응
- **`role`** (optional, string | string[]) — tool 단위 권한. readable-ui 확장 (MCP 표준 아님)
- **`constraints`** (optional, Constraint[])

JSON Schema subset 지원 키워드: `type`, `properties`, `required`, `items`, `enum`, `format`, `pattern`, `minLength`, `maxLength`, `minimum`, `maximum`, `description`, `default`. 그 외는 `passthrough`로 허용하되 엔진이 검증하지 않는다.

## 검증 규칙

1. **Envelope 부재** 또는 `title` 누락 → **error**
2. **`tools[].name` 충돌** (같은 페이지 내 중복) → **error**
3. **Action 미선언 참조** — 본문 directive `action=X`, Link `mcp://tool/X`, Table directive `:::table{tool=X}`, Table `actions[].tool=X`가 envelope `tools[]`에 없으면 → **error** (기본)
4. **JSON Schema 형식 오류** — `input`/`output`이 Zod `JsonSchemaSubsetZ` parse 실패 → **error**
5. **권한 일관성 warning** — tool의 `role`이 페이지 `role`보다 공개적이면 → **warning**
6. **알 수 없는 최상위 키** → **error** (Zod `.strict()`)
7. **constraints[].id 중복** → **error**
8. **`paths.view` 누락** (v1 하위호환) → **warning** → v2에서 error 승격 예정
9. **pagination 교차 일관성** — envelope `pagination.total`과 Table directive 메타(`of`·`size`·row 수)가 불일치하면 `warning` (향후 구현). Table directive가 있으면 directive 우선 (ADR 0015 §4).
10. **Table directive ↔ envelope pagination 공존** — envelope `pagination`이 있고 페이지에 Table directive가 2개 이상이면 `warning` (어느 Table의 상태인지 모호). 1개이고 값이 불일치해도 `warning` (directive 우선).
11. **`intent` enum 위반** — `intent` 값이 허용 enum 외(현재 v1 한정 `"destructive-confirm"` 1종) 이면 → **error** (Zod). v2 에서 `"reversible-confirm"` 등 확장 시 본 enum 갱신.

## 예시

### 최소 예시

```yaml
---
title: Dashboard
---
```

### 일반 관리 페이지

```yaml
---
title: User management
purpose: Admin page to list, create, update, and delete user accounts.
role: admin
layout: flow
paths:
  view: /users
  markdown: /users.md
updatedAt: 2026-04-17T00:00:00Z
constraints:
  - id: delete-irreversible
    text: Deleting a user is permanent and cannot be undone.
    severity: danger
  - id: audit-log
    text: All mutations here are recorded in the audit log.
    severity: info
pagination:
  page: 1
  perPage: 20
  total: 3
tools:
  - name: createUser
    title: Create user
    description: Create a new user.
    role: admin
    input:
      type: object
      properties:
        name: { type: string, minLength: 1 }
        email: { type: string, format: email }
        role: { type: string, enum: [admin, user] }
      required: [name, email, role]
  - name: updateUser
    title: Update user
    role: admin
    input:
      type: object
      properties:
        id: { type: string }
        role: { type: string, enum: [admin, user] }
      required: [id]
  - name: deleteUser
    title: Delete user
    role: admin
    input:
      type: object
      properties:
        id: { type: string }
      required: [id]
---
```

## MCP 호환

envelope의 `tools`는 MCP `tools/list` 응답과 호환되는 형태로 설계됐다.

| readable-ui | MCP |
|---|---|
| `tools[].name` | `tools[].name` |
| `tools[].title` | `tools[].title` |
| `tools[].description` | `tools[].description` |
| `tools[].input` | `tools[].inputSchema` |
| `tools[].output` | `tools[].outputSchema` |
| `tools[].role` | `tools[]._meta.role` (확장) |
| `tools[].constraints` | `tools[]._meta.constraints` (확장) |

변환 함수는 `@readable-ui/mcp`가 제공 예정 (`toMcpToolList(envelope): Tool[]`).

## 셀 이스케이프 수용

Table 셀 내부의 `u\_alice\_01`, `bob\@example.com` 등은 `mdast-util-to-markdown`의 안전 이스케이프이다. **원문 정보 손실 없음** — GFM 파서 통과 시 `u_alice_01`, `bob@example.com`로 복원된다.

AI가 tool 호출 인자를 추출할 때는 **셀 텍스트가 아니라 action URI의 query string**에서 읽어야 한다: `[Delete](mcp://tool/deleteUser?id=u_bob_01)` — URL은 이스케이프되지 않는다.

## 미정 / 후속 결정

- **Layout 카탈로그 전체 값** — 현재 `flow`·`sidebar`·`topbar` (ADR 0011). `tabs-page`, `split-page`, `detail` 등은 후속 ADR 대상
- **외부 스키마 참조** (`$ref`, `include: ./tools.yaml`) — 초기 비지원
- **Permission 모델 확장** — 단순 역할 기반 `role`만
- **Multipart envelope** (탭 내부 서브페이지) — 초기 비지원
- **ajv standalone 빌드 검증** — 현재 런타임 Zod만. 빌드 스텝 편입은 후속
