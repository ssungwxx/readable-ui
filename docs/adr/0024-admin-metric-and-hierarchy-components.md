# ADR 0024 — Admin metric·progress·descriptions·breadcrumb 관용구

- Status: Accepted
- Date: 2026-04-18
- Extends: [ADR 0007 §3](./0007-layout-and-component-catalog.md) (카탈로그 +2), [ADR 0018](./0018-detail-view-convention.md) (Descriptions 관용구 외재화), [ADR 0021 §Open](./0021-detail-page-layout.md) (back → breadcrumb 확장)
- Related: [ADR 0011](./0011-sidebar-and-topbar-page-layouts.md), [ADR 0014](./0014-nav-as-envelope-metadata.md), [ADR 0017](./0017-jsx-markdown-attribute-naming.md), [ADR 0019](./0019-crud-action-idioms.md)

## Context

ADR 0007 이 v1 카탈로그를 닫힌 집합으로 고정한 이후, 실사용 admin 페이지들(`/dashboard`, `/reports`, `/users/[id]`)에서 반복 부딪힌 표현 부족 지점을 업계 표준(Ant Design Pro, Refine, shadcn/ui dashboard, Tremor) 인벤토리와 교차 비교한 결과 4개 요구를 식별했다:

1. **수치 지표 카드 (KPI / Statistic)** — `MRR $48.2K · +12.4% · trend↑` 처럼 `label + value + delta + trend` 4축을 구조화한 카드. 현재는 `Card{title=MRR}` + `Heading{level=2} $48.2K` + `Paragraph +12.4%` 3개 노드로 분해되며, LLM 입장에서 "숫자 지표"라는 시맨틱이 소실된다.
2. **진행률 바** — `used / max` 비율 표시. Storage 사용량·quota·onboarding completion 등. 현재 카탈로그에 `value/max` 구조화 표현이 없어 Paragraph 자연어로만 기술 가능.
3. **Key-Value 상세 (Descriptions)** — ADR 0018 이 `:::card{title=Details}` + `- **field**: value` 관용구를 이미 정규형으로 고정했지만, JSX 저작면에서 `<Card><List><ListItem><Strong>Field</Strong>: value</ListItem></List></Card>` 4-depth nesting 이 반복되어 DX 부담이 크다.
4. **Breadcrumb (계층 경로)** — ADR 0021 `back` prop 은 단일 링크만 지원. `Users › Alice › Billing` 3단 경로가 필요한 중첩 리소스(`/users/[id]/billing`) 에서 표현 공백. ADR 0021 §Open "back prop 의 다중 parent 표현 (breadcrumb) 필요성 — 수요 입증 후 v2" 이 본 ADR 시점에 입증됨.

동시에, 업계 표준에서 흔한 다음 컴포넌트들은 readable-ui scope 판단 근거로 **의도적으로 배제**한다 — 이유를 본 ADR 에 한 번 고정해 재논의 재발을 막는다.

| 컴포넌트 | 배제 이유 |
|---|---|
| Badge / Tag | ADR 0019 §3 이 상태 표기를 `CodeSpan` 으로 통일. 별도 등재는 의미 중복. |
| Tabs / Accordion / Steps | ADR 0007 §4 flush 규약 하에 등재는 유지되나 v1 구현 유예(Tier 3). 본 ADR 범위 밖. |
| Modal / Drawer / Popover / Tooltip | ADR 0007 §6 + ADR 0021 Out-of-scope. overlay interactive-only — Markdown flush 불가. |
| Toast / Notification | 세션·타이밍 의존. envelope snapshot 범위 밖. |
| Skeleton / Spin | SSR snapshot 시점에 로딩 상태 의미 없음. 뷰어 관심사. |
| Upload (file) | `Input[type=file]` 확장 대상 — 별도 ADR. |
| DateRange Picker | `Input[type=date]` 2개 조합으로 수용 (ADR 0016 규약). 본 ADR 에서 별도 이름 등재 안 함. |
| Switch / Toggle | `Checkbox` 시맨틱 등가. 시각 차이만 — override 로 해결. |
| Pagination (standalone) | Table 내장 외 수요 미관찰. 필요 시 후속. |
| Avatar | `Image` + CSS 로 해결. 새 directive 불필요. |
| Timeline / Tree | List + Heading 조합으로 정적 표현 충분. interactive 트리 토글은 scope 밖. |

