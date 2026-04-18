# ADR 0020 — CRUD idiom gaps closure: 2단계 삭제, 행 상태 CodeSpan 자동 wrap, EmptyState fallback, destructive-action convention

- Status: Proposed
- Date: 2026-04-18
- Amends: [ADR 0019](./0019-crud-action-idioms.md)
- Related: [ADR 0007](./0007-layout-and-component-catalog.md), [ADR 0012](./0012-dual-render-convention-signals.md), [ADR 0013](./0013-suppress-form-inner-button-action.md), [ADR 0015](./0015-table-as-container-directive.md), [ADR 0016](./0016-form-default-value-convention.md), [ADR 0018](./0018-detail-view-convention.md)

## Context

ADR 0019가 destructive 2단계 전이·EmptyState Alert 단일화·행 상태 CodeSpan 통일을 정했으나, 후속 LLM 친화성 검증(`docs/research/llm-test-0019-crud-idioms.md`)이 9개 시나리오 중 high 2 / partial 4 / fail 3 으로 "결정은 합리, 이행은 미완"을 보고했다. 5건의 갭이 식별됐다.

1. **Gap I — `Input.type="hidden"` 부재**: ADR 0019 §1.2 의 Confirm Form 정규형이 `<input type=hidden>` 으로 id 를 전달하나, `packages/react/src/components.tsx:509` `InputProps.type` union 에 `hidden` 이 없어 정규형을 코드로 작성할 수 없다. ADR 0019 §Open "후속 소형 ADR" 항목.
2. **Gap II — Table 셀 자동 CodeSpan wrap 부재**: ADR 0019 §3 가 spec 에는 명문화됐으나 (`docs/spec/component-catalog.md` §Table 197), `packages/react/src/components.tsx:1244` 의 셀 직렬화는 `String(r[c.key] ?? "")` 만 호출. status 값이 plain text 로 새어 나가 셀 표면 신호 부재.
3. **Gap III — EmptyState 저자 누락 시 fallback 부재**: ADR 0019 §2 의 "엔진 자동 placeholder 미삽입" 결정이 lint 부재와 결합되면 빈 표가 모호한 상태로 노출 (research S6).
4. **Gap IV — Confirm 페이지 envelope 컨벤션 부재**: preview tool 응답을 어떻게 page-envelope 로 직렬화할지 spec 가이드 없음. ADR 0019 §1 의 실제 작동에 필요한 implementation gap.
5. **Gap V — `destructive-action` convention 자동 주입 부재**: ADR 0012/0013/0014/0017 선례대로 `DEFAULT_CONVENTIONS` (`packages/core/src/index.ts:207`) 자동 주입 가능하나 미적용.

추가로 ADR 0019 §Consequences "Neutral: CodeSpan 행 상태 직렬화 이미 동작" 문장은 사실 오류였음이 검증으로 드러났다 — 본 ADR 에서 정정 기록한다.

본 ADR 은 ADR 0019 를 **amends** 한다 (supersedes 아님). ADR 0019 의 결정 자체는 모두 유효하며, 본 ADR 은 그 이행을 막는 5건의 갭을 닫는 보강 결정만 추가한다.

## Decision

### 1. `Input.type` 에 `"hidden"` 추가 (Gap I)

`InputProps.type` union 에 `"hidden"` 을 추가한다. 갱신된 enum:

```
text | email | password | number | url | date | datetime-local | tel | search | hidden
```

**직렬화 규칙**:

```markdown
::input{type=hidden name=id default=u_bob_01}
```

- `name` 필수, `default` 필수 (hidden 은 사용자 입력이 아니라 사전 설정된 값을 form 제출에 동봉하는 용도이므로 `default` 가 곧 전송 값).
- `label`/`placeholder`/`required`/`pattern`/`minlength`/`maxlength`/`min`/`max`/`step`/`format` 은 hidden 에서 무의미 — 직렬화 시 무시. 작성 자체는 허용하되 warning (lint 후속).
- HTML render: `<input type="hidden" name="..." value="...">`. label wrapper 없이 바로 `<input>` 만 출력.
- ADR 0016 의 `default` SSOT 규약(directive 우선)과 정합. ADR 0017 §1 "HTML 원어 우선" 의 `type` 매핑과도 정합.

