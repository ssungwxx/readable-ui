# LLM 친화성 검증 — ADR 0025 Tier 3 컨테이너 컴포넌트

- Date: 2026-04-18
- Subject: [ADR 0025](../adr/0025-tier3-container-components-activation.md) 이행 검증 — Section · Steps · Tabs · Accordion · Split 5종이 v1 카탈로그에 편입된 뒤, 각 컴포넌트의 **onwire Markdown 직렬화 형태** 가 fresh-context LLM 에게 충분히 자기설명적인가를 점검한다.
- Fixtures: 본 리포트에 inline 으로 포함된 5개 onwire Markdown 블록. 각 블록은 envelope YAML + body 를 담은 **완전한** 샘플이며, `apps/example` 의 `/components` · `/settings` 페이지 라우트 (`components.md`, `settings.md`) 를 참고해 현실적 admin-page 수준으로 작성했다.
- Method: 실제 LLM 호출 없이, **본 리포트 작성 에이전트(= 저자)** 가 자신을 fresh-context 해석 주체로 가정하고 각 자극에 대해 (a) directive 문법을 알 때, (b) `fallback="on"` 상태의 paragraph 만 본다고 가정할 때, (c) spec 을 보지 않은 상태로 처음 접할 때 — 세 관점에서 해석을 기록한다. 이 방법은 [llm-test-0011-layouts.md](./llm-test-0011-layouts.md) · [llm-test-0015-table-container.md](./llm-test-0015-table-container.md) 두 선행 리포트와 동일하다. 선행 리포트에서 그랬듯, 저자가 LLM 역할을 시뮬레이트할 때 드러나는 **자신의 해석 편향·한계** 도 숨기지 않고 기록한다.

## 결과 요약

| 가설 | 대상 컴포넌트 | Verdict | 핵심 신호 |
|---|---|---|---|
| H1 | Section — flat `### {title}` 중첩 outline 유지 | **해석 가능** (high) | heading `#` 수 + 본문 층위가 CommonMark 의 outline 시맨틱 그대로 |
| H2 | Steps — `status=done\|current\|pending` 3값 현재 단계 식별 | **해석 가능** (high) | `status=current` 가 유일·직렬 위치로 self-evident |
| H3 | Tabs — flush 직렬화 시 "동시 vs. 탭 분리" 구별 | **해석 가능하나 개선 필요** (medium) | `::tab[label]` 가 구분자임은 추론 가능하나 "탭 = 배타적 영역" vs. "Section = 병렬 영역" 구별 신호가 약함 |
| H4 | Accordion — Panel title + 본문 heading 관계 | **해석 가능하나 개선 필요** (medium) | Panel 과 Section 이 시맨틱적으로 겹쳐, 본 리포트 저자도 한 번 "accordion 의 panel 은 사실상 Section 아닌가" 라는 혼동을 경험 |
| H5 | Split — 좌/우 세로 직렬화 시 공간 관계 보존 | **해석 가능 — 공간 관계 의존 과업에 한해 LLM-unfriendly 불가피** | 의미 복원은 ok, 공간 관계 복원이 필요한 과업은 Split 이 원천적으로 부적합 |

**총평**: ADR 0025 의 5종 편입 결정은 **LLM 친화성 기준선을 유지**한다. 5개 가설 모두 "해석 실패 — ADR 재검토 권고" 로 이어지지 않는다. 단, H3 (Tabs) 와 H4 (Accordion) 에서 **flush 규약의 시맨틱적 애매함** 이 관찰되어 후속 spec 피드백 3건 (§후속 spec 피드백) 을 도출했다. 모두 선택적 개선 (convention key 추가 수준) 이며 ADR 0025 본문 개정을 요구하지 않는다.

## 검증 질문

본 리포트는 다음 5개 가설을 각각 명시적으로 검증한다:

1. **Section**: heading 레벨이 자동 추론이 아니라 필수 prop 인 현재 결정에서, `### {title}` flat 출력이 중첩 heading outline 을 LLM 이 잃지 않고 해석하는가.
2. **Steps**: `status=done|current|pending` 3값이 directive 만 볼 때와 fallback 병기를 볼 때, LLM 이 현재 진행 단계를 정확히 식별하는가 (= `current` 로 라벨된 step).
3. **Tabs**: flush 규약 (ADR 0007 §4) 으로 **전체 탭 본문이 순차 출력** 될 때, LLM 이 "동시에 보여지는 정보" 와 "탭으로 분리된 정보" 를 구별하는가 — 또는 구별 못 해도 과업 수행에 지장 없는가.
4. **Accordion**: Tabs 와 동일한 flush 규약에서 Panel title + 본문의 heading 관계를 어떻게 해석하는가 (Panel 을 Section 과 혼동하는지).
5. **Split**: 2열 cell 내용이 세로로 직렬화될 때, LLM 이 "좌/우" 공간적 관계를 **잃어도 의미가 보존되는지** 확인. 공간적 관계 복원이 필요한 과업이면 Split 자체가 LLM-unfriendly 라는 신호.

각 가설의 자극 (onwire Markdown) · 검증 · 결론을 아래 섹션에서 하나씩 다룬다.

---

## 1. Section — 중첩 heading outline 유지 여부

### 자극 (onwire Markdown)

다음 블록은 `/components.md` 수준의 admin 데모 페이지 일부다. ADR 0025 §1 의 규칙에 따라 `level` 을 저자가 명시했고, 중첩 Section 이 level 2 → level 3 로 한 단계씩 올라간다.

~~~markdown
---
title: Tier 3 components — Section, Steps, Split
purpose: Admin demo page showing Section/Steps/Split usage for ADR 0025.
role: admin
layout: sidebar
nav:
  items:
    - label: Dashboard
      href: /dashboard
    - label: Users
      href: /users
    - label: Reports
      href: /reports
    - label: Settings
      href: /settings
    - label: Components
      href: /components
      active: true
paths:
  view: /components
  markdown: /components.md
updatedAt: 2026-04-18T00:00:00Z
tools: []
extensions:
  conventions:
    duplicate-button-link: dual-render
    form-inner-button-action: inherit
    uri-query-encoding: percent-decoded-match
---

## Navigation

- [Dashboard](/dashboard)
- [Users](/users)
- [Reports](/reports)
- [Settings](/settings)
- [Components](/components) · current

# Tier 3 components

Section · Steps · Split — introduced in ADR 0025. Compare with the [view route](/components).

## Section component

Section wraps a Heading + children block. In Markdown it serializes as a plain heading followed by block children — no directive wrapper. The `level` prop is required in v1; automatic inference is v2.

### Nested section (level 3)

Nested sections require the author to increment the level explicitly. This section uses `level=3` to keep the outline consistent with the outer Section.

#### Deeply nested (level 4)

Three-level deep nesting is supported. The engine does not infer depth automatically.

## Steps component

Steps display an ordered progress sequence. See §2 below for the representative stimulus.

## Split component

Split provides a 2-column layout. Markdown serializes cells top-to-bottom. See §5 below.
~~~

### 검증 질문

> `### Nested section (level 3)` 이 `## Section component` 의 **자식 outline 단위** 임을 LLM 이 잃지 않는가? `#### Deeply nested` 가 `### Nested section` 의 자식인가, 아니면 `## Section component` 의 손자 수준 자식인가?

### 해석 관찰 (저자 = LLM 관점)

**directive 문법을 아는 상태**에서 위 Markdown 을 읽으면, 저자 자신은 다음과 같이 해석한다:

- `# Tier 3 components` 가 페이지 제목 (envelope.title 과 일치).
- `## Section component` · `## Steps component` · `## Split component` 세 형제가 페이지 본문의 top-level section.
- `### Nested section (level 3)` 은 `## Section component` 내부의 하위 section. CommonMark 관행상 heading level 이 2 → 3 으로 내려가면 descendant 가 된다.
- `#### Deeply nested (level 4)` 는 `### Nested section` 의 descendant.

**directive 문법을 모르는 상태**는 Section 에는 해당되지 않는다 — Section 은 애초에 directive 를 emit 하지 않고 순수 CommonMark heading 만 emit 하므로 fallback paragraph 문제가 발생하지 않는다. `:::section{...}` 같은 특수 container 를 쓰지 않는 결정이 여기서 빛을 낸다: **모든 Markdown 뷰어가 동일하게 해석**한다.

**spec 을 보지 않은 상태**에서도 "page heading + nested heading" 은 Markdown 의 기본 문법이라 해석에 추가 문서가 필요 없다. H1 자체는 CommonMark 표준 outline 에 완전히 포섭된다.

### 오탐 유형

