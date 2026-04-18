# ADR 0017 — JSX prop ↔ Markdown attribute 명명 규칙

- Status: Proposed
- Date: 2026-04-18
- Related: [ADR 0005](./0005-page-envelope.md), [ADR 0007](./0007-layout-and-component-catalog.md), [ADR 0009](./0009-envelope-extensions-and-serialization-refinements.md), [ADR 0012](./0012-dual-render-convention-signals.md), [ADR 0016](./0016-form-default-value-convention.md)

## Context

ADR 0009 §7(Input/Select 확장), ADR 0016(`default` 도입)을 거치며 JSX prop 이름과 대응 Markdown directive attribute 이름 사이의 매핑이 ad-hoc으로 누적됐다. 현행 사례:

| JSX prop (camelCase) | Markdown attribute | 변환 규칙 |
|---|---|---|
| `minLength` | `minlength` | 전부 소문자 평탄화 |
| `maxLength` | `maxlength` | 전부 소문자 평탄화 |
| `placeholder` | `placeholder` | 동일 (HTML 원어) |
| `required` | `required` | 동일 (HTML 원어, boolean) |
| `multiple` | `multiple` | 동일 (HTML 원어, boolean) |
| `defaultValue` | `default` | 접미(`Value`) 제거 + 소문자화 (ADR 0016) |
| `defaultChecked` (내부) | `checked` | React 접두(`default`) 제거 + HTML 원어 매핑 |

Item 2 LLM 점검에서 LLM이 `defaultValue`를 그대로 attribute로 내보내는 오류를 냈다. 명명 정본이 단일 ADR에 없는 것이 문제. 또한 Item 2 후속 3건(아래)을 동일 카테고리로 흡수한다.

- (a) §Select "multiple `default`는 `options`와 동일 쉼표 구분" 1문장 보강
- (b) `extensions.conventions.form-default-ssot: "directive"` 기본값 도입
- (c) §Textarea multi-line `default` round-trip 규약 1문장

ADR 0016 Consequences의 "Input HTML `value`와의 차이"도 본 ADR에 흡수.

## Decision

### 1. 일반 규칙 (정본 1문장)

> **JSX prop 은 React·TS 관례에 따라 camelCase 를 쓰고, 대응하는 Markdown directive attribute 는 해당 JSX prop 을 전부 소문자로 평탄화한 단일 토큰(kebab 없음)으로 매핑한다. 단 (i) React 고유 접두·접미(`default*`, `*Value`, `on*`)가 붙은 prop 은 해당 접두·접미를 제거한 의미어로 매핑하고(`defaultValue → default`, `defaultChecked → checked`), (ii) HTML 원어가 확립된 prop(`placeholder`, `required`, `multiple`, `checked`, `pattern`, `min`, `max`, `step`, `rows`, `name`, `type` 등)은 그 원어를 그대로 쓴다.**

| prop | 적용 결과 |
|---|---|
| `minLength` | (i) → 소문자 평탄화 → `minlength` |
| `maxLength` | → `maxlength` |
| `placeholder` | (ii) HTML 원어 → `placeholder` |
| `required` | (ii) → `required` (boolean, `""`) |
| `multiple` | (ii) → `multiple` |
| `defaultValue` | (i) 접미 제거 → `default` |
| `defaultChecked` | (i) 접두 제거 → HTML 원어 `checked` |
| (가상) `onChange` | v1 scope 밖 (이벤트 핸들러 미지원) |

"접두·접미 제거"는 **의미 충돌이 없을 때만**. 복수 단어 prop이 HTML 원어 아니면 소문자 평탄화를 우선, kebab 도입은 본 ADR 개정을 거친다.

### 2. 예외 목록 (HTML 원어 우선)

```
placeholder, required, multiple, checked, pattern, min, max, step,
rows, name, type, value, href, src, alt
```

### 3. Item 2 LLM 점검 후속 흡수

