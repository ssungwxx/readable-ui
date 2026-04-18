# ADR 0025 — Tier 3 컨테이너 컴포넌트 v1 편입 (Section · Steps · Tabs · Accordion · Split)

- Status: Accepted
- Date: 2026-04-18
- Closes: ADR 0007 §3 Tier 3 유예, ADR 0024 §Context "Tier 3. 본 ADR 범위 밖" 재확인
- Extends: [ADR 0007 §3](./0007-layout-and-component-catalog.md) (카탈로그 신규 구현), [ADR 0007 §4](./0007-layout-and-component-catalog.md) (flush 규약 정본화)
- Related: [ADR 0008](./0008-engine-react-element-walk.md), [ADR 0015](./0015-table-as-container-directive.md), [ADR 0024](./0024-admin-metric-and-hierarchy-components.md)

## Context

ADR 0007 이 v1 카탈로그를 확정할 때 **Section · Steps · Tabs · Accordion · Split** 5종을 "Tier 3" 으로 분류해 구현을 유예했다. 유예 근거:

| 컴포넌트 | 유예 당시 근거 |
|---|---|
| Section | Heading + body 조합으로 표현 가능. 단독 `<section>` 추가 가치 불명확 |
| Steps | task list + Heading 조합으로 대체 가능 (ADR 0007 §Neutral 명시) |
| Tabs | UI 상태 전환이 필요 — `useState` 클라이언트 코드 미비. flush 규약은 ADR 0007 §4에 정의만 존재 |
| Accordion | 동일 사유 — 열림/닫힘 상태 전환 UI |
| Split | 2열 배치 — engine 의 nested directive 처리 여부 미확인 (ADR 0007 §5) |

ADR 0024 (`2026-04-18`) 기준 admin 예시 페이지 (`/reports`, `/users/[id]`) 가 구체화되면서 다음이 확인됐다:

1. **실사용 부족 지점**: 탭으로 분리하는 설정 화면, 단계적 온보딩 안내, 좌/우 2열 레이아웃이 모두 Heading+Card 조합으로만 표현되어 LLM 문맥이 불필요하게 커짐.
2. **engine 조건 충족**: `packages/core/src/index.ts` 의 walker 는 `spec` 프로퍼티를 가진 함수형 컴포넌트를 인식하며, `ctx.walk(children)` 로 nested children 을 재귀 처리한다. nested container directive 는 추가 engine 수정 없이 `containerDirective` 노드를 중첩하면 `mdast-util-directive` 가 그대로 직렬화한다.
3. **Split 중첩 directive 확인**: CommonMark container directive 중첩 규칙 — **외부 fence 의 콜론 개수가 내부보다 엄격히 많아야** 파싱된다. `mdast-util-directive` 의 `toMarkdown` 은 실측(content depth) 기반으로 fence 콜론 수를 **자동 상승**시켜 이 규칙을 보장한다. 특별한 engine 확장이 필요하지 않다. 예: Split 이 Card 를 품으면 `::::split` (4) → `:::cell` (3) → `:::card` 내부 (추가 자식이 있으면 더 상승).
4. **Tabs / Accordion 클라이언트 상태**: React `useState` 를 직접 사용하면 된다. SSR 환경에서 첫 렌더는 서버-클라이언트 hydration mismatch 없이 첫 번째 항목을 default active 로 설정한다.
5. **Section level 자동 추론**: `SerializeContext.depth` 가 있지만 "parent heading 레벨" 은 별도 트래킹이 필요하다. v1 에서는 **`level` prop 필수** 방식을 채택해 복잡도를 최소화한다. Section 이 중첩되면 저자가 `level` 을 명시하는 것이 ADR 0007 "작은 컨텍스트로 이해 가능" 원칙에도 부합한다.

## Decision

### 1. Section — Heading + 자식 flow 묶음 (카탈로그 구현 편입)

**확정 직렬화 형태**:

```markdown
### Section title

children…
```

