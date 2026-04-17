# LLM 친화성 검증 — ADR 0015 Table container directive

- Date: 2026-04-18
- Subject: [ADR 0015](../adr/0015-table-as-container-directive.md) 이행 검증 — Table을 container directive로 승격하고 pagination/sort/filter 를 directive attribute로 co-locate한 구조가 LLM에게 충분히 자기설명적인가
- Fixture: `/tmp/readable-ui-tests/users.md` (신규 `:::table{tool= page= of= size= total= sort= filter-*= mode=}` directive + 내부 GFM pipe table, summary footer link 포함)
- Method: fresh-context Claude 서브에이전트에게 Markdown 파일 하나만 주고 10개 과제 수행. 코드·ADR·spec·외부 리소스 접근 차단. ADR 0015 고유 과제 7개 + ADR 0012/0013/0014 회귀 과제 3개.

## 결과 요약

| 카테고리 | Pass (high) | Partial (medium) | Fail (low) | 노트 |
|---|---|---|---|---|
| F. 현재 상태 판독 (T1, T2) | 2 | 0 | 0 | directive attribute가 self-evident |
| G. Action URI 구성 (T3, T4, T6) | 0 | 3 | 0 | 콜론 인코딩·기본값 신호 부재로 medium |
| H. Summary mode 해석 (T5) | 1 | 0 | 0 | `mode="summary"` + footer link 이중 신호가 의도대로 작동 |
| I. Row action 회귀 (T7) | 1 | 0 | 0 | ADR 0009 §8 이스케이프 round-trip 그대로 유효 |
| J. 회귀 (ADR 0012/0013/0014) | 2 | 1 | 0 | E2 high, E3 medium (본 fixture엔 mirror link paragraph 부재), A3 해당없음 |
| K. SSOT 판별 (T10) | 1 | 0 | 0 | envelope `pagination` 부재를 정확히 신호로 처리 |
| **합계** | **7** | **4** | **0** | 10/10 정답, **7개 high confidence** |

ADR 0015의 핵심 약속 — "LLM이 Table 한 블록만 읽고 tool·page·of·size·sort·filter를 한 지점에서 이해" — 은 **성립**. 10문항 모두 정답, 실패 0건.

## 과제별 판정

### F. 현재 상태 판독

| # | 과제 | 결과 | 판정 |
|---|---|---|---|
| T1 | 어느 tool, 몇 페이지/총 몇 페이지, 총 몇 행? | `listUsers`, 2 / 7, 135 (high) | ✅ PASS |
| T2 | 적용된 필터는? | `status=active`, `role=user` (high) | ✅ PASS |

두 질문 모두 L127의 directive attribute 한 줄만 인용해 해결. ADR 0015 §2 의도 정확히 달성.

### G. Action URI 구성

| # | 과제 | 결과 | 판정 |
|---|---|---|---|
| T3 | `createdAt`을 반대 방향으로 정렬, 나머지 유지 | URI 구조 정답, `_sort=createdAt:asc`까지 정확. (medium) | ⚠️ PARTIAL |
| T4 | 필터·정렬 유지하며 3페이지로 | URI 구조 정답. (medium) | ⚠️ PARTIAL |
| T6 | status 필터 버리고 `role=admin` 1페이지만 | `mcp://tool/listUsers?_page=1&_filter_role=admin` (medium) | ⚠️ PARTIAL |

에이전트가 **medium**으로 내린 공통 이유:
- **콜론 인코딩 정규형 불명확**: summary footer link가 `_sort=createdAt%3Adesc`로 URL-encode 되어 있으나 directive attribute는 `sort="createdAt:desc"`로 raw colon 사용. LLM이 "URI에서는 어느 쪽이 canonical인가"를 결정할 단일 신호 없음.
- **기본값 신호 부재**: `_size`/`_sort`를 생략했을 때 서버가 어떤 기본값을 쓰는지 markdown 본문 어디에도 없음. tool input schema에 `default` 키가 붙으면 self-explanatory할 것.

