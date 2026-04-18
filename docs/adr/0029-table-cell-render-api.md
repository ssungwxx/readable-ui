# ADR 0029 — Table 셀 렌더 API 드리프트 해소 (spec ↔ `TableImpl` 정합)

- Status: Accepted
- Date: 2026-04-18
- Related: [ADR 0007 §3](./0007-layout-and-component-catalog.md) (카탈로그 닫힘), [ADR 0015](./0015-table-as-container-directive.md) (Table container directive), [ADR 0017](./0017-jsx-markdown-attribute-naming.md) (prop ↔ attribute 명명), [ADR 0019 §3](./0019-crud-action-idioms.md) (행 상태 CodeSpan 권고), [ADR 0020 §3](./0020-close-crud-idiom-gaps.md) (schema-driven enum 자동 wrap), [ADR 0022](./0022-table-payload-fenced.md) (payload 모드)

## Context

`docs/spec/component-catalog.md` §Table 의 끝(line 284) 은 다음 한 문장을 명시한다.

> **셀 내부 인라인만 허용 (Link, CodeSpan, Emphasis, Strong).**

이 문구는 두 가지로 해석될 수 있다.

1. **해석 H1 — 인간 작가 JSX 허용**: 저자가 `<Table>` 의 행 데이터를 만들 때, 셀 값으로 `<Link>` · `<CodeSpan>` · `<Emphasis>` · `<Strong>` 4 종의 React 노드를 **직접 주입** 할 수 있다. `rows` 의 개별 셀에 primitive 대신 ReactNode 가 들어가도 카탈로그 규약상 허용이다.
2. **해석 H2 — engine-driven inline wrap 한정**: 저자는 여전히 primitive (string/number/boolean) 만 넘기고, 위 4 종의 inline 노드는 **엔진이 자동으로 주입** 한다 (예: id 열 CodeSpan wrap, ADR 0020 §3 enum 자동 wrap, `actions[]` → row action Link). 셀 내부 "인라인 허용" 은 "엔진 주입 결과물로 등장할 수 있는 노드 화이트리스트" 라는 규범적 의미.

실제 구현인 `packages/react/src/components.tsx` 의 `TableImpl` 은 H2 만 지원한다.

- HTML render 경로(line 1319):

  ```tsx
  <td key={c.key} className={...}>
    {String(r[c.key] ?? "")}
  </td>
  ```

- Markdown `toMarkdown` 경로(line 1508):

  ```ts
  const rawVal = String(r[c.key] ?? "");
  ```

두 경로 모두 `String(r[c.key] ?? "")` 로 cell value 를 **primitive 로 강제 변환** 한다. 따라서 저자가 H1 해석을 따라 `rows: [{ id: 1, name: <Link href="...">Alice</Link> }]` 를 넘기면 HTML 에는 `[object Object]` 가 출력되고, Markdown 에는 동일한 문자열이 그대로 직렬화된다. 실질적으로 저자 JSX 인라인은 **작동하지 않는다**.

실제로 inline 노드가 셀에 등장할 수 있는 경로는 다음 세 가지 **engine-driven** 채널뿐이다.

- **id 열 표면 처리**: `showIdColumn` 은 `String(r.id)` 를 별도 `<span class="font-mono">` / `inlineCode` 로 감싼다 (HTML) — Markdown 에서는 text 이지만 의미적으로는 CodeSpan 권고(ADR 0019 §3) 에 근접.
- **ADR 0020 §3 schema-driven enum 매칭**: `tool` attribute 로 지정된 envelope `tools[]` 의 `_filter_<col>.enum`·`output` enum·`tools[].name` 집합과 셀 값이 정확히 일치하면 `inlineCode` wrap (components.tsx:1511~1517).
- **`actions[]` prop**: row action 셀은 `[Label](mcp://tool/<tool>?<params>)` link 를 엔진이 생성 (components.tsx:1486~1494).

