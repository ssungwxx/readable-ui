# ADR 0010 — Readable-UI Harness (Claude Code skill)

- Status: Accepted
- Date: 2026-04-17

## Context

그동안 반복된 패턴은 "ADR은 앞서 있고 코드·spec은 뒤떨어진다"였다. 1차 LLM 친화성 검토에서도 "ADR 0001 fallback 자동 병기 약속 미구현", "ADR 0003 unified 파이프라인 미연결" 등 코드-문서 드리프트가 집요하게 지적됐다. 매 사이클 검토 에이전트가 같은 종류의 결함을 잡아내는 비용이 크다.

런타임 강제(코드 레벨 throw)는 이미 `renderPage`의 envelope 검증, `walkNode`의 host element 차단, `EnvelopeZ.parseEnvelope` 등에 배치되어 있다. 나머지 결함은 **Claude가 편집 중 "어떤 판단을 내려야 하는지"를 유도**하는 것으로 대부분 예방 가능하다 — 즉 skill 범위.

## Decision

**`.claude/skills/readable-ui-harness/`** 프로젝트-로컬 Claude Code skill을 도입한다.

### 역할 분리

| 종류 | 담당 | 예시 |
|---|---|---|
| **Runtime 강제** (코드가 throw) | `@readable-ui/core` | envelope 필수 title, 미선언 tool 참조, host element |
| **Build-time 강제** (CI, tsc) | pnpm scripts | 타입체크, 빌드 |
| **설계 판단 유도** (Claude 작업) | Harness skill | 카탈로그 확장, spec↔code 동기화, ADR 변경 시 파급 |

### Skill 범위 (판단 유도 대상)

1. **카탈로그 닫힘 유지** — `defineDualComponent`로 built-in 외 이름 등록 금지. 필요하다 판단되면 ADR 0007 개정 필요성을 Claude가 먼저 제기.
2. **문서 동기화 체크리스트**
   - 새 컴포넌트 추가 → `component-catalog.md` + ADR 동반 갱신
   - envelope 필드 추가 → `page-envelope.md` + ADR 갱신 + Zod 스키마 동기화
   - 새 ADR → `docs/README.md` 인덱스 업데이트
3. **Directive attribute 예약어** — `action`, `name`, `required`, `label`, `variant`, `status`, `kind`, `cols`, `level`, `options` 등을 커스텀 용도로 overload 금지.
4. **셀 내부 허용 인라인** — Table 셀은 Link / CodeSpan / Emphasis / Strong만. Button directive 금지.
5. **셀 이스케이프 수용 규약** — `u\_alice\_01`, `bob\@example.com` 을 버그로 오해하지 말 것. tool 호출은 URI query에서 id 추출.
6. **Directive + link 중복 규범** — "동일 호출의 이중 표현". Form 내부는 fallback off, 밖은 on.
7. **언어 정책** — ADR 0006 준수. 새 문서 위치에 따라 언어 자동 선택.
8. **Fallback 모드 선택** — `renderMarkdown`/`renderPage` 호출 시 `fallback` 옵션 결정 유도.
9. **커밋 범위** — 한 커밋에 ADR + spec + 코드 + 예시까지 동반 포함 선호.

### Skill이 다루지 않는 것

- 런타임 검증 로직 중복 제공 (코드가 이미 담당)
- 커밋 메시지 자동 생성 (commit-organizer 류 별도 skill)
- 외부 도구 호출

### 배치

```
.claude/
└── skills/
    └── readable-ui-harness/
        └── SKILL.md    # frontmatter + 규약 + 결정 트리
```

- `.claude/` 는 git-tracked. 프로젝트 기여자 전체에게 동일 skill 공유.
- Skill 진입 조건: readable-ui 저장소의 `packages/`, `docs/`, `apps/` 어느 경로든 편집 대상일 때.

## Consequences

**Positive**
- ADR-코드-spec 3자 드리프트를 사전에 잡는다. 반복되던 검토 에이전트 지적이 줄어든다.
- Claude 작업의 암묵지(카탈로그 닫힘, 예약어, 셀 이스케이프 수용 등)가 명시화.
- 기여자가 늘어도 규약이 문서 한 곳에 집약.

**Negative**
- Skill 자체도 유지보수 대상이 된다. spec/ADR이 바뀌면 SKILL.md도 갱신해야 함.
- Skill은 Claude Code 사용자에게만 유효. 다른 IDE·툴 사용자는 혜택 없음 — CI 린트로 보강 가능성(후속).

**Neutral**
- 향후 `pre-commit` hook이나 GitHub Action으로 규약 위반 탐지를 확장할 여지. 본 ADR은 skill 단독 적용만 확정.

## 관련

- 모든 기존 ADR(0001~0009)의 규약 내용을 참조.
- 후속: 린트 룰 / GitHub Action 자동화는 별도 ADR.
