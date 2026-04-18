# ADR 0021 — Detail page layout (단건 상세 화면 쉘)

- Status: Accepted
- Date: 2026-04-18
- Extends: [ADR 0007 §2](./0007-layout-and-component-catalog.md), [ADR 0011](./0011-sidebar-and-topbar-page-layouts.md)
- Related: [ADR 0005](./0005-page-envelope.md), [ADR 0014](./0014-nav-as-envelope-metadata.md), [ADR 0018](./0018-detail-view-convention.md), [ADR 0019](./0019-crud-action-idioms.md), [ADR 0020](./0020-close-crud-idiom-gaps.md)

## Context

ADR 0018 은 단건 상세의 **본문 content pattern** (`Card{title="Details"} + List + Strong(field) + ": " + value`) 을 정식 관용구로 고정했다. 그러나 ADR 0018 §Decision 은 "컨테이너: Card" 수준에서 끝나며 **페이지 쉘 구조** — 어떤 레이아웃 위에 얹혀야 하는지, 제목·뒤로가기·메타 축 (updated / owner / id) · 하단 액션 영역의 배치 — 는 범위 밖으로 남겼다.

현재 관행 (`apps/example/app/users/[id]/delete/page-content.tsx`) 은 `layout="sidebar"` 위에 `Heading level=1 + Card(details) + Alert + Form` 의 1차원 `flow` 를 얹어 쓴다. 이 조합은 지금도 작동하지만 다음이 모호:

1. **뒤로가기 / 부모 경로로 복귀** 의 표준 표현이 없음 — admin CRUD 에서 상세→목록 네비는 반복 패턴.
2. **헤더 영역 (title + 선택적 sub-title + 선택적 primary action)** 과 **본문** 의 시각/의미 구분이 없음. 모든 Heading 이 평평하게 body 에 녹아 있음.
3. **메타 rail** (updated / owner / created / id 등 읽기 전용 요약) 과 **주 본문** 분리가 없음. 현재는 Card 본문 List 안에 한꺼번에 섞임.
4. **하단 액션 영역** (Delete / Archive / Export) 이 Form 인라인과 구분 안 됨.

ADR 0011 §Consequences "Neutral" 은 `tabs-page` / `split-page` / **`detail`** 을 "본 ADR 패턴을 재사용 가능" 후속 레이아웃으로 명시 예고했고, `docs/README.md` Open Decisions #11 · `docs/spec/component-catalog.md` §미정·`docs/spec/page-envelope.md` §미정 세 곳이 동일한 확장점을 대기 중이다.

ADR 0018 본문은 수정하지 않는다 (ADR amends 정책). 본 ADR 은 ADR 0018 이 남긴 layout-level gap 을 닫는 **신규 레이아웃 1개 추가** 결정이다.

## Decision

### 1. 신규 레이아웃 `detail` 을 v1 카탈로그에 추가

ADR 0007 §2 레이아웃 표에 `detail` 을 추가한다. 갱신된 enum:

```
flow | sidebar | topbar | detail
```

envelope `layout` Zod enum (`packages/core/src/envelope.ts`), `PageLayoutZ`, `<Page>` prop 타입 동시 갱신. 미선언 시 기본 `flow` 는 불변.

### 2. `detail` 쉘 구조 — 3영역

HTML render 는 다음 3영역 고정 구조로 분기한다.

```
┌───────────────────────────────────────────────┐
│ header:                                       │
│   [← Back to <parent>]  (선택)                 │
│   <title (h1)>          [primary action (선택)]│
├───────────────────────────────────────────────┤
│ body grid (2-column, md+):                    │
│   main column:           │ meta rail (선택):   │
│     <children flow>      │   <children flow>  │
│                          │                    │
│   mobile: main 위 / meta 아래 (단일 세로)       │
├───────────────────────────────────────────────┤
│ footer actions (선택):                         │
│   <children flow — 주로 Form · Button 2차 액션>│
└───────────────────────────────────────────────┘
```

**영역 판별 규약 — "placement" prop 이 아니라 envelope / Page prop 으로 선언**:

- `<Page layout="detail">` 의 `children` 은 기본적으로 **main column** 에 flush.
- meta rail / footer actions 는 **명시 prop** 으로만 들어간다 — 본문 children 에서 "어느 카드가 rail 인지" 추론하지 않는다 (LLM · 사람 양쪽 모호성 회피).

```ts
interface PageProps {
  layout?: "flow" | "sidebar" | "topbar" | "detail";
  nav?: NavItem[];
  // detail 전용 — 다른 layout 에서는 무시
  back?: { label: string; href: string };
  meta?: ReactNode;       // 우측 rail 본문 (optional)
  footer?: ReactNode;     // 하단 액션 영역 (optional)
  children: ReactNode;    // main column 본문
}
```

