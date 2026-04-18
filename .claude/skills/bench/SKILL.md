---
name: bench
description: readable-ui 전송 계층 벤치 (`bench/` 패키지, `pnpm bench`) 를 다루기 전에 반드시 먼저 참조하는 skill. 새 벤치 시나리오 추가, 새 transport 도입, `bench/scenarios/**`·`bench/src/runners/**`·`bench/src/lib/**`·`bench/docs/metrics.md` 수정, AX 트리 스냅샷·ax→md 변환 규칙 조정, `@anthropic-ai/tokenizer` 토크나이저 교체, actionable 카운트 정의 변경, `summary.md` 리포트 포맷 변경, ADR 0023 개정 요청 시 이 skill을 **가장 먼저 열어** 3-way 공정성 규칙과 결과 아티팩트 규약을 확인해야 한다. 3 런너(`readable-ui`, `ax-tree`, `headful-md`) 간 공정성 드리프트가 이 프로젝트의 최대 리스크이므로 새 작업은 spec (`bench/docs/metrics.md`) + ADR 0023 을 동반 업데이트한다.
---

# bench harness

`bench/` 는 세 전송 계층 (`readable-ui` / `ax-tree` / `headful-md`) 이 **같은 DOM 상태**를 각자의 출력으로 직렬화한 뒤 크기·토큰·액션 밀도를 비교하는 하니스다. 모든 작업은 `bench/docs/metrics.md` 에 선언된 계약을 따르며 본 skill은 그 계약을 유지하기 위한 결정 규칙을 담는다.

## 0. 언제 이 skill을 트리거하나

- `bench/**` 의 어떤 파일이든 편집하기 전
- `docs/adr/0023-benchmark-environment.md` 개정
- `bench/docs/metrics.md` 개정
- 새 시나리오 추가, 새 transport 추가, actionable 카운트 기준 변경
- `pnpm bench` 실행 방식 / 결과 아티팩트 포맷 변경

## 1. 세 런너 공정성 규칙 (spec §4)

세 런너는 **같은 `apps/example` 라우트 DOM 상태**에서 출력한다.

- `readable-ui`: `http://localhost:3030/<route>.md` HTTP fetch. 404 → `output: null`, 0 metrics.
- `ax-tree`: Playwright chromium headless → CDP `Accessibility.getFullAXTree` (Playwright 1.51에서 `page.accessibility.snapshot` 이 제거돼 CDP로 대체).
- `headful-md`: 위 AX tree 를 입력 받아 spec §5 규칙으로 markdown 변환. **같은 page visit 의 스냅샷을 공유** — `PageAxSnapshotCache` (`bench/src/lib/ax-cache.ts`).

`renderTimeMs` 는 각자의 "입력 → output string" 단계만 측정. 네트워크/브라우저 부팅은 포함하지 않는다.

## 2. 새 시나리오 추가 — 3-way 패리티 규칙

ADR 0023 Consequences: **새 시나리오는 세 런너 모두에서 산출돼야 한다**. 예외: runner-out-of-applicability 가 spec 에 명시된 경우 (현재 `home` 시나리오는 `.md` 라우트 미존재로 `readable-ui` null).

체크리스트:

- [ ] `bench/scenarios/index.ts` 에 `BenchScenario` 추가 (id, url, title, taskDescription)
- [ ] `apps/example` 에 해당 라우트 + `.md` 라우트가 존재하는지 확인 (없으면 먼저 readable-ui-harness skill 로 라우트 설계)
- [ ] `bench/docs/metrics.md` §2 테이블에 엔트리 추가
- [ ] `pnpm bench --scenario <new-id>` 로 3 transport 모두 실행되는지 확인
- [ ] `bench/README.md` "Latest baseline run" 에 포함

**벤치 전용 fixture 신설 금지**. `apps/example` 의 기존 fixture (ADR 0011·0015·0018·0019·0020·0021·0022) 를 재사용한다. fixture-drift 를 막기 위한 결정.

## 3. 새 transport 추가

예: `dom-text` (raw `innerText`), `ax-compact`, `readable-ui-v2` 등.

체크리스트:

