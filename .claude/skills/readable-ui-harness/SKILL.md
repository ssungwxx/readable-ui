---
name: readable-ui-harness
description: readable-ui 저장소에서 코드·문서를 편집할 때 따라야 할 설계 규약. envelope·컴포넌트 카탈로그·ADR 간 정합을 유지하도록 Claude의 판단을 유도한다. `packages/`, `docs/`, `apps/` 어느 경로든 편집 대상일 때 참조.
---

# readable-ui harness

readable-ui 저장소에서 편집 작업을 수행할 때 본 skill을 참조한다. **런타임 강제는 코드가 담당**하고, 본 skill은 **Claude가 내려야 할 설계 판단을 유도**한다.

## 1. 카탈로그는 닫힌 집합이다

- `packages/react/src/components.tsx` 에 있는 컴포넌트 목록이 v1의 유일한 카탈로그다.
- `defineDualComponent({ name: "kanban", ... })` 처럼 **새 이름을 등록하지 않는다**.
- 새로운 컴포넌트가 필요하다고 판단되면, 먼저 다음을 제안한다:
  1. 기존 카탈로그(Heading/Card/Table/Form/…) 조합으로 해결 가능한지
  2. 불가능하면 ADR 0007 개정이 필요함을 사용자에게 알리고, 새 ADR 초안 작성
- 기존 이름의 **override는 허용** (시각 스타일 교체용).

카탈로그 원본: [docs/spec/component-catalog.md](../../../docs/spec/component-catalog.md)

## 2. 동기화 체크리스트

세 자료가 항상 정합을 유지해야 한다:

```
코드 (packages/**)
 ↕
Spec (docs/spec/**)
 ↕
ADR (docs/adr/**)
```

### 새 컴포넌트 추가

- [ ] `packages/react/src/components.tsx` 에 `defineDualComponent(...)`
- [ ] `docs/spec/component-catalog.md` 에 항목 추가
- [ ] ADR 0007 개정 또는 후속 ADR
- [ ] `docs/README.md` 의 ADR 목록 갱신

### Envelope 필드 추가

- [ ] `packages/core/src/envelope.ts` Zod 스키마
- [ ] `packages/core/src/index.ts` export
- [ ] `docs/spec/page-envelope.md` 필드 명세
- [ ] ADR 0005 개정 또는 후속 ADR (예: 0009)

### 새 ADR

- [ ] `docs/adr/NNNN-title.md` (숫자 증가)
- [ ] `docs/README.md` "Accepted ADRs" 목록
- [ ] 관련 spec 파일들의 "결정 근거" 링크에 추가
- [ ] 이전 ADR이 superseded면 status 변경 명시

## 3. Directive attribute 예약어

built-in 의미로 예약된 속성 이름 — **다른 용도로 overload 금지**:

```
action, name, required, label, variant, status, kind, cols, level,
options, pattern, minlength, maxlength, min, max, step, format, multiple
```

새 attribute가 필요하면 (1) 기존 중 합쳐 쓸 수 없는지, (2) 카탈로그 spec에 선언하고 예약 목록에 추가할지 판단한다.

## 4. Table 셀 내부 규약

- 셀 내부에는 **Link / CodeSpan / Emphasis / Strong만** 허용한다.
- `::button` directive 는 셀 안에 넣지 않는다. row action은 `<Table actions={[...]}/>` props로 선언하고 엔진이 자동으로 `[Label](mcp://tool/<tool>?<params>)` link를 생성.
- 셀 텍스트에 `u\_alice\_01`, `bob\@example.com` 같은 이스케이프가 보이면 **정상이다** (GFM round-trip). 버그로 오해하지 말 것. tool 호출 인자는 URI query(`?id=u_bob_01`)에서 읽는다.

## 5. Directive + link 중복의 의미

`::button[Label]{action=X}` 바로 뒤에 `[Label](mcp://tool/X)` paragraph가 따르면 **동일 호출의 이중 표현**이다. AI는 한 번만 호출해야 한다.

- Form 컨테이너 내부에서는 자동으로 off. Form이 `ctx.walk(children, { fallback: "off" })`로 내부 walk.
- Form 밖 standalone Button은 기본 on — GitHub README 같은 directive 미파서 뷰어 호환용.

## 6. 문서 언어 정책 (ADR 0006)

| 경로 | 언어 |
|---|---|
| `docs/adr/**` | 한국어 |
| `docs/research/**` | 한국어 |
| `docs/spec/**` | 한국어 |
| `README.md` | 영어 |
| `docs/guide/**` (향후) | 영어 |
| 코드 identifier·주석·에러 메시지 | 영어 |
| 커밋 메시지 | 영어 |

경로에 따라 자동으로 언어 선택. 헷갈리면 이 표를 재확인한다.

## 7. Fallback 모드 선택 가이드

`renderMarkdown` / `renderPage` 호출 시 `fallback` 옵션:

| 모드 | 용도 |
|---|---|
| `"on"` (기본) | Button directive + link paragraph 병기. GitHub·Slack·Gmail 등 호환 |
| `"off"` | directive만. Form 내부 자동 사용. readable-ui 호환 뷰어·에이전트 전용 |
| `"link-only"` | link만. directive 미지원 뷰어 타겟팅 |

## 8. 커밋 범위

관련 변경은 하나의 커밋으로 묶는 것을 선호:

- ADR 변경 → 관련 spec + 코드 + 예시를 같은 커밋에
- 새 기능 추가 → 테스트/예시/문서를 같은 커밋에
- 메시지 컨벤션: `feat:`, `fix:`, `docs:`, `chore:` 접두 (Conventional Commits)

## 9. Skill이 다루지 않는 것 (코드가 담당)

다음은 본 skill의 대상이 **아니다**. 이미 런타임이 강제한다.

- envelope 필수 `title` 부재 (코드가 throw)
- 미선언 tool 참조 (코드가 throw)
- Host element `<div>` 사용 (walker가 throw)
- JSON Schema 형식 오류 (Zod가 throw)

코드가 throw하는 문제를 skill 레벨에서 별도 검증하지 않는다. 중복 방지.

## 10. 의심되면 ADR로

본 skill 또는 spec이 모호할 때는:

1. 현재 구현을 근거로 일단 합리적 판단을 내리고
2. 판단 근거를 **새 ADR 초안**으로 기록하거나 기존 ADR 개정을 제안한다
3. 사용자 승인 후 코드·spec 동반 반영

"일단 구현해두고 나중에 문서화"는 **금지**. 그 방식이 과거 반복된 드리프트의 원인이었다 (ADR 0010 Context 참고).
