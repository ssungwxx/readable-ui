# ADR 0015 — Table as container directive (pagination / sort / filter co-location)

- Status: Accepted
- Date: 2026-04-18
- Revises (in part): [ADR 0007 §3](./0007-layout-and-component-catalog.md), [ADR 0009 §1·§6](./0009-envelope-extensions-and-serialization-refinements.md)
- Reinforces: [ADR 0002](./0002-action-uri-scheme.md), [ADR 0012](./0012-dual-render-convention-signals.md)
- Related: [ADR 0005](./0005-page-envelope.md), [ADR 0013](./0013-suppress-form-inner-button-action.md)

## Context

readable-ui의 목적은 **admin 성격의 UI를 LLM이 빠르게 이해하고, 적은 토큰으로 자동화를 수행하도록 markdown으로 전달**하는 것이다. admin 화면에서 가장 많이 반복되는 패턴은 목록(Table) 위에서 수행되는 페이지 이동·정렬·필터 조작이다. 현행 설계는 여기서 다음 결함을 갖는다.

1. **메타의 분산**: `pagination`이 envelope(ADR 0009 §1)에, row action이 Table props(ADR 0009 §6)에, sort/filter는 **전혀 정의되지 않음**. LLM은 "지금 어느 페이지에 있고, 무엇으로 정렬되어 있고, 어떤 필터가 걸렸는가"를 파악하려 여러 지점을 교차 참조해야 하고 결과적으로 토큰·추론 비용이 증가한다.
2. **`caption` 직렬화 누락**: Table props에 `caption`이 있으나 `toMarkdown` 경로에서 버려져 round-trip이 깨진다.
3. **카탈로그 닫힘 원칙의 사각**: Table은 v1에서 GFM table(Block)로 고정됐지만, pagination/sort/filter를 표현하려면 메타를 붙일 자리가 필요하다. 기존 Block 분류에는 attribute 슬롯이 없다.
4. **v1 검증 드리프트**: LLM 친화성 팀 검증에서 filter 값에 `,`·`:`·공백이 들어가면 `filter=k:v,k:v` 단일 문자열로는 이스케이프가 모호해 LLM이 일관되게 생성하기 어렵다는 결론이 나왔다.

**목적 재확인**: 본 프로젝트는 프런트 UI를 스크린샷으로 이미지 분석하게 하는 방향이 아니라, **admin 수준의 간단한 화면을 markdown으로 빠르게 전달해 LLM의 토큰·지연을 최소화하는 홈페이지 기반 자동화**를 지향한다. 따라서 Table의 상태 메타는 (a) LLM이 한 지점만 읽고도 즉시 이해할 수 있어야 하고, (b) 이스케이프 규칙이 단순해야 하며, (c) 토큰이 저렴해야 한다.

## Decision

### 1. Table을 container directive로 승격한다

기존 leaf Block(GFM table)이 아니라 `:::table` container로 출력한다. 내부에 GFM pipe table이 그대로 들어간다.

```markdown
:::table{tool=listUsers page=2 of=7 sort=createdAt:desc filter-status=active filter-role=admin}
| id | name  | email    |
| -- | ----- | -------- |
| 1  | Alice | a@x.com |
:::
```

- ADR 0007 §3 분류표에서 **Table을 Block → Container로 이동**한다.
- ADR 0007 §7 "override는 시각 스타일 교체"의 예외가 아니라 **카탈로그 내부의 재정의**로 본다. 이는 본 ADR이 명시적으로 승인하는 단일 예외이며, 다른 컴포넌트에 기본 전이되지 않는다.
- 엔진은 Form과 동일한 container directive 경로를 재사용한다 (`components.tsx`의 Form precedent).

### 2. 메타 속성을 directive attribute로 co-locate한다

