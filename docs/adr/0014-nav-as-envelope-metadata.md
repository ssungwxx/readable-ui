# ADR 0014 — Global nav as envelope metadata (+ nav scope)

- Status: Accepted
- Date: 2026-04-17
- Revises (in part): [ADR 0011 §2](./0011-sidebar-and-topbar-page-layouts.md)
- Related: [ADR 0005](./0005-page-envelope.md), [ADR 0009](./0009-envelope-extensions-and-serialization-refinements.md)

## Context

ADR 0011이 `<Page nav={[...]}>` prop으로 쉘 네비게이션을 도입했다. LLM 테스트(`docs/research/llm-test-0011-layouts.md` A3)에서 두 페이지의 nav 세트가 달라(users: Dashboard/Users/Roles/Audit log 4개 vs dashboard: Dashboard/Users/Reports 3개) fresh-context AI가 "전역 사이트맵인지 컨텍스트 nav인지" 판별 불가, medium confidence에 그쳤다.

실제 admin 앱 관행 — AWS Console, Vercel, Supabase, Linear — 은 "전역 shell nav + 섹션 내 서브 nav" 이층 구조가 표준. 현재 단일 `nav` prop 설계는 두 의미를 섞어 쓸 수 있어 모호.

심각도는 E2/E3보다 낮으나 페이지가 늘수록 드리프트 표면적이 기하급수적으로 커져 중기 악화 리스크.

## Decision

### 1. Envelope에 `nav` 필드를 신설한다

```ts
nav?: {
  items: NavItem[];
  scope?: "global" | "section";  // default "global"
};
```

`NavItem`은 기존 `{ label, href, active? }` 동일. envelope이 사이트맵의 단일 소스로 기능.

### 2. Envelope `nav` 우선, Page prop은 하위호환

`Page.toMarkdown` / `Page` 쉘 render는 아래 우선순위로 nav를 결정한다:

1. envelope `nav.items` 가 있으면 그 값 사용
2. 없으면 Page prop `nav` 사용 (ADR 0011 호환)
3. 둘 다 없으면 nav 섹션 flush 하지 않음

두 값이 모두 주어지고 서로 다르면 **warning** (ADR 0011 §5의 "envelope ↔ Page.layout 불일치" 규칙과 동일 계열).

### 3. Scope enum

`scope: "global"` (기본) — 앱 전역 쉘 nav. 모든 페이지에서 동일 세트 유지가 관행.

`scope: "section"` — 현재 섹션 내부 서브 nav. 페이지마다 다른 것이 자연스러움.

Markdown 직렬화 시 heading 텍스트가 분기된다:

- `global` → `## Navigation` (ADR 0011 기본 유지)
- `section` → `## Section navigation`

AI가 heading 텍스트만으로 scope 즉시 식별. i18n은 후속 ADR (현 단계 영어 고정).

### 4. Cross-validation warning

- `active: true` 항목이 `nav.items` 에 없으면 warning.
- 같은 앱(동일 `role` 또는 `paths.canonical` origin 공유)에서 페이지마다 `nav.items` 세트가 불일치하면 warning — 단 lint는 **페이지 단위 Envelope 검증 범위를 넘어서는 자료**가 필요하므로 v1에선 개별 페이지 Zod 검증으로 구현하지 않고, 후속 빌드 단계 lint ADR 대상으로 남긴다.

### 5. Examples 마이그레이션

`apps/example` 의 `adminNav` / `dashboardNav` 를 공용 상수 `apps/example/app/_shared/admin-nav.ts` 로 승격하고 두 페이지 envelope의 `nav.items` 에 동일하게 주입. `active` 만 페이지별로 다르게. 이것 자체가 "실세계 admin 패턴" 의 살아있는 예시가 된다.

## Consequences

**Positive**
- AI가 envelope 첫 스캔만으로 앱 전체 사이트맵 획득, A3 confidence medium → high 예상.
- 저자 부담 감소 — 공용 `nav.items` 상수 1개 선언, 페이지마다 `active` 만 변경.
- 실제 admin 앱 이층 구조와 정합 — `scope: "section"` 으로 section-level tab도 같은 메커니즘으로 표현 가능.
- ADR 0011 §2 "nav는 Page props, 카탈로그 확장 아님" 결정을 깨지 않음. envelope 확장 계보(0005→0009) 에 자연 편입.

**Negative**
- envelope 필드 하나 더 추가 — ADR 0009의 "장황성 증가" negative의 연장.
- Page prop `nav` 와 envelope `nav` 의 이중 경로가 혼재하는 하위호환 기간 동안 "어느 쪽을 써야 하지?" 혼란 가능성. 가이드 문서로 해소.

**Neutral**
- 반응형·아이콘·배지 같은 NavItem 확장은 본 ADR 범위 밖 (ADR 0011 Open/Follow-up 그대로 유효).
- 전역 nav 공유를 위한 `<AdminShell>` 류 헬퍼는 사용자 영역 유지 — ADR 0011의 "v1에서 헬퍼 미제공" 결정과 일관.

## 관련 구현

- `packages/core/src/envelope.ts` — `NavItemZ`, `NavZ` 신설, `EnvelopeZ.nav` 추가.
- `packages/core/src/index.ts` — `NavItem`/`Nav` 타입 export.
- `packages/react/src/components.tsx` — `Page.toMarkdown` / render 시 envelope `nav` 우선 로직. `NavItem` 타입은 기존 것과 호환.
- `docs/spec/page-envelope.md` — `nav` 필드 명세, 검증 규칙.
- `docs/spec/component-catalog.md` §Page — "nav 우선순위: envelope > prop" 명시.
- `docs/adr/0011-*.md` — Status에 "§2 partially revised by 0014" 주석.
- `apps/example/app/_shared/admin-nav.ts` 신규, users·dashboard 페이지 마이그레이션.
- 재검증: `docs/research/llm-test-0011-layouts.md` A3 재실행.

## Open

- envelope + prop 동시 지정 시 우선순위는 envelope 우선으로 충분한가, 불일치를 error로 승격할지 (현재 warning).
- `scope: "section"` 이면 여러 섹션 nav가 한 페이지에 동시에 있을 수 있는가 — 단일 envelope `nav` 만 허용하는 현 설계는 단일 섹션 가정.
- lint 자동화 범위 (전역 nav 일관성 체크) — 빌드 스텝 또는 CI 단계 ADR 후보.