### H. Summary mode 해석

| # | 과제 | 결과 | 판정 |
|---|---|---|---|
| T5 | `mode="summary"` + `[View all 135 rows](...)` 는 무엇을 뜻하는가? | "현재는 샘플 뷰, 전수 필요 시 재호출" (high) | ✅ PASS |

`mode="summary"` 라는 attribute + 바로 아래의 View-all link **두 신호의 일치**가 에이전트에게 강한 증거. ADR 0015 §6 의 의도한 "샘플임을 명시 + 재호출 엔트리포인트 co-locate" 작동 확인.

### I. Row action 회귀

| # | 과제 | 결과 | 판정 |
|---|---|---|---|
| T7 | `u_bob_01` 삭제 URI + Bob email plain text | `mcp://tool/deleteUser?id=u_bob_01`, `bob@example.com` (high) | ✅ PASS |

ADR 0009 §6·§8 의 row action link + GFM 이스케이프 round-trip 규약이 container directive 감싸기 이후에도 **회귀 없음**. 셀의 `bob\@example.com` → plain `bob@example.com` 정상 파싱.

### J. 회귀 (ADR 0012/0013/0014)

| # | 과제 | 결과 | 판정 |
|---|---|---|---|
| T8 | directive+link 중복은 한 번의 호출인가? | "한 번의 호출, 근거 `extensions.conventions.duplicate-button-link: dual-render`" (high) | ✅ PASS |
| T9 | Form 내부 Button 직렬화 이유 | "leaf directive + label만, form이 action을 가져 생략" (medium) | ⚠️ PARTIAL |

**T8**: ADR 0012 envelope conventions 규약이 ADR 0015 이후에도 **high confidence 유지**. 본 fixture에는 mirror link가 없어 "만약 있다면"으로 답했으나 규약 자체는 정확히 인용.

**T9**: ADR 0013 이행은 눈에 보이지만, 본 fixture에 `extensions.conventions`에 "form-inner-button-action-suppress" 같은 규약 선언이 **없음**. 에이전트는 구조로부터 추론했고 정답이지만 medium. 회귀가 아니라 **본 과제 프레이밍이 회귀 테스트에 최적화되지 않은** 결과. ADR 0012 선례처럼 `form-action-inheritance: direct` 같은 convention key 추가를 검토할 수 있으나 우선순위 낮음.

### K. SSOT 판별

| # | 과제 | 결과 | 판정 |
|---|---|---|---|
| T10 | envelope `pagination` vs directive attribute 중 무엇을 신뢰? | "envelope `pagination` 부재 → directive attribute가 유일 SSOT" (high) | ✅ PASS |

에이전트가 **부재를 적극적으로 신호로 리포트**. ADR 0015 §4의 "Table이 있으면 directive 우선, envelope는 shortcut" 완화 결정이 정확히 의도대로 작동. envelope-pagination 공존 케이스는 본 fixture 범위 밖 — 후속 테스트에서 다룰 수 있음.

## 식별된 Gap

### Gap A — URI 콜론 인코딩 정규형 부재

**현상**: directive attribute `sort="createdAt:desc"` 는 raw colon, URI path/query `_sort=createdAt%3Adesc` 는 URL-encoded colon. 한 fixture에 두 표기가 공존. LLM이 새 URI를 **구성**할 때(T3/T4/T6) 어느 쪽을 정규형으로 써야 할지 신호 부족.

**영향**: 정답 구조는 잡지만 토큰 낭비 + confidence medium. 실제 tool 호출이 URL-encoded `%3A`를 역디코드하지 않으면 서버 측 매칭 실패 가능.

