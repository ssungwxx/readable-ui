# ADR 0022 — 데이터 헤비 Table 의 fenced payload 분리 (`readable-ui:data` JSONL)

- Status: Accepted
- Date: 2026-04-18
- Closes: Open Decision #9 (200행+ payload 분리, fenced info string naming convention 포함, 구 #5 흡수)
- Extends: [ADR 0015](./0015-table-as-container-directive.md) §6 / §Open
- Related: [ADR 0007 §3·§5](./0007-layout-and-component-catalog.md), [ADR 0009 §1·§6](./0009-envelope-extensions-and-serialization-refinements.md), [ADR 0012](./0012-dual-render-convention-signals.md), [ADR 0017](./0017-jsx-markdown-attribute-naming.md)

## Context

ADR 0015 는 Table 을 container directive 로 승격해 pagination·sort·filter 메타를 데이터와 co-locate 했다. 그러나 **본문 행 수가 수백~수천 단위로 커지는 케이스**는 동일 ADR §6/§Open 에서 후속으로 명시 보류됐다:

> ADR 0015 §6 ─ "ADR 0009 §1의 '200행+ 권장' 경로는 여전히 열려 있다 (후속 ADR: fenced `readable-ui:data` payload)."

남아 있던 결정 공백 — Open Decision #9 — 은 다음 두 가지를 한 번에 해결해야 한다:

1. **데이터 페이로드 분리 형식**: 200행 이상의 Table 본문을 GFM pipe table 한 덩어리로 직렬화하면
   - LLM 토큰 비용이 (행수 × 컬럼수) 단위로 선형 증가하고,
   - row-by-row 부분 읽기 / streaming 이 어려우며,
   - directive attribute (메타) 와 데이터의 비중이 역전되어 LLM 의 첫-N-토큰 효율이 무너진다.

