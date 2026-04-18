# ADR 0016 — Form input default value convention

- Status: Proposed
- Date: 2026-04-18
- Extends: [ADR 0009 §7](./0009-envelope-extensions-and-serialization-refinements.md)
- Related: [ADR 0005](./0005-page-envelope.md), [ADR 0007](./0007-layout-and-component-catalog.md), [ADR 0013](./0013-suppress-form-inner-button-action.md), [ADR 0015](./0015-table-as-container-directive.md)

## Context

readable-ui의 CRUD 시나리오 중 **U(Update)** 가 사실상 미구현 상태이다.

1. `Input` / `Select` 컴포넌트에 초기값을 표현할 prop이 없다. 기존 리소스의 값으로 pre-fill된 수정 폼을 만들 수 없어 admin 자동화의 핵심 시나리오 하나("user.email을 a@x.com에서 b@y.com으로 변경")가 닫히지 않는다.
2. `Textarea`는 Item 1 루프(2026-04-18)에서 카탈로그에 신규 추가됐으나 역시 초기값 prop이 부재하다.
3. `Checkbox` / `Radio`는 `checked` boolean attribute를 이미 가지고 있으나, Input/Select/Textarea와 의미·직렬화 방식이 통일되어 있지 않다.
4. Envelope `tools[].input.properties.<field>.default`는 이미 `JsonSchemaSubsetZ`에 정의돼 있으나 본문 directive attribute로 노출하는 관용구가 없다.

## Decision

### 1. Input / Select / Textarea는 `default` attribute를 도입한다

| 위젯 | attribute | 타입 | 생략 규칙 |
|---|---|---|---|
| `input` | `default` | 문자열 (숫자는 toString) | `null`/`undefined`/`""` 생략 |
| `select` (single) | `default` | 문자열 | `null`/`undefined`/`""` 생략 |
| `select` (multiple) | `default` | 문자열 (쉼표 구분) | `null`/`undefined`/빈 배열 생략 |
| `textarea` | `default` | 문자열 (multi-line 허용) | `null`/`undefined`/`""` 생략 |

Select multiple의 쉼표 구분 규약은 `options`와 동일. 값에 쉼표 포함은 v1 비지원.

### 2. Checkbox / Radio는 기존 `checked` 유지

`checked`는 boolean attribute(`checked=""`)이며 HTML 표준과 1:1. `default=true` 같은 우회 도입하지 않는다.

### 3. React prop 이름은 `defaultValue`

React 표준 uncontrolled 관행과 일치. JSX camelCase ↔ Markdown 단일 단어 소문자 분리는 `minLength↔minlength` 선례와 동일.

### 4. envelope ↔ directive 이중 출처: directive가 SSOT

- 본문 directive `default`가 SSOT. 런타임은 directive 값을 따름.
- envelope `default`는 schema hint로 보존 (MCP `tools/list`·외부 UI 생성기 호환).
- 엔진은 envelope `default`를 directive attribute로 자동 주입하지 않음.
- 둘 다 존재 + 불일치 시 warning (향후 lint). directive 우선.

ADR 0015 §4의 "envelope pagination vs Table directive SSOT"와 동일 패턴.

### 5. 예약어 `default` 추가

`component-catalog.md` §공통규약 3항에 `default` 추가.

### 6. v1 범위 밖

- Controlled component 지원
- 동적 default (다른 필드 의존)
- date/datetime-local 값 포맷 정규화
- 파일 input의 default

## Consequences

**Positive**: CRUD U 닫힘. `default`가 JSON Schema·envelope 기존 필드와 의미 통일. Radio `value`(제출값)와 Input `default`(초기값)의 역할 분리. SSOT 경계 명확.

**Negative**: React prop `defaultValue`와 Markdown attribute `default`의 이름 불일치(선례 있음). Checkbox/Radio는 `checked`, 나머지는 `default`로 분기 — 1문장 규범 보강 필요. envelope·directive 이중 출처 warning 수준.

**Neutral**: Zod 변경 없음 (`JsonSchemaSubsetZ.default: z.unknown()` 이미 존재).

Input HTML `value`와의 차이 및 명명 규칙 전반은 [ADR 0017 §4](./0017-jsx-markdown-attribute-naming.md) 참조.

## Alternatives

- **옵션 1 — `value` 통일**: Radio의 `value`(제출값)와 의미 충돌. 기각.
- **옵션 2 — Checkbox/Radio도 `default`**: HTML `checked` 표준 이탈. 기각.
- **옵션 3 — Input/Select/Textarea는 `default`, Checkbox/Radio는 `checked`**: HTML·JSON Schema 양쪽 정합. **채택**.

## Edge cases

1. `multiple=false` + `defaultValue: string[]`: 첫 원소 사용, warning.
2. Select options 밖의 `defaultValue`: warning, HTML 관대 동작 승계.
3. Radio 그룹 내 2개+ `checked`: HTML 마지막 선택, warning.
4. envelope `default` ↔ directive `default` 불일치: warning, directive 우선.
5. Textarea `default` 내 `"`: `mdast-util-directive`가 quoting 처리.
6. 숫자 Input `default`: `toString` 후 HTML5 number input 관대 파싱.

## Open

- `value` 재사용 가능성 (외부 호환): 후속 ADR
- envelope default auto-injection opt-in (`extensions.conventions`): 후속
- Controlled input 경로 (React state 통합): 별도 ADR