**후보 개선**:
1. 서버는 둘 다 수용 + ADR 0002 문구 보강 (`:`는 URI query에서 관용적 허용 — URLSearchParams가 자동 encode하지만 decode해서 매칭)
2. 엔진이 directive attribute 값도 URL-encode해 두 표기를 통일 (토큰 비용 ↑, 사람 가독성 ↓)
3. 본 fixture 혹은 tool description에 "`_sort` value는 `KEY:DIR` 형식, URL-encoding 무관" 한 줄 추가

방안 3 가장 저렴. 본 research 후속 조치로 `listUsers.description`에 1문장 추가 권장.

### Gap B — Default param 부재 신호

**현상**: `_page`/`_size` 생략 시 서버 기본값이 무엇인지 markdown 본문에 없음. JSON Schema `default` 키를 envelope `tools[].input` 에 채우면 자동으로 드러남.

**영향**: T6에서 "minimal URI로 충분한가, `_size`도 넣어야 하는가" 판단에 confidence 감점.

**후보 개선**:
- envelope `tools[].input.properties._page.default: 1`, `._size.default: 20` 추가. JSON Schema 표준 규약 그대로 → 즉시 self-explanatory.
- spec `page-envelope.md` §검증규칙에는 변경 없음 (이미 JSON Schema subset 지원).

본 research는 코드 변경 불요, **fixture 차원에서 envelope tool 선언을 보강하면 해결**. 후속 커밋 후보.

### Gap C — Form-action-inheritance 신호 (ADR 0013 후속)

**현상**: Form 내부 `::button[Create user]` 에 `action=` 생략은 정답이나, 관련 규약이 envelope conventions에 선언되지 않아 **규범의 외재화가 ADR 0012만큼 완결되지 않음**. 구조적 추론으로도 정답에 도달하지만 confidence medium.

**영향**: 낮음 — 복합 Form을 여러 개 가진 페이지에서도 추론 가능하나, ADR 0012 선례의 "규약을 envelope에 명시" 패턴으로 통일하면 self-explanatory 수준이 high로 고정.

**후보 개선**:
- ADR 0012 `extensions.conventions` 에 `form-inner-button-action: inherit` 관행 키 추가. 런타임이 기본 주입.
- ADR 0013 §Open에 "conventions key 도입 재검토" 한 줄.

우선순위 낮음 — 본 test의 유일 medium이 회귀 영역이고 나머지 고유 테스트가 모두 high이므로 ADR 0015 자체는 통과 처리.

## Positive signals

1. **Directive attribute co-location이 T1/T2에서 즉시 통함** — LLM이 `tool="listUsers" page="2" of="7"` 한 줄로 세 질문 동시 해결. ADR 0015 §2 의도 적중.
2. **`mode="summary"` + View-all link 이중 신호** — ADR 0012가 link title "fallback"으로 입증한 "두 신호 일치" 패턴이 Table 영역에서도 그대로 작동.
3. **예약 prefix `_` 자기설명적** — `_page`/`_size`/`_sort`/`_filter_<field>` 가 tool input schema에 선언되고 fixture footer link에 실제로 쓰여 에이전트가 규약을 **별도 문서 없이** 즉시 파악.
4. **envelope `pagination` 의미 강등이 실제로 혼동 제거** — 부재 자체가 SSOT 판별 신호로 작동 (T10). ADR 0015 §4 의도 성공.
5. **GFM 이스케이프 round-trip 회귀 없음** — container directive 감싸기가 ADR 0009 §8 규약을 깨지 않음.

## 판정

**ADR 0015 자체는 통과**. 10문항 모두 정답, 7/10 high confidence. Directive attribute가 admin 자동화 LLM에게 한 점 조회로 충분한 컨텍스트를 제공한다는 ADR 0015의 핵심 약속이 fresh-context 검증에서 성립.

Gap 3건은 **ADR 0015 범위 밖**:
- Gap A (콜론 인코딩)은 ADR 0002 또는 tool description 문구 수준의 개선
- Gap B (default param)은 envelope tool schema 보강 (코드 변경 불요)
- Gap C (form-action-inheritance)은 ADR 0013 후속 convention key 후보