**Form-context 강제**: 다른 type 과 동일하게 Form 외부에서는 의미 없음 (HTML `<form>` 이 없으면 hidden value 가 제출되지 않음). v1 에서는 warning, v2 에서 error 승격 검토.

### 2. `destructive-action: "two-step-preview"` convention 자동 주입 (Gap V)

ADR 0012 패턴을 따라 `DEFAULT_CONVENTIONS` (`packages/core/src/index.ts:207`) 에 1줄 추가한다.

```yaml
extensions:
  conventions:
    duplicate-button-link: dual-render
    form-inner-button-action: inherit
    uri-query-encoding: percent-decoded-match
    form-default-ssot: directive
    destructive-action: two-step-preview
```

**의미**: "이 페이지의 destructive tool 은 1단계 preview tool 호출 → 2단계 confirm 페이지에서 실제 action 호출의 2단계 전이로 작동한다. envelope `tools[]` 에 `<verb><Resource>Preview` 와 `<verb><Resource>` 가 함께 등장하면 두 tool 은 한 쌍의 idiom 이며 독립 호출이 아니다."

**Naming convention** (envelope `tools[]` 내 암묵 규약):
- preview tool 이름은 실제 action 이름 + `Preview` suffix.
- envelope `tools[]` 안에 `<verb><Resource>` 가 등재됐다면 `<verb><Resource>Preview` 페어가 함께 등재되는 것을 권장. v2 lint 에서 강제 후보.
- LLM 은 본 convention key 를 보고 두 이름이 한 쌍임을 추론. 본문 directive 의 `…` suffix(`Delete…`)·`variant=danger`·`action=*Preview` 세 신호와 정합.

**enum 확장 여지**: 현재 값 `"two-step-preview"` 1종. 향후 후보 `"inline-confirm"`(Button `confirm` 미래 도입 시)·`"none"`(destructive 가 아예 없는 페이지) 등은 v2 에서 검토. 본 ADR 은 single-value 로 한정.

### 3. Table 셀 status 값 자동 CodeSpan wrap (Gap II)

ADR 0019 §3 의 "행 상태 CodeSpan 통일" 을 engine 차원에서 자동화한다.

**감지 규칙 — 채택안: schema-driven 자동 wrap (research S7 권고 1번)**:

Table 셀 직렬화 시 `packages/react/src/components.tsx:1240~1245` 경로에서 envelope `tools[]` 를 참조해 다음 조건을 만족하는 셀 값을 `inlineCode` 노드로 wrap 한다.

조건 (어느 하나라도 만족):
- (a) `Table.tool` 로 지정된 tool 의 `input.properties._filter_<col>.enum` 에 셀 값이 정확히 포함됨 (현재 컬럼이 filterable status 컬럼).
- (b) `Table.tool` 의 `output` schema 의 해당 컬럼 enum 에 셀 값이 포함됨 (output enum 이 선언된 경우).
- (c) 셀 값이 envelope `tools[].name` 집합에 정확히 일치 (audit `action` 컬럼류 — research S8).

**채택 근거**:
- 자동·schema-driven 으로 저자 부담 0.
- envelope SSOT 와 본문 표면이 1:1 — 두 신호 일치.
- 후방 호환: enum/tool name 신호가 없으면 지금과 동일 plain String 출력.

**기각된 대안**:
- `TableColumn.codeSpan = true` opt-in (research S7 권고 2번): 명시적이지만 새 prop 도입. ADR 0019 "신규 예약어 0개" 약속과 약하게 충돌. v2 에서 자동 추론 실패 시의 escape hatch 로 검토.
- `TableColumn.render` override (research S7 권고 3번): 가장 일반적이지만 ADR 0019 §3 "v2 render override 예약" 과 동일 라인 — v1 scope 외.

**예약 prefix 와의 정합**: ADR 0015 §3 의 시스템 예약 prefix `_filter_<field>` 가 본 결정의 신호 source 가 됨. 정합.

