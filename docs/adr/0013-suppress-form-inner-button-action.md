# ADR 0013 — Form 내부 Button의 action 속성 생략

- Status: Accepted
- Date: 2026-04-17
- Extends: [ADR 0009 §5](./0009-envelope-extensions-and-serialization-refinements.md) (Form 내부 fallback off의 자연 연장)
- Related: [ADR 0001](./0001-primary-interaction-syntax.md), [ADR 0005](./0005-page-envelope.md)

## Context

LLM 친화성 검증(`docs/research/llm-test-0011-layouts.md` E3)에서 Form 내부 Button의 `action` 속성 이중 선언이 low-confidence FAIL로 드러났다.

```markdown
:::form{action="createUser"}
::input{name="name" ...}
::select{name="role" ...}
::button[Create user]{action="createUser"}
:::
```

Form과 Button이 같은 `action="createUser"`를 반복 선언. fresh-context AI는 "form action을 button이 override하는지, 같은 action을 두 번 호출하는지, form submit 없이 button이 main action인지" 판별 불가. 15개 과제 중 유일한 FAIL. 실제 동작은 "form submit → createUser 1회 호출"이지만 Markdown만 보면 이 사실이 드러나지 않는다.

ADR 0009 §5는 "Form 내부는 fallback link off"로 link-paragraph 중복만 해결했다. **attribute 중복은 미해결**.

## Decision

### 1. Form이 내부 walk 시 action을 context로 주입한다

`SerializeContext`에 `formAction?: string` 필드를 추가. `Form.toMarkdown`은 `ctx.walk(children, { fallback: "off", formAction: action })`로 자식에게 현재 form의 action을 전파한다. ADR 0009 §5의 fallback override 메커니즘과 동일 계열 확장.

### 2. Button은 동일 action이면 `action` 속성을 생략한다

`Button.toMarkdown`에서 `ctx.formAction === props.action` 이면 `attributes.action` 키를 **생략**한다. 결과:

```markdown
:::form{action="createUser"}
...
::button[Create user]
:::
```

HTML `<form action="...">` + `<button type="submit">`의 action 상속 모델과 1:1 대응. AI가 사전지식으로 즉시 해석 가능.

### 3. 다른 action의 Button은 그대로 명시한다

Form 내부에 `action`이 form과 **다른** Button이 있으면 `action` 속성을 유지한다. 합법적 사례:

```markdown
:::form{action="createUser"}
::button[Create]
::button[Save draft]{action="saveDraft"}
::button[Cancel]{action="cancelFormDraft"}
:::
```

submit용(같은 action) → 생략, 보조 action → 명시 — 차이가 자연스럽게 드러남.

### 4. registerAction은 변함없이 동작

`ctx.registerAction(action)`은 속성 생략 여부와 무관하게 항상 호출. envelope `tools[]` 교차 검증은 Button의 런타임 동작 기반이므로 Markdown 표기 축약과 분리.

### 5. Form 밖 standalone Button은 영향 없음

`ctx.formAction`이 undefined인 컨텍스트에서는 기존대로 `action` 속성을 항상 출력. ADR 0009 §4 fallback link 병기도 유지.

## Consequences

**Positive**
- Markdown이 HTML form 표준 멘탈모델과 정합 — AI 사전지식 활용 가능.
- E3 confidence가 low → high 상승 예상 (후속 LLM 재검증으로 확인).
- envelope `tools[]` 계약·React API·카탈로그·예약 attribute 모두 불변.
- "Cancel / Save draft" 같은 실세계 폼 패턴을 명시적으로 수용.

**Negative**
- `SerializeContext`에 상태성 필드 1개 추가. 단, `fallback`과 동일 계열이라 복잡도 증가 미미.
- Form 내부 Button의 Markdown 표기가 Form 밖과 달라져 "왜 어떤 button은 action이 있고 어떤 건 없지?" 라는 첫 접근 혼란 가능 — spec 1문장으로 해소.

**Neutral**
- directive를 미지원하는 뷰어(GitHub README 등)에서 Form 내부 submit 버튼은 시각적으로 `[Create user]` 텍스트만 남음. ADR 0009 §5의 "fallback off" 결정과 동일 trade-off — Form은 directive-aware 뷰어/에이전트 타겟.

## Edge cases

1. **Form 내부에 submit용 Button이 하나도 없음** (모든 Button이 다른 action) — 제출 수단 부재는 의도 가능(예: auto-submit on change). v1에서는 warning 없음, 후속 lint ADR 대상.
2. **Form 내부 Button이 여러 개, 전부 form action과 동일** — 모두 생략 허용. "여러 submit 버튼" UI는 드물지만 합법.
3. **중첩 Form** — HTML 금지이며 readable-ui도 미지원. 내부 Form의 `formAction` context 전파는 shallow (가장 가까운 Form). 단, v1에서 중첩 Form은 error로 승격 권장(후속 component-catalog 갱신 시).

## 관련 구현

- `packages/core/src/index.ts` — `SerializeContext`·`WalkOptions`에 `formAction?: string` 추가, `makeCtx` / `walk` override에 포함.
- `packages/react/src/components.tsx`
  - `Form.toMarkdown` — `ctx.walk(children, { fallback: "off", formAction: action })`.
  - `Button.toMarkdown` — `ctx.formAction === action` 이면 `attributes`에서 `action` 생략.
- `docs/spec/component-catalog.md` §Button — "Form 내부에서 같은 action이면 attribute 생략" 규범 1문장.
- `docs/spec/component-catalog.md` §Form — "내부 walk 시 action을 context로 주입" 1문장.
- 재검증: `docs/research/llm-test-0011-layouts.md` E3 재실행.