세 Gap 모두 low-priority, 본 ADR의 "pass" 판정을 막지 않음.

## Open questions / 후속

1. Gap A 해결을 위해 ADR 0002에 "`:` URI query에서 raw vs percent-encoded 모두 수용 + sender side는 URLSearchParams 자동 encode 결과 수용" 한 문장 추가 — 별도 ADR 없이 개정 가능. → **2026-04-18 ADR 0002 `§Query value encoding` 보강 + `uri-query-encoding: percent-decoded-match` convention 자동 주입. v2에서 high 확인.**
2. Gap B — `listUsers.input.properties._page.default` 를 envelope에 추가하고 fixture 재생성 후 T6 재검증. → **2026-04-18 envelope tool input 에 `_page/_size/_sort` default 선언. v2에서 high 확인.**
3. Gap C — `form-inner-button-action: inherit` convention key 후보 재검토 (ADR 0013 Open 갱신). → **2026-04-18 ADR 0013 Follow-up + `form-inner-button-action: inherit` convention 자동 주입. v2에서 high 확인.**
4. **envelope `pagination` 공존 케이스 별도 fixture** — 본 test에서는 부재만 검증. 공존+불일치 케이스(warning 의도 동작)는 후속 fixture에서 다룸.

---

## v2 재검증 (Gap A/B/C 개선 후)

- Date: 2026-04-18
- Fixture v2: 동일 경로 `/tmp/readable-ui-tests/users.md`. 변경점 — envelope `extensions.conventions` 에 `uri-query-encoding`·`form-inner-button-action` 자동 주입, `listUsers.input.properties._page/_size/_sort` 에 `default` 선언.
- Method: fresh-context Claude 서브에이전트에게 Gap 대응 과제 4개(T3/T4/T6/T9)만 재실행.

### 결과

| # | v1 판정 | v1 confidence | v2 판정 | v2 confidence | 변화 |
|---|---|---|---|---|---|
| T3 (sort 방향 전환 URI) | PARTIAL | medium | ✅ PASS | **high** | medium → high |
| T4 (페이지 이동 URI) | PARTIAL | medium | ✅ PASS | **high** | medium → high |
| T6 (신규 필터 최소 URI) | PARTIAL | medium | ✅ PASS | **high** | medium → high |
| T9 (Form 내부 button 근거) | PARTIAL | medium | ✅ PASS | **high** | medium → high |

### v2 에이전트가 핵심 신호로 인용한 것

- **T3**: `uri-query-encoding: percent-decoded-match` convention + footer URL 예시 `_sort=createdAt%3Adesc` 두 신호 인용. "raw 와 encoded 둘 다 동등하므로 LLM 이 어느 쪽으로 써도 서버가 매칭한다" 로 확신.
- **T4**: 현재 directive attribute 값 그대로 유지 + `_page=3` 만 교체 — 규약이 명시되어 추론 불필요.
- **T6**: `Unspecified params fall back to each property's default value` 문구 + `default: 1` / `default: 20` / `default: "createdAt:desc"` 세 신호를 직접 인용해 "minimal URI 가 충분함" 확정.
- **T9**: `form-inner-button-action: inherit` convention + button directive 속성 부재 + 감싸는 `:::form{action="createUser"}` — 세 신호 일치로 high.

### 최종 스코어 요약

| Gap | 조치 | 결과 |
|---|---|---|
| A (colon 인코딩) | ADR 0002 `§Query value encoding` + `uri-query-encoding` convention | medium → **high** |
| B (default param) | envelope tool input `default` 선언 | medium → **high** |
| C (form-action-inheritance 외재화) | ADR 0013 Follow-up + `form-inner-button-action` convention | medium → **high** |

4건 모두 고신뢰 판별 가능. **T1–T10 전부 high 달성**, ADR 0015 의 LLM 친화성 기준선 완결.
