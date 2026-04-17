# ADR 0011 — Sidebar & topbar page layouts (admin 1차)

- Status: Accepted (§2 partially revised by [ADR 0014](./0014-nav-as-envelope-metadata.md) — envelope nav 경로 추가)
- Date: 2026-04-17
- Revises (in part): [ADR 0007 §2](./0007-layout-and-component-catalog.md)
- Related: [ADR 0005](./0005-page-envelope.md), [ADR 0008](./0008-engine-react-element-walk.md)

## Context

ADR 0007 §2는 v1 레이아웃 카탈로그를 `flow` 단일로 잠갔다. 1차 검증에서 `flow` 하나로 제품성이 증명됐지만, admin 시나리오(사내/대시보드/콘솔)에서는 **페이지 전역 네비게이션 쉘**이 사실상 표준이다 — AWS·GCP·Vercel·Supabase·Linear admin 등 대부분이 좌측 사이드바, 일부(Notion·GitHub Settings·초기 Stripe)가 상단 탭.

현재 구현(`packages/react/src/components.tsx:35`)의 `<Page>` 는 envelope `layout` 필드를 무시하고 `<main className="mx-auto max-w-4xl ...">` 하나만 렌더한다. `layout: flow` 가 선언형 메타로만 존재하고 렌더에 영향 없음. admin 1차에서 이 gap을 닫되, ADR 0007의 "닫힌 집합" 원칙을 해치지 않는 최소 확장을 정의한다.

검토한 후보:

1. **Page props 기반** — `<Page layout="sidebar" nav={[...]}>`
2. **카탈로그 확장** — 새 `<Nav>`, `<NavItem>`, `<NavGroup>` 컴포넌트 추가
3. **Page 변종 분기** — `<PageWithSidebar>` / `<PageWithTopbar>` 각각 별도

## Decision

### 1. 두 개의 신규 레이아웃을 추가한다

| id | 설명 | 도입 근거 |
|---|---|---|
| `flow` | 기존. 세로 1차원 흐름 | — |
| `sidebar` | 좌측 수직 네비 + 우측 본문 | 5+개 네비 항목, 계층·배지 필요한 admin 쉘 표준 |
| `topbar` | 상단 수평 네비 + 하단 본문 | ≤5개 평탄 네비, 본문 너비가 중요한 dashboard/report |

`detail` · `tabs-page` · `split-page` 등 기타 후보는 본 ADR 범위 밖. 후속 ADR에서 다룬다.

### 2. Nav 표현은 `<Page>` props로 한다 (카탈로그 확장 아님)

```ts
type PageLayout = "flow" | "sidebar" | "topbar";

interface NavItem {
  label: string;
  href: string;
  active?: boolean;
}

interface PageProps {
  layout?: PageLayout;        // default "flow"; envelope.layout과 교차 검증
  nav?: NavItem[];            // layout !== "flow" 일 때 의미 있음
  children: ReactNode;
}
```

**근거**:
- ADR 0007 §3 카탈로그는 **본문 컨텐츠** 집합이다. 쉘 네비는 "이 페이지가 앱의 어디에 있는가"라는 envelope 성격의 메타다 — 본문에 섞는 것은 의미 오염.
- 카탈로그를 건드리지 않으므로 "닫힌 집합" 원칙 유지. 예약 attribute(ADR 0007 §7 · skill §3)도 영향 없음.
- `<Page>` 는 이미 shell 책임을 맡고 있으므로 `layout`·`nav` 두 prop 추가가 단일 책임 원칙과 정합.
- ADR 0008 walker는 동기·상태 없음. `Page.toMarkdown` 이 자식 walk 앞에 mdast list 하나만 prepend하면 됨 — 새 walker 경로 불필요.

### 3. Nav 직렬화 규약 — flush-first

좌/위 배치는 **순수 시각 정보**다. Markdown 층에서는 배치 구분 없이 본문 맨 앞에 링크 리스트로 flush한다.

직렬화 포맷:

```markdown
---
title: ...
layout: sidebar
---

## Navigation

- [Users](/users)
- [Roles](/roles)
- [Audit log](/audit)

<body blocks here>
```

규약:

1. `nav` 가 비어있거나 undefined면 prepend 없음 (`flow` 와 동일 출력).
2. Heading 레벨은 고정 `##` (level 2). envelope `title`이 `# ...` 으로 나가는 h1과 겹치지 않도록.
3. Heading 텍스트는 `Navigation` 으로 고정. i18n은 v2.
4. `active: true` 인 항목은 링크 뒤에 ` · current` suffix를 붙인다 (AI가 현재 위치 파악). 복수 active 허용되나 권장은 1개.
5. nav 리스트는 unordered (`-`). ordered는 의미 없음.
6. 링크 텍스트에 `[`,`]` 포함 시 백슬래시 이스케이프.