즉 본 ADR 은 **카탈로그 +2 (`stat` · `progress`)** 와 **기존 카탈로그 조합 관용구 2 (Descriptions · Breadcrumb)** 을 한 번에 닫는다.

## Decision

### 1. `stat` — 새 leaf directive (카탈로그 +1)

수치 지표 카드 — admin dashboard KPI 핵심.

**Props / JSX**:

```ts
interface StatProps {
  label: string;         // "MRR"
  value: string;         // "$48.2K" — 포맷 완료된 문자열. 엔진이 포맷 추론하지 않음.
  delta?: string;        // "+12.4%" — 변화량. 부호·단위 포함 완전 문자열.
  trend?: "up" | "down" | "flat";  // 시각 아이콘·색상 결정용. 생략 가능 (중립).
  unit?: string;         // "MAU" 같은 보조 단위 라벨. value 와 병기 (아래 delta 줄).
}
```

**Markdown 직렬화** (leaf directive + fallback paragraph):

```markdown
::stat[$48.2K]{label="MRR" delta="+12.4%" trend=up unit=MRR}

**$48.2K** · +12.4% (MRR)
```

- directive body (`[...]`) 에 `value` 를 넣어 directive-미지원 뷰어에서도 숫자가 읽힌다.
- fallback paragraph 는 `**value** · delta (label)` 고정 포맷. `delta` 미선언 시 `**value** (label)`. ADR 0012 이중 표현 규약과 정합 — fallback `"off"` · `"link-only"` 토글 시 directive 만 / paragraph 만 출력.
- `trend=up` 은 HTML 에서 `▲` 녹색, `down` 은 `▼` 빨강, `flat` 은 `—` 회색. Markdown 에는 시각 마커 주입 안 함 — `trend` 속성 값 그대로만 나감 (LLM 이 파싱).
- 엔진은 `value` 문자열을 해석하지 않는다 — 통화·퍼센트·K/M suffix 는 모두 저자 책임.

**예약어 추가**: `trend`, `delta`, `unit`.

### 2. `progress` — 새 leaf directive (카탈로그 +1)

진행률·사용량 바. 0-100 percent 또는 임의 max 수용.

**Props / JSX**:

```ts
interface ProgressProps {
  value: number;         // required
  max?: number;          // default 100
  label?: string;        // "Storage"
  variant?: "primary" | "success" | "warning" | "danger";  // default "primary"
}
```

**Markdown 직렬화**:

```markdown
::progress{value=720 max=1000 label=Storage variant=warning}

720 / 1000 (72%) — Storage
```

- fallback paragraph 포맷: `<value> / <max> (<percent>%)` + ` — <label>` (label 있을 때). `max` 기본 100 은 `<value>% — <label>` 축약 없이 항상 `<value> / 100 (..%)` 로 그대로 출력 (LLM 파싱 안정).
- `variant` 는 Alert 팔레트 정합:
  - `primary` → 기본 파랑 (neutral)
  - `success` → Alert `tip` 팔레트 (녹색)
  - `warning` → Alert `warning` 팔레트 (주황)
  - `danger` → Alert `caution` 팔레트 (빨강)
- directive body 없음 (leaf). `label` 속성은 HTML 에서 바 좌측 레이블로 렌더.

**예약어 재사용**: 기존 `value`, `max`, `label`, `variant` — 신규 예약 없음.

### 3. Descriptions — JSX convenience (카탈로그 불변)

ADR 0018 단건 상세 관용구 (`:::card{title=...}` + `- **field**: value` list) 를 JSX 에서 한 번에 기술하는 wrapper. **새 directive name 을 등록하지 않는다** — 내부적으로 `<Card>` + `<List>` + `<ListItem>` + `<Strong>` 조합으로 분해되어 렌더되며, Markdown 출력은 ADR 0018 정규형과 **완전히 동일**하다.

**Props / JSX**:

