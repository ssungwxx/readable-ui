# @readable-ui/bench

세 가지 전송 계층(`readable-ui` envelope, `ax-tree` JSON, `headful-md` heuristic markdown)이 같은 `apps/example` 페이지 상태에서 어떤 크기·토큰·actionable 밀도로 출력되는지 비교하는 하니스. 설계 계약은 [`bench/docs/metrics.md`](./docs/metrics.md), 도입 배경은 [ADR 0023](../docs/adr/0023-benchmark-environment.md).

## Latest baseline run

- 실행: `2026-04-18T03-33-45-531Z` (스냅샷: [`results/baseline/`](./results/baseline/))
- git: `5bd03ea`
- node: `v22.14.0`
- chromium: `147.0.7727.15` (playwright v1217, CDP `Accessibility.getFullAXTree`)
- warm-up: on (각 (scenario, transport) 쌍마다 1회 실행 후 2회차 측정)

### Per-scenario tokens / actionable / sizeRatio

| scenario | readable-ui tokens | ax-tree tokens | headful-md tokens | ax-tree sizeRatio | headful-md sizeRatio | readable-ui actionable | ax-tree actionable | headful-md actionable |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| home | n/a | 15,968 | 305 | — | — | — | 12 | 0 |
| dashboard | 793 | 20,361 | 334 | 25.68 | 0.42 | 5 | 11 | 1 |
| users | 1,494 | 34,063 | 425 | 22.80 | 0.28 | 13 | 29 | 4 |
| user-detail | 907 | 21,921 | 271 | 24.17 | 0.30 | 3 | 10 | 3 |
| reports | 1,197 | 33,358 | 526 | 27.87 | 0.44 | 8 | 15 | 1 |
| audit | 13,164 | 27,794 | 425 | 2.11 | 0.03 | 5 | 17 | 0 |
| jobs | 608 | 17,885 | 245 | 29.42 | 0.40 | 0 | 12 | 0 |

### Across-scenario summary

| transport | tokens median | tokens mean | tokens min | tokens max | actionable median | actionable mean |
|---|---:|---:|---:|---:|---:|---:|
| readable-ui | 1,052 | 3,027 | 608 | 13,164 | 5 | 5.67 |
| ax-tree | 21,921 | 24,479 | 15,968 | 34,063 | 12 | 15.14 |
| headful-md | 334 | 362 | 245 | 526 | 1 | 1.29 |

### Takeaways (auto-computed)

- **ax-tree vs readable-ui**: 평균 sizeRatio 22.01 (산술평균), 중앙값 24.17 — `audit` 시나리오 (sizeRatio 2.11) 가 평균을 끌어내리므로 **중앙값 쪽이 실제 비대칭을 더 정직하게 반영**한다. `home`·`audit` 을 제외한 5 시나리오 기준 단순 평균은 25.99.
- **headful-md vs readable-ui**: 평균 sizeRatio 0.31 (약 69% 감소). 단, actionable 중앙값이 1 로 심각히 낮아 "정보는 작지만 액션도 잃었다" 는 해석이 맞다. `users` 라우트에서도 ax-tree 가 뽑아낸 29개 interactive 중 4개만 복원. 즉 토큰 감소는 **정보 손실 비용으로 얻은 것**.
- **`audit` 시나리오**: readable-ui 쪽도 payload-heavy 240 rows 때문에 13k 토큰. sizeRatio 가 가장 낮게 나오는 이유 (ADR 0022 Table payload 결정의 비용). 평균 수치에 단독으로 크게 영향을 주는 outlier — per-scenario 표와 함께 읽어야 한다.
- **home (`/`)** 은 `readable-ui` 런너에 미적용 — envelope/`.md` 라우트 없음. spec §4.2 의 명시적 예외.

## 재현 방법

```bash
# 1) 워크스페이스 의존성 (최초 1회)
pnpm install

# 2) playwright chromium 바이너리 (최초 1회, ~260MiB)
pnpm --filter @readable-ui/bench exec playwright install chromium

# 3) 전체 bench (7 scenarios × 3 transports, warm-up 포함)
pnpm bench

# 부분 실행
pnpm bench --scenario users,audit
pnpm bench --transport readable-ui,ax-tree
pnpm bench --no-warmup            # spec §4.5 warm-up 비활성화 (디버깅용)
pnpm bench --plan                 # 매트릭스만 출력 후 종료
```

결과는 `bench/results/<ISO-timestamp>/` 아래 다음 구조로 저장된다:

```
summary.md       # GFM 리포트 (이 README 의 소스)
summary.json     # enrichResults() 를 거친 원데이터
outputs/
  <scenario>.<transport>.txt      # 각 셀의 원문 (디버깅·snapshot)
```

`bench/results/baseline/` 은 **수동 복사된 스냅샷**이며 타임스탬프 디렉터리와 동일한 구조. 새 baseline 을 고정하려면 `cp -R bench/results/<new-timestamp> bench/results/baseline` 로 덮어쓴다.