- [ ] `bench/src/runners/<id>.ts` 에 `Runner` 구현 — `start?/stop?` lifecycle, `run(scenario)` 반환은 spec §7 의 `RunnerResult` 정확히
- [ ] `RunnerId` 유니온 타입 (`bench/src/types.ts`) 에 `id` 추가
- [ ] `bench/src/cli.ts` 의 `ALL_TRANSPORTS` 와 runner factory 분기 추가
- [ ] `bench/src/lib/aggregator.ts` 의 takeaways 템플릿이 새 transport 를 다루는지 재확인
- [ ] `bench/docs/metrics.md` §1 표 + §3.1 actionable 정의 + §5 (변환 규칙 있는 경우) 업데이트
- [ ] ADR 0023 개정 또는 후속 ADR 작성 (왜 추가했는지, 평가 기준)

## 4. actionable 카운트 정의 (spec §3.1)

| runner | 카운트 대상 |
|---|---|
| `readable-ui` | 본문 내 `mcp://tool/<name>[?qs]` URL 을 **dedup** 한 수. directive+link paragraph 이중 표현 (fallback `"on"`) 은 같은 URL 이므로 자동 1회로 집계. |
| `ax-tree` | role ∈ {button, link, textbox, combobox, checkbox, radio, menuitem, tab, switch}. `disabled: true` 포함 (에이전트가 보는 "액션 수"). |
| `headful-md` | `[text](url)` 링크 + `- label: ___` 입력 라인 + `[label]` 단독 버튼 라인 합산. 변환 규칙 상 비활성 노드는 `~~...~~` 로 표기되므로 버튼 카운트에 포함된다. |

이 정의를 바꿔야 한다면 **세 러너 모두를 동시에** 수정하고 `bench/docs/metrics.md` §3.1 을 개정한다 (단독 변경 금지 — 비교 공정성 훼손).

## 5. 결과 디렉터리 읽는 법

`bench/results/<ISO-timestamp>/` 구조:

```
summary.md         — GFM 리포트 (per-scenario 표 + across-scenario 요약 + takeaways)
summary.json       — enrichResults() 가 붙인 infoDensity/sizeRatio 포함 원데이터
outputs/
  <scenario>.<transport>.txt   — 각 셀의 원문 (디버깅·snapshot)
```

새 결과를 비교할 때:

1. `summary.md` 의 "Takeaways" 가 자동 계산값이므로 먼저 확인
2. 개별 셀에 의문이 있으면 `outputs/<scenario>.<transport>.txt` 열어 raw 출력 검증
3. deterministic 이 깨졌다고 의심되면 **같은 git sha · 같은 node 버전**으로 두 번 실행해 `summary.json` 의 `bytes/chars/tokens/actionable` 가 identical 한지 확인 (`renderTimeMs` 만 변동 허용)

## 6. 자주 생기는 실패 모드

| 증상 | 원인 | 해결 |
|---|---|---|
| `Executable doesn't exist at .../chrome-headless-shell` | Playwright 브라우저 바이너리 미설치 | `pnpm --filter @readable-ui/bench exec playwright install chromium` (사용자 허용 후) |
| `Next dev server did not respond on ... within 20000ms` | `apps/example` 빌드 에러 또는 포트 점유 | 수동으로 `pnpm --filter example run dev` 실행해 로그 확인 |
| `headful-md requires a cached AX snapshot` | transport 순서가 ax-tree 이후에 실행돼야 하는데 먼저 실행됨 | CLI 의 `transportOrder` 가 유지되고 있는지 확인. ax-tree 없이 headful-md 단독 실행은 현재 지원하지 않음 |
| readable-ui 의 `home` 이 null | `/` 에 `.md` 라우트 없음 — 설계대로의 동작 | spec §4.2 참조. 집계에서는 sizeRatio 계산 제외됨 |
| `@anthropic-ai/tokenizer` 버전 충돌 | 0.0.x 대의 API 불안정 | `0.0.4` 로 **pin** 유지 (spec §6). 업그레이드는 ADR 개정 동반 |

## 7. spec 이 절대 기준이다

`bench/docs/metrics.md` 가 **코드보다 우선**한다. 코드와 spec 이 충돌하면 기본적으로 코드가 틀린 것 — spec 을 먼저 읽고 코드를 맞춘다. 거꾸로 spec 이 낡았다면 먼저 spec 을 개정하고, 같은 PR 에서 코드를 업데이트한다 (ADR 드리프트 방지는 readable-ui-harness skill §2 와 동일 원칙).
