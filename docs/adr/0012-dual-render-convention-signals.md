# ADR 0012 — Dual-representation convention signaling for directive + link fallback

- Status: Accepted
- Date: 2026-04-17
- Reinforces: [ADR 0001](./0001-primary-interaction-syntax.md), [ADR 0009 §4·§9](./0009-envelope-extensions-and-serialization-refinements.md)
- Related: [ADR 0005](./0005-page-envelope.md) (`extensions` 슬롯 사용)

## Context

ADR 0001이 directive-primary, link-as-action을 compat fallback으로 병기하기로 정했고 ADR 0009 §4·§9가 구현과 "동일 호출의 이중 표현" 규범을 확정했다.

LLM 친화성 검증(`docs/research/llm-test-0011-layouts.md` E2)에서 fresh-context AI가 본문만 보고 `::button{action=X}` + `[Label](mcp://tool/X)` 병기가 "중복 호출인지 이중 표현인지" medium confidence로만 판별했다. 규범은 spec 문서에만 있고 **Markdown 본문 자체에는 어떤 신호도 없음**.

MCP 업계 관행을 조사한 결과 directive + link dual을 명시하는 생태계 표준은 부재. Markdown 내부에 이 규범을 encode할 방법을 새로 정해야 한다.

## Decision

**A + B 하이브리드 — 두 축에서 보강 신호를 제공한다.**

### A. envelope `extensions.conventions` 상수 삽입

`renderPage`는 envelope에 `extensions.conventions["duplicate-button-link"]` 가 미선언이면 기본값 `"dual-render"`를 자동 주입한다. 저자가 명시 override 가능.

```yaml
extensions:
  conventions:
    duplicate-button-link: dual-render
```

ADR 0005/0009의 `extensions: Record<string, unknown>` 예약 슬롯을 활용. GraphQL `extensions`와 동일 철학 — 구현자 메타.

### B. fallback link에 `title="fallback"` 부착

`fallback: "on"` 모드의 Button은 link-paragraph의 link 노드에 CommonMark title `"fallback"`을 자동으로 붙인다.

```markdown
::button[Refresh]{action=refreshDashboard}

[Refresh](mcp://tool/refreshDashboard "fallback")
```

- CommonMark 표준 문법이라 GitHub/GitLab/Gmail hover tooltip에서 정상 동작.
- `fallback: "link-only"` 모드에서는 title 생략 (dual이 아닌 단일 표현이므로 "fallback"이라는 의미가 없음).
- `fallback: "off"` 모드는 link 자체가 없어 무관.

### 의미 규범

- A와 B는 **보강** 관계다. 어느 한쪽만 있어도 AI는 dual-render로 해석해야 한다.
- A는 "이 페이지의 directive-link 이중 출현은 이중 호출이 아니다"라는 페이지 전역 선언.
- B는 "이 link paragraph는 앞 directive의 fallback이다"라는 인스턴스 레벨 증거.

## Consequences

**Positive**
- E2 confidence가 medium → high로 상승 예상 (후속 LLM 재검증).
- MCP·CommonMark·ADR 0002 URI 규범 모두 불변.
- 저자 부담 0 — 자동 주입.
- envelope 선언이 tool 호출 의미를 오염시키지 않음 (`tools[]` 스키마와 별도 필드).

**Negative**
- 토큰 소폭 증가: 페이지당 envelope +2~3줄, Button 당 link title +12자. dual-render로 이미 증가한 비용 대비 5~10% 추가.
- 다른 directive(향후 `::toggle` 등)가 dual 패턴을 도입할 때마다 `conventions` 키가 확장 — 명명 규율 필요(후속).

**Neutral**
- `"fallback"` 문자열은 readable-ui 고유 관행. CommonMark title 의미(tooltip)와 충돌 없음. 뷰어에서 hover 시 "fallback"이 보이는 것은 수용.
- i18n: `"fallback"`은 AI 인식용 영어 고정 키워드. UI tooltip을 번역하고 싶으면 serializer 옵션으로 override (v1에서는 미제공).

## 관련 구현

- `packages/core/src/index.ts` — `renderPage`에서 envelope 검증 후 `extensions.conventions["duplicate-button-link"]` 미선언 시 `"dual-render"` 기본 주입.
- `packages/react/src/components.tsx` — Button.toMarkdown의 fallback link 노드에 `title: "fallback"` 부착 (`ctx.fallback === "on"` 에서만).
- `docs/spec/page-envelope.md` — `extensions.conventions` 섹션 신설, `duplicate-button-link` 키 명세.
- `docs/spec/component-catalog.md` §Button — "fallback link는 title `fallback` 자동 부착" 1문장.
- 재검증: `docs/research/llm-test-0011-layouts.md` E2 재실행.

## Open

- `conventions` 값 문자열을 enum으로 닫을지 자유 문자열로 열어둘지 — 타 directive 확장 시 재검토.
- `"fallback"` 키워드 localization 정책은 v2.
- **Container directive fallback** — Form(ADR 0009 §5)과 Table(ADR 0015)이 container directive이고, directive 미지원 뷰어에서 opening/closing fence가 paragraph·ghost row로 흡수된다. 본 ADR은 Button link fallback만 다루므로 container fallback은 후속 ADR에서 `link-only` 대체 경로를 정의할 수 있다.
