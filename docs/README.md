# readable-ui docs

## Structure

- `research/` — 설계 결정을 뒷받침하는 조사 자료
- `adr/` — Architecture Decision Records (의사결정 이력, 한국어)
- `spec/` — 내부 스펙 문서(포맷·검증 규칙)

문서 언어 정책: [ADR 0006](./adr/0006-documentation-language.md)

## Research

- [Markdown 요소 → View/Event 매핑 조사](./research/markdown-elements.md)

## Specs

- [Page Envelope](./spec/page-envelope.md) — YAML frontmatter + JSON Schema tools
- [Component Catalog (v1)](./spec/component-catalog.md) — 허용 컴포넌트·directive 직렬화

## Accepted ADRs

- [0001 — Primary interaction syntax: Directive first](./adr/0001-primary-interaction-syntax.md)
- [0002 — Action URI scheme: MCP ecosystem](./adr/0002-action-uri-scheme.md)
- [0003 — Parser strategy: unified + thin abstraction](./adr/0003-parser-strategy.md)
- [0004 — MDX scope: author-time only](./adr/0004-mdx-scope.md)
- [0005 — Page envelope: YAML frontmatter with JSON Schema tools](./adr/0005-page-envelope.md)
- [0006 — Documentation language policy](./adr/0006-documentation-language.md)
- [0007 — Layout & component catalog (v1)](./adr/0007-layout-and-component-catalog.md)

## Open Decisions

아직 확정되지 않은 설계 지점 — 후속 ADR로 정리 예정:

1. **React tree → mdast 변환 엔진 전략** (ADR 0008 예정) — element walk / offscreen reconciler / HTML 역파싱 중 택일
2. **HTML inline 허용 정책** — 완전 허용(sanitize 화이트리스트) / 완전 금지 / 커스텀 엘리먼트만 허용
3. **Alert 확장 범위** — GFM 5종 고정 vs info/success/error 보강
4. **Form 상태(error/loading/disabled) 표현 위치** — 본문 인라인(`:::error`) vs envelope 선언 vs 이벤트 스트림
5. **Table 편집 가능성** — read-only 고정 vs Markform 식 "table field"
6. **Fallback 이중 직렬화 의무화** — directive + link-as-action 자동 병기를 기본으로 할지
7. **fenced info string 생태계 정책** — `readable-ui:<subtype>` 네이밍 규칙 확정
8. **정규형(normal form) 규정** — 같은 UI의 여러 Markdown 표기를 하나로 강제할지
9. **AG-UI / MCP Apps와의 경계** — 이벤트 스트림까지 포함 vs 직렬화 레이어로만
10. **v2 컴포넌트 registry 확장 정책** — 카탈로그 확장 규약
11. **데이터 헤비 Table의 JSON payload 분리** — 200행+ 규약 (component-catalog 후속)
12. **오버레이(Modal/Drawer/Popover) v2 지원 정책**
