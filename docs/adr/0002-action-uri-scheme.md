# ADR 0002 — Action URI scheme: MCP ecosystem

- Status: Accepted (query value encoding policy added 2026-04-18; see §Query value encoding below)
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

## Query value encoding

(2026-04-18 보강 — ADR 0015 Table directive 이행 후 LLM 친화성 재검증에서 "URI query의 `:` 를 raw로 둘지 `%3A`로 encode할지" 정규형이 불명확하다는 관찰에서 출발.)

readable-ui 는 `mcp://tool/...?key=value&...` 의 query component 에 대해 다음 규약을 채택한다.

1. **Canonical serializer output**: `buildActionURI(tool, params)` 는 `URLSearchParams` 를 사용해 RFC 3986 percent-encoding 을 적용한다. 따라서 엔진이 생성하는 직렬화 결과는 예컨대 `?_sort=createdAt%3Adesc` 형태로 고정된다. `%3A` 가 정규형.
2. **Percent-decoded matching**: 수신측(`@readable-ui/mcp` 또는 MCP 런타임 어댑터)은 **percent-decoded 값을 기준으로 tool 파라미터 매칭**을 수행한다. 이에 따라 LLM 이나 외부 생성기가 `?_sort=createdAt:desc` 처럼 raw colon 으로 작성해 전송해도 **의미적으로 동일**하게 처리된다.
3. **Directive attribute**: directive `{sort=createdAt:desc}` 의 attribute value 는 raw colon 으로 유지 (URL-encode 하지 않음). Markdown 직렬화와 URL 직렬화의 정규형은 서로 다른 층에 속한다.
4. **Escape 회피**: `mdast-util-to-markdown` 이 link URL 내부의 특정 `:` 를 `\:` 로 이스케이프하는 것은 percent-encoded 형태(`%3A`)를 쓰면 자연히 회피된다. 가독성·토큰 효율 측면에서도 `%3A` 가 `\:` 보다 우수.

이 규약의 **LLM 관점 의미**: 에이전트가 새 URI 를 생성할 때 두 형태(`createdAt:desc` raw, `createdAt%3Adesc` encoded) 모두 유효하며 서버가 동일하게 처리함을 알 수 있다. 권장은 `%3A` 지만 강제되지 않는다. 이 계약은 envelope `extensions.conventions["uri-query-encoding"]` 에 `"percent-decoded-match"` 로 표현되며 `renderPage` 가 기본 주입한다 (본 ADR 이 도입).

### 구현 메모

- `@readable-ui/react` 의 `buildActionURI` 는 `URLSearchParams.toString()` 을 그대로 사용. 별도 후처리 없음.
- `@readable-ui/core` 의 `withDefaultConventions` 는 envelope extensions 에 `uri-query-encoding: "percent-decoded-match"` 기본값을 주입한다 (ADR 0012 선례와 동일 메커니즘).
