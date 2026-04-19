# ADR 0030 — README 다국어 정책: 한국어 default + 영어 병행

- Status: Accepted
- Date: 2026-04-19
- Amends: [ADR 0006](./0006-documentation-language.md)

## Context

ADR 0006 은 저자 (한국어) 와 OSS 독자 (영어) 두 독자층을 고려해 **독자층별 언어 분리** 를 결정했고, 저장소 첫 화면인 `README.md` 는 영어로 고정했다.

운영 중 두 가지 마찰이 드러났다.

- 저자/내부 팀이 README 를 갱신할 때 영어 초안 작성 비용이 설계 이터레이션 속도를 저하시킨다.
- `docs/adr/*` · `docs/research/*` · `docs/spec/*` 가 모두 한국어인데 README 만 영어라서, 내부 독자의 진입 경로가 일관되지 않는다.

한편 OSS 공개 대상 영어 독자 역시 여전히 유효하다 — README 를 완전히 한국어로만 바꾸면 ADR 0006 의 "공개 시 진입장벽 낮춤" 약속이 깨진다.

## Decision

**README 를 다국어로 병행 관리하되, 저장소 기본 (`README.md`) 은 한국어로 한다.**

| 파일 | 언어 | 역할 |
|---|---|---|
| `README.md` | 한국어 | 저장소 기본 첫 화면. GitHub / 내부 뷰어 기본 노출. |
| `README.en.md` | 영어 | 영어 독자용 병행 버전. |

- 두 파일 모두 상단에 언어 전환 링크를 1 줄 둔다:
  - `README.md`: `> Languages: **한국어** · [English](./README.en.md)`
  - `README.en.md`: `> Languages: [한국어](./README.md) · **English**`
- 두 파일은 의미적으로 동일한 내용을 담는다 — 번역 드리프트 관리는 **README 변경 시 두 파일을 함께 갱신** 하는 관례로 강제한다. 자동 검증은 도입하지 않는다.

## Consequences

### Positive

- 저자/내부 팀의 갱신 속도 회복 — 한국어로 먼저 쓰고 영어 번역은 동시 또는 follow-up.
- 내부 독자 진입 경로가 ADR · spec · README 모두 한국어로 일관.
- 영어 독자는 명시적 링크로 영어 버전에 1 클릭 접근.

### Negative

- 두 파일 동기화 의무. 일방만 갱신 시 드리프트 위험.
- GitHub 언어 감지 등 자동화 도구가 저장소 기본 언어를 한국어로 인식할 수 있음 (실사용에 무해).

### Neutral

- ADR 0006 표의 `README.md` 행은 본 ADR 에 의해 갱신된 의도이나, ADR amend 정책상 ADR 0006 본문은 수정하지 않는다 — 본 ADR 이 override 관계를 명시한다.
- `docs/guide/*.md` (향후) 는 여전히 영어 원안 유지 (ADR 0006).
- `docs/adr/*` · `docs/research/*` · `docs/spec/*` 정책 불변.

## Migration

- `README.md` (영어) 를 `README.en.md` 로 이동.
- `README.md` 는 한국어 번역본 + 상단 언어 전환 링크.
- `README.en.md` 상단에도 언어 전환 링크 추가.
- `docs/README.md` Accepted ADRs 목록에 본 ADR 추가.

## Out of scope

- README 이외 문서의 다국어화 (ADR 0006 독자층 분리 원칙 유지).
- 자동 번역 pipeline / lint / CI 드리프트 검출.
- `docs/guide/*.md` 한국어 병행 (향후 필요 시 별도 ADR).

## Open

- 번역 드리프트가 실제로 관찰되면 lint / CI 검증 도입 시점 결정 (현재 관례 기반).
- 추가 언어 (일본어 등) 요구가 생길 경우 `README.<lang>.md` suffix 규약 확장.