2. **fenced info string naming convention** (구 Open Decision #5): `component-catalog.md` §CodeBlock note 가 `readable-ui:actions`·`readable-ui:data` 라는 이름을 *예약은 했지만 정의는 하지 않은* 상태로 남아 있어 spec drift 의 위험.

본 ADR 은 (1) 의 산출 형식을 결정하고, 그 결정에 필요한 만큼 (2) — `readable-ui:` prefix 정책과 `readable-ui:data` 한 가지 키만 — 를 동시에 닫는다. `readable-ui:actions` 등 다른 후보 키는 본 ADR 범위 밖.

목적 재확인 (ADR 0015 와 동일 라인): admin 자동화의 LLM 토큰·지연 최소화. 200행+ 케이스에서 사람의 시각 표 (HTML) 와 에이전트의 데이터 (Markdown) 를 같은 React tree 에서 분기 산출하되, 메타·데이터·footer link 의 역할을 한 directive 안에서 닫는다.

## Decision

### 1. fenced info string naming convention — `readable-ui:` prefix 정본

readable-ui 가 자기 의미를 부여하는 fenced code block 의 info string 은 다음 단일 토큰 형식을 정본으로 한다:

```
readable-ui:<subtype>
```

CommonMark 0.30 §4.5 ("Fenced code blocks") 의 info string 정의는 첫 공백까지를 단일 토큰으로 본다. 그 토큰 내부에 콜론(`:`) 사용은 명시적으로 금지되지 않으며, GFM·directive 파서 모두 통과한다 (mdast `code.lang` 에 `"readable-ui:data"` 가 그대로 담긴다 — 본 ADR 구현으로 검증).

**정본 키 (v1)**:

| info string | 의미 | 도입 ADR |
|---|---|---|
| `readable-ui:data` | Table directive 내부 row payload (JSONL) | 본 ADR |

**대안 평가 / 기각 근거**:

- `rui:` (짧은 prefix) — 토큰 1개 이득은 미미한 반면, ecosystem search 시 ambiguity 가 크다 (`rui` 는 다른 React UI 라이브러리·Rust UI 라이브러리의 약칭으로 널리 쓰임). **기각**.
- 네임스페이스 없는 토큰 (`data`, `actions`) — 일반 codeblock 과 충돌. `data` 라는 lang 토큰은 다른 도구가 자유롭게 쓸 수 있어 정본화하면 ecosystem-grabbing. **기각**.
- 도메인 URL 형식 (`https://readable-ui.dev/data`) — 토큰 비용 큼 + 사람 가독성 저하. **기각**.

**확장 정책**: `readable-ui:actions`, `readable-ui:filters` 등 다른 subtype 의 도입은 후속 ADR 개별 결정. 본 ADR 은 prefix 만 예약하고, **subtype 한 종 (`data`) 만** closure 한다. 새 subtype 추가 시 본 표를 갱신하고 component-catalog spec 의 fenced 절을 동시에 갱신.

### 2. `readable-ui:data` payload 형식 — JSONL 단일

```
:::table{tool=listUsers page=1 of=68 size=200 total=13420 sort=createdAt:desc mode=payload}
| id | email | role | status | createdAt |
| -- | ----- | ---- | ------ | --------- |
| u_alice_01 | alice@example.com | admin | active | 2026-04-12 |
| ... (head N visible rows) |

```readable-ui:data
{"id":"u_alice_01","email":"alice@example.com","role":"admin","status":"active","createdAt":"2026-04-12"}
{"id":"u_bob_01","email":"bob@example.com","role":"user","status":"active","createdAt":"2026-04-10"}
... (전체 행 N개, 줄당 한 객체)
```

[View all 13,420 rows](mcp://tool/listUsers?_page=1&_size=13420&_sort=createdAt%3Adesc)
:::
```

**대안 평가**:

- (a) JSON array — `[ { ... }, { ... } ]` 한 덩어리. 파서 친화적이나 **row-단위 streaming/diff 가 어렵고**, 마지막 행 누락 시 전체가 unparseable. 행 추가/삭제 diff 가 line-단위로 깨끗하지 않음. **기각**.
- (b) CSV — 헤더 + 행. LLM 토큰 효율은 가장 좋으나 **이스케이프 규칙이 복잡** (콤마/따옴표/줄바꿈 RFC 4180), Table 셀 값에 콤마가 흔한 admin 도메인에서 회귀 위험. envelope JSON Schema 와의 type fidelity 도 낮음 (모든 값이 string 으로 손실). **기각**.
- (c) **JSONL** — 줄당 한 JSON 객체. 토큰 효율은 array 와 유사하나 **(i) 부분 읽기 가능, (ii) row 단위 diff 친화, (iii) 각 행이 독립적으로 parse-able, (iv) JSON 타입 fidelity 보존, (v) `head -n` / `tail -n` 같은 LLM 의 자연스런 부분 인용 패턴과 호환**. **채택**.

**Schema 정합성 규약**:

- payload 의 각 라인은 JSON object 여야 한다 (array 라인 금지 — 행 위치는 라인 순서로만 의미됨).
- 각 객체는 **id 필드 필수** (Table `R extends { id: string | number }` 제약과 동형).
- 객체의 키 집합은 Table `columns[].key` ∪ `{"id"}` 와 정확히 일치해야 한다 (extra key 도 허용하지 않음 — 누락도 허용하지 않음). 직렬화 단계에서 위반 시 throw — 침묵 drift 차단.
- 값은 JSON primitives (`string`/`number`/`boolean`/`null`). 객체·배열 값은 v1 미지원 (v2 후보).

### 3. Table directive 와 payload 의 결합 — directive container 내부 자식

`readable-ui:data` fenced block 은 **`:::table{...}` directive container 의 자식 노드** 로만 등장한다. 형제 노드 + key 매칭 (`data-id` 등) 방식은 다음 이유로 기각:

- **Sync drift 0**: 같은 container 안에 메타 (attribute) ↔ 데이터 (visible head rows) ↔ payload (전체) 가 모이므로 round-trip 시 위치 신호가 자명. 형제 매칭은 markdown 편집기에서 사이에 다른 블록이 끼면 깨진다.
- **ADR 0015 의 자연 확장**: ADR 0015 가 이미 Table 을 container directive 로 승격했다. 같은 container 안에 fenced 자식을 두는 것은 "메타·데이터·footer link 를 한 단위로 묶는다" 라는 ADR 0015 §1·§6 의 원칙과 정합.
- **LLM 첫-N-토큰**: 페이지를 위→아래로 스캔하는 LLM 입장에서 directive open fence (`:::table{...}`) 다음 줄에 메타·visible head rows·fenced payload·footer link 가 순차로 붙는다. 한 번의 컨텍스트 진입으로 충분.

**직렬화 순서 (directive 안)**:

1. visible GFM pipe table (head N rows — `mode="payload"` 시 N = `payloadHead` 옵션, 기본 5)
2. ` ```readable-ui:data ` fenced block (전체 N행 JSONL)
3. (선택) `[View all <total> rows]` footer link — `mode="summary"` 와 동일 신호이나 `mode="payload"` 에서는 payload 가 이미 "전체" 를 들고 있으므로 의미가 다르다. 본 ADR §4 참조.

### 4. 200행+ trigger — 명시 옵트인 `mode="payload"`

자동 임계 (예: rows.length > 200 시 자동 분리) 는 **회귀 위험** 으로 기각:

- 같은 페이지를 여러 번 렌더할 때 데이터 변동에 따라 mode 가 깜빡이면 round-trip 안정성이 무너진다.
- LLM 이 "이 Table 이 왜 어느 시점에는 payload 모드이고 어느 시점에는 아닌가" 를 추론해야 함.
- spec 의 닫힘 원칙 (ADR 0007 §7) 과 모순 — 동작이 데이터 의존이면 카탈로그가 닫혀 있다고 말할 수 없다.

대신 **저자가 `mode="payload"` 를 명시 선언** 한다. 기존 `mode="summary"` 와 동일 attribute slot 의 enum 확장:

```
mode: "summary" | "payload"
```

**의미 분리**:

| mode | visible rows | fenced payload | footer link |
|---|---|---|---|
| (none) | rows 전체 (저자가 넘긴 그대로) | 없음 | 없음 |
| `summary` | rows (head N — 저자가 잘라서 넘김) | 없음 | `[View all <total> rows](_size=<total>)` 자동 |
| `payload` | rows (head N visible) | rows 전체 JSONL | (선택) 저자가 더 큰 dataset 의 일부 페이지를 보여주는 케이스에 한해 |

`mode="payload"` 와 `mode="summary"` 는 **상호 배타** 단일 enum 값. 동시 의미가 필요한 케이스는 후속 ADR.

**`payloadHead` 기본값 5**: head N visible rows 는 사람이 첫 진입에 "어떤 모양의 데이터인지" 확인하는 시각 미리보기 + LLM 이 "schema 가 맞는지 sanity check" 하는 용도. 기본 5는 작아서 토큰 비용 미미, 큰 화면 (HTML) 에서는 어차피 props rows 전체가 시각 렌더되므로 무관.

### 5. HTML render 관계 — 분리 없음, payload 는 .md 출력 한정

HTML 측은 기존 Table render 를 그대로 사용한다 (rows 전체를 시각 표로 그림). `readable-ui:data` fenced payload 는 **.md 출력에만** 등장. 사람 사용자가 보는 화면에는 fenced block 자체가 노출되지 않는다.

대안 — HTML 에서 `<details><summary>` 로 fenced 내용을 노출 — 은 기각:
- 사람 입장에서 JSONL raw payload 는 가독성 0. UI 에는 visible 표가 이미 있음.
- 가상 스크롤 / 페이지네이션 같은 HTML 측 대량 데이터 UX 는 별도 결정 (본 ADR 범위 밖).

### 6. 후방 호환

- **기존 Table 미영향**: `mode` 미선언 페이지 (현재 `apps/example/app/users/page-content.tsx` 등) 는 동작 변화 0. fenced payload 는 명시 옵트인일 때만 등장.
- **envelope 변경 없음**: `mode="payload"` 는 directive attribute 단독 신호. envelope tools schema 변경 불요.
- **Table actions / row action link / id 셀 / cell 이스케이프 / EmptyState fallback 등 기존 규약 (ADR 0009 §6·§8, ADR 0019, ADR 0020)** 은 모두 그대로 유지. payload 모드에서도 동일하게 동작.

## Consequences

**Positive**

- 200행+ Table 을 한 directive 안에서 표현 가능. 메타·visible head·전체 payload·재호출 link 가 같은 container 에 응집 → LLM 단일 컨텍스트 진입으로 "현재 보이는 것 / 전체 데이터 / 다음에 무엇을 호출할지" 파악.
- JSONL 채택으로 row-단위 diff / streaming / 부분 인용 친화. 장기적으로 MCP `tools/call` 응답이 streaming JSONL chunk 를 그대로 fenced 에 흘려 넣는 구현 여지 확보.
- `readable-ui:` prefix 정본화로 fenced info string 의 namespace 충돌 사전 차단. 후속 ADR 에서 `readable-ui:actions`·`readable-ui:filters` 등이 자연스럽게 등록 가능.
- spec 의 "후속" 보류항 2건 (Open #5 + Open #9) 동시 closure → README open list 정리.

**Negative**

- visible head rows + fenced payload 의 **이중 표현 비용** — visible head 의 행 데이터가 payload JSONL 에도 존재. 토큰 비용 미미 (head 기본 5행) 이나 round-trip 시 LLM 이 "두 곳의 값이 일치해야 한다" 를 인지해야 함. 본 ADR 은 두 곳을 동일 source (props `rows`) 에서 산출하므로 코드 단계에서는 drift 0 — 외부 편집자가 손으로 둘 중 한 곳만 고치면 의미 깨짐 (ADR 0012 의 "directive ↔ link paragraph 이중 표현" 과 동형 trade-off).
- HTML / Markdown 의 표현 비대칭 강화. HTML 은 visible rows props 그대로, Markdown 은 head + payload 분리. 관점 6 "정규형" (Open Decision #6) 의 결정이 미뤄진 상태에서는 이 비대칭이 정상이지만, 향후 정규형 ADR 에서 재검토.

**Neutral**

- `payloadHead` 기본 5는 본 ADR 결정. props 로 override 가능 (`payloadHead?: number`). 0 도 허용 — visible 표 없이 payload 만 출력하는 LLM-only 모드.
- `readable-ui:data` payload 의 전체 행수는 **저자 책임**. 정말로 큰 dataset (수만 행+) 은 envelope tool 의 페이지네이션을 통해 잘라 내는 것이 권장. 본 ADR 은 payload 자체 사이즈 상한을 두지 않음 (v2 후보).

## 관련 구현

- `packages/core/src/index.ts` — JSONL 직렬화 헬퍼 + column ↔ payload 정합성 검증 헬퍼 신설 export. fenced code node 의 `lang` 필드로 `"readable-ui:data"` 를 그대로 출력 (mdast `code.lang` 호환 검증 완료).
- `packages/react/src/components.tsx` — `TableProps` 에 `mode: "summary" | "payload"`, `payload?: R[]`, `payloadHead?: number` 추가. `toMarkdown` 에서 mode === "payload" 분기 — visible head N 행만 GFM table 로, 전체 rows 를 fenced JSONL 자식 노드로 directive container 에 같이 담는다. visible 표 자체는 head N 만이지만 payload 는 props `payload ?? rows` 전체.
- `docs/spec/component-catalog.md` — Table §에 `mode="payload"` + `payload`/`payloadHead` props 명세 추가. CodeBlock § note 의 "(후속 spec)" 표현을 `readable-ui:data` 정의로 교체. 공통규약 표에 `payload`/`payloadHead` 예약어 추가.
- `apps/example/app/audit/` — 기존 audit fixture 의 events 배열을 200+ 행으로 확장하고 `mode="payload"` 로 시연. 신규 라우트 신설은 하지 않음 (기존 audit 라우트가 "immutable feed — view-only" 의미와 정합).
- `docs/README.md` — Accepted ADRs 에 0022 추가, Open Decisions #9 를 "(폐기됨 — ADR 0022 로 closure)" 마킹.

## Alternatives considered

1. **별도 라우트로 payload 전체를 JSON endpoint 로 분리** (`/users.md` + `/users/data.jsonl`) — admin 자동화 LLM 이 두 번 fetch 해야 함 + envelope/route 라우팅 규약 동시 확장 필요. **기각**.
2. **Table props `rows` 를 자동 limit 하고 over-flow 시 throw** — 저자가 매번 수동 분리해야 함, payload 분리가 아니라 차단이 됨. **기각**.
3. **`mode="summary"` 와 `mode="payload"` 동시 허용 (혼합 enum)** — 의미 모호 ("payload 가 있는데 왜 summary 인가"). 본 ADR 은 단일 enum 값으로 닫고, 혼합 케이스는 후속 ADR 또는 별 attribute 에서.
4. **YAML payload (`readable-ui:data` lang 에 YAML body)** — JSON 대비 토큰 절약 미미 + LLM tokenizer 효율성은 JSON 이 우세. **기각**.
5. **`readable-ui:data` 대신 directive attribute `payload="<base64 JSON>"`** — attribute 값 길이 제한·이스케이프·가독성 모두 열위. **기각**.

## Out of scope

- `readable-ui:actions`, `readable-ui:filters`, `readable-ui:schema` 등 다른 subtype 의 도입 — 수요 입증 후 개별 ADR.
- payload 행 수 상한 / chunk 분할 / streaming protocol — 본 ADR 은 단일 fenced block 한 덩이만 다룬다. 매우 큰 dataset 은 envelope tool 페이지네이션으로 잘라야 한다.
- payload 값의 nested 객체 / 배열 지원 — v1 primitives 한정. v2 후보.
- HTML 측 대량 데이터 UX (가상 스크롤 / 무한 스크롤) — CSS / framework 층 결정.
- 정규형 (Open Decision #6) — head visible vs payload 의 이중 표현이 "한 UI 의 다중 markdown 표기" 인가 여부는 정규형 ADR 에서 통합 결정.
- LLM 클라이언트의 fenced payload 자동 indexing 규약 — 본 ADR 은 출력 형식만 정의, consumer 측 인덱싱은 별도.

## Open

- `payloadHead` 의 적정 기본값 (현재 5) 의 LLM 친화성 검증. 0·5·10·20 후보 중 fresh-context 에이전트 측정 후 후속 갱신 가능.
- `readable-ui:data` payload 의 인접 메타 — schema URI / generated-at 등을 fenced meta string 으로 부착할지 (CommonMark info string 의 lang 다음 토큰). 본 ADR 은 lang 토큰 1개로만 닫는다. 후속 수요 시 검토.
- payload 모드와 row `actions[]` 의 관계 — visible head 행에는 action link 가 붙지만 payload JSONL 에는 action URI 가 없다. payload 만 보는 LLM 이 row 단위 action 을 호출하려면 envelope tool 명세를 통해 URI 를 조립해야 함 (현재도 가능). action URI 를 payload 객체에 같이 넣는 변형 (`_actions: [...]`) 은 후속 ADR 후보.
