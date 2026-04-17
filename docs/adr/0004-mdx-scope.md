# ADR 0004 — MDX scope: author-time only

- Status: Accepted
- Date: 2026-04-17

## Context

MDX는 "Markdown 안에 JSX 컴포넌트 직접 삽입"을 허용해 저자가 가장 편하게 쓸 수 있는 표현이다. 다만 **런타임에 에이전트가 MDX를 생성·평가**한다면 임의 JSX 실행이라는 심각한 보안/샌드박스 이슈가 생긴다.

## Decision

**MDX는 저자(빌드타임) 전용으로만 지원한다.** 런타임 입력·출력의 canonical 표현은 directive + GFM + frontmatter로 한정한다.

- 개발자가 `.mdx` 파일을 작성하면 빌드 시 `@mdx-js/mdx`가 AST를 만들고, readable-ui의 빌드 훅이 `<Button>` 같은 JSX 노드를 equivalent directive AST로도 재직렬화한다.
- 런타임에 `renderMarkdown(mdxSource)` 같은 API는 제공하지 않는다.
- 에이전트가 출력하거나 저장소가 자동 생성하는 Markdown은 directive/GFM 형식으로만 받는다.

## Consequences

**Positive**
- 라이브러리 스코프 명확 — JSX evaluator, sandbox, VM context를 유지할 필요 없음.
- 런타임 번들에 MDX 파서가 빠져 크기·의존성 감소.
- "에이전트가 생성한 콘텐츠"는 항상 단일 형식(directive)으로 들어와 검증·saniti 규칙이 단순해진다.

**Negative**
- JSX에 익숙한 저자가 `.md`를 쓸 때 `<Button>` 대신 `::button[Label]{attr=value}`를 써야 한다 — 학습 비용.
- MDX의 `{expression}` 같은 표현력은 제공하지 않는다. 동적 값은 React 컴포넌트가 props로 받아 처리한다.

**Neutral**
- 향후 "빌드타임 MDX → directive 자동 변환" 어댑터는 `@readable-ui/mdx-compat` 같은 별도 패키지로 분리 가능. 코어는 개입하지 않는다.