| 속성 | 값 | 의미 |
|---|---|---|
| `tool` | envelope `tools[].name` | 이 Table을 생성한 tool. 헤더 클릭·페이지 이동 시 재호출 대상. envelope 미선언 시 **error** (ADR 0005 검증규칙 3). |
| `page` | 1-index 정수 | 현재 페이지. 생략 시 `1`. |
| `of` | 정수 (total pages) | 전체 페이지 수. LLM의 `ceil(total/size)` 계산 부담 제거. cursor 기반이면 생략 + `next`/`prev` URL. |
| `size` | 정수 | 페이지 크기. 고정 기본이면 생략. |
| `sort` | `KEY:DIR` 단일 | 정렬 컬럼·방향. 첫 `:`만 separator, `DIR`은 `asc|desc` case-insensitive. |
| `mode` | `summary` | 선택. summary일 때 잘린 꼬리행을 숨기고 `total > rows.length`면 tool 재호출 link를 footer로 자동 삽입. |
| `caption` | 문자열 | 상단 제목. render에서 `<caption>` 박스, markdown에서 directive attribute로 직렬화(현행 누락 동시 수정). |
| `filter-<field>` | 문자열 | equality filter. 필드 1개당 1개의 attribute. 이스케이프 제로. |

**v1 금지 범위**:
- 복수 정렬 컬럼
- OR / range / not-equal / like 연산자
- 필드당 2개 이상의 filter 값 (배열 필터)

필요하면 LLM이 다음 턴에 새 tool call을 구성하도록 유도한다. 본 ADR은 `filter-*` prefix를 예약해 후속 ADR에서 연산자 문법을 덧붙일 여지를 남긴다.

### 3. Action URI 예약어는 `_` prefix로 네임스페이스 분리

헤더 클릭·페이지 이동·필터 적용 시 엔진이 생성하는 action URI는 시스템 파라미터와 tool 자체 파라미터를 **밑줄 prefix로 구분**한다.

```
mcp://tool/listUsers?_page=3&_size=20&_sort=name:asc&_filter_status=active&_filter_role=admin
```

| URI 예약 prefix | 의미 |
|---|---|
| `_page` | 이동할 페이지 |
| `_size` | 페이지 크기 변경 |
| `_sort` | 정렬 (`KEY:DIR`) |
| `_filter_<field>` | equality filter per field |

tool 고유 param이 `page` 등 동일 이름을 쓰더라도 `_` prefix로 충돌이 원천 차단된다. 이 prefix 집합은 spec `component-catalog.md` 예약어로 등록되고, 후속 ADR에서만 확장한다.

### 4. Envelope `pagination`은 single-table shortcut으로 완화

ADR 0009 §1의 envelope-level `pagination`은 **Table directive 메타와 이중 소스가 되지 않도록** 다음과 같이 재정의된다.

- **원칙**: Table directive가 페이지에 있으면 directive의 `page`/`of`/`size`가 **SSOT**이다.
- envelope `pagination`은 (a) **Table이 0개 또는 1개인 페이지**에서 선언하는 **호환 shortcut**으로만 유지된다.
- Table이 2개 이상이고 envelope `pagination`이 선언되면 **warning** (런타임 경고, v2에서 error 승격 후보).
- envelope `pagination`과 Table directive가 공존할 때 값이 불일치하면 **warning**. directive 우선.
- Zod 스키마 변경은 없다 (`PaginationZ` 자체는 유지). 의미의 강등이다.

### 5. Row action 경로는 기존 유지 (ADR 0009 §6 불변)

- `actions?: TableRowAction<R>[]` props는 그대로 유지.
- 각 row의 action cell은 `[Label](mcp://tool/<tool>?<params>)` link-as-action으로 직렬화 (directive 금지).
- 셀 내부 규약(Link/CodeSpan/Emphasis/Strong만) 불변.
- Row action은 **Table의 "row 단위" 동작**이고, directive attribute의 `tool`은 **"Table 전체를 생성한 목록 tool"**이다. 두 역할은 겹치지 않는다.

### 6. `mode="summary"` 규약

- 의도: 대량 데이터에서 LLM이 쓰는 토큰을 줄이기 위해 head N행만 직렬화. 기본 N은 구현 기본값(권장 10).
- 잘린 경우에만(`rows.length < total`) footer link `[View all N rows](mcp://tool/<tool>?_page=1&_size=<total>)` 1줄을 `:::` 안쪽 마지막에 추가.
- 실제 `rows.length >= total`이면 footer 생략.
- ADR 0009 §1의 "200행+ 권장" 경로는 여전히 열려 있다 (후속 ADR: fenced `readable-ui:data` payload).