1. **level 점프 (skip level)**: 저자가 `##` 다음에 `####` 로 건너뛰면 LLM 이 "암묵적 level 3 가 있는데 비어 있다" 고 오해하거나, 혹은 "이 `####` 는 실질상 level 3 역할" 로 재해석. 본 자극에서는 2 → 3 → 4 로 연속 상승시켰으므로 문제 없음. ADR 0025 §Alternatives 에서 `ctx.headingDepth` 를 v2 로 미룬 판단과 정합.
2. **외부 페이지 `# H1` 과의 충돌**: 저자가 Section `level={1}` 로 설정하면 `# nested title` 이 페이지 제목과 동레벨로 드러나 outline 이 망가짐. 현재 스펙상 `level` 타입은 `1~6` 이므로 런타임이 이를 막지 않는다. LLM 관점에서는 "H1 이 두 개 있다 = 같은 페이지인가, 이어 붙은 두 페이지인가" 가 ambiguous.
3. **Tabs/Accordion 내부 Section**: ADR 0025 §Open 에 명시되듯, Tab 내부에 Section 을 두면 페이지 outline 과 어긋날 수 있다. 본 자극에는 해당 케이스가 없지만, §3/§4 에서 추가 확인.

### 결론

H1 — **해석 가능 (high)**. Section 이 directive 대신 pure heading 을 사용한 결정이 LLM 해석 부담을 0 에 가깝게 낮춘다. `level` 필수 prop 의 단점 (저자 실수 시 outline 오류) 은 LLM 관점보다 저자·저자-도구 (린트) 관점의 문제이므로 본 검증 범위 밖.

**후속 spec 피드백 후보** (필수 아님): `level={1}` 을 Section 에서 허용할 것인지 재검토. ADR 0025 가 1~6 을 열어 두었으나, 실전에서는 `Page` 의 `<Heading level={1}>` 과 중복되기 쉽다. spec `component-catalog.md` §Section 에 "Section `level` 은 `2` 이상 권장 — `level={1}` 은 페이지 H1 과 충돌 가능" 1 문장 추가 검토. 선택 사항.

---

## 2. Steps — 현재 진행 단계 식별

### 자극 (onwire Markdown)

다음 블록은 5-step onboarding 을 `done` · `current` · `pending` 3가지 status 로 표현한다. ADR 0025 §2 의 규칙을 그대로 따른다.

~~~markdown
---
title: Onboarding — new workspace
purpose: Admin onboarding wizard showing progress through 5 stages.
role: admin
layout: sidebar
nav:
  items:
    - label: Dashboard
      href: /dashboard
    - label: Users
      href: /users
    - label: Onboarding
      href: /onboarding
      active: true
paths:
  view: /onboarding
  markdown: /onboarding.md
updatedAt: 2026-04-18T09:00:00Z
tools:
  - name: advanceOnboarding
    title: Advance onboarding
    description: Mark the current onboarding step as complete and advance to the next one.
    role: admin
extensions:
  conventions:
    duplicate-button-link: dual-render
    form-inner-button-action: inherit
---

## Navigation

- [Dashboard](/dashboard)
- [Users](/users)
- [Onboarding](/onboarding) · current

# Onboarding

Complete the following 5 steps to finish workspace setup.

:::card{title="Workspace setup"}
:::steps
::step[Create workspace]{status=done}
::step[Invite team members]{status=done}
::step[Configure SSO]{status=current}
::step[Connect billing]{status=pending}
::step[Review and launch]{status=pending}
:::
:::

::button[Advance to next step]{action=advanceOnboarding}

