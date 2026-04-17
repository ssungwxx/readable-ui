# ADR 0003 — Parser strategy: unified + thin abstraction

- Status: Accepted
- Date: 2026-04-17

## Context

Markdown 파싱 기반을 (a) remark/unified 생태계에 의존, (b) 완전 독자 파서(micromark 직접), (c) 의존하되 얇게 감싸 추상화 중 선택해야 한다. 빠른 개발 vs 장기 유지보수 vs GFM 체인 순서 충돌 이슈의 트레이드오프.

## Decision

**remark/unified에 의존하고 `@readable-ui/core` 내부에서 얇은 추상화 레이어를 둔다.**

기본 파이프라인:

```
unified()
  .use(remarkParse)
  .use(remarkFrontmatter, ['yaml'])
  .use(remarkGfm)
  .use(remarkDirective)
  .use(readableUiTransform)   // 자체 플러그인: directive → actionable mdast 노드
  .use(remarkStringify)
```

- 사용자는 `parse(md)` / `serialize(tree)` 같은 고수준 API만 보고, 체인 구성은 내부 책임이다.
- 플러그인 순서(특히 `remark-gfm` ↔ `remark-directive`)는 내부에서 고정.
- 필요 시 사용자가 추가 remark plugin을 주입할 수 있는 확장점(`extensions: Plugin[]`) 제공.

## Consequences

**Positive**
- 초기 개발 속도 최상. 파싱·직렬화 핵심을 직접 구현할 필요 없음.
- `remark-gfm`, `remark-directive`, `mdast-util-to-markdown` 같은 검증된 구현을 활용.
- 추상화 레이어 덕분에 향후 독자 파서로 교체하거나 다른 엔진(micromark 직접)으로 전환할 여지 유지.

**Negative**
- `unified` + 모든 remark 플러그인을 번들에 포함하면 코어 크기가 커진다. 서버 사이드(Node) 우선이므로 초기엔 허용.
- 플러그인 체인 순서 버그 리스크가 있다. 테스트로 고정.
- remark 메이저 업데이트 시 자체 플러그인도 따라가야 한다.

**Neutral**
- 독자 구현이 필요한 부분은 `readableUiTransform` 플러그인 하나로 응집한다 (directive AST → actionable 메타 주입, fallback 이중 출력, action URI 정규화).
