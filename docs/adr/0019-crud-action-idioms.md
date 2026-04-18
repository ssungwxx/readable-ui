# ADR 0019 — CRUD 액션 관용구: Delete 확인 · EmptyState · 행 상태

- Status: Proposed
- Date: 2026-04-18
- Related: [ADR 0007](./0007-layout-and-component-catalog.md), [ADR 0015](./0015-table-as-container-directive.md), [ADR 0016](./0016-form-default-value-convention.md), [ADR 0018](./0018-detail-view-convention.md)
- Reinforces: [ADR 0012](./0012-dual-render-convention-signals.md), [ADR 0013](./0013-suppress-form-inner-button-action.md)

## Context

ADR 0018로 R(단건) 관용구가, ADR 0016으로 U(Update) pre-fill이 닫혔다. CRUD 남은 빈칸 세 곳:

1. **Delete 확인 단계 부재**: `<Button variant="danger" action="deleteX">`가 즉시 실행. 실수 방지 관용구 없음.
2. **EmptyState 표현 규범 부재**: Table `rows: []`에서 헤더만 남은 테이블 출력. 단건 404도 빈 페이지.
3. **Inline status 표기 규범 부재**: Table 셀 레코드 상태 표현 관용구 없음. 셀 규약(§4 Link/CodeSpan/Emphasis/Strong)은 Badge 신설 차단.

## Decision

### 1. Delete 확인 = 2단계 페이지 전이

`confirm=true` flag 방식 기각. 이유: tool 스키마 오염, Markdown SSOT 판별 불가, 영향 예고 표현 불가.

**1단계 Button** (목록/상세):
- `::button[Delete…]{variant=danger action=<verb><Resource>Preview}` 정규형
- 라벨 `<Verb>…` suffix
- `action` 이름: `<verb><Resource>Preview`
- `variant=danger` (destructive) / `secondary` (reversible)

**2단계 Confirm 페이지** (preview tool 반환):
- 상단: 단건 상세 Card (ADR 0018)
- 중단: `Alert{kind=caution}` (irreversible) / `{kind=warning}` (reversible but high-impact). 본문에 List 허용.
- 하단: `Form{action=<verb><Resource>}` — hidden input으로 id, `Button[Confirm <verb>]{variant=danger}` + `Button[Cancel]{action=<list/detail> variant=secondary}`.

**envelope convention (선택)**: `extensions.conventions["destructive-action"] = "two-step-preview"` 비강제 키. LLM이 `<X>Preview` → `<X>` 쌍을 관용구로 해석. ADR 0012 패턴.

### 2. EmptyState = Alert 단일화

전용 directive 미도입. Alert으로 커버.

**리소스 부재 (404)**: Card 출력 안 함, `Alert{kind=warning}` 단독. 복구 링크 1개 권장. ADR 0018 §5 승격.

**목록 빈 상태 (`rows: []`)**: Table directive 그대로(헤더만), `total=0` attribute 권장. Table 형제 레벨에 `Alert{kind=note}` 저자 배치. 엔진 자동 placeholder 삽입 없음 (스키마 inspection 가치 유지).

**빈 값 분리 규범**:

| 상황 | 표기 |
|---|---|
| 단건 상세 필드 null | `*none*` (ADR 0018) |
| Table 셀 null | `""` 또는 `—` |
| 리소스 전체 부재 | `Alert{kind=warning}` |
| Table 전체 비어있음 | `Alert{kind=note}` |

**`*none*` 표기 강화**: 별표 1쌍, 괄호 없음, 소문자, 영어 고정. `*None*`/`*NONE*`/`*"none"*`/`(none)`/`null`/`—`/`N/A` 모두 금지. 로케일 번역 v1 금지.

### 3. 행 상태 = `CodeSpan` 통일

- 표기: `` `<status>` ``
- 5단계 권고 팔레트 (비강제): `active`, `pending`, `archived`, `disabled`, `error`
- 도메인 특수 상태도 CodeSpan이면 허용. 영어 소문자 단어(숫자·언더스코어 허용). 공백 금지.
- 대안 기각: Strong(필드명과 충돌), Emphasis(`*none*`과 충돌), 이모지(일관성 저하).
- v1 시각 강제 없음 — Table React render는 `String()` 그대로. v2에서 render override로 배지 승격 예약.

## Consequences

**Positive**: 세 빈칸이 신규 컴포넌트/예약어 0개로 닫힘. Delete 2단계 전이는 HTML form 멘탈모델 정합. Alert `kind` 분기로 톤 표현. ADR 0018 `*none*` 강화 명문화.

**Negative**: 런타임 강제 없음, lint 보강 필요. 5단계 팔레트 고정 부작용 (i18n·도메인 확장). Button `confirm` 미도입 → 확인 페이지 1장 추가 토큰 비용. preview tool 추가로 envelope `tools[]` 팽창.

**Neutral**: `destructive-action` 키 선택적. Table `rows: []` 자동 placeholder 미삽입 = 현 구현. CodeSpan 행 상태 직렬화 이미 동작.

## Alternatives

1. Button `confirm` 속성 — HTML 밖 개념, 영향 예고 불가. 기각.
2. tool 파라미터 `confirm=true` — SSOT 판별 불가. 기각.
3. 전용 `EmptyState` directive — Alert로 커버, ADR 0007 §7 위반. 기각.
4. Table 엔진 자동 Alert 삽입 — 저자 의도 고정, 스키마 inspection 손실. 기각.
5. 행 상태 Strong/Emphasis/이모지 — 의미 충돌 또는 일관성 저하. 기각.

## Migration

- `docs/spec/component-catalog.md`
  - §Button: 위험 동작 관용구 1문단 (variant=danger + `<Verb>…` + preview tool 규약)
  - §Alert: 빈 상태 3가지 kind 매핑 (warning/note/caution)
  - §Table: "`rows: []` 처리 — 자동 placeholder 없음, 저자가 Alert{kind=note}" + "행 상태 CodeSpan 소절 + 5단계 팔레트"
  - §공통규약 뒤: "9. 위험 동작 관용구 (ADR 0019)" + "10. 빈 값 표기 (ADR 0018/0019)" 소절 추가
  - §미정/후속: "Empty state 결정, Loading/Error는 후속"
- `docs/adr/0018-detail-view-convention.md`: Migration `*none*` 규범 강화 문단. Open "Delete 확인 결합" 항목을 "ADR 0019로 해소" 마킹.
- `docs/README.md` Accepted ADRs에 0019 추가.
- `.claude/skills/readable-ui-harness/SKILL.md` §4: "상태 값은 CodeSpan 권고 (ADR 0019)" 1줄 추가.

**코드 변경 없음**.

## Open

- Preview tool 네이밍(`<verb><Resource>Preview`) 강제 — v2 lint
- `Input.type="hidden"` 허용 — 후속 소형 ADR
- 행 상태 팔레트 envelope 선언 (`extensions.statusPalette`) — v2
- i18n `*없음*` 등 — v2
- Button `confirm` 재검토 — v2 opt-in fallback