### 7. GitHub fallback 관찰

Directive 미지원 뷰어(GitHub README 프리뷰 등)에서 `:::table{...}`는 opening fence가 paragraph 텍스트로, closing `:::`가 pipe table의 ghost row로 흡수될 수 있다. **Form이 이미 동일한 inherited limitation**을 안고 있고, ADR 0012의 fallback 규범은 "best-effort"를 허용한다. 본 ADR은 별도 fallback 산출을 **요구하지 않는다**. 필요 시 후속 ADR에서 container-directive용 link-only 대체 규약을 추가한다.

## Consequences

**Positive**
- LLM이 Table 한 블록만 읽고 현재 페이지·정렬·필터를 전부 파악. envelope ↔ directive 왕복 제거.
- `of=7`로 `ceil(total/size)` 계산 부담 제로. 토큰 cost 낮음.
- `filter-<field>=<value>`는 이스케이프 규칙 없이 LLM이 기계적으로 생성 가능.
- `_` prefix 예약어로 system/tool param 충돌 원천 차단.
- `caption` 직렬화 누락 회귀 동시 해소.
- admin 자동화 시나리오("다음 페이지 가서 status=inactive만 골라 삭제")에서 단일 Table 블록 수정만으로 완결.

**Negative**
- ADR 0009 `pagination`의 의미를 "SSOT"에서 "shortcut"으로 강등 — 기존 작성자가 envelope에 pagination을 박아두고 Table에 또 넣는 실수 유발 가능. warning으로만 잡는다.
- Form에 이어 두 번째 container directive. GitHub 프리뷰 ghost row 비용이 누적.
- ADR 0007 §7의 "override만 허용" 규약을 이 ADR이 한 건 우회한다. 일반 규칙이 아니라 본 ADR 범위의 단일 예외임을 문서에 명시.

**Neutral**
- `of`·`size` 둘 다 선택 — cursor 기반/offset 기반 둘 다 자연스럽게 표현.
- `mode="summary"` footer link도 `_page=1&_size=<total>`을 쓰므로 신규 URI 규약 없이 기존 예약 prefix만 재사용.

## 관련 구현

- `packages/core/src/envelope.ts` — 변경 없음 (`pagination` Zod 유지). 필요 시 후속에서 per-tool map 승격.
- `packages/core/src/index.ts` — `SerializeContext`에 변경 없음. Table의 container 전환은 `mdast-util-directive` 경로를 그대로 사용.
- `packages/react/src/components.tsx` — `TableProps`에 `tool?`, `page?`, `of?`, `size?`, `sort?`, `mode?`, `filter?: Record<string,string>` 추가. `toMarkdown`을 `containerDirective(name="table")`로 전환, GFM pipe table을 내부 자식으로 포함. `caption`을 attribute로 직렬화. render에는 `<Pagination/>` 보조 UI 추가.
- `docs/spec/component-catalog.md` §Table — 전면 재작성. 예약어 표에 `tool`, `page`, `of`, `size`, `sort`, `mode`, `filter-*`, `_page`, `_size`, `_sort`, `_filter_*` 추가.
- `docs/spec/page-envelope.md` — `pagination` 의미 강등 명시. 검증규칙 3에 `:::table{tool=X}` 경로 명시.
- `apps/example/app/users` — Users 페이지에 pagination/sort/filter 시연 케이스 추가.

## Open

- **Multi-sort / range / OR filter** — v1 금지, 수요가 누적되면 후속 ADR.
- **Cursor 기반 pagination** — `next`/`prev` URL attribute 추가 여부 (현행 row action link와 중복 우려).
- **Summary 기본 N 값의 전역 설정화** — `WalkOptions.tableSummarySize` 같은 옵션 필요성.
- **Table directive의 link-only fallback** — GitHub 프리뷰 경험을 더 개선할 필요가 생기면 ADR 0012 확장.
