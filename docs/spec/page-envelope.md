# Spec — Page Envelope

readable-ui로 변환된 모든 Markdown 문서는 **반드시** 최상단에 YAML frontmatter로 된 envelope을 가진다. 본 문서는 envelope의 필드·검증 규칙·에러 케이스를 정의한다.

> 결정 근거: [ADR 0005](../adr/0005-page-envelope.md)

## 구조

```yaml
---
title: <string, required>
purpose: <string, optional>
role: <string | string[], optional>
layout: <layout-id, optional>
tools:
  - name: <string, required>
    description: <string, optional>
    input: <JSON Schema, optional>
    role: <string | string[], optional>
---
```

## 필드 명세

### `title` (required, string)

페이지 제목. 본문의 첫 `# H1`과 반드시 일치할 필요는 없지만, 기본 렌더러는 envelope의 `title`을 `<title>`과 `<h1>`에 동시 출력한다.

### `purpose` (optional, string)

페이지의 의도를 한 문장으로. AI가 첫 토큰에 페이지의 역할을 파악하도록 돕는다. 문장 부호 권장.

### `role` (optional, string | string[])

이 페이지를 열람할 수 있는 역할. 지정하지 않으면 public.

```yaml
role: admin
# 또는
role: [admin, support]
```

### `layout` (optional, enum)

허용되는 레이아웃 식별자. 기본값은 `flow`(세로 1차원). 전체 카탈로그는 추후 ADR 0007에서 확정. 현재 임시 허용 값:

- `flow` — 기본. 헤딩, 단락, 리스트, 테이블, callout 등이 세로로 흐름.

### `tools` (optional, Tool[])

페이지 안의 directive `action=` 또는 link `mcp://tool/<name>`이 참조할 수 있는 action 목록.

#### Tool 항목

- **`name`** (required, string)
  - action URI의 tool 부분(`mcp://tool/<name>`)과 일치해야 한다.
  - 영문자·숫자·`.`·`_`·`-`만 허용. camelCase 권장 (`createUser`, `updateSettings`).

- **`description`** (optional, string)
  - 자연어 설명. AI가 tool 선택 근거로 사용.

- **`input`** (optional, JSON Schema 서브셋)
  - 없으면 파라미터 없는 액션.
  - JSON Schema Draft-07 서브셋. 지원 키워드:
    - `type`: `object | string | number | integer | boolean | array`
    - `properties`, `required` (object 전용)
    - `items` (array 전용)
    - `enum`
    - `format` (string 전용, 예: `email`, `date-time`, `uri`)
    - `minLength`, `maxLength`, `pattern` (string)
    - `minimum`, `maximum` (number/integer)
    - `description`, `default`
  - 지원하지 않는 키워드는 검증 단계에서 무시되며 warning을 낸다.

- **`role`** (optional, string | string[])
  - 이 tool을 호출할 수 있는 역할. 페이지 레벨 `role`과 별도로 tool 단위 제어 가능.

## 검증 규칙

1. **Envelope 부재**: frontmatter가 없거나 `title`이 없으면 **error**.
2. **`tools[].name` 충돌**: 같은 페이지 안에서 `name` 중복이면 **error**.
3. **Action 미선언 참조**: 본문의 directive `action=createUser` 또는 링크 `mcp://tool/createUser`가 `tools`에 없는 이름을 참조하면 **error** (기본). 옵션으로 `warning`으로 완화 가능.
4. **JSON Schema 형식 오류**: `input`이 유효한 JSON Schema가 아니면 **error**.
5. **권한 일관성**: tool의 `role`이 페이지 `role`보다 더 열려 있으면 **warning** (페이지는 admin인데 tool은 public 등).
6. **알 수 없는 키**: envelope 또는 tool에 명세에 없는 최상위 키가 있으면 **warning**.

## 예시

### 최소 예시

```yaml
---
title: Dashboard
---
```

본문은 자유. 어떤 액션도 없는 단순 읽기 페이지.

### 일반 관리 페이지

```yaml
---
title: User management
purpose: Admin CRUD for users
role: admin
tools:
  - name: createUser
    description: Create a new user
    input:
      type: object
      properties:
        name: { type: string, minLength: 1 }
        email: { type: string, format: email }
        role: { type: string, enum: [admin, user] }
      required: [name, email, role]
  - name: deleteUser
    description: Permanently delete a user by id
    input:
      type: object
      properties:
        id: { type: string }
      required: [id]
---
```

### Public + 부분 권한 tool

```yaml
---
title: Public pricing
purpose: Pricing information; subscribe requires login
tools:
  - name: subscribe
    description: Subscribe to the newsletter
    input:
      type: object
      properties:
        email: { type: string, format: email }
      required: [email]
  - name: createPlan
    description: Create a new pricing plan (admin only)
    role: admin
    input:
      type: object
      properties:
        name: { type: string }
        price: { type: number, minimum: 0 }
      required: [name, price]
---
```

## MCP 호환

envelope의 `tools`는 MCP `tools/list` 응답과 호환되는 형태로 설계됐다.

```jsonc
// envelope → MCP tools/list
{
  "tools": [
    {
      "name": "createUser",
      "description": "Create a new user",
      "inputSchema": /* envelope.tools[i].input을 그대로 매핑 */
    }
  ]
}
```

변환 함수는 `@readable-ui/mcp`가 제공 예정 (`toMcpToolList(envelope): Tool[]`).

## 미정 / 후속 결정

- **Layout 카탈로그 전체 값** — ADR 0007에서 확정.
- **외부 스키마 참조** (`$ref`, `include: ./tools.yaml`) — 초기 비지원. 필요 시 후속 ADR.
- **Permission 모델 확장** — 단순 역할 기반 `role`만. capabilities/scope 모델은 후속 결정.
- **Multipart envelope** — 본문 중간에 envelope을 다시 선언할 수 있는지(예: 탭 내부 서브페이지). 초기 비지원.
