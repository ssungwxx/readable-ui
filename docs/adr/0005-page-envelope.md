# ADR 0005 — Page envelope: YAML frontmatter with JSON Schema tools

- Status: Accepted
- Date: 2026-04-17

## Context

readable-ui의 목표는 "AI가 큰 컨텍스트 없이 전환된 Markdown만 읽고도 페이지 의도·가능한 액션·필수 입력·권한을 파악"하는 것이다. 이를 위해 본문 마크다운보다 먼저 **페이지 envelope(외곽 프레임)** 을 고정한다. envelope의 포맷과 그 안의 tool signature 표기 방식을 정해야 한다.

후보:
- envelope: YAML frontmatter / TOML / JSON fence / 하이브리드
- tool schema: JSON Schema 서브셋 / Zod + 변환 / 축약 DSL

선택 기준: (1) AI·사람 양쪽 가독성, (2) MCP `tools/list` 및 Anthropic tool use 계약과의 호환, (3) 생태계 표준성.

## Decision

**1. Envelope은 YAML frontmatter 단일 형식으로 고정한다.**

- 문서 맨 앞 `---` ... `---` 블록에 모든 페이지 메타·권한·tool 선언을 담는다.
- Jekyll/Hugo/Astro 등 광범위 관행과 일치.

**2. Tool signature는 JSON Schema 서브셋으로 기술한다.**

- YAML로 직렬화된 JSON Schema를 `tools[].input`에 둔다.
- MCP `tools/list` 응답 스키마와 키·형태가 1:1 호환되도록 유지한다 (`name`, `description`, `input`).
- 런타임 검증은 `ajv`(또는 동급)로 수행한다.

**3. Envelope 필수/선택 필드**

| 필드 | 타입 | 필수 | 의미 |
|---|---|---|---|
| `title` | string | ✅ | 페이지 제목 |
| `purpose` | string | ❌ | 페이지 의도를 한 문장으로 |
| `role` | string \| string[] | ❌ | 이 페이지를 볼 수 있는 역할 (없으면 public) |
| `tools` | Tool[] | ❌ | 페이지 안에서 호출 가능한 action들 |
| `layout` | enum | ❌ | 허용 레이아웃 식별자 (ADR 0007에서 카탈로그 확정 예정) |

Tool 항목:

| 필드 | 타입 | 필수 | 의미 |
|---|---|---|---|
| `name` | string | ✅ | action URI의 tool 부분 (`mcp://tool/<name>`) |
| `description` | string | ❌ | 자연어 설명 |
| `input` | JSON Schema | ❌ | params 스키마. 없으면 파라미터 없는 액션 |
| `role` | string \| string[] | ❌ | 이 tool을 호출할 수 있는 역할 |

`tools`가 선언된 tool만 본문 directive의 `action=` 속성에서 참조 가능하다 (검증 대상).

**4. Envelope은 모든 페이지에 필수이다.**

- `title`이 없거나 frontmatter 자체가 없으면 검증 실패.
- 이 규칙이 "self-describing header"를 강제해 AI가 페이지를 작은 컨텍스트로 이해할 수 있게 한다.

## 예시

```markdown
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
    input:
      type: object
      properties:
        id: { type: string }
      required: [id]
    role: admin
---

# Users

:::form{action=createUser}
::input{name=name label=Name required}
::input{name=email type=email label=Email required}
::select{name=role options="admin,user" label=Role required}
::button[Create]
:::

| Name | Email | Actions |
|---|---|---|
| Alice | a@x.com | [Delete](mcp://tool/deleteUser?id=1) |
```

## Consequences

**Positive**
- AI 에이전트가 첫 수십 줄(frontmatter)만 읽어도 페이지 의도·호출 가능 action·params 타입을 **추측 없이** 파악한다. 관점 4의 핵심 gap 해소.
- MCP 호환: envelope의 `tools` 배열을 그대로 MCP `tools/list` 응답으로 전달 가능.
- 검증 가능: ajv 기반 프리컴파일로 빌드 시 envelope 스키마 위반 catch.
- 한 포맷(YAML)으로 통일해 learning curve 최소.

**Negative**
- 매우 큰 tool schema가 수십 개면 frontmatter가 장황해진다 — 향후 `include: ./tools.yaml` 같은 외부 참조 지원을 열어둘 수 있으나 초기엔 제공 안 함.
- YAML은 indentation 버그에 민감. 문서 빌드 시 파싱 에러를 친절히 리포트할 것.
- `tools`를 선언해야 directive `action=` 참조가 유효 — 저자 학습 비용 조금 증가.

**Neutral**
- 본문 내 action 링크(`mcp://tool/X`)가 envelope에 선언되지 않은 tool을 가리키면 warning 또는 error. 기본은 error.
- 추후 permission 모델이 복잡해지면 `role` 대신 `capabilities` 식 확장 가능. 구조만 유지하면 호환.

## 관련

- ADR 0001 Directive primary: envelope의 `tools`는 directive `action=` 속성과 짝을 이룬다.
- ADR 0002 Action URI: `tools[].name`은 `mcp://tool/<name>`의 `<name>`과 동일.
- 후속 ADR 0007(가칭) Allowed layout catalog가 `layout` enum 값을 확정 예정.
