# ADR 0026 — `definePage` / `defineNav` DX 레이어

- Status: Accepted
- Date: 2026-04-18
- Related: [ADR 0005](./0005-page-envelope.md) (envelope), [ADR 0007](./0007-layout-and-component-catalog.md) (카탈로그 닫힘), [ADR 0008](./0008-engine-react-element-walk.md) (walker 의미론), [ADR 0011](./0011-sidebar-and-topbar-page-layouts.md), [ADR 0014](./0014-nav-as-envelope-metadata.md) (envelope-nav 우선순위), [ADR 0021](./0021-detail-page-layout.md), [ADR 0023](./0023-benchmark-environment.md) (byte-equal baseline), [ADR 0024](./0024-admin-metric-and-hierarchy-components.md)

## Context

ADR 0005–0024 누적 결과, 한 페이지를 만들려면 동일한 정보를 **세 위치에 중복 선언**해야 한다:

| 위치 | 중복 필드 |
|---|---|
| `envelope` 객체 | `layout`, `nav.items`, `tools[]` |
| `<Page layout nav>` prop | `layout`, `nav` (envelope 와 중복) |
| 트리 내부 | `<Form action="X">` / `<Button action="X">` / `<Table tool="X">` — envelope.tools 참조 |

추가로 모든 페이지가 `foo/page-content.tsx` + `foo.md/route.tsx` 쌍을 유지한다. `.md/route.tsx` 는 `renderPage(<Page/>, envelope)` 한 줄 호출 보일러플레이트다. `withActive` 같은 nav 활성 마커는 `apps/example/_shared/admin-nav.ts` 에만 존재해 외부 사용자는 직접 다시 구현해야 한다.

**중요 관찰**: Markdown 직렬화 경로는 이미 envelope 을 SSoT 로 사용한다 — `packages/react/src/components.tsx` 의 `Page.toMarkdown` 이 `ctx.envelope.layout ?? propLayout ?? "flow"`, `resolveNav(propNav, ctx.envelope?.nav)` (envelope 우선), `resolveBreadcrumb(propBc, ctx.envelope?.breadcrumb)` 로 envelope 을 먼저 참조한다 (ADR 0014 §2). 누수는 **HTML 렌더 경로에서만** 존재한다 — `<Page>` render 함수가 props 만 읽으므로 envelope 을 알지 못한다.

따라서 DX 개선은 **walker 를 건드리지 않고** HTML 경로에서 envelope 을 `<Page>` prop 으로 주입하는 얕은 레이어로 충분하다.

## Decision

`@readable-ui/react` 에 두 개의 비파괴 DX 헬퍼를 추가한다. 새 카탈로그 항목·envelope 필드·walker 변경은 **없다**.

### 1. `definePage({ envelope, render })`

```ts
export function definePage<P = void>(opts: {
  envelope: Envelope | ((params: P) => Envelope);
  render: (params: P) => ReactElement;
}): {
  Component: P extends void ? () => ReactElement : (props: P) => ReactElement;
  GET: P extends void ? () => Response : (req: Request, ctx: { params: P }) => Response;
  toMarkdown: P extends void ? () => string : (params: P) => string;
  envelope: Envelope | ((p: P) => Envelope);
};
```

- **Eager validation**: static envelope 은 모듈 로드 시점에 `parseEnvelope` 로 검증해 스키마 드리프트가 빌드 타임에 잡히도록 한다.
- **`Component`**: `page.tsx` 기본 export 용 React 컴포넌트. 내부적으로 `render(params)` 를 호출한 뒤 `bindPageEnvelope` 로 root `<Page>` 에 envelope 기반 props 를 주입한다.
- **`GET`**: Next.js App Router route handler 시그니처와 호환 (`(request, { params })`). `foo.md/route.tsx` 가 `export const GET = fooPage.GET` 한 줄로 끝난다.
- **`toMarkdown`**: 테스트/외부 소비용. `renderPage(buildTree(params), envelope)` 를 직접 호출.

#### `bindPageEnvelope` — HTML-only 주입

root element 가 `<Page>` 면 `cloneElement` 로 다음 prop 을 보충한다 (ADR 0014 §2 우선순위: envelope > prop 로 이미 정해진 규칙의 HTML 확장):

| 필드 | 주입 조건 | prop 명시 시 동작 |
|---|---|---|
| `layout` | prop 부재 & envelope 존재 | 값 다르면 console.warn (ADR 0011 §5 / ADR 0014 §4) |
| `nav` | prop 부재 or 빈 배열 & envelope.nav.items 존재 | href 배열 다르면 console.warn |
| `breadcrumb` | prop 부재 or 빈 배열 & envelope.breadcrumb 존재 | mismatch 무음 — 상세 페이지 특이 케이스 존중 |

Markdown 경로는 변경하지 않는다. `Page.toMarkdown` 이 이미 `ctx.envelope` 을 우선 읽으므로 `cloneElement` 된 prop 이든 원본 prop 이든 동일 출력이 보장된다 — **byte-equal** (ADR 0023).

#### ADR 0021 detail-layout 특례

`back` / `meta` / `footer` 는 envelope 필드가 아닌 `<Page>` prop 전용이다 (ADR 0021 §2). `definePage` 는 이들을 변경하지 않는다 — 상세 페이지는 `render: ({ id }) => <Page meta={...} footer={...}>...</Page>` 형태를 그대로 유지한다.