#### 3.1 Select multiple `default` 규약
`component-catalog.md` §Select 에 추가: "`default`(multiple)는 `options` 와 동일한 쉼표 구분 문자열을 쓴다. 값에 쉼표 포함은 v1 비지원."

#### 3.2 `extensions.conventions.form-default-ssot`

| 키 | 값 | 의미 |
|---|---|---|
| `form-default-ssot` | `"directive"` (default) | 폼 입력 위젯의 `default` attribute와 envelope `default` 공존 시 directive를 SSOT로 사용. envelope는 schema hint로만 보존. ADR 0016 §4를 컨벤션 키로 명시화. |

구현: `packages/core/src/index.ts` `DEFAULT_CONVENTIONS` 에 1줄 추가. `docs/spec/page-envelope.md` 표에 1행.

#### 3.3 Textarea multi-line `default`
`component-catalog.md` §Textarea 에 추가: "Textarea `default`는 multi-line 문자열을 수용한다. `mdast-util-directive`의 attribute quoting으로 `\n`은 escape되어 보존된다. 값 내 `\"`는 `\\\"`로 escape."

### 4. ADR 0016 Input `value` vs `default` 보강 흡수

- Input/Select/Textarea: `default`만 (초기값). `value` 미노출.
- Radio: `value` (제출값) + `checked` (초기 선택).
- Checkbox: `checked` (boolean). HTML `value`(제출값)는 v1 scope 외.

ADR 0016 Consequences에 "Input HTML `value`와의 차이는 ADR 0017 §4 참조" 1줄 크로스 링크.

### 5. 새 컴포넌트 도입 시 적용 의무

v2 또는 후속 ADR에서 새 prop 추가 시 본 ADR §1을 먼저 적용. 예외 확장은 본 ADR 개정 필요. `component-catalog.md` §공통규약 3항(예약어) 갱신은 본 ADR과 동시 (SKILL §2 동기화 체크리스트).

## Consequences

**Positive**: 신규 컴포넌트 이름 결정 비용 제로. 매핑 이력 단일 ADR 정리. LLM 프롬프트 1줄 주입 가능. ADR 0016 미결 1건 해소. Item 2 후속 3건 일괄 정합.

**Negative**: 규칙이 예외 목록을 가짐 — 기계적 완전성 X. `on*` 등 v2 확장 시 재검토. `DEFAULT_CONVENTIONS` 4→5개로 증가 (토큰 비용 미미).

**Neutral**: Textarea quoting 규약은 이미 구현된 동작의 규범 문서화. Select multiple 쉼표 규약은 ADR 0016에 이미 존재, spec 중복 명시 수준.

## Alternatives considered

1. **완전 kebab-case**: HTML 원어 다수가 단일 단어라 적용 불가. 복수 단어만 kebab은 이중 규칙. 기각.
2. **JSX 이름 그대로 (camelCase 직렬화)**: HTML5 원어와 정합 깨짐. LLM 오염 출력 위험. 기각.
3. **ADR 0016 안에 명명 규칙 병합**: 제목-내용 불일치. 분리 옳음. 기각.

## Migration

- 기존 코드는 이미 본 규칙 준수. 코드 변경 없음.
- `packages/core/src/index.ts` `DEFAULT_CONVENTIONS`에 `"form-default-ssot": "directive"` 1줄.
- `docs/spec/page-envelope.md` `extensions.conventions` 표에 1행.
- `docs/spec/component-catalog.md` §Select 1문장, §Textarea 1문장, §공통규약 3항 뒤 ADR 0017 참조 링크.
- `docs/adr/0016-form-default-value-convention.md` Consequences에 ADR 0017 §4 크로스 링크.
- `docs/README.md` Accepted ADRs에 ADR 0017 행 추가.

## 관련

- ADR 0007 카탈로그 닫힘 (본 ADR은 이름 규칙만)
- ADR 0009 Input/Select 확장 (명명 사례 원출처)
- ADR 0012 Dual-render conventions (`extensions.conventions` 메커니즘)
- ADR 0016 Form default (명명 측면 승격, SSOT 런타임 키)
