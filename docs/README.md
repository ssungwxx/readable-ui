# readable-ui docs

## Structure

- `research/` — 설계 결정을 뒷받침하는 조사 자료
- `adr/` — Architecture Decision Records (의사결정 이력, 한국어)
- `spec/` — 내부 스펙 문서(포맷·검증 규칙)

문서 언어 정책: [ADR 0006](./adr/0006-documentation-language.md)

## Research

- [Markdown 요소 → View/Event 매핑 조사](./research/markdown-elements.md)
- [LLM 친화성 검증 — ADR 0011 레이아웃](./research/llm-test-0011-layouts.md)
- [LLM 친화성 검증 — ADR 0015 Table container directive](./research/llm-test-0015-table-container.md)

## Specs

- [Page Envelope](./spec/page-envelope.md) — YAML frontmatter + JSON Schema tools
- [Component Catalog (v1)](./spec/component-catalog.md) — 허용 컴포넌트·directive 직렬화
- [Bench](./spec/bench.md) — readable-ui · ax-tree · headful-md 3중 비교 (포인터; 정본 `bench/docs/metrics.md`)

## Accepted ADRs

- [0001 — Primary interaction syntax: Directive first](./adr/0001-primary-interaction-syntax.md)
- [0002 — Action URI scheme: MCP ecosystem](./adr/0002-action-uri-scheme.md)
- [0003 — Parser strategy: unified + thin abstraction](./adr/0003-parser-strategy.md)
- [0004 — MDX scope: author-time only](./adr/0004-mdx-scope.md)
- [0005 — Page envelope: YAML frontmatter with JSON Schema tools](./adr/0005-page-envelope.md)
- [0006 — Documentation language policy](./adr/0006-documentation-language.md)
- [0007 — Layout & component catalog (v1)](./adr/0007-layout-and-component-catalog.md)
- [0008 — Engine strategy: React element walk](./adr/0008-engine-react-element-walk.md)
- [0009 — Envelope extensions, Table row actions, serialization refinements](./adr/0009-envelope-extensions-and-serialization-refinements.md)
- [0010 — Readable-UI Harness (Claude Code skill)](./adr/0010-harness-skill.md)
- [0011 — Sidebar & topbar page layouts (admin 1차)](./adr/0011-sidebar-and-topbar-page-layouts.md)
- [0012 — Dual-representation convention signaling](./adr/0012-dual-render-convention-signals.md)
- [0013 — Form 내부 Button의 action 속성 생략](./adr/0013-suppress-form-inner-button-action.md)
- [0014 — Global nav as envelope metadata](./adr/0014-nav-as-envelope-metadata.md)
- [0015 — Table as container directive (pagination/sort/filter)](./adr/0015-table-as-container-directive.md)
- [0016 — Form input default value convention](./adr/0016-form-default-value-convention.md)
- [0017 — JSX prop ↔ Markdown attribute 명명 규칙](./adr/0017-jsx-markdown-attribute-naming.md)
- [0018 — Detail view convention](./adr/0018-detail-view-convention.md)
- [0019 — CRUD 액션 관용구: Delete 확인 · EmptyState · 행 상태](./adr/0019-crud-action-idioms.md)
- [0020 — CRUD idiom gaps closure: 2단계 삭제·자동 CodeSpan·EmptyState fallback](./adr/0020-close-crud-idiom-gaps.md)
- [0021 — Detail page layout (단건 상세 화면 쉘)](./adr/0021-detail-page-layout.md)
- [0022 — 데이터 헤비 Table 의 fenced payload 분리 (`readable-ui:data` JSONL)](./adr/0022-table-payload-fenced.md)
- [0023 — Benchmark environment (readable-ui · ax-tree · headful-md 3중 비교)](./adr/0023-benchmark-environment.md)
- [0024 — Admin metric·progress·descriptions·breadcrumb 관용구](./adr/0024-admin-metric-and-hierarchy-components.md)
- [0025 — Tier 3 컨테이너 컴포넌트 v1 편입 (Section · Steps · Tabs · Accordion · Split)](./adr/0025-tier3-container-components-activation.md)

## Open Decisions

아직 확정되지 않은 설계 지점 — 후속 ADR로 정리 예정:

1. **HTML inline 허용 정책** — 완전 허용(sanitize 화이트리스트) / 완전 금지 / 커스텀 엘리먼트만 허용
2. **Alert 확장 범위** — GFM 5종 고정 vs info/success/error 보강
3. **Form 상태(error/loading/disabled) 표현 위치** — 본문 인라인(`:::error`) vs envelope 선언 vs 이벤트 스트림
4. **Table 편집 가능성** — read-only 고정 vs Markform 식 "table field"
5. ~~**fenced info string 생태계 정책**~~ (폐기됨 — #9 로 흡수)
6. **정규형(normal form) 규정** — 같은 UI의 여러 Markdown 표기를 하나로 강제할지
7. **AG-UI / MCP Apps와의 경계** — 이벤트 스트림까지 포함 vs 직렬화 레이어로만
8. **v2 컴포넌트 registry 확장 정책** — 카탈로그 확장 규약
9. ~~**데이터 헤비 Table의 JSON payload 분리**~~ (폐기됨 — ADR 0022 로 closure)
10. **오버레이(Modal/Drawer/Popover) v2 지원 정책**
11. **Layout 카탈로그 추가 확장** — `tabs-page`, `split-page` 등 (sidebar/topbar는 ADR 0011, detail은 ADR 0021에서 확정)
12. **ajv standalone 빌드 검증** — envelope Zod를 빌드-타임 검증으로 승격
13. **린트 / GitHub Action 규약 자동화** — harness skill을 IDE 외부로 확장
