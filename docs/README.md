# readable-ui docs

## Structure

- `research/` — 설계 결정을 뒷받침하는 조사 자료
- `adr/` — Architecture Decision Records (의사결정 이력)

## Research

- [Markdown 요소 → View/Event 매핑 조사](./research/markdown-elements.md)

## Accepted ADRs

- [0001 — Primary interaction syntax: Directive first](./adr/0001-primary-interaction-syntax.md)
- [0002 — Action URI scheme: MCP ecosystem](./adr/0002-action-uri-scheme.md)
- [0003 — Parser strategy: unified + thin abstraction](./adr/0003-parser-strategy.md)
- [0004 — MDX scope: author-time only](./adr/0004-mdx-scope.md)

## Open Decisions

아직 확정되지 않은 설계 지점 — 후속 ADR로 정리 예정:

1. **HTML inline 허용 정책** — 완전 허용(sanitize 화이트리스트) / 완전 금지 / 커스텀 엘리먼트만 허용 중 택일
2. **Callout 확장 범위** — GFM alert 5종(note/tip/important/warning/caution) 고정 vs directive로 info/success/error 보강
3. **Form 상태(error/loading/disabled/permission) 표현 위치** — 본문 인라인(`:::error`) vs frontmatter 선언 vs 별도 이벤트 스트림(AG-UI 방식)
4. **권한 메타데이터 위치** — frontmatter `role:` vs directive attribute(`{role=admin}`) vs MCP Apps `visibility` 차용
5. **Table 편집 가능성** — read-only 고정 vs Markform 식 "table field" 정식 지원
6. **Content negotiation** — `Accept: text/markdown` 헤더 채택을 공식화할지
7. **Fallback 이중 직렬화 의무화** — directive를 쓸 때 link-as-action을 자동 병기할지 (토큰 비용 vs 호환성 트레이드오프)
8. **`data-rui-action` 같은 machine-readable anchor 강제 여부**
9. **fenced info string 생태계 정책** — `readable-ui-<type>` 여러 개 vs 단일 `ui`
10. **정규형(normal form) 규정** — 같은 UI의 여러 Markdown 표기를 하나로 강제할지
11. **AG-UI / MCP Apps와의 경계** — 이벤트 스트림까지 포함 vs 직렬화 레이어로만