### 4. EmptyState 저자 누락 시 fallback Alert 자동 주입 (Gap III)

Table `rows.length === 0` 이고 동일 컨테이너 (Page body 직속 또는 Card 내부) 에 형제 `Alert{kind=note}` 가 없을 때, 엔진이 기본 Alert 을 자동 삽입한다.

**기본 fallback Markdown**:

```markdown
> [!NOTE]
> No results.
```

- 본문 텍스트 영어 고정 ("No results" — `*none*` 과 동일한 영어 single-source 정책, ADR 0019 §2 ).
- 위치: Table directive 직후 형제. directive 내부 침투 안 함.
- 감지 시점: `Table.toMarkdown` 직렬화 후 walk 단계에서 형제 Alert 존재 여부 검사. 없으면 합성 Alert 노드 1개 push.

**옵트아웃**: `<Table empty="silent">` prop 으로 fallback 비활성. 저자가 의도적으로 빈 표만 보이고 싶은 경우 (예: 데이터 미수신을 명시적으로 표현하지 않는 dashboard placeholder).

**Author-supplied Alert pattern**: 저자가 Table 의 형제 (또는 동일 컨테이너 내 인접) 위치에 직접 `Alert{kind=note}` 를 두는 경우 — 예컨대 현재 적용된 필터 값을 함께 안내하는 풍부한 메시지 — 엔진은 v1 에서 형제 검사를 수행하지 않으므로 fallback 이 자동으로 silent 되지 않는다 (mdast 노드 직렬화 시점에 형제 컨텍스트 접근 비용이 큼). 따라서 저자가 자기 Alert 을 두려면 동일 Table 에 `empty="silent"` 를 함께 선언해야 한다 — 두 신호가 한 쌍으로 작동한다 (저자 Alert 제공 ↔ 엔진 fallback opt-out). v2 에서 형제 검사 자동화 후 본 권고는 폐기 검토.

**ADR 0019 §2 "엔진 자동 placeholder 삽입 없음" 과의 관계**: ADR 0019 는 "Table directive 내부에 placeholder 행을 삽입하지 않는다" 의 의미였다. 본 ADR 은 **directive 외부의 형제 Alert** 을 fallback 으로 삽입하므로 directive 내부의 schema inspection 가치는 그대로 보존된다. 즉 ADR 0019 §2 의 "스키마 inspection 가치 유지" 약속은 본 결정에 의해 깨지지 않는다.

**lint 와의 관계**: research Gap III 권고 1번의 dev-time lint warning 은 본 ADR 의 fallback 이 활성일 때 불필요하나, `empty="silent"` 옵트아웃 사용 시에도 형제 Alert 부재면 warning 발생을 후속 lint ADR 에서 검토.

### 5. Confirm 페이지 envelope 컨벤션 (Gap IV)

preview tool 이 반환하는 page-envelope 에 다음 표식을 둔다.

**envelope 필드 추가**:

```yaml
purpose: "Confirm delete of user u_bob_01"
intent: destructive-confirm
```

- `intent: "destructive-confirm"` — preview 응답 페이지임을 명시하는 envelope 레벨 단일 신호. 값 enum: `"destructive-confirm"` (v1 한정, v2 에서 `"reversible-confirm"` 등 확장 여지).
- LLM 이 `intent` 를 보고 "이 페이지는 form 제출 시 실제 destructive action 이 발생한다" 를 즉시 인지.
- envelope `tools[]` 에는 실제 action(`deleteUser`) 만 등재 — preview tool 은 이미 호출됐으므로 다시 등재할 필요 없음.

**페이지 본문 정규형** (ADR 0019 §1.2 재확인):

```markdown
:::card{title="Delete user"}
- **Email**: bob\@example.com
- **Role**: user
- **Status**: `active`
- **Created**: 2026-04-10
:::

> [!CAUTION]
> Deleting this user is permanent and cannot be undone.

:::form{action=deleteUser}
::input{type=hidden name=id default=u_bob_01}

::button[Confirm delete]{variant=danger}

::button[Cancel]{variant=secondary action=listUsers}
:::
```