```ts
interface DescriptionsProps {
  title?: string;                                    // Card title
  items: Array<{ term: string; value: ReactNode }>;  // { term: "Email", value: "alice@x.com" }
}
```

`columns=2` visual grid 변형은 v2 defer — Card + List 정규형을 유지하려면 List 의 render override 가 필요한데, 이는 ADR 0007 §7 override 정책과 별개 판단이 요구되므로 본 ADR 범위 밖으로 분리한다.

**저작면 단축**:

```tsx
// Before (ADR 0018 정규형 직접 저작)
<Card title="Profile">
  <List>
    <ListItem><Strong>Email</Strong>: alice@example.com</ListItem>
    <ListItem><Strong>Role</Strong>: <CodeSpan>admin</CodeSpan></ListItem>
  </List>
</Card>

// After (본 ADR convenience wrapper)
<Descriptions title="Profile" items={[
  { term: "Email", value: "alice@example.com" },
  { term: "Role", value: <CodeSpan>admin</CodeSpan> },
]} />
```

**Markdown 직렬화** (완전 동일):

```markdown
:::card{title=Profile}
- **Email**: alice@example.com
- **Role**: `admin`
:::
```

- 빈 값 표기는 ADR 0019 §4 `*none*` 관용구 준수 — `value: null | undefined | ""` 은 `<em>none</em>` 으로 자동 치환.
- `defineDualComponent` 호출 없음 — React 함수 컴포넌트로만 제공. 카탈로그 닫힘 원칙 (ADR 0007 §7) 위반 아님.

### 4. Breadcrumb — Page prop 확장 (카탈로그 불변)

ADR 0021 §Open "back prop 의 다중 parent 표현" 해소. `<Page>` prop 에 `breadcrumb` 추가. **새 directive name 을 등록하지 않는다** — Markdown 출력은 nav 뒤 · back 앞 paragraph 한 줄.

**Props 확장**:

```ts
interface PageProps {
  // 기존
  layout?: "flow" | "sidebar" | "topbar" | "detail";
  nav?: NavItem[];
  back?: { label: string; href: string };
  meta?: ReactNode;
  footer?: ReactNode;

  // 본 ADR 추가
  breadcrumb?: Array<{ label: string; href?: string }>;  // 마지막 항목 href 생략 가능(현재 위치)

  children: ReactNode;
}
```

**envelope 필드 추가**:

```yaml
breadcrumb:
  - { label: Users, href: /users }
  - { label: "Alice Example", href: /users/u_alice_01 }
  - { label: Billing }    # 현재 위치 — href 생략
```

- envelope ↔ Page prop 공존 시 envelope 우선 + 불일치 warning (nav 규약과 동형, ADR 0014).
- 항목 `href` 생략은 "현재 위치" 를 의미. 마지막 항목 외 생략은 warning (현재 위치는 1개만).
- 비어 있거나 항목 1개면 출력 생략 (noise 억제).

**Markdown 직렬화 순서 (detail layout 기준, ADR 0021 §3 갱신)**:

```
envelope YAML
  ↓
## Navigation         (envelope.nav 또는 Page.nav)
  ↓
[Users](/users) › [Alice Example](/users/u_alice_01) › Billing       ← breadcrumb paragraph (본 ADR)
  ↓
[← Back to Users](/users)   (Page.back) — breadcrumb 있으면 자동 생략 (아래 규약 참조)
  ↓
main (children)
  ↓
meta
  ↓
footer
```

**flow / sidebar / topbar layout 기준**: nav 뒤, body(children) 앞 1줄 paragraph.

**`back` 과의 공존 규약 (중요)**: `breadcrumb` 가 2개 이상 항목을 포함하면 ADR 0021 `back` 은 **자동 무음 생략**한다 — 정보 중복(둘 다 parent 링크) 억제 + 단일 신호 보존. 저자가 명시적으로 두 prop 을 모두 지정해도 breadcrumb 우선. v2 lint 에서 warning 승격 검토.

**Markdown 포맷 고정**:

- 구분자: `\u203A` (` › `, MIDDLE DOT 아닌 SINGLE RIGHT-POINTING ANGLE QUOTATION MARK). 영어 단일 소스.
- 각 항목: `href` 있으면 `[label](href)` link, 없으면 plain text.
- 마지막 항목은 통상 href 생략 → plain text → "현재 위치" 시각 신호 자연스럽게 보존.
- 공백: 항목 사이 ` › ` (space + chevron + space).
- 링크 스타일 없음 — directive 아닌 **일반 Link inline** 이므로 GitHub README 등 모든 Markdown 뷰어 호환.

### 5. out-of-scope 명시 (재확인 고정)

본 ADR 은 Context 표의 11개 컴포넌트를 v1 범위 밖으로 **명시 고정**한다. 향후 동일 요구 재발 시 본 ADR 을 근거로 즉시 기각하며, 재논의하려면 별도 ADR 을 열어야 한다. "LLM 이 이해할 수 있는 정적 Markdown 표현이 존재하는가?" 단일 기준을 적용한다 — 상호작용·상태·오버레이·타이밍 의존은 envelope snapshot 범위를 벗어난다.

## Consequences

**Positive**:

- Admin dashboard KPI · 사용량 바 · 계층 경로가 **단일 directive / prop** 으로 표현 — ADR 0007 `LLM 이 작은 컨텍스트로 이해` 원칙 유지.
- Descriptions · Breadcrumb 는 카탈로그 이름 추가 없이 JSX DX 만 개선 — ADR 0007 §7 닫힘 원칙 비위반.
- out-of-scope 11종을 한 ADR 에 고정 → 재논의 cost 영구 절감.
- ADR 0021 §Open 중 breadcrumb 항목 closure.

**Negative**:

- `<Page>` props 표면 1개 추가 (`breadcrumb`). 현재 Page prop 누적: `layout`, `nav`, `back`, `meta`, `footer`, `breadcrumb`, `children` — ADR 0011 · 0021 패턴의 연장이나 prop 수 증가 지속.
- `stat` · `progress` leaf directive 2개가 v1 interactive primitive 6개 (Button/Input/Select/Textarea/Checkbox/Radio) 바깥의 "**view-only leaf directive**" 라는 새 하위 범주를 도입. ADR 0007 §3 분류는 `Atomic / Block / Container / Interactive` 4분류인데 Stat · Progress 는 Atomic 도 아니고 Interactive 도 아닌 경계에 위치. spec 문서에 `Block (leaf directive, view-only)` 하위 범주로 정리.
- Descriptions 가 Card + List 의 convenience wrapper 라는 점은 spec 에 명시해야 LLM · 사람이 Markdown 출력 해석 시 혼동하지 않음. spec 문서에 명시.

**Neutral**:

- `trend` / `delta` / `unit` 3개 예약어 추가 — 기존 예약어 집합 (§공통규약 3) 과 충돌 없음.
- Progress `variant` 팔레트는 Alert kind 5종 중 `note` / `important` 를 제외하고 `tip → success` / `warning → warning` / `caution → danger` + `primary` neutral 을 채택. Alert 전체 매핑은 아님 — Progress 는 위험도가 아닌 진행 상태 색이므로 `important` (보라) 는 의미 불합치.
- Breadcrumb chevron `\u203A` 는 ADR 0021 back link `\u2190` (← 화살표) 와 동일 패턴 (영어 single-source · 하드코딩 시각 토큰).

## Alternatives considered

1. **Stat / Progress 를 Card + Paragraph 조합으로 수용** — 시맨틱 정보 (value 가 숫자 지표임, delta 가 변화량임) 가 평문 Paragraph 로 희석. LLM 이 `Card{title=MRR}` 본문 `$48.2K +12.4%` 를 "지표 카드" 로 재식별하려면 heuristic 필요. 기각.
2. **Descriptions 를 새 directive `:::descriptions`** — ADR 0018 정규형과 의미 중복. 동일 정보에 두 표기 도입은 ADR 0007 관점 5 (정규형 강제) 를 약화. 기각.
3. **Breadcrumb 를 새 directive `:::breadcrumb`** — directive 미지원 뷰어 (GitHub · Slack · Gmail) 에서 fallback 필요. 일반 Link paragraph 1줄은 fallback 불필요. 기각.
4. **Badge / Tag 를 함께 추가** — ADR 0019 §3 상태 표기를 CodeSpan 으로 통일한 결정과 의미 경합. 기각.
5. **Tabs / Accordion / Steps 를 본 ADR 에서 Tier 3 → Tier 1 승격** — 구현 복잡도와 v1 검증 범위 초과. 별도 ADR 로 분리.
6. **Stat 에 enum `kind=currency|percent|count` 를 두어 value 포맷 자동 해석** — 통화·로케일·정밀도 추론은 i18n 범위. 저자가 포맷 완료된 문자열을 넘기는 것이 v1 에서 단순·안전. 기각 (v2 검토).