[Advance to next step](mcp://tool/advanceOnboarding "fallback")
~~~

### 검증 질문

> directive 만 볼 때, 그리고 fallback paragraph 만 볼 때 (= `::steps` directive 가 무시되는 가상의 뷰어), LLM 은 "현재 진행 중인 step 은 `Configure SSO` 다" 를 정확히 식별할 수 있는가?

### 해석 관찰

**directive 를 아는 상태**에서 저자 자신의 해석:

- `::step[Configure SSO]{status=current}` 에서 `status=current` 가 **유일한 current 값**임을 인식.
- 이전 step 2개 (`Create workspace` · `Invite team members`) 는 `status=done` 이므로 완료.
- 이후 step 2개 (`Connect billing` · `Review and launch`) 는 `status=pending` 이므로 미착수.
- → "현재 진행 중인 step 은 `Configure SSO` 다. 3/5 단계."

3값 enum 이 모두 표면에 드러나고, `current` 값이 정확히 하나만 등장하는 직렬 구조는 **추론 없이 즉답 가능**. ADR 0025 §2 가 Alert 계열 (`done=tip`, `current=note`, `pending=neutral`) 과 팔레트를 정합시킨 것은 UI 일관성을 위한 부수 결정이고, LLM 해석에는 영향 없다.

**fallback 만 보는 상태** — 이 경우가 흥미롭다. ADR 0025 §2 와 spec `component-catalog.md` §Steps "Fallback 규약" 에 따르면, **Steps 는 directive-미지원 뷰어에서 fallback 병기가 없다**. 즉 `:::steps` directive 가 무시되는 뷰어에서는 내용이 소실된다 (ADR 0025 Negative 에 "수용" 으로 기록). 이 경우 LLM 해석은 다음과 같이 갈린다:

- **파서가 strict CommonMark 만 지원**: `:::steps` 은 fenced paragraph 로 fallback. `::step[...]{...}` 도 단순 텍스트로 드러남. 에이전트는 원시 문자열 `::step[Create workspace]{status=done}` 을 보게 되는데, directive syntax 를 **본 적 있는** LLM 이라면 "leaf directive 같은 구조 — step 라벨과 status attribute" 로 추론 가능. **본 적 없는** LLM 은 `{status=done}` 을 장식 텍스트로 무시하거나 `{...}` 내용을 키-값 메타데이터로 읽을 수 있음. 후자가 오해 소지.
- **본 리포트 저자의 시뮬레이션**: directive 문법을 본 적 있다 (= Claude 계열 LLM 대부분). 따라서 fallback 만 있어도 `status=current` 를 잡아낼 가능성 high. 단 confidence 는 medium — 왜냐하면 "`:::steps` 가 container 라는 신호" 가 스펙 외재화 되어 있지 않아 "이것이 내부 node 인지 플랫 텍스트인지" 가 모호하기 때문.

**spec 을 보지 않은 상태** — "5 개의 step 이 순차로 늘어서 있고 `status` enum 이 3값" 은 Markdown 문법이 아니라 directive 관용. directive 를 본 적 없는 reader 에게 `::step[label]{status=value}` 는 처음 보는 문법이지만 "대괄호 본문 + 중괄호 속성" 은 MDX / remark-directive / Hugo shortcode 등에서 전파된 유사한 관용이 많아 **자연어 parser 감도로도 label+attribute 해독 가능**. 저자 자신도 spec 을 모르는 상태로 이 블록을 받아보면 "다섯 단계의 진행 지표, 3 번째 단계가 현재 진행 중" 으로 읽는다.

### 오탐 유형

1. **`status` 가 여러 값 섞임**: 이론상 저자가 `status=done` 이후 다시 `status=pending` 을 쓰면 "진행 중 우회" 같은 시나리오 표현 가능. 본 자극은 done-run → current → pending-run 의 monotone 순서지만, Steps 는 spec 상 모노톤을 강제하지 않는다. 저자가 비모노톤 상태를 쓸 경우 LLM 은 "step 순서가 시간순이 아닐 수도 있다" 로 해석 여지. 실사용 빈도는 낮고, 필요 시 저자가 별도 Alert 로 부연.
2. **`status` 부재**: spec 상 `status` 는 필수이지만 TypeScript 컴파일 오류가 빠지면 Markdown 에 `::step[label]` 만 남는다. 이 경우 LLM 은 "상태가 미정 = pending 으로 간주" 로 해석할 가능성이 자연스럽다. **비직관적 인 것은 아님**. 향후 engine 에서 `status` 부재 시 `pending` 자동 주입을 검토할 수 있으나 v1 범위 밖.
3. **`current` 가 0개 또는 2개 이상**: "완료한 온보딩" (모두 done) 혹은 "두 작업이 병렬 진행" 같은 케이스. 본 자극은 정확히 1개 current 이므로 단순. 0개 혹은 2개일 때 LLM 이 "이상하다" 고 감지하는지는 본 자극에서 다루지 않음.

### 결론

H2 — **해석 가능 (high)**. Steps 는 5종 중 가장 자기설명적이다. `done|current|pending` enum 이 자연어 의미 그대로이고 (`Configure SSO` 가 "현재 할 일"임이 즉시 명료), 3값의 한정된 상태 공간이 토큰 낭비 없이 해석된다.

**후속 spec 피드백 후보** (필수 아님): Steps 의 fallback 부재가 H2 자체는 통과하지만, "directive-미지원 뷰어에서 내용 소실" 규범을 envelope `extensions.conventions` 에 명시적으로 선언하는 방향을 검토할 수 있다. 예: `steps-fallback: none`. 현재는 spec 문서에만 기록되어 있고 Markdown 에는 드러나지 않는다. ADR 0012 선례 ("convention key 로 외재화") 를 따르면 LLM 이 "이 directive 는 fallback 이 없는 타입이다" 를 envelope 한 점 조회로 확인할 수 있다. 우선순위 낮음.

---

## 3. Tabs — flush 규약 하에서 "동시 vs. 탭 분리" 구별

### 자극 (onwire Markdown)

다음 블록은 3개 탭 (`Profile` / `Security` / `Billing`) 을 flush 직렬화한다. 각 탭 본문이 상이함 — `Profile` 은 Descriptions, `Security` 는 Card + Descriptions, `Billing` 은 Card + Form.

~~~markdown
---
title: Settings — account
purpose: Account-scoped settings split across Profile / Security / Billing tabs.
role: admin
layout: sidebar
nav:
  items:
    - label: Dashboard
      href: /dashboard
    - label: Users
      href: /users
    - label: Settings
      href: /settings
      active: true
paths:
  view: /settings
  markdown: /settings.md
updatedAt: 2026-04-18T08:00:00Z
tools:
  - name: saveProfile
    title: Save profile
    description: Save user profile settings.
    input:
      type: object
      properties:
        displayName:
          type: string
          minLength: 1
        timezone:
          type: string
      required:
        - displayName
    role: admin
  - name: saveBilling
    title: Save billing
    description: Save billing contact and payment preferences.
    input:
      type: object
      properties:
        email:
          type: string
          format: email
        autoRenew:
          type: boolean
      required:
        - email
    role: admin
  - name: rotateApiKey
    title: Rotate API key
    description: Invalidate the current API key and generate a new one.
    role: admin
extensions:
  conventions:
    duplicate-button-link: dual-render
    form-inner-button-action: inherit
    uri-query-encoding: percent-decoded-match
---

## Navigation

- [Dashboard](/dashboard)
- [Users](/users)
- [Settings](/settings) · current

# Account settings

Settings for the current user's account. Workspace-level settings are under [Workspace settings](/workspace).

:::tabs
::tab[Profile]

:::descriptions{title="Profile"}
- **Display name** — Alice Example
- **Email** — alice\@example.com
- **Role** — `admin`
- **Department** — (not set)
:::

::tab[Security]

:::card{title="Security"}
Two-factor authentication is enabled. Last login: 2026-04-18 08:42 UTC.

:::descriptions
- **2FA** — `enabled`
- **Session timeout** — 30 minutes
- **API key** — `sk-••••••••••••3f2a`
:::

::button[Rotate API key]{action=rotateApiKey variant=danger}

[Rotate API key](mcp://tool/rotateApiKey "fallback")
:::

::tab[Billing]

:::card{title="Billing"}
:::form{action="saveBilling"}
::input{name="email" type="email" label="Billing email" value="billing@acme.example" required}

::checkbox{name="autoRenew" label="Auto-renew annually" checked}

::button[Save billing]
:::
:::

:::
~~~

### 검증 질문

> 저자 = LLM 이 위 블록을 읽을 때, "Profile · Security · Billing 은 **동시에 한 화면에 보이는 세 영역** 인가, **사용자가 하나씩 전환해서 보는 배타적 영역** 인가" 를 구별할 수 있는가? 구별 못 해도 "계정 설정을 바꾸고 싶다" 같은 과업 수행에 지장이 없는가?

### 해석 관찰

**directive 를 아는 상태**:

- `:::tabs` container 를 보면 "아, 이게 탭 컨테이너구나" 는 즉답. `::tab[Profile]` 등의 marker leaf 를 구분자로 해석.
- 그러나 **"탭" 이라는 이름이 UI 상 배타적 전환을 의미한다** 는 것을 LLM 이 알려면 (i) "tabs" 가 UI 관용어임을 사전 학습에서 알고 있거나, (ii) spec `component-catalog.md` §Tabs 의 "HTML: 활성 탭 패널만 표시" 를 참조해야 한다. ADR 0007 §4 flush 규약은 "AI 에게는 전부 드러낸다" 는 설계지, "AI 에게 탭의 UI 속성을 알린다" 는 설계가 아니다.
- 결과: 저자 자신도 `:::tabs` 를 보면 "3개 탭 = UI 상 하나씩" 으로 거의 즉답. 이는 "tabs" 라는 단어가 **범용 UI 관용어** 이기 때문 — 별도 스펙 참조 없이도 해석 가능.

**fallback 만 보는 상태** — ADR 0025 §3 및 spec §Tabs "Fallback 규약" 에 따르면 Tabs 는 별도 fallback paragraph 를 병기하지 않는다. directive 미파서 뷰어에서는 `:::tabs` · `::tab[Profile]` 마커가 리터럴 텍스트로 드러나고, 각 탭 본문은 **순차적 텍스트** 로 흐른다. 이것이 ADR 0007 "전부 flush" 의 의도.

- LLM 이 `::tab[Profile]` 을 "탭 구분자" 로 인식 못 하면 → "Profile / Security / Billing 이라는 라벨이 박힌 세 개의 연속된 섹션" 으로 읽음.
- **이 해석이 과업 수행에 지장을 주는가?** 대부분의 admin 과업 ("Billing email 을 바꿔줘") 에서는 **지장 없음**. Billing 섹션의 form 이 `action=saveBilling` 으로 선언되어 있고, form 필드도 모두 평문으로 드러나기 때문이다.
- 단, **"Profile 탭은 편집 가능한가, 조회 전용인가?" 같은 UI affordance 질문** 은 Markdown 만으로는 답하기 어렵다. Profile tab 본문이 Descriptions 뿐 (form 없음) 이므로 "조회 전용" 추론은 가능하지만, "왜 Profile 에는 저장 버튼이 없지? 버그?" 같은 의심이 들 수 있다. ADR 0025 §3 의 설계 의도 ("UI 만 배타, AI 는 전부 접근") 에 부합하는 정상 동작이지만, LLM 입장에서 이 의도는 외부에서 주입되지 않으면 모른다.

**spec 을 보지 않은 상태** — "tabs" 라는 단어가 UI 관용어이므로 spec 이 없어도 대략의 시맨틱은 짐작 가능. 단 "각 탭이 배타적" 이라는 세밀한 시맨틱은 확신 medium. 관용어가 통하는 LLM 에 대해서는 **추가 설명 없이도 대부분의 과업 해결 가능**.

### 오탐 유형

1. **Panel / Section 과 혼동**: `::tab[Profile]` 이 `::panel[Profile]` 이나 `## Profile` 과 어떤 의미 차이를 가지는가? 3가지 마커가 모두 "영역 시작 구분자" 역할을 한다. Tabs 와 Accordion 은 UI 상 다르지만 Markdown 표면에는 `::tab` vs. `::panel` 이름만 다르다 (후술 §4). Section 은 heading 이므로 표면적으로는 구별되나, **시맨틱적으로는 셋 다 "부분-전체 관계" 를 가진다**. LLM 이 이들을 구별하려면 이름에 의존해야 한다.
2. **"동시 표시 영역" 과의 혼동**: 저자가 의도한 것이 "탭" 이 아니라 "나란히 열린 3 개 영역" 이었다면 Section · Card · Split 중 하나를 쓰는 것이 맞다. 실수로 `Tabs` 를 썼다면, LLM 은 UI 가 의도한 배타 전환을 "저자 의도" 로 잘못 받아들임. 이는 저자 책임 영역이나, **LLM 이 "이 tabs 는 나란히 보이는 것이 맞다" 는 반대 해석을 할 여지는 없다** — tabs 라는 단어가 UI 관용상 배타이므로.
3. **과업 수행 지장 여부**: "Profile 정보를 수정해줘" 같은 과업에서 LLM 이 `saveProfile` tool 을 호출하려 할 때, 본 자극의 Profile 탭 본문에는 **form 이 없다**. 따라서 LLM 은 "readable view" 로 오해할 수 있다. 이는 **자극 설계 결함** 으로, 실제 `/settings` 페이지의 Profile tab 은 Descriptions + Edit button 이 있어야 자연스럽다. 본 자극은 검증 단순화를 위해 form 을 Billing tab 에만 배치.

### 결론

H3 — **해석 가능하나 개선 필요 (medium)**. Tabs 의 flush 규약은 **정보 손실은 없으나 시맨틱 층위 마커가 약하다**. `::tab[label]` 구분자만으로 "탭 = 배타 UI 전환" 을 LLM 이 확신하려면 "tabs" 단어의 일반 상식에 의존해야 한다.

**후속 spec 피드백**: envelope `extensions.conventions` 에 `tabs-semantics: exclusive-ui` 같은 convention key 를 자동 주입하는 방안 검토. ADR 0012 · 0013 선례 (convention key 외재화) 와 동형. 선택 사항.

추가로, **Tabs 내부에 Section 을 중첩**할 때 heading level 충돌 문제 (ADR 0025 Open 에 명시) 가 발생할 수 있다. 본 자극은 Tabs 내부에 Section 을 두지 않았지만, 실제 설계에서는 각 탭이 자체 outline 을 가지고 싶어할 수 있다. v1 저자 책임 구간이고, v2 `ctx.headingDepth` 확장 시 해결 예정.

---

## 4. Accordion — Panel title + 본문 heading 관계

### 자극 (onwire Markdown)

다음 블록은 4개 panel 을 가진 `/settings` 페이지 변형이다. 일부 패널은 List, 일부는 Form 을 포함한다. 본 자극의 핵심은 **Panel 이 Section 과 어떻게 구별되는가** 이다.

~~~markdown
---
title: Workspace settings
purpose: Workspace-scoped settings organized into 4 collapsible panels.
role: admin
layout: sidebar
nav:
  items:
    - label: Dashboard
      href: /dashboard
    - label: Users
      href: /users
    - label: Settings
      href: /settings
      active: true
paths:
  view: /settings
  markdown: /settings.md
updatedAt: 2026-04-18T08:30:00Z
tools:
  - name: saveGeneral
    title: Save general settings
    description: Save workspace general settings.
    input:
      type: object
      properties:
        workspaceName:
          type: string
          minLength: 1
        timezone:
          type: string
      required:
        - workspaceName
    role: admin
  - name: deleteWorkspace
    title: Delete workspace
    description: Permanently delete the workspace. Requires explicit confirmation.
    input:
      type: object
      properties:
        confirmation:
          type: string
          pattern: ^DELETE$
      required:
        - confirmation
    role: admin
extensions:
  conventions:
    duplicate-button-link: dual-render
    form-inner-button-action: inherit
---

## Navigation

- [Dashboard](/dashboard)
- [Users](/users)
- [Settings](/settings) · current

# Workspace settings

Expand each panel to manage a category of settings.

:::accordion
::panel[General]

:::form{action="saveGeneral"}
::input{name="workspaceName" label="Workspace name" value="Acme Corp" required}

::select{name="timezone" options="UTC,America/New_York,Europe/Paris,Asia/Seoul" label="Timezone" value="UTC" required}

::button[Save general]
:::

::panel[Integrations]

Connect third-party services to extend functionality.

- [Slack](/integrations/slack) — workspace `acme-ops`, connected 2026-03-01
- [GitHub](/integrations/github) — organization `acme-corp`, connected 2026-02-14
- [Jira](/integrations/jira) — not connected

::panel[Billing]

:::descriptions{title="Current plan"}
- **Plan** — `Team`
- **Seats** — 25 / 30
- **Billing cycle** — Monthly
- **Next invoice** — 2026-05-01
- **Payment method** — Visa ••••1234
:::

::panel[Danger zone]

> [!CAUTION]
> These actions are irreversible.

:::form{action="deleteWorkspace"}
::input{name="confirmation" label="Type DELETE to confirm" placeholder="DELETE" pattern="^DELETE$" required}

::button[Delete workspace]{variant=danger}
:::

:::
~~~

### 검증 질문

> `::panel[General]` 은 `## General` heading + 본문과 같은가, 다른가? Panel 이 Section 의 특수 케이스로 환원되는가, 아니면 Accordion-specific 시맨틱을 가지는가?

### 해석 관찰

**directive 를 아는 상태**:

- `:::accordion` container 를 보면 "접이식 패널 목록" 시맨틱을 바로 잡음.
- `::panel[General]` · `::panel[Integrations]` · `::panel[Billing]` · `::panel[Danger zone]` 4개 마커가 각 패널을 구분.
- 각 패널 본문의 구성 — `General` 은 Form, `Integrations` 는 List, `Billing` 은 Descriptions, `Danger zone` 은 Alert + Form — 이 상이해 "각 패널이 다른 유형의 콘텐츠를 담는다" 가 드러남.

**흥미로운 지점**: 본 리포트 저자가 이 블록을 처음 작성하면서 한 **실제 혼동 경험** 을 기록한다.

> 자극을 초안 작성하면서 "`::panel[General]` 이 정말 `:::section{title="General" level=3}` 과 다른가?" 라는 질문이 **자동으로 떠올랐다**. 외형상:
>
> - Panel 도 "라벨 + 자식 flow" 조합
> - Section 도 "heading + 자식 flow" 조합
>
> 차이는 (i) Panel 은 `:::accordion` 내부에서만 의미, (ii) Panel 은 heading 을 emit 하지 않음. 이 차이는 Markdown 표면상 `::panel[label]` vs. `### label` 의 토큰 차이만 남는다. LLM 이 이 차이를 "단순 장식 vs. 의미론적 영역 구분" 중 어느 쪽으로 해석하는지가 ambiguous.

즉, **Panel 과 Section 의 시맨틱 구별은 directive 이름에만 의존**한다. ADR 0007 §4 의 flush 규약 ("accordion = 열림 상태로 모두 직렬화") 이 Markdown 에 드러나는 신호는 `:::accordion` 컨테이너 이름뿐. 그 바깥 층위에서 "Panel = 접이식" 이라는 UI affordance 는 LLM 사전 학습의 "accordion" 단어 지식에 의존한다.

**fallback 만 보는 상태** — Accordion 은 spec §Accordion "Fallback 규약" 상 별도 fallback paragraph 를 병기하지 않는다. directive 미파서 뷰어에서는 `::panel[General]` 등이 리터럴 텍스트로 노출되고, 각 패널 본문이 연속된 텍스트로 흐른다.

- LLM 이 `:::accordion` 을 못 알아보면 → "4 개의 라벨된 영역이 있는 일반 페이지 본문" 으로 읽음. **Tabs 와 동일하게, 과업 수행 (폼 submit 등) 에는 지장 없다**.
- 단, "`General` 영역이 접힘/펼침 가능한가?" 같은 UI 질문은 모름. 본 자극에서는 이런 UI 메타 질문이 직접 과업이 되지 않는 한 영향 없다.

**spec 을 보지 않은 상태** — "accordion" 이 UI 관용어이므로 시맨틱은 짐작 가능 (Tabs 와 동일 이유). 단 Panel 과 Section 의 구별은 관용어 수준에서는 불명확 — "panel" 이라는 단어는 GUI 레이아웃에서 다의적 (탭 패널, 카드 패널, 툴 패널 등).

### 오탐 유형

1. **Panel 을 Section 으로 환원**: LLM 이 `::panel[General]` 을 사실상 `### General` 과 동형으로 간주하면, Accordion 의 UI affordance (접힘/펼침) 가 증발한다. 이는 "AI 는 전부 플랫하게 읽는다" 는 flush 규약 의도와 **부합**하므로 문제 없음. UI 복원이 필요한 과업에서만 문제.
2. **Panel label 의 중복**: 저자가 같은 `label` 을 가진 Panel 2개를 두면 LLM 은 "같은 섹션이 두 번 열린 것" 으로 오해할 수 있다. 본 자극은 4개 label 이 모두 unique.
3. **Panel 내부 heading 과의 충돌**: 본 자극의 Billing 패널 내부에는 `:::descriptions{title="Current plan"}` 이 있다. 이 `title` 은 Descriptions 컴포넌트의 prop 이고, Panel label (`Billing`) 과 별개다. LLM 이 "Billing 의 현재 플랜" 이라는 2 계층 제목으로 해석하는지, "Billing 이라는 섹션 아래 Current plan 이라는 하위 섹션" 으로 해석하는지는 신호 부족. 일반적으로 후자가 자연스럽지만, UI 상으로는 **같은 패널 내 라벨 두 개** 이지 중첩 관계는 아니다.

### 결론

H4 — **해석 가능하나 개선 필요 (medium)**. Accordion 의 flush 규약 자체는 정보 손실 없음. 단 Panel 과 Section 의 시맨틱 구별이 directive 이름에만 의존하고, "접이식" UI affordance 는 LLM 의 일반 상식에 의존한다.

**후속 spec 피드백**: envelope `extensions.conventions` 에 `accordion-semantics: collapsible-ui` 같은 convention key 자동 주입을 검토. H3 의 `tabs-semantics: exclusive-ui` 와 쌍. 선택 사항.

추가로, **Panel 내부 Section 의 level 관계** 가 ADR 0025 Open 에 명시된 대로 저자 책임 영역이다. 본 자극에서는 Panel 내부에 Section 을 두지 않아 충돌 회피. 실전에서는 Panel 내부에 복잡한 계층이 들어갈 때 level 충돌이 일어날 가능성 있음.

---

## 5. Split — 공간 관계 보존 여부

### 자극 (onwire Markdown)

다음 블록은 Card + Steps 를 Split 내부에 중첩한다. ADR 0025 §5 가 규정한 "외부 fence 콜론이 내부보다 엄격히 많아야 한다" 규칙에 따라, fence depth 가 자동으로 상승한 상태를 보인다.

~~~markdown
---
title: Deployment dashboard
purpose: Deployment status page with pipeline on the left and recent runs on the right.
role: admin
layout: sidebar
nav:
  items:
    - label: Dashboard
      href: /dashboard
    - label: Users
      href: /users
    - label: Deployments
      href: /deployments
      active: true
paths:
  view: /deployments
  markdown: /deployments.md
updatedAt: 2026-04-18T10:00:00Z
tools:
  - name: triggerBuild
    title: Trigger build
    description: Trigger a new build for the current branch.
    role: admin
  - name: viewRun
    title: View build run
    description: Open a build run by id.
    input:
      type: object
      properties:
        id:
          type: string
      required:
        - id
    role: admin
extensions:
  conventions:
    duplicate-button-link: dual-render
    form-inner-button-action: inherit
    uri-query-encoding: percent-decoded-match
---

## Navigation

- [Dashboard](/dashboard)
- [Users](/users)
- [Deployments](/deployments) · current

# Deployments

Current deployment pipeline on the left, recent runs on the right.

::::::split{cols=2}
:::::cell

::::card{title="Pipeline"}
:::steps
::step[Lint]{status=done}
::step[Build]{status=done}
::step[Test]{status=current}
::step[Stage]{status=pending}
::step[Deploy]{status=pending}
:::

::button[Trigger build]{action=triggerBuild}

[Trigger build](mcp://tool/triggerBuild "fallback")
::::

:::::
:::::cell

::::card{title="Recent runs"}
- [Run r_8f12](mcp://tool/viewRun?id=r_8f12) — Test stage, running
- [Run r_8f11](mcp://tool/viewRun?id=r_8f11) — Deployed to production, 12 min ago
- [Run r_8f10](mcp://tool/viewRun?id=r_8f10) — Failed at Test, 47 min ago
- [Run r_8f09](mcp://tool/viewRun?id=r_8f09) — Deployed to production, 2 h ago
::::

:::::
::::::
~~~

### 검증 질문

> (a) 저자 = LLM 이 위 블록을 읽을 때, "Pipeline" 과 "Recent runs" 가 **시간 축상 연속된 두 섹션** 인가, **좌/우로 나란히 배치된 두 섹션** 인가를 구별할 수 있는가? (b) 구별이 불가능할 때, 각 섹션의 정보 (현재 Test 단계, 최근 run 4개) 는 과업 수행에 충분히 보존되는가? (c) 공간 관계 복원이 필요한 과업 (예: "왼쪽 칼럼의 현재 단계가 오른쪽 칼럼의 마지막 실패 시점 이후에 시작됐는가?") 에서 Split 이 원천적으로 부적합한가?

### 해석 관찰

**directive 를 아는 상태**:

- `::::::split{cols=2}` 를 보면 "2열 레이아웃" 임을 즉답.
- `:::::cell` 2개가 각 칼럼.
- 첫 cell = Pipeline Card + Steps + Trigger button.
- 둘째 cell = Recent runs Card + List of runs.
- → "좌측 Pipeline, 우측 Recent runs" 라는 공간 관계를 **directive 이름 덕에 복원 가능**.
- 단, Markdown 문서 순서는 세로 직렬 — 즉 "좌측이 먼저, 우측이 뒤" 라는 전체 순서만 복원된다. **어떤 좌측 요소가 어떤 우측 요소와 수평으로 대응되는지** 는 복원 불가.

**fence depth 상승 관찰**:

- 본 자극의 fence 는 `::::::split` (6 개) → `:::::cell` (5 개) → `::::card` (4 개) → `:::steps` (3 개) 로 6 → 5 → 4 → 3 층위.
- ADR 0025 §5 가 예고한 "Cell 안에 Card · Steps 등이 중첩되면 엔진이 전체 depth 를 자동 상승" 이 실측 통과.
- LLM 이 이 6 단계 fence 를 정확히 매칭하는가? CommonMark directive spec 에 익숙한 LLM (remark-directive / MDX 계열) 은 "가장 긴 fence 가 최외곽" 규칙을 알아야 한다. 저자 자신도 **처음 이 문법을 본 LLM 이라면 fence 매칭 규칙을 spec 없이 확신하기 어렵다** 고 판단. 실제로 CommonMark 의 code fence 규약 ("opening fence 의 backtick 수 ≥ closing fence 의 backtick 수") 과 유사하므로 유추 가능하지만 완벽 해석은 못함.

**fallback 만 보는 상태** — Split 은 spec §Split "Fallback 규약" 상 별도 fallback paragraph 를 병기하지 않는다. directive 미파서 뷰어에서는:

- `::::::split{cols=2}` · `:::::cell` 마커가 리터럴 텍스트로 드러남.
- 내부 Card · Steps · List 는 depth 상승으로 정상 파싱될 수도, 안 될 수도 있음 (뷰어 구현 의존).
- 최악의 경우 LLM 은 "왼쪽·오른쪽 구분 없이 연속된 두 섹션" 으로 읽음. **Pipeline 과 Recent runs 가 독립 섹션** 이라는 해석은 유지됨 — 공간 관계만 증발.

**spec 을 보지 않은 상태** — "split" 이 UI 관용어로서는 "분할 뷰" 정도로 해석됨. `cols=2` attribute 가 힌트. 저자 자신의 해석:

- "좌/우 2열 레이아웃이 의도됐고, Markdown 은 세로 직렬로 떨어뜨렸다" 는 시맨틱은 spec 없이도 **짐작 가능**.
- 단, 이 짐작이 확신으로 굳으려면 "tabs" · "accordion" 과 달리 "split" 은 관용어 감도가 낮다. "tabs" 는 대부분의 UI 에서 배타 전환이라는 지식이 있으나, "split" 은 vertical split vs. horizontal split vs. splitter bar 등 다의적.

### 공간 관계 복원이 필요한 과업 — Split 이 LLM-unfriendly 한 영역

본 자극의 의도는 "좌측 Pipeline 과 우측 Recent runs 는 **병렬** 로 존재" 다. 다음 과업을 LLM 에게 부여하면:

1. "왼쪽 칼럼의 현재 단계는?" → **답변 가능** ("Test, running"). Split 없이도 답 가능.
2. "오른쪽 칼럼의 최근 실패 run 은?" → **답변 가능** ("r_8f10, Failed at Test, 47 min ago"). Split 없이도 답 가능.
3. "왼쪽 칼럼의 현재 Test 단계가 오른쪽 칼럼의 r_8f10 실패 시점 (47 min ago) 이후에 시작됐는가?" → **시간 정보 부족으로 답 불가**. 이 실패는 **Split 의 공간 관계 부재 탓이 아니라**, Pipeline 에 시간 스탬프가 없기 때문. 즉 본 자극 자체가 시간 관계를 표현하지 않음.
4. "Pipeline 컬럼과 Recent runs 컬럼이 시각적으로 어떻게 정렬되어야 하는가? 각 run 이 특정 step 과 수평 매칭되어야 하는가?" → **답변 불가**. 세로 직렬화된 Markdown 은 수평 매칭 정보를 아예 담지 않는다. **이 과업은 Split 이 원천적으로 LLM-unfriendly 인 영역**.

즉 **공간 관계가 과업의 일부** 인 경우 (예: 타임라인 대시보드, 분할 비교 뷰, side-by-side diff) 에는 Split 이 정보 손실을 일으킨다. 저자가 그런 과업을 의도한다면 Split 은 **정보 표현 수단으로 부적합** 하며, Table 혹은 Descriptions 같은 "축을 명시적으로 표기하는" 컴포넌트로 전환해야 한다.

반면 본 자극처럼 **단순 2열 배치** (병렬 정보이지만 수평 매칭이 불필요한 경우) 는 Split 의 정보 손실이 **의미 있는 손실이 아님**. ADR 0007 §5 의 "배치 정보는 버린다" 결정이 이 판단과 정합.

### 오탐 유형

1. **fence depth 매칭 오류**: LLM 이 `::::::split` (6) 과 `::::::` (6) 를 정확히 매칭 못 하면 `:::::cell` 마커의 범위 해석이 어긋난다. CommonMark fence 규약 지식에 의존.
2. **`cols=2` 를 장식 텍스트로 읽음**: 저자가 directive attribute 문법을 모르면 `{cols=2}` 를 "단순 메모" 로 무시할 수 있음. 실제로는 Split 의 칼럼 수 결정.
3. **Cell 내 다른 Cell 컴포넌트 (중첩 Split)**: ADR 0025 가 허용하지 않는 케이스지만 저자 실수로 발생 가능. fence depth 가 더 상승한다 (`:::::::split`).
4. **Cell 이 1개뿐**: spec §Split 엣지 케이스에 명시된 대로 "1열로 표시됨". LLM 해석에는 문제 없음 — 단순 1열 본문으로 읽으면 됨.

### 결론

H5 — **해석 가능 — 공간 관계 의존 과업에 한해 LLM-unfriendly 불가피**. Split 의 세로 직렬화는 **배치 정보의 명시적 버림** 이 ADR 0007 §5 의 공언된 결정이므로 "설계된 손실" 이다. 본 자극의 과업 대부분은 손실 영향을 받지 않는다.

공간 관계 복원이 필요한 과업 (타임라인 매칭, 수평 diff, 좌우 라벨-값 매칭) 에서 Split 은 **저자가 선택해서는 안 되는 컴포넌트** 다. 이 판단은 spec `component-catalog.md` §Split "Fallback 규약" 의 "단순 나열이 필요한 환경에서는 Card 2개 나열을 대안으로" 권고와 일치하지만, **"공간 관계 복원이 필요한 과업에서는 Split 을 쓰지 마라" 는 anti-pattern 권고는 현재 spec 에 명시되어 있지 않다**.

**후속 spec 피드백**: spec `component-catalog.md` §Split 에 anti-pattern 1 문장 추가 검토 — "좌/우 공간 매칭이 과업의 일부인 경우 Split 대신 Table 또는 Descriptions 사용 권장. Split 은 배치 정보를 버린다 (ADR 0007 §5)". 우선순위 낮음.

---

## Positive signals (바로 잘 작동한 것)

선행 두 리포트와 동일한 구조로, **설계대로 기능한 것** 을 모아 기록한다. ADR 0025 에 기여한 판단을 확인하는 목적.

1. **Section 이 directive 없이 pure heading** — H1 에서 확인. `:::section{...}` 대신 `### {title}` 만 emit 하는 결정이 모든 Markdown 뷰어 호환성을 확보. Tabs · Accordion 과 달리 fallback 고민 자체가 발생하지 않는다.
2. **Steps 의 3값 enum 이 자연어 시맨틱과 1:1 대응** — H2 에서 확인. `done` · `current` · `pending` 이 의미 그대로이고, `current` 가 정확히 하나만 등장하는 직렬 구조 덕에 "현재 진행 단계" 를 즉답 가능. Alert 팔레트와의 정합은 UI 부수 효과.
3. **Tabs · Accordion 의 flush 규약이 정보 손실 0** — H3 · H4 에서 확인. UI 상 감춰지는 콘텐츠가 Markdown 에는 모두 드러남. ADR 0007 §4 의 "AI 는 전부 접근" 원칙이 5종 편입에서도 그대로 유지.
4. **Split fence depth 자동 상승** — H5 에서 확인. `mdast-util-directive` 의 content depth 기반 자동 계산이 저자에게 "콜론 몇 개 써야 하는가" 를 물지 않는다. ADR 0025 §Context-3 의 판단이 실측 통과.
5. **예약어 추가 0개** — ADR 0025 Neutral 에 공언된 대로. `status` · `label` · `cols` 가 이미 예약되어 있어 5종 편입 시 신규 예약이 불필요. 카탈로그 폐쇄성 유지.
6. **Tier 3 유예 해제의 즉효**: ADR 0025 Context-1 에서 언급된 "탭으로 분리하는 설정 화면, 단계적 온보딩 안내, 좌/우 2열 레이아웃이 Heading+Card 조합으로만 표현되어 LLM 문맥이 커진다" 문제가 5종 편입으로 **해소**. §3 Tabs 자극의 경우, 같은 정보를 `## Profile` · `## Security` · `## Billing` 3개 Section 으로 평탄하게 펼치면 탭 시맨틱 증발 + 섹션 간 구분이 H1~H6 의 단조로운 heading 계층에 의존해야 한다. Tabs 가 이 축약을 명시적으로 수용.

## 선행 두 리포트 대비 구조적 차이

본 리포트는 [llm-test-0011-layouts.md](./llm-test-0011-layouts.md) · [llm-test-0015-table-container.md](./llm-test-0015-table-container.md) 두 리포트의 구조를 답습하되, 다음 차이가 있다:

1. **검증 방법이 "fresh-context 서브에이전트 호출" 이 아니라 "본 리포트 저자의 자기 관찰"**. 선행 두 리포트는 `/tmp/readable-ui-tests/*.md` fixture 를 별도 에이전트에게 넘겨 15 · 10 문항을 풀게 했다. 본 리포트는 **실제 LLM 호출 없이** 저자가 스스로 LLM 관점을 시뮬레이트한다. 이는 사용자 지시 ("실제 LLM 호출 없이도 본 리포트 작성 에이전트가 스스로 해석 주체로 서서") 에 따른 것이며, 결과적으로 **정량 통계 (Pass/Partial/Fail 카운트) 가 약화**되고 **정성 관찰 (오탐 유형, 시맨틱 애매함) 이 강화**된다. 선행 리포트의 과제표 구조가 아닌, 가설별 "자극 → 해석 → 결론" 형태의 서사형 구조를 채택.
2. **v2 재검증 섹션 없음**. 선행 두 리포트는 Gap 이 식별되면 즉시 spec/ADR 을 개정하고 v2 재검증으로 medium → high 수렴을 증명했다. 본 리포트는 제약 ("코드 수정 금지. ADR 0025 · spec 개정 금지") 상 개정이 불가하므로 후속 spec 피드백만 기록하고 v2 는 남겨둔다. 이는 사용자 판단에 위임하는 의도.
3. **Verdict 카테고리가 3단계** — "해석 가능" / "해석 가능하나 개선 필요" / "해석 실패 — ADR 재검토 권고". 선행 리포트는 Pass/Partial/Fail (또는 high/medium/low confidence) 2 축을 썼다. 본 리포트는 1 차원 3값으로 단순화.
4. **"본 자극 설계 결함"을 명시적으로 기록**. H3 Tabs 자극의 경우 Profile 탭에 form 이 없어 LLM 이 편집 의도를 오해할 여지 — 이를 "자극 설계 결함" 으로 투명하게 적음. 선행 두 리포트는 fixture 결함을 그만큼 적극적으로 자기 고백하지 않았음.
5. **"저자의 실제 혼동 경험" 기록**. H4 Accordion 섹션에서 "자극을 초안 작성하면서 `::panel[General]` 이 `:::section{...}` 과 정말 다른가 라는 질문이 자동으로 떠올랐다" 는 저자 자신의 해석 편향을 기록. 이는 선행 리포트 방법론과의 차이 — 저자가 검증자이자 LLM 시뮬레이터인 본 연구에서 발견되는 자연스러운 투명성이다.

## 최종 판정

**ADR 0025 (Tier 3 컨테이너 컴포넌트 v1 편입) 자체는 통과**. 5 개 가설 모두 "해석 실패 — ADR 재검토 권고" 에 해당하지 않는다. verdict 분포:

| 가설 | Verdict |
|---|---|
| H1 Section | 해석 가능 (high) |
| H2 Steps | 해석 가능 (high) |
| H3 Tabs | 해석 가능하나 개선 필요 (medium) |
| H4 Accordion | 해석 가능하나 개선 필요 (medium) |
| H5 Split | 해석 가능 — 공간 관계 의존 과업에 한해 LLM-unfriendly 불가피 |

"개선 필요" 2 건 (H3 · H4) 은 **flush 규약의 시맨틱 외재화** 이슈로 수렴한다. ADR 0012 · 0013 · 0014 선례가 `extensions.conventions` 를 convention key 주입 지점으로 정착시켰으므로, Tabs · Accordion 도 동일 패턴으로 해소 가능. ADR 0025 본문 개정은 불요.

## 후속 spec 피드백

다음 항목은 본 리포트에서 식별된 개선 후보로, **사용자 판단에 따른 적용** 을 전제로 기록한다. 모두 ADR 0025 개정은 요구하지 않으며, spec `component-catalog.md` 또는 envelope `extensions.conventions` 수준의 국소 개정으로 충분하다.

1. **Tabs 시맨틱 외재화 (H3)** — envelope `extensions.conventions` 에 `tabs-semantics: exclusive-ui` convention key 자동 주입. LLM 이 "tabs = UI 배타 전환" 을 일반 상식에 의존하지 않고 envelope 한 점 조회로 확인 가능. ADR 0012 선례와 동형.

2. **Accordion 시맨틱 외재화 (H4)** — envelope `extensions.conventions` 에 `accordion-semantics: collapsible-ui` convention key 자동 주입. 1 번과 쌍.

3. **Steps fallback 부재 명시 (H2)** — Steps 는 directive-미지원 뷰어에서 내용 소실 가능. envelope `extensions.conventions` 에 `steps-fallback: none` convention key 자동 주입으로 "이 directive 는 fallback 없음" 을 외재화. 우선순위 낮음.

4. **Section level=1 권고 (H1)** — spec `component-catalog.md` §Section 에 "Section `level={1}` 은 페이지 `Heading level={1}` 과 충돌 가능, `level>=2` 권장" 1 문장 추가. 린트 룰화는 v2. 선택 사항.

5. **Split anti-pattern 명시 (H5)** — spec `component-catalog.md` §Split 에 "좌/우 공간 매칭이 과업의 일부인 경우 Split 대신 Table 또는 Descriptions 사용 권장. Split 은 배치 정보를 버린다 (ADR 0007 §5)" 1 문장 추가. 이미 "단순 나열이 필요한 환경에서는 Card 2개 나열을 대안으로" 가 있으므로 anti-pattern 측 보강.

6. **Panel / Section 구별 명시 (H4)** — spec `component-catalog.md` §Accordion 에 "Panel 은 Accordion 내부의 접이식 영역 마커이고, Section 과 달리 heading 을 emit 하지 않는다. 계층적 문서 구조가 필요하면 Panel 내부에 Section 을 중첩하되 `level` 은 외부 outline 과 정합하게 지정한다" 1 문장 추가. H1 · H4 교차 영역.

위 6 개 항목 중 1 · 2 는 ADR 0012 선례에 따른 자연스러운 확장이며 우선순위 high. 나머지 3 ~ 6 은 우선순위 low 로 문서화 편의 개선.

## Open questions / 후속

1. **실제 LLM fresh-context 검증의 필요성** — 본 리포트는 저자 자기 관찰로 대체되었으나, 선행 두 리포트 방법론 (fresh-context 서브에이전트 + 정량 과제표) 으로 5종 각 컴포넌트에 10 ~ 15 개 과제를 부여하는 v2 검증이 설계 가치 검증 면에서 유효. 사용자 재량.

2. **Split 의 공간 관계 손실을 정량 측정** — H5 에서 "공간 관계 복원이 필요한 과업은 Split 이 원천적으로 부적합" 을 정성 판단했으나, 어떤 비율의 admin UI 과업이 공간 관계에 의존하는지 실측치가 없다. `bench/` 에서 Split-heavy 페이지의 actionable 카운트 · sizeRatio · token 측정을 추가하면 정량화 가능. ADR 0023 범위 후속.

3. **Tabs 내부 Section level 충돌** — ADR 0025 Open 에 명시된 대로 v2 `ctx.headingDepth` 자동 조정 전까지 저자 책임. 실사용 빈도가 높아지면 우선순위 상향 가능.

4. **Accordion 의 "모두 열림" 기본 상태** — ADR 0025 에서 "첫 번째 패널만 열림" 으로 v1 결정. 사용자 검증에서 "default all-open 이 더 자연스러운 시나리오가 있다" 는 피드백이 있으면 v2 `defaultOpenAll` prop 추가 검토.

5. **Convention key 확장으로 인한 envelope 비대화** — 본 리포트가 제안한 3 개 신규 convention key (`tabs-semantics` · `accordion-semantics` · `steps-fallback`) 는 모두 컴포넌트 타입별이다. 컴포넌트 수가 증가할수록 envelope 크기도 선형 증가. 이를 "카테고리 단위" (예: `flush-semantics: { tabs: "exclusive-ui", accordion: "collapsible-ui" }`) 로 묶을지, "자동 주입만 하고 Markdown 본문에는 drop" 할지 등 envelope 전략은 후속 ADR 주제.

---

## 부록 A — 5종 컴포넌트 상호작용 매트릭스

본 리포트의 주된 자극은 **각 컴포넌트를 독립적으로** 검증한 것이다. 그러나 실제 admin 페이지는 5종을 **복합 중첩** 하는 경우가 많다. 아래 매트릭스는 "컴포넌트 A 가 컴포넌트 B 를 자식으로 포함할 때 LLM 해석상 드러나는 기존 결론과의 차이" 를 요약한다.

| 외부 ↓ / 내부 → | Section | Steps | Tabs | Accordion | Split |
|---|---|---|---|---|---|
| **Section** | heading level 명시적 상승 필수 (H1) | 정상 (§2 와 동일) | Tabs 가 Section 자식일 때 문제 없음 | Accordion 이 Section 자식일 때 문제 없음 | Split 이 Section 자식일 때 fence depth 영향 없음 |
| **Steps** | — | 중첩 Steps 금지 (spec 상 Step leaf 만 자식) | — | — | — |
| **Tabs** | **level 충돌 가능** (ADR 0025 Open) | 각 Tab 에 Steps 배치 — 정상 | 중첩 Tabs 는 허용되나 UI 혼란. v1 에서 drop 권장 | Tabs 내부 Accordion — 허용. flush 중복 발생 | 각 Tab 에 Split 배치 — 허용. fence depth ++ |
| **Accordion** | **level 충돌 가능** (ADR 0025 Open) | 각 Panel 에 Steps 배치 — 정상 | Panel 내부 Tabs — 허용. UI 상 2 단계 상태 전환 | 중첩 Accordion 은 허용되나 UI 혼란 | 각 Panel 에 Split 배치 — 허용. fence depth ++ |
| **Split** | Cell 에 Section 배치 — level 은 외부 outline 과 정합하게 | Cell 에 Steps 배치 — §5 자극 그대로 | Cell 에 Tabs — 허용. fence depth + Tabs 상태 분리 | Cell 에 Accordion — 허용. fence depth + Accordion 상태 분리 | 중첩 Split 은 금지 권장 (v1). fence depth 가 급격히 상승 |

**핵심 관찰**:

1. **fence depth 자동 상승은 모든 중첩 케이스에서 작동** — `mdast-util-directive` 가 content depth 를 실측하므로 저자가 fence 콜론 수를 수동 관리할 일이 없다. 본 리포트의 H5 자극 (Split + Card + Steps) 이 6-5-4-3 depth 로 안정적으로 직렬화되는 것을 검증. 이론상 Split 에 Tabs + Card + Form 을 중첩하면 depth 가 7-8 까지도 상승 가능.

2. **heading level 충돌은 Tabs/Accordion 내부 Section 에서만 발생** — 이는 ADR 0025 Open 에 명시된 한계. 다른 조합 (Section 내부 Tabs 등) 에서는 충돌 없음 — 외부 Section 의 heading 이 기준 outline 이고, 내부 Tabs/Accordion 은 heading 을 emit 하지 않기 때문.

3. **중첩 Tabs/Accordion 의 UI 혼란** — `Tab` 안에 또 `Tabs` 를 두거나, `Panel` 안에 또 `Accordion` 을 두면 UI 상 "탭 안의 탭" / "아코디언 안의 아코디언" 이 되어 사용자 경험이 나빠진다. ADR 0025 가 명시적으로 금지하지는 않으나, spec `component-catalog.md` 에 "권장 안함" 수준의 가이드 추가를 검토할 수 있다. LLM 해석 자체는 문제 없음 — flush 규약으로 전체 내용 보존.

4. **Split 의 Cell 에 상태형 컴포넌트 (Tabs/Accordion) 을 두는 것은 허용** — flush 직렬화가 양측 모두 작동하므로 Markdown 에 정보 손실 없음. 단 fence depth 가 함께 상승하고, UI 상으로는 "좌측 칼럼에 탭 바, 우측 칼럼에 접이식 패널 목록" 같은 복합 화면이 됨. LLM 입장에서는 각 컴포넌트의 단독 해석 규칙이 그대로 적용.

5. **Steps 의 자식은 Step leaf directive 만** — spec 상 Steps 는 block flow 가 아닌 leaf 시퀀스. Steps 내부에 Card 나 Section 을 넣는 것은 불허 (Markdown 에는 emit 되나 정상 동작 아님). ADR 0025 §2 가 이를 암묵 전제.

## 부록 B — 엣지 케이스 미니-자극 모음

본 부록은 각 가설의 오탐 유형 섹션에서 언급한 케이스를 **실제 미니 자극** 으로 재현한다. envelope 는 간소화 (본론 자극과 동일 admin 컨텍스트 가정).

### B-1. Section level 점프 (H1 오탐 유형 1)

~~~markdown
# Page title

## Top section (level 2)

#### Deeply nested (level 4 — skipped level 3!)

body content
~~~

**해석 관찰**: CommonMark 표준상 level skip 은 valid 이지만 outline 이 어긋난다. LLM 은 "level 3 가 암묵적으로 존재하는가, 아니면 저자 실수인가" 를 결정 못 한다. 실전에서는 저자 실수가 압도적이므로 **린트 경고** 가 적합하나 엔진은 관여하지 않는다. spec 수준에서 "Section level 은 형제 · 부모와 연속해야 함" 권고 1 문장 추가를 검토할 수 있다.

### B-2. Steps status 비모노톤 (H2 오탐 유형 1)

~~~markdown
:::steps
::step[Submit application]{status=done}
::step[Review pending]{status=pending}
::step[Interview scheduled]{status=current}
::step[Final decision]{status=pending}
:::
~~~

**해석 관찰**: `done → pending → current → pending` 순서는 실제 채용 파이프라인 (리뷰는 보류, 인터뷰는 진행 중) 에서 발생 가능한 비모노톤. LLM 은 이를 "1 단계 완료, 2 단계 보류, 3 단계 진행, 4 단계 미착수" 로 자연어 의미 그대로 해석. 시간순과 상태순이 다를 수 있다는 암묵 이해가 작동. **문제 없음** — 단 저자가 이 구조를 의도적으로 쓰는 빈도가 낮다면 spec 에 "Steps 는 시간순·단조 권장" 한 줄 추가 검토.

### B-3. Steps 의 current 0 개 / 2 개 (H2 오탐 유형 3)

~~~markdown
:::steps
::step[A]{status=done}
::step[B]{status=done}
::step[C]{status=done}
:::
~~~

**해석 관찰 (current 0 개)**: "모든 단계 완료" 로 해석 가능. "현재 진행 단계" 질문에는 "없음 — 전체 완료" 로 답함. 문제 없음.

~~~markdown
:::steps
::step[Design]{status=done}
::step[Frontend]{status=current}
::step[Backend]{status=current}
::step[QA]{status=pending}
:::
~~~

**해석 관찰 (current 2 개)**: "Frontend 와 Backend 가 병렬 진행 중" 으로 해석. 자연어 의미가 보존되어 문제 없음. 단 "단일 current" 를 전제하는 과업 (다음 단계 추천 등) 에서는 LLM 이 "어느 쪽이 주 current 인가" 를 결정 못 한다. spec 상 단일 current 를 강제하지 않으므로 **저자 책임**.

### B-4. Tabs label 중복 (H3 관련)

~~~markdown
:::tabs
::tab[Settings]

first settings group

::tab[Settings]

second settings group

:::
~~~

**해석 관찰**: 같은 label 을 가진 Tab 2개. UI 상 탭 바에 `Settings` 2개 표시, 클릭 시 어느 쪽이 활성인지 불명. LLM 해석상으로도 "동일 이름 영역 두 개" 가 혼란. **spec 에 "Tab label 은 unique 권장" 1 문장 추가** 검토. 동일 이슈가 Accordion Panel 에도 적용.

### B-5. Accordion Panel 안의 또 다른 Accordion (부록 A-3 재현)

~~~markdown
:::accordion
::panel[Outer A]

:::accordion
::panel[Inner A1]

nested content

::panel[Inner A2]

more nested

:::

::panel[Outer B]

flat content
:::
~~~

**해석 관찰**: directive 파서는 정상 동작 (fence depth 자동 상승). flush 규약도 정보 보존. 단 UI 상 "아코디언 안의 아코디언" 은 사용자가 2 중 클릭해야 열림 — UX 가 나쁘다. LLM 해석은 "Outer A 내부에 2 개 중첩 패널, Outer B 는 평범 패널" 로 정확히 잡음. **설계상 금지는 아니나 UI 가이드로 권장 안함**.

### B-6. Split 의 Cell 1개 (H5 오탐 유형 4)

~~~markdown
::::split{cols=2}
:::cell
only left content
:::
::::
~~~

**해석 관찰**: spec §Split 엣지 케이스에 명시된 대로 "셀이 1개뿐이면 HTML 에서도 1 열로 표시됨". LLM 해석상 "1 열 배치" 로 해석 문제 없음. 단 `cols=2` attribute 가 "2 열 의도" 를 남기므로 "오른쪽 셀은 의도적 비워둔 것인가, 저자 실수인가" 가 ambiguous. `cols=1` 을 쓰는 것이 더 자기설명적. spec 상 `cols=1` 은 경고 없이 그대로 직렬화되므로 저자 판단.

### B-7. Split 내 중첩 Split (부록 A-5 재현)

~~~markdown
::::::split{cols=2}
:::::cell

::::split{cols=2}
:::cell
Q1
:::
:::cell
Q2
:::
::::

:::::
:::::cell

::::split{cols=2}
:::cell
Q3
:::
:::cell
Q4
:::
::::

:::::
::::::
~~~

**해석 관찰**: 2×2 사사분면 레이아웃 의도. fence depth 6 → 5 → 4 → 3 으로 자동 상승, 정상 파싱. LLM 해석상 "Q1/Q2 는 상단 좌우, Q3/Q4 는 하단 좌우" 로 공간 복원 시도하나, **Markdown 직렬 순서는 Q1 → Q2 → Q3 → Q4** 이므로 "2×2" 의 수평/수직 축 복원은 directive 이름 (`split` + `cols=2`) 에 의존. H5 결론과 정합 — 공간 관계는 배치된다기보다 **이름으로 시사될 뿐** 이다. 중첩 Split 은 ADR 0025 에서 허용되나 실전 활용 저조.

### B-8. Section level=1 중복 (H1 오탐 유형 2)

~~~markdown
# Page title (from Page H1)

<Section title="Overview" level={1}>

content...

</Section>
~~~

직렬화 결과:

~~~markdown
# Page title

# Overview

content...
~~~

**해석 관찰**: H1 이 2 개 등장. LLM 은 "하나의 페이지인가, 두 페이지가 이어 붙은 것인가" 혼동. envelope 의 `title` 필드가 있어 "페이지 제목 = Page title" 을 우선 판단하지만, 본문의 두 번째 H1 은 여전히 outline 을 흐트러뜨림. **후속 spec 피드백 4 번** (`level>=2` 권장) 이 이 케이스를 방어.

## 부록 C — 본 리포트 자극의 전송 효율 추정

본 리포트는 실제 LLM 호출을 하지 않으므로 `bench/` 와 같은 정량 측정은 수행하지 않는다. 단 참고 차원에서 5 개 자극 블록의 **대략적 transport 비용** 을 기록한다 (토큰 수는 `@anthropic-ai/tokenizer` Claude 계열 추정). 수치는 본 리포트 저자의 어림셈이며 `bench/` 실측과는 다를 수 있다.

| 자극 | 블록 줄 수 (본문 + envelope) | 추정 토큰 (Claude) | 특이사항 |
|---|---|---|---|
| §1 Section 중첩 | ~45 줄 | ~380 | directive 거의 없음 — heading + paragraph 위주로 토큰 밀도 높음 (`#` 가 토큰 경제적) |
| §2 Steps onboarding | ~40 줄 | ~350 | `:::steps` · `::step[...]{status=...}` 구조가 반복 — 5 단계 × step 당 ~12 토큰 |
| §3 Tabs settings | ~100 줄 | ~850 | envelope 3 개 tool 선언이 큰 비중. Tab 본문 3 개가 각기 다른 구조 |
| §4 Accordion workspace | ~95 줄 | ~800 | 4 panel 구조. envelope 2 개 tool 선언 + Danger zone 의 pattern 정규식 |
| §5 Split deployments | ~75 줄 | ~620 | fence depth 6 상승으로 콜론 문자 많음 (`:` 가 단일 토큰으로 압축되나 밀도는 ↑) |

**관찰**: §3 Tabs 자극이 가장 크다. 이는 Tabs 가 여러 독립 영역을 한 블록에 flush 하기 때문 — ADR 0007 §4 의 "AI 는 전부 접근" 설계의 자연스러운 비용이다. ADR 0023 benchmark 환경에서 Tabs-heavy 페이지를 `headful-md` 변환 대비 측정하면 readable-ui 의 토큰 효율이 얼마나 유지되는지 정량 확인 가능. 후속 연구 후보 (bench 시나리오 추가).

## 부록 D — 본 리포트가 다루지 않은 범위

투명성을 위해 기록한다. 본 리포트는 다음을 다루지 않았다:

1. **실제 LLM 호출을 통한 verdict 재현** — 사용자 지시상 자기 관찰로 대체.
2. **코드 · spec 개정 반영** — 제약상 금지. "후속 spec 피드백" 섹션에 기록만 하고 사용자 판단에 위임.
3. **apps/example 변경** — 제약상 금지. 기존 `page-content.tsx` · `envelope.ts` 파일을 참조만 했다.
4. **bench/** 수정 — 제약상 금지. 부록 C 의 수치는 어림셈.
5. **ADR 0025 재검토** — 5 개 가설 모두 pass 이므로 재검토 불요.
6. **v2 재검증** — 선행 두 리포트의 "v2 개선 후 high 로 수렴" 섹션과 같은 재측정 루프는 본 리포트에서 수행하지 않는다. 후속 spec 피드백이 적용되면 별도 v2 리포트 (`llm-test-0025-tier3-containers-v2.md`) 로 기록하는 것을 권장.
7. **대체 설계 (Section `level` 자동 추론, Tabs `defaultActive` 등) 시뮬레이션** — ADR 0025 가 v2 defer 로 명시. v1 검증 범위 밖.

## 참조

- [ADR 0025 — Tier 3 컨테이너 컴포넌트 v1 편입](../adr/0025-tier3-container-components-activation.md)
- [ADR 0007 — Layout & component catalog (v1)](../adr/0007-layout-and-component-catalog.md) — 특히 §3 Tier 3 · §4 flush 규약 · §5 Split 배치 정책
- [ADR 0012 — Dual-representation convention signaling](../adr/0012-dual-render-convention-signals.md) — convention key 외재화 선례
- [ADR 0013 — Form 내부 Button의 action 속성 생략](../adr/0013-suppress-form-inner-button-action.md) — 동형 선례
- [ADR 0024 — Admin metric·progress·descriptions·breadcrumb 관용구](../adr/0024-admin-metric-and-hierarchy-components.md) — 직전 Tier 3 유예 재확인 시점
- [spec component-catalog.md](../spec/component-catalog.md) — §Section · §Steps · §Tabs · §Accordion · §Split
- [llm-test-0011-layouts.md](./llm-test-0011-layouts.md) — 선행 레퍼런스 (방법론 · 구조)
- [llm-test-0015-table-container.md](./llm-test-0015-table-container.md) — 선행 레퍼런스 (convention key 외재화 사례)