- `heading` mdast 노드 + children walk 결과를 flat 하게 반환. `<section>` wrapper HTML.
- `level` prop 은 **필수** (`1~6`). 자동 추론 포기 — 저자가 페이지 outline 을 명시적으로 지정하는 것이 LLM 입장에서 명확하다.
- `title` prop 필수. children 은 block flow.
- `toMarkdown` 반환: `[heading, ...childNodes]` flat 배열.

**Props**:

```ts
interface SectionProps {
  title: string;
  level: 1 | 2 | 3 | 4 | 5 | 6;  // 필수. 자동 추론 없음.
  children: ReactNode;
}
```

**설계 판단**: `ctx.depth` 를 사용해 "컨텍스트가 깊어질수록 heading 레벨을 올린다" 는 방식을 검토했으나, depth 는 "walk 재귀 깊이" 이며 페이지의 heading 레벨과 직결되지 않는다. 명시적 `level` 이 더 단순하고 안전하다.

### 2. Steps — 단계 진행 컨테이너 (카탈로그 구현 편입)

**확정 직렬화 형태**:

```markdown
:::steps
::step[Create account]{status=done}
::step[Verify email]{status=current}
::step[Finish setup]{status=pending}
:::
```

- 외부 `:::steps` container directive + 내부 `::step[label]{status=...}` leaf directive 들.
- `status` 3값: `done | current | pending`. CSS 팔레트는 Alert 계열과 정합:
  - `done` → `tip` 팔레트 (녹색)
  - `current` → `note` 팔레트 (파랑)
  - `pending` → 회색 (neutral)
- `toMarkdown`: container directive, children 은 각 step 의 leaf directive.
- ADR 0007 §Neutral 의 "task list + Heading 조합" 은 fallback 표현이었으나, 명시적 `:::steps` 가 LLM 에게 "이 노드 집합이 단계 진행 시퀀스다" 라는 시맨틱을 더 명확하게 전달한다.

**Props**:

```ts
interface StepProps {
  label: string;   // ::step[label] body
  status: "done" | "current" | "pending";
}

interface StepsProps {
  children: ReactNode;  // Step 컴포넌트들
}
```

### 3. Tabs — 상태 전환 컨테이너, flush 직렬화 (카탈로그 구현 편입)

**확정 직렬화 형태**:

```markdown
:::tabs
::tab[Info]

tab content…

::tab[Security]

tab content…

:::
```

- ADR 0007 §4 flush 규약 정본: 모든 탭 내용을 **전부 직렬화**한다. 활성 탭 표시는 Markdown 에서 소거.
- `::tab[label]` leaf directive 가 탭 구분자 역할. 이후 `ctx.walk(children)` 결과를 순서대로 나열.
- UI 에서만 현재 활성 탭을 표시하고 나머지는 숨김. `useState` 클라이언트 상태. SSR 초기값: 첫 번째 탭 (index 0).
- `active` 예약어는 본 ADR 에서 **사용하지 않는다** — `::tab[label]` body 로 식별, active 탭 선택은 UI-only. ADR 0007 flush 규약 "AI 는 전 탭 정보 필요" 원칙 준수.

**Props**:

```ts
interface TabProps {
  label: string;    // ::tab[label] body
  children: ReactNode;
}

interface TabsProps {
  children: ReactNode;  // Tab 컴포넌트들
}
```

**Markdown 정보 손실 없음**: 모든 탭의 내용이 순서대로 직렬화되므로 AI 는 전체 내용에 접근 가능. UI 에서 탭 숨김은 순수 시각 효과.

### 4. Accordion — 열림 상태 flush 직렬화 (카탈로그 구현 편입)

**확정 직렬화 형태**:

```markdown
:::accordion
::panel[Billing]

billing content…

::panel[Notifications]

notifications content…

:::
```

