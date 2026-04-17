# ADR 0002 — Action URI scheme: MCP ecosystem

- Status: Accepted
- Date: 2026-04-17

## Context

인터랙션 링크(예: `[Submit](…)`)와 directive의 `action=…` 속성에 쓸 URI scheme을 정해야 한다. 후보는 `mcp://…`, `ui://…`, `readable-ui://…`, `action://…`, `#action-…`. 선택 기준은 (1) AI 에이전트 생태계 호환, (2) 렌더러의 링크 차단 정책, (3) 충돌 가능성.

## Decision

**MCP 생태계의 URI scheme에 편승한다.**

- Action 트리거: `mcp://tool/<toolName>[?params]`
  - 예: `[Submit](mcp://tool/createUser?role=admin)`
  - directive attribute: `::button[Save]{action=mcp://tool/saveUser}` 또는 축약 `{action=saveUser}` (scheme 생략 시 자동 `mcp://tool/` 접두)
- UI 리소스(필요 시): `ui://server/<resource>` (MCP Apps 사양 그대로)
- Navigation: 일반 URL (`/admin/users`, `https://…`) 또는 `#anchor`
- 읽기 전용 참조: 일반 URL

## Consequences

**Positive**
- Claude/ChatGPT의 MCP 클라이언트가 이 scheme을 이미 인식·처리한다. 별도 어댑터 없이 에이전트가 호출 가능.
- MCP Apps 사양(`ui://server/resource`)과 충돌하지 않고 서로 보완한다 (tool 호출 vs UI 리소스 로드).
- `@readable-ui/mcp` 패키지가 action URI ↔ MCP tool 레지스트리 매핑만 담당하면 된다.

**Negative**
- MCP Apps가 `mcp://`를 iframe-loaded UI 용도로 쓰는 관행과 혼동될 수 있다. 문서에서 **"`mcp://tool/...`는 readable-ui의 tool 호출, `ui://…`는 iframe UI"** 로 구분을 명시한다.
- MCP 외 런타임(예: 일반 웹 앱)에서는 scheme이 의미 없고 clicked 시 브라우저가 무시한다. 이 경우 클라이언트 측에서 `mcp:` scheme을 가로채 fetch로 매핑하는 런타임 핸들러가 필요하다 (→ `@readable-ui/react`의 `ActionProvider`).

**Neutral**
- `action://` 은 지원하지 않지만, 외부 코드가 custom scheme을 쓰고 싶다면 registry로 등록 가능하도록 확장점을 둔다.