## Known failures

없음. 2026-04-18 run 기준 7 × 3 = 21 cell 전부 성공 (`home.readable-ui` 는 spec 에 명시된 `null` 결과이므로 실패가 아님).

## 카프 (caveats)

### 측정 비대칭 (해석 시 반드시 고려)

- **Tokenizer 단일 — Claude 편향**: `@anthropic-ai/tokenizer@0.0.4` 로만 측정한다. GPT/o200k·cl100k 로 재측정하면 각 transport 의 절대 토큰 수뿐 아니라 상대 비율도 약간 이동한다 (한국어 비중이 높은 `audit`·`user-detail` 에서 특히). readable-ui 의 1차 소비자가 Claude 인 점을 근거로 단일 tokenizer 로 닫았고 (spec §6, ADR 0023), 벤치 숫자는 **"Claude 에서 보이는 비율"** 로만 인용하라.
- **`Accessibility.getFullAXTree` 는 필터링 불가**: CDP 메소드는 항상 full tree 를 돌려준다. Playwright 구 API 의 `interestingOnly: true` 같은 서버측 필터링은 CDP 에 없다. production agent 가 자체적으로 ignored/hidden 노드를 제거하면 ax-tree 크기는 줄어들 수 있다. 따라서 **`ax-tree` 수치는 "가공 전 상한"**. readable-ui 와의 갭 22배는 "LLM 에 raw dump 로 주었을 때" 기준이지 "ax-tree 기반 에이전트의 일반적 입력 크기" 는 아니다.
- **`renderTimeMs` scope 가 3 runner 간 다르다**: readable-ui 는 HTTP fetch wall-clock (네트워크 포함), ax-tree 는 CDP call + tree 복원 + stringify, headful-md 는 순수 변환 단계 (snapshot 비용 제외, `PageAxSnapshotCache` 로 공유). **3 runner 를 동일 축에서 비교하지 말 것** — 이 숫자는 각 runner 내부 rank 변화 추적용. 크기 계열 (`bytes`/`chars`/`tokens`/`actionable`) 은 deterministic.
- **`actionable` 정의가 3 runner 간 다르다**: readable-ui 는 `mcp://tool/` URL dedupe (즉 선언된 tool 호출만), ax-tree/headful-md 는 모든 interactive 요소 (navigation 링크 포함). `infoDensity = tokens / actionable` 의 **교차 비교는 제한적** — 동일 runner 내부 scenario 랭킹 비교에만 유효하다. spec §3.1 정의 참조.
- **sizeRatio 평균은 산술평균**: 비율 지표에는 geomean 이 더 적절할 수 있으나 v1 은 산술평균 + median 을 병기한다. `audit` outlier (sizeRatio 2.11) 가 산술평균을 유의하게 끌어내리므로 **median 쪽이 실제 규모를 더 잘 반영**한다.

### 운영 조건

- **Single-machine 측정**: 모든 숫자는 builder 의 macOS Darwin 25.3.0 (Apple silicon) 에서 단회 수집. CPU 부하 편차에 따른 `renderTimeMs` 흔들림 10–20% 가 예상되므로 **타이밍은 rank 비교 목적**에만 사용하고 절대값은 인용하지 말 것.
- **Warm-up 1회 버림**: spec §4.5 에 따라 각 (scenario, transport) 별 1회 실행 후 2회차만 기록. Next RSC 캐시·Playwright navigation 부팅 편차 제거 목적.
- **AX 스냅샷 공유**: `ax-tree` 와 `headful-md` 는 동일 page visit 의 단일 AX 트리를 공유 (`PageAxSnapshotCache`). 덕분에 두 런너가 본 DOM 상태는 identical.
- **CDP 전환**: Playwright 1.51 에서 `page.accessibility.snapshot` 이 제거돼 `context.newCDPSession(page)` + `Accessibility.getFullAXTree` 로 대체. 결과 노드 shape 는 자체 `AxNode` 타입 (`bench/src/lib/ax-cache.ts`) 으로 정의.
- **`audit` payload**: spec §2 의 240 rows deterministic fixture. readable-ui 쪽도 13k 토큰으로 커지지만, 이는 ADR 0022 Table payload 의 의도된 비용 — 에이전트가 모든 행을 직접 조회 가능하게 하는 trade-off.
- **home (`/`)**: spec §4.2 에 따라 `readable-ui` 가 non-applicable. `ax-tree`·`headful-md` 는 정상 측정되지만 sizeRatio 계산에서 baseline 이 없으므로 `—`.

## 관련 문서

- [`bench/docs/metrics.md`](./docs/metrics.md) — 전체 spec (시나리오, 측정 항목, 공정성 규칙, 변환 규칙, tokenizer 선택)
- [ADR 0023 — Benchmark environment](../docs/adr/0023-benchmark-environment.md) — 의사결정 기록
- [`.claude/skills/bench/SKILL.md`](../.claude/skills/bench/SKILL.md) — bench 편집 가이드