다른 레이아웃에서 `back`/`meta`/`footer` 를 전달해도 warning 아님 — 무음 무시 (sidebar/topbar 에서 `nav` 가 flow 일 때 무음 무시되는 현행과 동형). v2 lint 에서 warning 승격 검토.

### 3. Markdown 직렬화 — flush-first (ADR 0007 §4 · ADR 0011 §3 계승)

좌/우 2-column 배치는 **순수 시각 정보**다. Markdown 에서는 단일 세로 흐름으로 flush. 배치 정보는 버리지만 정보 손실은 없다.

**직렬화 순서 고정**:

1. envelope YAML (`layout: detail` 포함)
2. (envelope `nav` 또는 Page `nav` 가 있으면) `## Navigation` 또는 `## Section navigation` 링크 리스트 — ADR 0011 §3 과 동일
3. (Page prop `back` 이 있으면) 본문 맨 앞 1줄 paragraph:
   ```markdown
   [← Back to Users](/users)
   ```
   - 텍스트 리터럴 `← ` (U+2190 + space) + `Back to ` + `<label>` 고정.
   - 링크 내부에 다른 markup 금지 (back nav 는 단일 링크).
   - `back` 미선언 시 prepend 없음.
4. main column 본문 (`children` walk 결과) — 통상 `Heading level=1` 으로 시작. `<Page>` 가 자동 heading 삽입하지 않는다 (envelope `title` 과의 중복 피함, ADR 0007 §5 Split flush 와 동형 원칙).
5. (Page prop `meta` 가 있으면) meta rail 본문 walk 결과. 시각적으로는 우측이지만 Markdown 은 main 뒤 순서로 flush.
   - 관행: `meta` 내부는 `Card{title="Details"}` 또는 `Card{title="Meta"}` 1개 — ADR 0018 단건 상세 관용구 재사용.
6. (Page prop `footer` 가 있으면) footer 본문 walk 결과.

**왜 main 뒤 meta 순**?

- 사람 시선: main 이 주 내용, meta 는 부차 맥락. 주 내용 먼저.
- LLM 토큰: 첫 N 토큰에 주 내용이 들어가는 것이 프롬프트 효율 우수.
- 뷰어 호환: directive 미지원 뷰어 (GitHub README 등) 에서도 main → meta 세로 나열이 자연스러운 읽기 순서.

meta 를 main 앞에 두는 대안은 기각 — "상세 페이지 진입 직후 가장 먼저 기대하는 것은 주 내용" 이라는 admin CRUD 검증 시나리오 관찰과 정합.

### 4. sidebar / topbar 와의 공존

`layout: detail` 은 sidebar / topbar 와 **배타적**이다. 하나의 `<Page>` 는 하나의 layout id 만 선언한다.

- 앱 전역 쉘 네비 (`## Navigation`) 가 필요하면 `envelope.nav` 를 쓴다. detail layout 자체가 envelope nav 를 소거하지 않는다 — Markdown 직렬화는 `## Navigation` (nav) → back link → main 순.
- HTML render 에서는 detail 쉘 내부에 sidebar 를 동시에 그리지 않는다 — detail 은 **한 리소스에 집중하는 페이지** 의미이므로 전역 쉘과 분리. 전역 쉘이 필요한 "목록+상세 함께" 화면은 v1 에서 별도 라우트로 분리 (예: `/users` list + `/users/[id]` detail). master-detail split view 는 `split-page` 후속 ADR 대상.

### 5. `intent: "destructive-confirm"` 과의 관계 (ADR 0020 §5)

ADR 0020 의 delete-confirm 페이지는 현재 `layout: "sidebar"` 를 채택하나, 본 ADR 도입 후에는 `layout: "detail"` + `intent: "destructive-confirm"` 조합이 보다 정합한다 — confirm 페이지는 "한 리소스에 집중" 의미와 1:1. 그러나 본 ADR 은 ADR 0020 의 기존 예시를 **강제 마이그레이션하지 않는다** — sidebar 조합도 합법 유지. 신규 confirm 페이지에서 detail 채택을 권장.

### 6. envelope `layout` 교차 검증

ADR 0011 §5 규약 계승: envelope `layout: detail` ↔ `<Page layout="detail">` 불일치 warning. `renderPage` 는 envelope 값을 우선.

## Consequences

**Positive**:

- ADR 0018 content pattern 과 ADR 0019 destructive confirm 관용구가 공유할 수 있는 **layout-level** 시맨틱 획득.
- back / main / meta / footer 4영역 구분이 prop 으로 외재화 — LLM · 사람 모두 "이 페이지는 한 리소스의 상세" 를 envelope · 쉘 2중 신호로 인지.
- Markdown flush 는 flow / sidebar / topbar 와 동일 원칙 (정보 손실 없이 배치 버림) — 관점 2·5 flat 보장 불변.
- `docs/README.md` Open Decisions #11 중 `detail` 항목 해소. `tabs-page` · `split-page` 는 별도 후속 ADR 대기.