- ADR 0007 §4 flush 규약: 모든 패널을 "열린 상태"로 직렬화. 닫힘 상태는 Markdown 에 존재하지 않음.
- `::panel[label]` leaf directive 가 패널 구분자. Tabs 와 동형 구조.
- UI 에서 각 패널은 클릭으로 열기/닫기. `useState` 로 열린 패널 인덱스 집합 관리. SSR 초기값: 첫 번째 패널 열림 (index 0 open, 나머지 closed).
- `default open` 상태: **첫 번째 패널만** 기본 열림. 저자가 모든 패널을 기본 열림으로 원하면 JSX 에서 UI 커스텀 필요 (v1 범위 밖).

**Props**:

```ts
interface PanelProps {
  label: string;    // ::panel[label] body
  children: ReactNode;
}

interface AccordionProps {
  children: ReactNode;  // Panel 컴포넌트들
}
```

### 5. Split — 2열 배치, 세로 나열 직렬화 (카탈로그 구현 편입)

**확정 직렬화 형태**:

```markdown
::::split{cols=2}
:::cell
left content
:::
:::cell
right content
:::
::::
```

- 외부 `::::split` (콜론 4개) + 내부 `:::cell` (콜론 3개) — **외부가 내부보다 콜론 수가 많아야 한다** (CommonMark directive 중첩 규칙).
- **실제 fence 콜론 수는 `mdast-util-directive` 가 content depth 기반으로 자동 상승**시킨다. 위 샘플은 최소 depth(단순 텍스트) 기준. Cell 내부에 Card(`:::`) 등이 중첩되면 전체 depth 가 한 단계씩 올라간다 — 예: `::::::split` (6) → `:::::cell` (5) → `::::card` (4) → `:::steps` (3).
- `cols=2` 만 v1 허용. `cols=1` 또는 `cols>=3` 은 구현에서 경고 후 그대로 직렬화 (runtime error 없음 — Markdown 출력이 목적).
- engine 확장 없음: `ctx.walk(children)` 에서 Cell 컴포넌트가 `containerDirective` 를 반환하고, Split 이 이를 `containerDirective.children` 에 포함시키면 `mdast-util-directive` 가 fence 깊이를 자동 계산해 직렬화한다.
- Markdown 에서는 왼쪽 셀 → 오른쪽 셀 순서로 세로 나열. 배치(좌/우) 정보는 버림 — ADR 0007 §5 "배치 정보는 버린다" 규약 준수.

**Props**:

```ts
interface CellProps {
  children: ReactNode;
}

interface SplitProps {
  cols?: 2;          // v1에서 2만 허용. default 2.
  children: ReactNode;  // Cell 컴포넌트들
}
```

## Consequences

**Positive**:

- Tier 3 5종 해제로 admin UI 표현 범위 확장 — 탭·아코디언 설정 화면, 단계형 온보딩, 2열 정보 배치가 모두 LLM 시맨틱 유지 하에 표현 가능해짐.
- engine 코드 변경 없음 — 기존 walker 의 재귀 walk + mdast-util-directive 의 nested containerDirective 지원으로 구현 완결.
- ADR 0007 §4 flush 규약이 코드와 함께 정본화됨 — Tabs / Accordion 의 "전체 직렬화" 계약이 `toMarkdown` 구현으로 보증.

**Negative**:

- Section `level` 이 필수 prop 이 됨 — 자동 추론 기대했던 저자는 명시적으로 레벨을 지정해야 한다. v2 에서 `ctx` 에 `headingDepth` 필드 추가를 통해 자동 추론 재검토 가능.
- Tabs / Accordion 은 `useState` 가 필요하므로 React Server Component 에서 직접 사용 불가. `"use client"` 지시어 없이 쓰려면 데이터만 children 으로 전달하고 클라이언트 wrapper 에서 렌더링해야 한다. v1 에서는 example 앱이 Next.js page ("use client" 없이 RSC 사용) 이지 않으므로 문제 없음 — 단, `apps/example` 에서는 `page-content.tsx` 에 `"use client"` 를 추가해야 한다.
- Split 의 중첩 container directive(`::::split` / `:::cell`)는 directive 미지원 뷰어(예: GitHub, Slack)에서 `::::split{cols=2}` 같은 마커가 리터럴 텍스트로 드러난다. readable-ui 파서가 우선이므로 v1 에서는 수용. 단순 세로 나열이 필요한 환경에서는 Card 2개 나열을 대안으로 사용할 것.