ADR 0007 §4 flush 원칙의 연장 — 배치 정보는 버리고, 정보 손실은 없다.

### 4. HTML 쉘 렌더

- `flow` — 현행과 동일: `<main className="mx-auto max-w-4xl px-6 py-10 space-y-6">`
- `sidebar` — `<div className="flex min-h-screen">` + `<aside>`(nav, 좌측 고정 너비) + `<main>`(본문)
- `topbar` — `<div className="flex flex-col min-h-screen">` + `<header>`(nav, 가로) + `<main>`(본문)

`nav` 가 없는 `sidebar`/`topbar`는 합법이나 **warning** — 쉘만 있고 내용 없음은 의도 불명확.

### 5. 교차 검증 — envelope.layout ↔ Page.layout

- envelope `layout` 과 `<Page layout={...}>` 값이 불일치하면 **warning**. Zod로 강제하지 않음 (런타임 prop은 정적 frontmatter와 다른 레이어).
- 일관된 사용을 위해 `renderPage` 는 envelope가 있으면 envelope의 값을, 없으면 Page prop을, 둘 다 없으면 `flow`를 채택한다.
- 두 곳을 동시에 명시하는 것이 권장 (AI는 envelope만, 렌더러는 prop만 보기 때문).

### 6. Envelope `layout` 필드 제약

`EnvelopeZ.layout` 을 `z.enum(["flow","sidebar","topbar"]).optional()` 로 좁힌다. 미선언 시 기본 `flow`로 간주.

## Consequences

**Positive**
- Admin 시나리오의 첫 구조적 gap(쉘 네비게이션) 해소.
- 카탈로그 닫힘 유지 — ADR 0007의 핵심 원칙 비침범.
- 좌/위 차이가 Markdown 층에서 사라지므로 AI가 받는 정보는 동일 — 관점 2·5 flat 보장.
- Walker·fallback·directive 어느 축도 건드리지 않아 회귀 위험 최소.

**Negative**
- `Page` props 다형화 — `layout="flow"` 시 `nav` prop은 무의미. TS 상 optional이라 타입으로는 drain되나, 잘못 사용해도 조용히 무시되는 것이 UX일지 warning 띄울지 v1.1 이슈.
- 실제 "앱 전역" 네비는 여러 페이지 공통이므로, 각 페이지에서 같은 `nav` 배열을 반복 전달해야 한다. Next.js 프로젝트라면 상위 layout에서 감싸는 헬퍼(`<AdminShell>`)를 사용자 측에서 만드는 것이 관례. v1에서는 헬퍼 제공하지 않음.
- `sidebar`/`topbar` HTML 렌더 시 반응형(모바일) 동작 규약은 초기 명세 없음 — 사용자 구현 영역.

**Neutral**
- `active: true` suffix `· current` 는 관용 — AI가 "현재 위치"를 읽는 용도. UI에서는 class 기반 강조.
- 후속 레이아웃 (`tabs-page`, `split-page`, `detail`)은 본 ADR 패턴을 재사용 가능. 각각 추가 시 nav prop에 새 field(예: `badge`, `icon`)가 필요해지면 그 시점에 spec 갱신.
- 예약 attribute 목록(ADR 0007 §7 / skill §3)은 **변경 없음** — nav는 directive attribute가 아닌 React prop.

## 관련 구현

- `packages/core/src/envelope.ts` — `EnvelopeZ.layout` enum 제약
- `packages/react/src/components.tsx` — `Page` props/render/toMarkdown 확장
- `docs/spec/page-envelope.md` — layout enum 갱신 + nav flush 예시
- `docs/spec/component-catalog.md` — Page 항목에 layout·nav props 문서화 (Nav는 컴포넌트가 아님을 명시)
- ADR 0007 §2 레이아웃 표에 sidebar/topbar 추가, status 에 "Revised by 0011 (§2)" 주석

## Open / Follow-up

- `detail` 레이아웃 — admin CRUD의 레코드 상세 화면. 별도 ADR 후보.
- `tabs-page` — URL 기반 서브페이지 (envelope multipart). page-envelope spec의 "미정 / 후속"에 이미 기록됨.
- NavItem의 `icon`, `badge`, `group` — 수요 입증 후 점진 확장. 그 시점엔 envelope `layout` enum 과 함께 NavItem schema를 ADR로 갱신.
- 반응형 쉘 동작 규약 (모바일 접힘 등) — 시각 계층 결정이므로 ADR 필수 아님, 구현 가이드 문서 후보.
