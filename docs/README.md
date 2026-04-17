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

## Accepted ADRs

- [0001 — Primary interaction syntax: Directive first](./adr/0001-primary-interaction-syntax.md)
- [0002 — Action URI scheme: MCP ecosystem](./adr/0002-action-uri-scheme.md)
- [0003 — Parser strategy: unified + thin abstraction](./adr/0003-parser-strategy.md)
- [0004 — MDX scope: author-time only](./adr/0004-mdx-scope.md)
- [0005 — Page envelope: YAML frontmatter with JSON Schema tools](./adr/0005-page-envelope.md)
- [0006 — Documentation language policy](./adr/0006-documentation-language.md)

## Open Decisions

아직 확정되지 않은 설계 지점 — 후속 ADR로 정리 예정:

1. **허용 레이아웃·컴포넌트 카탈로그** (ADR 0007 예정) — `flow` 외에 허용할 레이아웃 집합, 허용 컴포넌트 목록. 사용자 의도 관점 2·5 핵심
2. **React tree → mdast 변환 엔진 전략** (ADR 0008 예정) — element walk / offscreen reconciler / HTML 역파싱 중 택일
3. **HTML inline 허용 정책** — 완전 허용(sanitize 화이트리스트) / 완전 금지 / 커스텀 엘리먼트만 허용
4. **Callout 확장 범위** — GFM alert 5종 고정 vs directive로 info/success/error 보강
5. **Form 상태(error/loading/disabled) 표현 위치** — 본문 인라인(`:::error`) vs envelope 선언 vs 이벤트 스트림
6. **Table 편집 가능성** — read-only 고정 vs Markform 식 "table field"
7. **Fallback 이중 직렬화 의무화** — directive + link-as-action 자동 병기를 기본으로 할지
8. **fenced info string 생태계 정책** — `readable-ui:<subtype>` 네이밍 규칙 확정
9. **정규형(normal form) 규정** — 같은 UI의 여러 Markdown 표기를 하나로 강제할지
10. **AG-UI / MCP Apps와의 경계** — 이벤트 스트림까지 포함 vs 직렬화 레이어로만