본 ADR §1 의 `Input.type=hidden` 추가가 위 정규형의 dependency 였음.

**`paths` 컨벤션** (의도적으로 미결정 — research Open #6):
- REST style (`/users/u_bob_01/delete`) 와 query style (`/users?confirm=delete&id=...`) 중 어느 것을 권장할지 본 ADR 에서 결정하지 않는다. 후속 spec/page-envelope.md 보강 또는 별도 ADR 에서 정한다.

## Consequences

**Positive**:
- ADR 0019 §1 의 Confirm Form 정규형이 코드로 작성 가능 (Gap I 해소).
- envelope `extensions.conventions["destructive-action"]` 자동 주입으로 LLM-친화 신호가 envelope·본문 양쪽에 외재화 (Gap V 해소).
- Table 셀 status 자동 CodeSpan wrap 으로 ADR 0019 §3 가 spec → engine 까지 일관 이행 (Gap II 해소).
- EmptyState fallback Alert 자동 주입으로 저자 누락 시에도 "결과 없음" 신호 보장 (Gap III 해소).
- Confirm 페이지 envelope `intent` 표식으로 preview→confirm idiom 이 envelope 레벨에서 판별 가능 (Gap IV 해소).
- ADR 0012/0013/0014/0017 의 "convention 자동 주입" 패턴이 ADR 0019 까지 확장됨 — 일관성 유지.

**Negative**:
- `Input.type=hidden` 추가는 `InputProps` 표면을 1단어 확장. type union 의 변경은 호환성 변경(추가만 — 기존 코드 깨짐 없음)이지만 spec 표·ADR 0017 §2 예외 목록에 hidden 이 명시돼야 함.
- Table 셀 자동 wrap 은 envelope `tools[]` 를 직렬화 시 참조 — 직렬화 경로의 의존성 그래프가 cell-level 로 확장. 토큰 비용 미미 (셀당 backtick 2자) 하나 직렬화 코드 복잡도 증가.
- EmptyState fallback Alert 자동 삽입은 ADR 0019 §2 "엔진 자동 placeholder 삽입 없음" 과 표면적으로 충돌해 보일 수 있음 — 본 ADR §4 에서 "directive 외부 형제 Alert" 으로 영역 분리해 해소했으나 향후 spec 갱신 시 명확화 필요.
- Confirm 페이지 envelope 의 `intent` 필드는 신규 envelope 표면. ADR 0005 envelope 스키마에 `intent?: "destructive-confirm"` enum 추가 필요.

**Neutral**:
- `destructive-action` convention 값은 현재 단일 enum (`"two-step-preview"`). v2 enum 확장은 별도 ADR.
- Table fallback Alert 의 본문 텍스트 ("No results") 영어 고정은 i18n v2 정책과 정합 (ADR 0018·0019 의 `*none*` 과 동일 라인).
- **ADR 0019 §Consequences "Neutral: CodeSpan 행 상태 직렬화 이미 동작" 사실 오류 정정**: 검증 시점(2026-04-18) 의 `packages/react/src/components.tsx:1240~1245` 셀 직렬화 경로는 `String()` 만 호출하며 CodeSpan wrap 을 수행하지 않았다. ADR 0019 의 해당 표현은 사실 오류였다. 본 ADR §3 의 자동 wrap 결정 이후에는 envelope enum 신호가 있는 경우 자동 wrap 으로 성립한다. ADR 0019 본문은 수정하지 않으며, 정정은 본 ADR 에서만 기록한다 (ADR amends 정책).

## Alternatives

1. **Gap I 대안 — query string 으로 id 전달** (`:::form{action=deleteUser?id=u_bob_01}`): ADR 0009 §8 "URI query 는 action URI 자체에만 등장" 규범과 충돌. 기각.
2. **Gap II 대안 — `TableColumn.codeSpan: true` opt-in**: 명시적이나 신규 prop·ADR 0019 "신규 예약어 0개" 와 약한 충돌. v2 escape hatch 후보.
3. **Gap III 대안 — engine 자동 HTML comment 삽입** (`<!-- empty: no rows -->`): ADR 0019 §2 결정과 약한 충돌, 그리고 fallback Alert 만큼 self-explanatory 하지 않음. 기각.
4. **Gap IV 대안 — `role: "confirm"` envelope 필드**: `intent` 와 의미 중복. envelope 표면을 단순하게 유지하기 위해 `intent` 단일 필드 채택.
5. **Gap V 대안 — `destructive-action` 을 보강하지 않고 본문 directive 신호만으로 충분하다고 판단**: research S1 이 본문 신호만으로 high confidence 가능함을 보였으나, ADR 0012/0013/0014/0017 의 일관 패턴(envelope 외재화) 을 따르는 것이 long-term 유지보수에 유리. 자동 주입 채택.

## Migration

- `packages/react/src/components.tsx`
  - `InputProps.type` union 에 `"hidden"` 추가.
  - `Input.toMarkdown` — `type=hidden` 일 때 label/placeholder/required/pattern 등 무의미 attribute 무시.
  - `Input.render` — `type=hidden` 일 때 label wrapper 없이 `<input type="hidden">` 만 출력.
  - `Table.toMarkdown` 셀 직렬화 — envelope `tools[]` 참조해 enum 또는 tool name 일치 시 `inlineCode` wrap.
  - `Table.toMarkdown` 빈 rows 처리 — 형제 Alert 부재 시 fallback Alert 노드 합성. `TableProps.empty?: "silent"` prop 추가.
- `packages/core/src/index.ts`
  - `DEFAULT_CONVENTIONS` 에 `"destructive-action": "two-step-preview"` 추가.
  - envelope 스키마(`Envelope`)에 `intent?: "destructive-confirm"` 옵셔널 필드 추가.
- `docs/spec/component-catalog.md`
  - §Input — type enum 에 `hidden` 추가, 본문 규칙 1문단 (form context, 직렬화 형태).
  - §Input — 예약어 표(§공통규약 3) 에 type 값 enum 갱신.
  - §Table — "행 상태 표기 (ADR 0019 §3)" 소절에 "envelope tool input enum 또는 tool name 일치 시 자동 CodeSpan wrap (ADR 0020 §3)" 1줄.
  - §Table — "`rows: []` 처리 (ADR 0019 §2)" 소절에 "형제 Alert 부재 시 엔진이 기본 Alert(kind=note, "No results") 자동 삽입. `<Table empty=\"silent\">` 로 옵트아웃 (ADR 0020 §4)" 1줄.
- `docs/spec/page-envelope.md`
  - `intent` 필드 추가, enum `"destructive-confirm"` 명세.
  - `extensions.conventions` 표에 `destructive-action` 키 추가.
- `docs/README.md` — Accepted ADRs 에 0020 추가, Open Decisions 재편 (#5 폐기 마킹, #9 개정).

## Out of scope

- **Preview tool 네이밍 강제 lint** (ADR 0019 §Open): v2 lint 우선순위 상향만 본 ADR 에서 권고. 실제 lint 도입은 별도 ADR.
- **Confirm 페이지 `paths.view` URL 컨벤션** (research Open #6): REST vs query style 결정은 본 ADR 에서 미결. spec/page-envelope.md 보강 또는 별도 ADR.
- **Loading / Error state**: ADR 0019 §Open 항목, 본 ADR scope 외.
- **5단계 팔레트 envelope 명시 (`extensions.statusPalette`)**: ADR 0019 §Open, v2.
- **Button `confirm` 속성 재검토**: ADR 0019 §Open, v2 opt-in fallback.
- **i18n `*없음*` / "No results" 번역**: v1 영어 고정 정책 유지 (ADR 0018/0019 와 동일).

## Open

- `destructive-action` convention 의 enum 확장 (`inline-confirm`, `none`) — v2.
- `intent` envelope 필드의 enum 확장 (`reversible-confirm`, `bulk-confirm` 등) — v2.
- Table 자동 CodeSpan wrap 의 escape hatch (`TableColumn.codeSpan` opt-in) — 자동 추론 실패 사례가 누적되면 v2 검토.
- Form 외부 hidden input 사용 시 warning → error 승격 시점.