**Neutral**:

- 예약어 추가 없음 — `status` (Steps 용) 이미 예약됨. `label` 도 이미 예약됨. `cols` 이미 예약됨. 신규 예약어 0개.
- `Cell` 은 `defineDualComponent` 로 등록되나, 카탈로그 이름 `cell` 은 `Split` 의 내부 자식 전용이다. 독립 사용은 의미 없음 — v1 에서 경고 없음(런타임 강제 생략), 저자 규약으로 수용.

## Alternatives considered

1. **Section `level` 자동 추론 — `ctx.depth` 기반**: depth 는 walk 재귀 깊이이며 Heading 레벨이 아니다. 페이지의 `<Heading level={1}>` 위치에 따라 depth 와 heading 레벨이 일치하지 않는다. 기각.
2. **Section `level` 자동 추론 — `ctx` 에 `headingDepth` 필드 추가**: `SerializeContext` 인터페이스 변경 필요. v2 에서 검토. v1 에서는 `level` 필수로 축소.
3. **Tabs / Accordion 에 `active` prop 추가**: 초기 활성 탭/패널을 저자가 지정. 예약어 `active` 는 이미 있지만 Markdown 에는 반영되지 않는다 (ADR 0007 flush 규약). UI-only 초기 상태 선택이므로 v1 에서는 "첫 번째" 고정 정책으로 단순화. v2 에서 `defaultActive` prop 추가 검토.
4. **Steps 를 task list `- [x] step` + Heading 으로 직렬화**: ADR 0007 §Neutral 에 명시된 대안. 그러나 `:::steps` container directive 가 "이것이 ordered 단계 시퀀스" 라는 시맨틱을 LLM 에게 더 명확하게 전달. `done/current/pending` 3값 상태도 task list 로는 표현 불가 (done vs. current 구분 없음). 기각.
5. **Split `cell` 이름 예약 (독립 사용 허용)**: `cell` 은 Table 의 셀과 혼동될 수 있다. `split-cell` 또는 `column` 대안 검토 → Split 내부 전용으로 사용 범위를 제한하는 현 방식이 더 단순. 기각.

## Migration

- `packages/react/src/components.tsx` — Section · Steps · Step · Tabs · Tab · Accordion · Panel · Split · Cell 9개 `defineDualComponent` + 관련 export.
- `docs/spec/component-catalog.md` — §455 "v1 구현 유예 (Tier 3)" 줄 제거. 각 5종 항목에 Props 시그니처·fallback 규약·엣지 케이스 추가. `status` 기존 예약어 재확인.
- `docs/README.md` — Accepted ADRs 에 0025 추가.
- `apps/example/app/components/` — Tier 3 5종을 시연하는 admin 예시 페이지 2개 추가.

## Out of scope

- Section `level` 자동 추론 — v2 검토 (`ctx.headingDepth` 확장).
- Tabs `defaultActive` prop — v2 검토.
- Accordion "모두 열림" 기본 상태 — v1 에서는 첫 번째 패널만 열림.
- Split `cols=3` 이상 — ADR 0007 §5 "v1은 2열까지" 계승.
- `cell` 독립 directive — Split 내부 전용.

## Open

- `Section` 이 `Tabs` / `Accordion` 내부에 중첩되는 경우 `level` 이 외부 컨텍스트와 맞지 않을 수 있다. v1 에서는 저자 책임. v2 `ctx.headingDepth` 로 자동 조정 가능성 검토.
- `Tabs` / `Accordion` 가 RSC 환경에서 사용될 경우 `"use client"` 경계 전략 — Next.js 13+ App Router 기준 설계 필요. v2 에서.
