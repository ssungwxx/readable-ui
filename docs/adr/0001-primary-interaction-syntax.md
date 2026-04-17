# ADR 0001 — Primary interaction syntax: Directive first

- Status: Accepted
- Date: 2026-04-17

## Context

CommonMark에는 버튼·폼·액션을 의미하는 요소가 없다. 업계에는 최소 6가지 관행이 병존한다 (link-as-button, directive, raw HTML, MDX, fenced manifest, markform). readable-ui가 "에이전트가 마크다운만 읽고 조작"할 수 있으려면 인터랙션 표현의 primary 구문 하나를 정해야 한다. 그렇지 않으면 에이전트 프롬프트가 산발적이 된다.

## Decision

**Directive 구문을 primary로 채택한다.** `remark-directive` 문법을 따른다.

- Leaf directive: `::button[Submit]{action=submit variant=primary}`
- Container directive: `:::form{action=/api/users}` … `:::`
- Text directive: `:badge[New]{color=blue}`

**Link-as-action (`[Submit](mcp://tool/submit)`) 은 compat fallback으로 동등하게 파싱한다.** Directive를 지원하지 않는 GitHub README 미리보기 같은 환경에서도 링크는 항상 렌더되기 때문.

## Consequences

**Positive**
- 컴포넌트 ↔ 속성 매핑이 1:1로 자연스럽다 (`::button[label]{attr=value}` ↔ `<Button attr="value">label</Button>`).
- Form/Card/Tabs 같은 컨테이너 표현이 직관적이다.
- `remark-directive` 생태계(파서·AST·플러그인)를 재사용할 수 있다.

**Negative**
- GitHub README 등 플레인 마크다운 뷰어에서 `:::button…` 텍스트가 그대로 노출된다. 이를 위해 **모든 directive는 link-as-action fallback을 자동 병기**하는 직렬화 규약을 둔다 (ADR 0005 예정).
- `remark-directive`는 CommonMark 정식 아님. 2014년 제안 이후 채택되지 않은 상태. 스펙 변경 리스크 존재.

**Neutral**
- MDX(`<Button>`)는 저자용 빌드타임 편의로만 지원하며, directive가 canonical 표현이다 (ADR 0004 참조).
