# readable-ui

> Languages: **한국어** · [English](./README.en.md)

**AI 에이전트가 브라우저 · 스크린샷 · 접근성 트리 없이 읽고 조작할 수 있는 React UI.**
같은 컴포넌트 트리가 사람에게는 HTML 로, 에이전트에게는 Markdown 으로 렌더됩니다.

[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](./LICENSE)
[![Node](https://img.shields.io/badge/node-%3E=20-brightgreen.svg)](./package.json)
[![Status](https://img.shields.io/badge/status-early%20scaffolding-orange.svg)](#상태)
[![ADR](https://img.shields.io/badge/ADRs-30%2B-purple.svg)](./docs/adr)

---

## 개념 — 한 트리, 두 얼굴

React 컴포넌트가 자기 자신의 **HTML 렌더** 와 **Markdown serializer** 를 함께 선언합니다. 요청이 `Accept: text/markdown` 을 실으면, 동일한 트리를 walk 하면서 DOM 대신 Markdown (테이블 · 링크 · 폼 필드 목록 · action manifest) 을 발행합니다.

```tsx
import { definePage } from "@readable-ui/react";
import { Page, Heading, Card } from "@readable-ui/react/components";

export const dashboard = definePage({
  envelope: {
    title: "Admin dashboard",
    tools: [{ name: "refreshDashboard", title: "Refresh dashboard" }],
  },
  render: (_, { Button }) => (
    <Page>
      <Heading level={1}>Admin dashboard</Heading>
      <Card title="Total users">
        <Heading level={2}>1,284</Heading>
      </Card>
      <Button action="refreshDashboard">Refresh</Button>
    </Page>
  ),
});
```

`GET /dashboard` 는 위 트리를 HTML 로 렌더합니다 — 카드 · 표 · 버튼에 자유롭게 Tailwind 를 입힐 수 있습니다.
동일 URL 에 `Accept: text/markdown` 을 보내면:

```md
---
title: Admin dashboard
tools:
  - name: refreshDashboard
    title: Refresh dashboard
---

# Admin dashboard

:::card{title="Total users"}
## 1,284
:::

::button[Refresh]{action="refreshDashboard"}
```

에이전트는 페이지를 문서처럼 읽고, envelope 에 선언된 tool 을 `mcp://tool/refreshDashboard` 형태의 URI 로 트리거합니다. Playwright 도, 스크린샷도, DOM snapshot 도 필요 없습니다.

## 왜 만드는가

오늘날 agent-facing 앱의 세 가지 흔한 선택지와 비교:

| 접근 | 토큰 비용 | 구조화된 action | UI ↔ tool drift |
| --- | :---: | :---: | :---: |
| Playwright · 스크린샷 (vision) | 매우 큼 | X | — |
| CDP 접근성 트리 dump | 수만 토큰 | 휴리스틱 | — |
| 별도 tool API + 수동 동기화 | 작음 | O | 발생 |
| **readable-ui** | **작음** | **O (declared)** | **없음 — 한 트리에서 파생** |

UI 와 tool 이 같은 코드에서 파생되므로 drift 가 원천적으로 없습니다.

## 벤치마크

`apps/example` 의 실제 7 시나리오를 동일 DOM snapshot 에서 3 개 전송 계층으로 측정 (baseline `2026-04-18`):

| Transport | tokens (중앙값) | tokens (평균) | vs readable-ui | actionable (평균) |
| --- | ---: | ---: | ---: | ---: |
| **`readable-ui`** | **1,247** | **3,118** | **1.00×** | **5.7** (declared) |
| `ax-tree` (CDP AX tree) | 23,883 | 29,701 | **23.9×** | 17.1 (heuristic) |
| `headful-md` (AX → MD 휴리스틱) | 417 | 402 | 0.13× | 1.3 (lossy) |

- `ax-tree` 는 평균 **23.9 배** 더 많은 토큰을 쓰면서도 action 을 구조화된 형태로 주지 못한다 (role 기반 휴리스틱 추정).
- `headful-md` 는 크기는 작지만 table payload · form field 같은 구조 정보를 잃는다.
- `readable-ui` 는 envelope `tools[]` 와 본문 directive 로 action 을 **명시적** 으로 선언한다.

공정성 규칙 · 전체 메트릭: [`bench/docs/metrics.md`](./bench/docs/metrics.md) · [ADR 0023](./docs/adr/0023-benchmark-environment.md).

## 패키지

| Package | 역할 |
| --- | --- |
| [`@readable-ui/core`](./packages/core) | 프레임워크 비의존 serializer (React tree → mdast → Markdown) + 컴포넌트 registry |
| [`@readable-ui/react`](./packages/react) | React 바인딩 — `definePage` · `defineDualComponent` · `defineTools` · 카탈로그 컴포넌트 |
| [`@readable-ui/next`](./packages/next) | Next.js 어댑터 — `Accept` 헤더 content negotiation, RSC 지원 |
| [`@readable-ui/mcp`](./packages/mcp) | envelope 의 declared action 을 MCP tool 로 노출 |

## 빠르게 보기

패키지는 아직 npm 에 게시되지 않았습니다. 저장소를 클론해 example 앱을 실행하세요.

```bash
git clone https://github.com/ssungwxx/readable-ui.git
cd readable-ui
pnpm install
pnpm -r build
pnpm --filter example dev
# → http://localhost:3000
```

각 라우트의 HTML 뷰 (`/dashboard`) 와 Markdown 뷰 (`/dashboard.md`) 를 나란히 열어 비교해 보세요. 8 개 샘플 페이지 — dashboard · users (CRUD) · user detail · reports · audit · jobs · components · settings — 가 준비돼 있습니다.

## 적용 범위

| Fit | Not fit |
| --- | --- |
| 처음부터 agent-facing 으로 설계하는 신규 admin 패널 · internal tool | shadcn/ui · MUI · Ant Design 등 기존 컴포넌트 라이브러리 기반 앱 |
| readable-ui 가 앱의 컴포넌트 표면을 전적으로 소유하는 프로젝트 | 기존 admin 앱 위에 페이지 단위 drop-in 도입 |

- walker 는 readable-ui subtree 내부의 host element (`<button>` · `<div>`) 를 거부합니다 (`packages/core/src/index.ts:147-151`).
- v1 카탈로그는 26 개 항목의 **닫힌 집합** 이며, 새 이름 (`DateRangePicker` · `Kanban` 등) 추가는 ADR 개정을 요구합니다. ([ADR 0007](./docs/adr/0007-layout-and-component-catalog.md))

## 상태

Early scaffolding — 다음은 **아직** 안정화되지 않았습니다.

- 패키지 npm 게시 전 (모두 `0.0.0`, `private` workspace)
- `definePage` · `Envelope` 시그니처
- 컴포넌트 카탈로그 v2 확장 규약
- 오버레이 (Modal · Drawer · Popover) 지원 정책
- Inline HTML 허용 범위

설계 피드백 · ADR 초안 기여를 환영합니다.

## Non-goals

- 고정된 UI kit. 시각 디자인은 본인의 스타일을 입히고 Markdown counterpart 를 등록하는 방식입니다.
- Markdown 에디터. UI **를 Markdown 으로** 직렬화하는 것이지, Markdown **을 UI 로** 편집하는 것이 아닙니다.
- 기존 컴포넌트 라이브러리 drop-in 대체 · 기존 admin 앱의 점진적 도입.

## 문서

- [`docs/adr/`](./docs/adr) — 30 여 개의 Architecture Decision Records (의사결정 이력)
- [`docs/spec/page-envelope.md`](./docs/spec/page-envelope.md) — envelope 포맷 (YAML frontmatter + JSON Schema tools)
- [`docs/spec/component-catalog.md`](./docs/spec/component-catalog.md) — v1 컴포넌트 · directive 직렬화 규칙
- [`bench/docs/metrics.md`](./bench/docs/metrics.md) — 벤치 시나리오 · 공정성 규칙

## License

MIT © [ssungwxx](https://github.com/ssungwxx)
