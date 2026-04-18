# Spec — Bench (readable-ui · ax-tree · headful-md 3중 비교)

- 결정 근거: [ADR 0023 — Benchmark environment](../adr/0023-benchmark-environment.md)
- 실행 spec (시나리오·메트릭·fairness·tokenizer·runner 인터페이스): [bench/docs/metrics.md](../../bench/docs/metrics.md) — **living document**

본 문서는 요약 포인터만 유지한다. 벤치의 측정 축·시나리오 표·휴리스틱 규칙은 모두 `bench/docs/metrics.md` 에 있으며, 이 문서가 정본이다 (문서 언어 정책: ADR 0006, 위치상 `docs/spec/` 이므로 한국어).

## 요약

- **비교 대상**: `readable-ui` (envelope + body) / `ax-tree` (Playwright `accessibility.snapshot` JSON) / `headful-md` (ax-tree → Markdown 휴리스틱).
- **시나리오**: `apps/example` 의 7 라우트 (`/`, `/dashboard`, `/users`, `/users/u_alice_01`, `/reports`, `/audit`, `/jobs`) 재사용. 신규 fixture 를 두지 않는다.
- **메트릭**: `bytes / chars / tokens / renderTimeMs / actionableElementCount` raw + aggregator 단계의 `infoDensity / sizeRatio`. tokenizer 는 `@anthropic-ai/tokenizer` 단일 (Claude 정렬, ADR 0023 §4).
- **Fairness**: 세 런너 모두 같은 Next dev server 의 동일 라우트 상태를 측정. readable-ui 는 `.md` 엔드포인트, ax-tree/headful-md 는 HTML 경로 + Playwright. Warm-up 1회 폐기, 2회차 측정.
- **확장 규칙**: 새 시나리오 추가 시 **3 러너 모두 산출** 유지. 러너 추가는 `bench/docs/metrics.md` §1 갱신 + 필요 시 후속 ADR.
- **CI**: 미편입. on-demand 로컬 실행 한정. nightly 승격은 ADR 0023 Open.

세부 spec 은 `bench/docs/metrics.md` 를 따라간다.