즉 **spec 의 문구와 구현이 허용 범위에 대해 다른 것을 말하고 있다**. `/page.md` 추가 작업(에이전트 #29 보고) 에서 이 드리프트가 처음으로 실제 저자 오류를 유발했다 — 에이전트 #29 는 "사용자 이메일 셀에 `<Link>` 를 걸어 mailto 로 이동시키려" 시도했고, 렌더 결과가 `[object Object]` 로 떨어지자 `<Table>` + `<List>` 를 병행 배치하는 우회를 채택해 완료했다. 이 우회는 지금 canonical 가이드가 아니다.

## Decision

두 방향을 열거하고, 비교 후 하나를 default 권장으로 채택한다.

### 방향 A — Spec 을 구현에 맞춘다 (**권장 default**)

component-catalog §Table 의 "셀 내부 인라인만 허용 (Link, CodeSpan, Emphasis, Strong)" 한 문장을 다음으로 **좁힌다**.

> **셀 내부에 등장할 수 있는 인라인은 엔진이 주입하는 경로(id 열 표면 처리, ADR 0020 §3 schema-driven enum wrap, `actions[]` prop 의 row action link) 로 한정한다. 저자는 `columns[].key` 로 읽히는 raw cell value 로 primitive (string/number/boolean/null/undefined) 만 넘긴다. ReactNode 주입은 v1 에서 비지원.**

- `TableImpl` 의 `String(r[c.key] ?? "")` 강제 변환은 **해당 규범의 런타임 시행** 으로 재해석한다 — 코드 변경 없음.
- 저자가 셀에 링크나 코드 표시가 필요하면:
  - 링크: `actions[]` 를 쓰거나 (row 단위 작업), 별도 컴포넌트(`<List>`, `<Descriptions>`) 를 Table 형제 위치에 두고 cross-reference (에이전트 #29 가 자연스럽게 도달한 패턴).
  - 상태 값 CodeSpan: envelope `tools[].output.properties.<col>.enum` 또는 `_filter_<col>.enum` 을 선언해 ADR 0020 §3 자동 wrap 을 유도.
- `columns[].key` 타입(`keyof R`) 가 이미 primitive 셀을 강하게 유도하고 있으므로, spec 조정만으로 표면 일치.

### 방향 B — 구현을 spec 에 맞춘다

`TableColumn` 에 저자 renderer 를 추가한다. 두 하위 변형.

- **B-1 — `render?: (row: R) => ReactNode`**: 자유 JSX 허용. `String()` 강제 변환 대신 `cellChild` 를 renderer 결과로 대체. 단 결과 ReactNode 는 허용된 4 type (`Link` / `CodeSpan` / `Emphasis` / `Strong`) 만 whitelisting — engine walker 가 런타임에 enforce (비허용 type 발견 시 throw).
- **B-2 — `cellType?: "link" | "code"`**: escape hatch 를 축소해 enum 두 값만 허용. primitive 값은 그대로 넘기되 직렬화 시 해당 셀만 Link / inlineCode 로 자동 wrap. Link URL 은 별도 `cellHref?: (row: R) => string` prop 과 페어 — API 표면이 커진다.

어느 변형이든 GFM pipe table 의 cell 은 block 노드를 허용하지 않는 제약 (paragraph 없이 inline 만) 을 유지해야 한다. B-1 의 whitelist enforcement 와 B-2 의 enum 제한은 모두 같은 목적이다.

### 비교 — default 채택

| 관점 | A | B |
|---|---|---|
| spec 변경 양 | §Table 한 문장 수정 | §Table 수정 + 예약어 (`render`/`cellType`) 추가 + ADR 0017 §2 예외 목록 갱신 |
| 구현 변경 양 | 0 (문구만) | TableProps 표면 확장 + markdown/HTML 두 경로 분기 + whitelist walker |
| 저자 자유도 | 낮음 — 우회(List/Descriptions 형제) 강제 | 높음 — 셀 안에서 임의 inline |
| LLM 토큰 비용 | 낮음 (셀은 plain text + schema-driven wrap) | 중 — renderer 결과가 GFM pipe table 제약을 넘으면 drift 위험 |
| ADR 0007/0015/0020/0022 정합 | 일관 (카탈로그 닫힘·schema-driven·payload 불변) | schema-driven 자동 wrap 과 저자 override 의 우선순위를 다시 정해야 함 |

**방향 A 를 default 로 권장** 한다. 근거:

1. `<Table>` 은 이미 `actions[]` prop + id auto-wrap + ADR 0020 §3 enum 자동 wrap 으로 **주된 inline 수요(링크·상태 표시·row action)** 를 커버한다. 저자가 직접 inline 을 주입할 실수요가 낮다.
2. 자유 JSX 셀을 허용하면 Markdown 경로의 **GFM pipe table 제약(인라인만 허용, 줄바꿈·block 불가)** 과 충돌이 잦다. 저자가 React 에서 잘 작동한 `<Link>` 내부에 `<strong>` 중첩, 또는 `<p>` 가 섞인 노드를 넣는 순간 Markdown round-trip 이 깨진다. whitelist enforcement 는 가능하지만 런타임 에러의 표면이 늘어난다.
3. 현재 spec 의 한 문장을 **확장하지 않는** 편이 ADR 0007 (카탈로그 닫힘) 과 ADR 0015 §1 (Table 은 container directive 로 단일 예외) 의 "카탈로그 닫힘 + directive canonical" 방향과 일관이다. 새 escape hatch 는 후속 ADR 에서 **수요가 누적되면** 도입하는 게 합리적이다.

## Consequences

### 방향 A 채택 시

**Positive**

- 코드·spec 의 드리프트가 **spec 문구 한 줄 교정** 만으로 닫힌다.
- 저자 표면이 좁아져 mental model 이 단순 — "셀은 primitive, 나머지는 엔진이 알아서".
- LLM 토큰 비용 예측 가능 (셀은 plain text 또는 backtick 2 자 추가된 inlineCode 뿐).
- ADR 0022 payload 모드의 JSONL 직렬화 규약 (primitives 한정) 과 자연 정합 — ReactNode 셀을 허용하면 payload 쪽 drift 위험이 생겼을 것.

**Negative**

- 저자가 mailto / 외부 링크 / 특수 배지를 셀 안에 넣고 싶은 케이스는 우회 (`<Table>` + `<List>` / `<Descriptions>` 형제 배치) 가 필요 — 에이전트 #29 사례가 canonical 로 승격되지만 초보 저자에게는 trigger 가 보이지 않을 수 있다.
- 스펙 문장이 좁혀져 H1 해석을 기대해 온 저자(만일 존재한다면) 에게는 표면상 기능 축소로 보인다. 실제로는 구현이 한 번도 H1 을 지원한 적이 없으므로 "축소"가 아니라 "드리프트 해소" 이다.

### 방향 B 채택 시

**Positive**

- 셀 내부 자유 표현 — 저자 직관과 일치.
- row action 이 아닌 cell-level link (mailto, 외부 문서) 케이스에 바로 답.

**Negative**

- `TableProps` / `TableColumn` 표면 확장 + whitelist walker + HTML/Markdown 분기 — 구현 비용.
- ADR 0017 §2 예외 목록에 `render` / `cellType` / `cellHref` 추가, spec 예약어 갱신.
- ADR 0020 §3 자동 wrap 과 저자 renderer 의 **우선순위 규약** 필요 — 저자 renderer 우선? 엔진 enum wrap 우선? 양쪽을 동시에 허용? — 새 edge case 군.
- ADR 0022 payload JSONL (primitives 한정) 과 B-1 자유 ReactNode 의 정합을 재확인해야 함. payload 는 raw row object 를 직렬화하므로 영향 없음이지만, renderer 결과의 `String()` fallback 규약이 필요.

## Migration

### 방향 A 채택 시

1. `docs/spec/component-catalog.md` §Table line 284 한 문장을 본 ADR §Decision 의 강화된 문구로 교체. 본 ADR 번호 (0029) 크로스 링크 추가.
2. 에이전트 #29 의 `<Table>` + `<List>` 병행 패턴을 **canonical 패턴** 으로 승격. `component-catalog.md` 의 "셀 null: 빈 문자열 `""` 또는 `—` 허용" (line 536 부근) 문단 뒤 또는 Table § 말미에 "저자가 cell-level link·rich inline 이 필요한 경우 `<Table>` 형제 위치에 `<List>` 또는 `<Descriptions>` 를 배치하는 것을 canonical 로 한다" 1문단 추가.
3. `packages/react/src/components.tsx` 변경 없음. 1319·1508 의 `String(...)` 강제 변환은 spec 규범의 런타임 시행으로 재해석만 한다.
4. `apps/example/**` 에서 유사 케이스(있다면) 를 동일 패턴으로 가이드. 현행 users·audit 페이지는 이미 primitive 셀만 사용하므로 영향 없음.
5. ADR 0007 `docs/README.md` Accepted ADRs 에 0029 추가.

### 방향 B 채택 시

1. `TableColumn<R>` 에 `render?: (row: R) => ReactNode` (B-1) 또는 `cellType?: "link" | "code"` + `cellHref?` (B-2) 추가.
2. `TableImpl.render` 의 1319 경로에 `c.render ? c.render(r) : String(r[c.key] ?? "")` 분기.
3. `TableImpl.toMarkdown` 의 1508 경로에 renderer 결과 → mdast 변환 헬퍼 신설 (walker 재사용 또는 신규 converter).
4. whitelist walker — 허용 4 type (Link / CodeSpan / Emphasis / Strong) 이외 발견 시 throw.
5. `docs/spec/component-catalog.md` §Table props 표에 신규 필드 1 ~ 3 행 추가. 예약어 목록에 `render` / `cellType` / `cellHref` 추가. ADR 0017 §2 예외 목록 갱신.
6. 기존 8 페이지(`apps/example/**`) 는 **옵트인**. 마이그레이션 불필요 — 기존 `columns[].key` primitive 동작은 그대로 유지.
7. ADR 0020 §3 자동 wrap 과의 우선순위를 본 ADR 에서 결정: "저자 renderer 가 있으면 엔진 자동 wrap 을 건너뛴다" 가 자연 — 그러나 본 ADR §Open Decisions 로 열어 두는 것도 안.

## 경계 (no-op 보증)

- **카탈로그 닫힘 (ADR 0007 §3)**: 방향 A 는 카탈로그 엔트리 개수·예약어를 건드리지 않는다. 방향 B 는 예약어 1 ~ 3 개를 추가하나 새 컴포넌트 엔트리는 없으므로 ADR 0007 §7 의 "override 만 허용" 범위 안.
- **Walker (ADR 0008)**: 방향 A 영향 없음. 방향 B 는 cell renderer 결과를 walker 가 방문해야 하므로 "walker 경유 ReactElement 직렬화" 의 재사용 — envelope `SerializeContext` / `cloneElement` 경로는 그대로.
- **ADR 0022 payload mode**: 두 방향 모두 `readable-ui:data` JSONL 은 raw row object 의 primitive 값을 직렬화하므로 영향 없음. 방향 B 에서도 renderer 결과는 **visible** GFM pipe table 에만 반영되고 payload JSONL 에는 반영되지 않음 — 본 ADR 에서 명시.
- **에이전트 #29 `<Table>` + `<List>` 병행 패턴**: 방향 A 에서는 canonical 로 승격, 방향 B 에서는 renderer 도입 후에도 유효한 대체 패턴으로 유지.

## Open Decisions

1. **방향 B 채택 시 whitelist 의 런타임 enforcement 방법**: walker 단계에서 비허용 type 발견 시 throw 할지, warning 으로 둘지, 또는 fallback (예: `String(node)`) 으로 전락시킬지. throw 는 표면 드리프트 즉시 차단 — 그러나 dynamic 데이터로 렌더할 때 runtime regression 의 발화점이 늘어난다.
2. **GFM pipe table 내부 multi-line inline 제한**: 방향 B 의 renderer 가 `\n` 을 포함한 ReactNode 를 반환하면 GFM pipe table 이 깨진다. `mdast-util-to-markdown` 단계에서 이를 탐지해 throw 할지, 또는 renderer 호출 시점에 `\n` 을 공백으로 치환할지 결정 필요.
3. **Markdown 경로에서 React element → mdast 변환의 책임 경계**: 방향 B 에서 renderer 가 반환한 ReactNode 를 mdast 로 변환하는 책임을 (i) `TableImpl.toMarkdown` 안의 cell-level converter 에 둘지, (ii) 상위 walker 에 위임해 모든 cell 을 walker 경유로 처리할지. 후자는 API 일관성이 좋으나 cell 레벨 walker 호출 비용이 누적.

## Alternatives considered

1. **현상 유지 (no ADR)**: 드리프트가 spec 과 구현 사이에 남고, 에이전트 #29 사례 같은 회귀가 재발. **기각**.
2. **ADR 0020 §3 의 schema-driven wrap 경로를 모든 4 type 으로 일반화**: enum-per-column 신호를 확장해 Link 도 schema hint 로 주입. 표면 복잡도 폭증 + envelope 표면 확장. **기각** — 본 ADR 은 4 type 일반화가 아니라 **저자 표면의 명확화** 가 목적.
3. **방향 A + B 혼합 — spec 은 A 로 좁히되 실험적 `render` 를 `unstable_` prefix 로 추가**: 과거 "일단 구현 두고 나중에 문서화" 패턴(ADR 0010 Context 가 지양하는 것) 과 동형. **기각**.

## 관련 구현 (방향 A 채택 시 예상)

- `docs/spec/component-catalog.md` — §Table line 284 문장 교체 + 병행 패턴 1문단 추가.
- `docs/README.md` — Accepted ADRs 에 0029 추가.
- `packages/react/src/components.tsx` — **변경 없음**. 1319·1508 의 `String(...)` 강제 변환이 본 ADR 의 규범을 이미 시행 중.
- `apps/example/**` — 영향 없음 (primitive 셀만 사용 중).
