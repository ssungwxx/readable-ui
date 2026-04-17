# ADR 0008 — Engine strategy: React element walk

- Status: Accepted
- Date: 2026-04-17

## Context

`defineDualComponent`로 등록된 컴포넌트 트리를 Markdown으로 변환하려면 React 런타임에서 해당 트리를 "순회하며 각 컴포넌트의 `toMarkdown`을 호출"하는 엔진이 필요하다. 후보는 (A) React element walk, (B) offscreen reconciler, (C) HTML 역파싱.

## Decision

**A — React element walk** 전략을 채택한다.

- 엔진은 React 엘리먼트 트리를 직접 순회한다.
- 엘리먼트의 `type`이 `defineDualComponent`로 생성된 함수라면 `type.spec.toMarkdown(props, ctx)`를 호출해 mdast 노드를 얻는다.
- 그 외 타입(Fragment, 배열, 문자열, 숫자, null/boolean, 일반 함수 컴포넌트)의 처리 규칙을 본 ADR에서 고정한다.
- React를 실제로 "렌더"하지 않는다 — 리콘실러, 가상 DOM, effect 전혀 동원하지 않음.

### 순회 규약

| 노드 | 처리 |
|---|---|
| `null`, `undefined`, `false`, `true` | 무시 (빈 배열) |
| `string`, `number` | `text` mdast 노드로 변환 |
| `Array` | 각 요소를 walk, 결과를 flatMap |
| `React.Fragment` | children만 walk (자신은 mdast에 출현 X) |
| element with `type.spec` | `spec.toMarkdown(props, ctx)` 호출. 반환 mdast 노드 삽입 |
| element, `type`이 함수(spec 없음) | 함수 호출 → 반환 트리를 walk (provider/HOC 투명 통과) |
| element, `type`이 host 문자열 (`div`, `p` 등) | v1 **error** — built-in catalog 밖 (ADR 0007) |
| element, `type`이 심볼/객체 (Suspense, Context 등) | v1 children만 walk (투명 통과) |

### ctx (SerializeContext)

`spec.toMarkdown(props, ctx)`에 주입되는 컨텍스트:

```ts
interface SerializeContext {
  depth: number;                   // heading auto-levelling용
  walk(node: unknown): MdNode[];   // children 재귀 walker
  envelope: EnvelopeView;          // 현재 페이지 envelope 조회
  registerAction(name: string): void; // 사용된 tool 추적
}
```

### 비동기·Hook·Context

- v1 `toMarkdown`은 **동기 함수**이다. 비동기 데이터는 컴포넌트가 이미 받은 props로만 다룬다.
- `useState`, `useEffect`, `useContext`는 invoke되지 않는다 (`spec.toMarkdown`은 React를 통해 호출되지 않으므로).
- Context Provider는 children만 walk되므로 "투명 통과"한다. Provider가 자식에게 context를 전달하고 싶으면 spec 자체에 context-aware 로직이 들어가야 한다 — v1은 지원 안 함.
- Suspense 경계 내부에 비동기 서버 컴포넌트가 있다면, `toMarkdown`은 **렌더링된 이후의 element tree를 받는 것을 전제**한다 (Next.js RSC 파이프라인이 이미 resolve한 트리를 엔진이 받는 방식).

### 엔진 주요 API

```ts
// @readable-ui/core
function walkTree(node: unknown, ctx?: Partial<SerializeContext>): MdNode[];
function renderMarkdown(node: unknown): string;                     // walk + serialize
function renderPage(node: unknown, envelope: Envelope): string;     // frontmatter + body
```

- Next.js Route Handler에서 `renderPage(<UsersPage/>, envelope)`를 호출해 Markdown 응답 생성.

## Consequences

**Positive**
- 구현 규모 작다. 순회 함수 하나 + mdast 팩토리 + frontmatter 직렬화만.
- SSR/RSC 어느 쪽이든 "엘리먼트 트리"만 있으면 동작.
- 테스트 쉬움 — 렌더 없이 snapshot.

**Negative**
- `useContext` 같은 React 기능을 못 쓴다. v1 컴포넌트는 props로만 데이터 전달. 복잡 컴포넌트에 제약.
- Host 엘리먼트(`<p>`, `<div>`) 사용이 error이므로 저자가 HTML을 섞고 싶으면 v1엔 우회로 없음 (ADR 0007 카탈로그 제약의 연장).
- 서버 컴포넌트에서 async 함수가 해결되기 전 트리를 받으면 walk가 빈 결과를 낸다 — 반드시 **resolve된 트리**를 엔진에 넘기는 순서를 지켜야 함.

**Neutral**
- Fragment/배열/조건부 렌더는 정상 처리된다.
- 향후 reconciler로 업그레이드할 여지는 있지만, v1 스코프에서 불필요.

## 관련

- ADR 0001 Directive primary — `spec.toMarkdown`은 directive mdast 노드를 반환 가능.
- ADR 0003 Parser strategy — 엔진 출력물(mdast)을 `remarkStringify`로 최종 문자열화.
- ADR 0005 Page envelope — `renderPage` API에서 frontmatter 병기.
- ADR 0007 Component catalog — host 엘리먼트 금지와 정합.