### 2. `defineNav(items)`

```ts
export function defineNav(items: readonly NavItem[]): {
  items: NavItem[];
  active(href: string): NavItem[];
};
```

`apps/example/_shared/admin-nav.ts` 의 `withActive` 를 라이브러리로 승격. `.active(href)` 는 매번 불변 복사본을 반환해 envelope `nav.items` 에 안전히 전달할 수 있다.

### 3. 타입 레벨 tool 참조 (보류)

envelope `tools[]` 에서 tool 이름 유니언을 추출해 `<Button action>` / `<Form action>` / `<Table tool>` 을 컴파일 타임에 검증하는 타입 마법은 **이번 ADR 에서 보류한다**. 이유:

- `renderPage` 가 이미 런타임에 동일 검증을 수행 (`core/src/index.ts` "Action X used but not declared").
- 유니언 추출은 `tools: [...] as const satisfies EnvelopeTool[]` 을 author 에게 요구해 DX 이득을 일부 상쇄한다.
- 닫힌 카탈로그(ADR 0007) 가 컴포넌트 prop 타입을 "현재 페이지의 tools" 로 좁히기 어려운 구조다.

후속 ADR 으로 다룬다.

### 4. 경계 명시 (no-op 보증)

본 ADR 이 **변경하지 않는 것**:

- **ADR 0007 카탈로그 닫힘**: `definePage` / `defineNav` 는 `defineDualComponent` 를 호출하지 않는다. 새 이름은 등록되지 않는다.
- **ADR 0008 walker 의미론**: React Context 를 사용하지 않는다. walker 는 Context provider 의 `value` 를 읽지 않으므로(`value` 필드가 walker 에 무효), envelope 전달은 전적으로 `SerializeContext.envelope` (Markdown) + `cloneElement` prop 주입 (HTML) 으로 처리한다.
- **ADR 0005 envelope 스키마**: `EnvelopeZ` 필드 추가 없음.
- **ADR 0011 / 0014 / 0021 의 prop semantics**: `<Page layout nav back meta footer>` 는 그대로 유효. 기존 앱이 깨지지 않는다.
- **ADR 0023 byte-equal baseline**: Markdown 출력은 변경 전과 동일해야 한다. CI 에서 `pnpm bench` 로 검증.

## Consequences

### Positive

- 정적 페이지: `page-content.tsx` 의 `<Page layout="X" nav={withActive(...)}>` 중복이 사라진다.
- `foo.md/route.tsx` 가 `export const GET = fooPage.GET` 한 줄로 압축된다.
- 동적 라우트 (`/users/[id]`) 도 `definePage<{id:string}>({ envelope: (p)=>..., render: (p)=>... })` 형태로 동일한 이득을 얻는다.
- `defineNav` 로 nav 활성 마커가 라이브러리 1급 시민이 된다 — 외부 사용자가 `withActive` 를 재구현할 필요 없음.
- Eager `parseEnvelope` 로 envelope 스키마 오류가 첫 요청이 아닌 모듈 로드 시점에 드러난다.

### Negative / Limit

- 타입 레벨 tool 검증은 여전히 런타임 (후속 ADR 로 이관).
- `bindPageEnvelope` 는 root element 가 `<Page>` 일 때만 동작한다. 저자가 Page 를 Fragment 나 HOC 로 감싸면 주입이 스킵된다 — 이 경우 기존 방식대로 `<Page layout nav>` prop 을 명시해야 한다. 현 카탈로그에서는 Page 가 항상 root 이므로 실용적 영향 없음.
- mismatch warning 은 `console.warn` — IDE lint 로 승격은 향후 과제 (Open Decision #13).

### Migration

- `apps/example` 의 8 개 페이지 (`dashboard`, `users`, `users/[id]`, `users/[id]/delete`, `audit`, `reports`, `jobs`, `components`, `settings`) 를 본 커밋에서 마이그레이션한다.
- `apps/example/_shared/admin-nav.ts` 는 `defineNav` 로 재작성되고, 기존 `withActive` export 는 deprecated 래퍼로 유지 (외부 호출 site 가 있을 수 있음).
- Bench baseline 갱신은 **byte-equal 을 먼저 확인**한 뒤에만 수행한다 (ADR 0023 §fairness).

## Harness skill 업데이트

`.claude/skills/readable-ui-harness/SKILL.md` §2 "동기화 체크리스트" 에 다음 row 추가:

```
### Library helper (factory) 추가
- [ ] 대응되는 ADR (이번 본 ADR)
- [ ] `packages/react/src/define-*.ts` 구현 + index.ts 재export
- [ ] tsup entry (`package.json scripts.build`) 에 파일 추가
- [ ] 사용처 (`apps/example/**`) 마이그레이션
- [ ] ADR 0007 / ADR 0008 위반 없음 재확인
```

## 검증

- [x] `pnpm --filter @readable-ui/react typecheck`
- [x] `pnpm --filter @readable-ui/react build`
- [x] `pnpm --filter example typecheck`
- [x] `pnpm --filter example build` (17/23 static pages generated)
- [ ] `pnpm bench` byte-equal vs pre-migration baseline (후속 run)
