# ADR 0007 — Layout & component catalog (v1)

- Status: Accepted (§2 revised by [ADR 0011](./0011-sidebar-and-topbar-page-layouts.md))
- Date: 2026-04-17

## Context

readable-ui는 "변환된 Markdown이 AI에게 작은 컨텍스트로 이해 가능해야 한다"(관점 4)와 "허용 레이아웃은 전부 flat 무손실 보장"(관점 2·5)을 원칙으로 한다. 그러려면 v1에서 허용되는 **레이아웃**(페이지 구조)과 **컴포넌트**(내용 블록)의 목록을 닫힌 집합으로 고정하고, 각각의 Markdown 직렬화 규약을 정해야 한다.

## Decision

### 1. 레이아웃과 컴포넌트를 분리 관리한다

| 개념 | 책임 | 식별자 위치 |
|---|---|---|
| Layout | 페이지 전체 구조 | envelope `layout: <id>` |
| Component | 내용 블록 (본문) | directive 이름 또는 mdast 타입 |

둘의 카탈로그는 별도 문서로 관리한다 ([spec/component-catalog.md](../spec/component-catalog.md)).

### 2. v1 허용 레이아웃 집합

| id | 설명 | 직렬화 | 도입 |
|---|---|---|---|
| `flow` | 기본. 세로 1차원 흐름. | 모든 블록이 위→아래 순서로 | 0007 |
| `sidebar` | 좌측 수직 네비 + 우측 본문 (admin 쉘) | nav를 `## Navigation` + 링크 리스트로 body 앞에 flush, 배치 정보는 버림 | 0011 |
| `topbar` | 상단 수평 네비 + 하단 본문 | `sidebar`와 동일 flush — 좌/위 차이는 시각 전용 | 0011 |

`flow` 단일로 v1을 잠갔던 원안은 admin 1차 검증에서 쉘 네비 필요성이 드러나 ADR 0011로 `sidebar`/`topbar` 2개를 추가 허용했다. 추가 레이아웃(`tabs-page`, `split-page`, `detail` 등)은 후속 ADR 대상.

### 3. v1 허용 컴포넌트 집합

**Atomic (inline)**

- `Heading` (h1~h6), `Paragraph`, `Link`, `Image`, `CodeSpan`, `Emphasis`, `Strong`, `Divider`

**Block**

- `List` (unordered / ordered / task)
- `Table` (GFM table; rowspan/colspan/중첩 불가)
- `Alert` (GFM alert 5종: note/tip/important/warning/caution)
- `CodeBlock` (info string 자유)

**Container (자식 블록을 담는 flow)**

- `Section` (heading + body 묶음)
- `Card` (독립 영역)
- `Form` (액션 묶음)
- `Steps` (numbered progress)
- `Tabs` (상태 전환 — 전부 flush)
- `Accordion` (상태 전환 — 전부 열림으로 flush)
- `Split` (2열까지만 허용 — Markdown은 세로 나열)

**Interactive (directive primitives)**

- `Button`, `Input`, `Select`, `Textarea`, `Checkbox`, `Radio`

이 집합 밖의 컴포넌트는 **v1에서 허용하지 않는다**. `defineDualComponent`가 카탈로그 외 이름을 등록하려 하면 **error**.

### 4. 상태 전환 컨테이너의 직렬화 규약

- **Tabs**: 모든 tab 내용을 Heading(`##` 기준, 페이지 문맥에 따라 레벨 조정)으로 변환해 순차 flush. 활성 탭 표시는 소거 (AI는 전 탭 정보 필요).
- **Accordion**: 모든 panel을 "열린 상태"로 직렬화. 헤더는 Heading, 본문은 자식 flow.
- 두 경우 모두 **정보 손실 없음**이 계약.

### 5. 2D 배치 규약

- **v1은 `Split{cols=2}` 하나만 허용.** Columns(3+), Grid, Sidebar 금지.
- Markdown 직렬화 시: 왼쪽 셀 flush → 오른쪽 셀 flush (세로 나열). 배치 정보는 버린다.
- UI 렌더는 CSS grid/flex로 2열 표시. 순수 시각 효과.

### 6. 오버레이는 v1 금지

Modal, Drawer, Popover, Tooltip은 v1에서 지원하지 않는다. 문맥 소실·이벤트 트리거 표현이 복잡해 후속 ADR 대상.

### 7. 카탈로그 외 확장 정책

- v1에서 카탈로그는 **닫힌 집합**이다 (사용자 의도 관점 2 "열어두지 않음").
- `defineDualComponent`는 카탈로그의 이름을 **override**하는 용도로만 쓸 수 있다 (예: 시각 스타일 교체). 새 이름 등록은 v1 금지.
- v2의 registry 확장은 별도 ADR로 다룬다.

## Consequences

**Positive**
- 허용 집합이 닫혀 있어 AI 프롬프트·문서·검증이 모두 단순해진다.
- 모든 허용 컴포넌트가 무손실 flat 직렬화 — 관점 2·5 원칙 준수.
- Built-in만 허용하므로 "이 페이지에 이상한 컴포넌트가 들어올 리 없다" 가정 아래 엔진 설계(ADR 0008 예정)가 단순해진다.

**Negative**
- 사용자가 DateRangePicker, Kanban 같은 복잡 컴포넌트를 넣으려면 v1 카탈로그 안에서 조합하거나 v2를 기다려야 한다. 초기 사용처 제한.
- Split 2열 직렬화는 배치 정보를 버리므로, "왼쪽 요약 / 오른쪽 상세" 같은 의미적 쌍은 Markdown에서 순서 관계로만 남는다. 문서에 명시하지 않으면 AI가 혼동할 수 있음 — envelope `purpose`나 Card title로 의미를 명시하도록 가이드 필요.

**Neutral**
- Steps는 task list(`- [x] step`) + heading 조합으로 직렬화 가능 — 상세는 [component-catalog.md](../spec/component-catalog.md).
- Tabs의 heading 레벨은 페이지 문맥에 따라 자동 조정 (parent heading + 1).

## 관련

- ADR 0001 Directive primary: container 컴포넌트는 container directive로 표현.
- ADR 0005 Page envelope: `layout` 필드가 이 ADR의 레이아웃 id를 참조.
- 후속 ADR 0008(가칭): React tree → mdast 엔진 전략 — 이 카탈로그를 기반으로 walker가 분기.
- 후속 ADR(미정): v2 component registry 확장 정책.