**Negative**:

- `<Page>` props 표면 3개 확장 (`back` / `meta` / `footer`). layout !== "detail" 일 때 무의미 prop — 현행 sidebar/topbar 의 `nav` 와 동일 패턴이나 prop 수 증가.
- meta rail 배치는 prop-driven 이므로 "무엇이 meta 인가" 는 저자가 결정. 저자 숙련도에 의존. v2 lint 로 ADR 0018 관용구 외 내용이 meta 에 들어가면 warning 검토.
- ADR 0020 의 기존 sidebar 기반 confirm 예시와 본 ADR 권장 detail 조합이 공존 — 마이그레이션 가이드는 후속 ADR 또는 lint 규칙 도입 시점에 결정.

**Neutral**:

- back / meta / footer 는 모두 optional — 모두 생략하면 `detail` 은 `<main>` 한 덩이로 flow 와 시각적으로 구분되지 않을 수 있다. 최소 사용 권장 조합: `back` + `children`(Heading + Card + Alert) + `footer`(Form).
- mobile (single column) 에서 meta 가 main 아래로 떨어지는 동작은 HTML/CSS 층 관심사. Markdown 출력은 화면 크기 무관.
- 본 ADR 은 `<Page>` 확장만 다룬다 — 신규 `defineDualComponent({ name: ... })` 호출 없음. 카탈로그 닫힘 원칙 (ADR 0007 §7) 준수.

## Alternatives considered

1. **content-driven 자동 판별** (main Card·meta Card 를 children tree 에서 자동 분리) — 추론 규칙 필요, LLM · 사람 모두 모호. 기각.
2. **신규 컴포넌트 `DetailPageHeader` / `DetailMetaRail` 등 4-5개 등록** — ADR 0007 §7 카탈로그 닫힘 원칙 위반. 기각.
3. **layout enum 확장 없이 Page prop `variant="detail"` 만 추가** — envelope `layout` 과 Page prop 의 역할 분리 (ADR 0011 §5 교차 검증) 가 무너짐. 기각.
4. **back link 를 body 맨 앞 paragraph 로 저자가 직접 작성** — LLM 이 "일반 paragraph 와 back nav 를 구분" 해야 하는 부담. envelope-level 표식 (Page prop) 이 외재화 우위. 기각.
5. **ADR 0018 을 amend 해 layout 도 정의** — ADR 0018 의 "신규 component 미도입" 스코프와 섞임. 관심사 분리 위해 신규 ADR 채택.

## Migration

- `packages/core/src/envelope.ts` — `PageLayoutZ` enum 에 `"detail"` 추가.
- `packages/react/src/components.tsx` — `PageProps` 타입 확장 (`back` / `meta` / `footer`), `layout === "detail"` render 분기 · `toMarkdown` 직렬화 순서 구현.
- `docs/spec/page-envelope.md` §`layout` 표 / 미정 섹션 갱신.
- `docs/spec/component-catalog.md` §Page 갱신 — detail layout props / 직렬화 규약.
- `docs/README.md` — Accepted ADRs 에 0021 추가, Open Decisions #11 에서 `detail` 항목 제거 (tabs-page / split-page 만 남김).
- `apps/example/app/users/[id]/page.tsx` · `apps/example/app/users/[id].md/route.tsx` — 신규 예시 라우트 추가 (User 프로필 상세).

## Out of scope

- **Modal / Drawer** (Open Decision #10) — 여전히 v1 금지. detail 은 페이지 진입 기반이며 오버레이 아님.
- **Tabs-page / split-page layout** (Open Decision #11 잔여) — 본 ADR 범위 밖, 별도 ADR.
- **Master-detail split view** (목록 + 상세 동시 렌더) — `split-page` 후속 ADR 또는 v2.
- **Back link 의 i18n** — "Back to " / "← " 영어 고정 (ADR 0011 `Navigation`, ADR 0018/0019 `*none*` / "No results" 와 동일 라인).
- **meta rail 의 ADR 0018 관용구 강제 lint** — v2.
- **반응형 break-point 규약** — CSS 층 관심사, 구현 가이드 후보.

## Open

- ADR 0020 destructive-confirm 페이지의 sidebar → detail 마이그레이션 권고 시점.
- `back` prop 의 다중 parent 표현 (breadcrumb) 필요성 — 현재 단일 링크. 수요 입증 후 v2.
- detail + `nav.scope=section` 조합의 실용 사례 — `/users/[id]` 상세에서 `Details / Settings / Billing` 서브 nav 가 필요해지는 시점.
