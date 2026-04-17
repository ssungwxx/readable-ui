# ADR 0006 — Documentation language policy

- Status: Accepted
- Date: 2026-04-17

## Context

저자(한국어 사용자) + 향후 OSS 공개(영어 독자) 두 독자층을 동시에 다뤄야 한다. 모든 문서를 영어로만 쓰면 초기 설계 속도가 떨어지고, 모든 문서를 한국어로 쓰면 공개 시 진입장벽이 생긴다.

## Decision

**독자층에 따라 언어를 분리한다.**

| 경로 | 언어 | 이유 |
|---|---|---|
| `docs/adr/*.md` | 한국어 | 저자의 설계 결정 이력, 내부 논의 속도 우선 |
| `docs/research/*.md` | 한국어 | 조사·근거 자료, 내부 참조용 |
| `docs/spec/*.md` | 한국어 | 내부 스펙 문서(envelope, component catalog 등). 추후 사용자에게 공개할 때 영어 버전을 `docs/guide/`로 별도 작성 |
| `README.md` | 영어 | 저장소 첫 페이지, 공개 대상 |
| `docs/guide/*.md` (향후) | 영어 | 사용자 가이드, Quickstart, API 레퍼런스 |
| 코드(identifier, 주석, 에러 메시지) | 영어 | 국제 표준 관행 |
| 커밋 메시지 | 영어 | 공개 이력 |

## Consequences

**Positive**
- 내부 설계 이터레이션 속도 유지.
- 공개 시 README와 guide만 번역·작성하면 되어 진입장벽 낮음.
- 코드는 처음부터 영어라 번역 부담 없음.

**Negative**
- 동일 주제의 ADR(한국어)과 guide(영어) 사이에 드리프트 가능. 해결: ADR을 **설계 결정 이력**으로만 두고, 영어 guide는 **결과로서의 사용 방법**에 집중 — 서로 번역 관계가 아니라 독립 문서로 유지한다.

**Neutral**
- 향후 외부 기여자가 ADR 변경을 제안하려면 한국어를 읽어야 한다. 이때는 케이스별로 영어 요약을 달거나 PR에서 번역한다.
