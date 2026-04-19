# readable-ui

> Languages: **한국어** · [English](./README.en.md)

AI 에이전트가 브라우저나 스크린샷 없이 읽고 조작할 수 있도록, React UI 컴포넌트가 자기 자신을 Markdown 으로 직렬화합니다.

> 상태: early scaffolding. API 는 아직 안정화되지 않았습니다.

## 개념

React 컴포넌트는 두 얼굴을 선언합니다.

1. **HTML render** — 사람이 보는 것.
2. **Markdown serializer** — 에이전트가 읽는 것.

`Accept: text/markdown` 요청이 도착하면, 동일한 컴포넌트 트리를 walk 하면서 각 노드가 DOM 대신 Markdown (테이블·링크·폼 필드 목록·action manifest) 을 발행합니다.

에이전트는 페이지를 문서처럼 읽고, 선언된 URI (예: `mcp://tool/...`) 로 action 을 트리거합니다 — Playwright 도, 스크린샷도 필요 없습니다.

## 패키지

| Package | 역할 |
| --- | --- |
| `@readable-ui/core` | 프레임워크 비의존 serializer (React tree → mdast → Markdown) + 컴포넌트 registry |
| `@readable-ui/react` | React 바인딩 — `defineDualComponent`, hooks, provider |
| `@readable-ui/next` | Next.js 어댑터 — Accept 헤더 content negotiation, RSC 지원 |
| `@readable-ui/mcp` | 선언된 action 을 MCP tool 로 노출 |

## 적용 범위 (Scope)

**적합 (Fit).** readable-ui 카탈로그를 전제로 처음부터 설계하는 신규 agent-facing admin 패널 및 internal tool — 즉 readable-ui 가 앱 전체 컴포넌트 표면을 소유하는 프로젝트.

**부적합 (Not fit).** 이미 shadcn/ui · MUI · Ant Design 등 기존 컴포넌트 라이브러리로 구축된 앱. readable-ui 는 drop-in 으로 얹히는 additive layer 가 아닙니다.

- readable-ui subtree 내부에서 walker 는 host element 를 거부합니다. Markdown 직렬화 도중 만나는 `<button>` 이나 `<div>` 는 throw (`packages/core/src/index.ts:147-151`) 되므로, native DOM 으로 펼쳐지는 기존 컴포넌트를 트리에 섞을 수 없습니다.
- v1 컴포넌트 카탈로그는 26 개 항목의 **닫힌 집합** 입니다 ([ADR 0007](./docs/adr/0007-layout-and-component-catalog.md)). `defineDualComponent` override 는 기존 카탈로그 이름에 대해서만 바인딩되며, 새 이름 (예: `DateRangePicker`, `MultiSelect`, `Kanban`) 은 ADR 개정을 요구합니다.

따라서 기존 admin 앱 위에 페이지 단위로 점진 도입하는 경로는 지원 범위 밖입니다. readable-ui 아래에 놓을 화면은 전면 재작성을 계획하거나, 다른 라이브러리를 선택하세요.

## Non-goals

- 고정된 UI kit. 본 라이브러리는 시각 디자인을 강제하지 않습니다 — 본인의 컴포넌트를 가져와 Markdown counterpart 를 등록하세요.
- Markdown 에디터. UI **를 Markdown 으로** 렌더링하는 것이지, Markdown **을 UI 로** 편집하는 것이 아닙니다.
- 기존 컴포넌트 라이브러리 (shadcn/ui · MUI · Ant Design 등) 의 drop-in 대체. [Scope](#적용-범위-scope) 참조.
- 기존 admin 앱 위의 점진 도입 — walker 는 readable-ui subtree 내부의 host element (`<button>` · `<div>`) 를 throw 하므로, 렌더된 모든 노드는 등록된 dual 컴포넌트여야 합니다. [ADR 0007](./docs/adr/0007-layout-and-component-catalog.md) 참조.

## License

MIT