## Migration

- `packages/core/src/envelope.ts` — `PageEnvelopeZ` 에 `breadcrumb?: Array<{label: string; href?: string}>` 추가.
- `packages/core/src/index.ts` — export 갱신 (필요 시 `BreadcrumbItem` 타입).
- `packages/react/src/components.tsx` —
  - `Stat` · `Progress` 신규 `defineDualComponent` 등록.
  - `Page` prop 에 `breadcrumb` 추가 · HTML render 에 breadcrumb header · `toMarkdown` 직렬화 순서에 breadcrumb flush 삽입 · `back` 자동 생략 규약 구현.
  - `Descriptions` 를 일반 React 함수 컴포넌트로 추가 (카탈로그 등록 X, 내부에서 `<Card><List><ListItem><Strong>` 조립).
- `docs/spec/component-catalog.md` — §Block 에 `Stat` · `Progress` 섹션 추가 · §Page props 에 `breadcrumb` 갱신 · §공통규약 3 예약어에 `trend` · `delta` · `unit` 추가 · §Descriptions 를 ADR 0018 관용구 위치에 JSX convenience 로 명시.
- `docs/spec/page-envelope.md` — `breadcrumb` 필드 명세 추가 · `layout: detail` 표에 breadcrumb 공존 규약 추가.
- `docs/README.md` — Accepted ADRs 에 0024 추가 · Open Decisions #11 추가 변경 없음 (본 ADR 은 `tabs-page` / `split-page` scope 아님).
- `apps/example/app/reports/**` · `apps/example/app/users/[id]/**` — 신규 컴포넌트 사용 예시 포함 업데이트.
- `bench/scenarios/**` — Admin 새 관용구를 반영한 baseline 갱신 (별도 판단 — sizeRatio 변화 관찰 후 baseline 확정 여부 결정).

## Out of scope

- Badge / Tag / Chip 독립 컴포넌트 — ADR 0019 §3 CodeSpan 통일 규약 계승.
- Tabs / Accordion / Steps / Split — ADR 0007 Tier 3 유예 유지.
- Modal / Drawer / Popover / Tooltip — ADR 0007 §6 + ADR 0021 Out-of-scope 계승.
- Toast / Notification / Skeleton / Spin — 상태·타이밍 의존, envelope snapshot 범위 밖.
- Upload (`Input[type=file]`), DateRange, Switch, Pagination standalone, Avatar, Timeline, Tree — Context 표 참조.
- Stat `value` 자동 포맷 / i18n / 로케일 — v2 검토.
- Progress 의 step segment (다단계 진행률) — Steps 관용구로 대체 또는 v2.
- Descriptions 3열+ grid · nested group — 시각 복잡도 증가 · LLM fallback 손실. v2.

## Open

- Stat · Progress 를 envelope `intent` enum ("kpi-dashboard", "onboarding-progress") 와 연결해 페이지 의도와 정합 검증할지 — 수요 관찰 후 결정.
- Breadcrumb envelope SSOT (envelope 선언 강제) vs Page prop 선택 허용 — 현재 nav 규약 (envelope 우선 권장) 과 동형. 1차 사용 패턴 수집 후 결정.
- Descriptions 가 Card 외 Alert · Form 내부에서도 유효한지 — 현재 ADR 0018 관용구를 Card 컨텍스트로만 수용. 다른 컨테이너 수요 있으면 후속.
