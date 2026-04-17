# Spec — Page Envelope

readable-ui로 변환된 모든 Markdown 문서는 **반드시** 최상단에 YAML frontmatter로 된 envelope을 가진다. 본 문서는 envelope의 필드·검증 규칙·에러 케이스를 정의한다.

> 결정 근거: [ADR 0005](../adr/0005-page-envelope.md), [ADR 0009](../adr/0009-envelope-extensions-and-serialization-refinements.md)

## 구조

```yaml
---
title: <string, required>
purpose: <string, optional>
role: <string | string[], optional>
layout: <layout-id, optional>
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

#### `layout` (optional, enum)

허용되는 레이아웃 식별자. 기본값 `flow`. v1은 `flow`만.

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

#### `updatedAt` (optional, ISO8601)

페이지 콘텐츠의 마지막 갱신 시점. AI가 "이 정보가 얼마나 최신인가" 판단.

#### `tools` (optional, Tool[])

페이지 안의 directive `action=` 또는 Link `mcp://tool/<name>` 또는 Table `actions[].tool`이 참조할 수 있는 action 목록.

#### `extensions` (optional, record)

구현자 예약 슬롯. GraphQL 응답의 `extensions`와 동일한 철학. readable-ui 자체는 이 필드를 해석하지 않는다.

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
3. **Action 미선언 참조** — 본문 directive `action=X`, Link `mcp://tool/X`, Table `actions[].tool=X`가 envelope `tools[]`에 없으면 → **error** (기본)
4. **JSON Schema 형식 오류** — `input`/`output`이 Zod `JsonSchemaSubsetZ` parse 실패 → **error**
5. **권한 일관성 warning** — tool의 `role`이 페이지 `role`보다 공개적이면 → **warning**
6. **알 수 없는 최상위 키** → **error** (Zod `.strict()`)
7. **constraints[].id 중복** → **error**
8. **`paths.view` 누락** (v1 하위호환) → **warning** → v2에서 error 승격 예정
9. **pagination 교차 일관성** — envelope `pagination.total`과 `<Table rows.length>` 이 불일치하면 `warning` (향후 구현)

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

- **Layout 카탈로그 전체 값** — 현재 `flow`만. 후속 ADR에서 `tabs-page`, `split` 등 검토
- **외부 스키마 참조** (`$ref`, `include: ./tools.yaml`) — 초기 비지원
- **Permission 모델 확장** — 단순 역할 기반 `role`만
- **Multipart envelope** (탭 내부 서브페이지) — 초기 비지원
- **ajv standalone 빌드 검증** — 현재 런타임 Zod만. 빌드 스텝 편입은 후속
