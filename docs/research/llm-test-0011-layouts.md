# LLM 친화성 검증 — ADR 0011 레이아웃 (sidebar/topbar)

- Date: 2026-04-17
- Subject: [ADR 0011](../adr/0011-sidebar-and-topbar-page-layouts.md) 이행 검증
- Fixtures: `/tmp/readable-ui-tests/users.md` (sidebar), `/tmp/readable-ui-tests/dashboard.md` (topbar)
- Method: fresh-context Claude 서브에이전트에게 두 Markdown 파일만 주고 15개 과제 수행. 코드·ADR·spec·외부 리소스 접근 차단.

## 결과 요약

| 카테고리 | Pass | Partial | Fail | 노트 |
|---|---|---|---|---|
| A. Navigation | 3 | 1 | 0 | A3만 "페이지별 nav 불일치" 지적 — 설계 의도 확인 필요 |
| B. Action extraction | 4 | 0 | 0 | URI 추출, enum·format·minLength 파싱 모두 정상 |
| C. Layout & purpose | 2 | 0 | 0 | 두 레이아웃의 성격을 envelope + 본문 신호만으로 정확히 분별 |
| D. Constraints | 2 | 0 | 0 | severity: danger + Alert caution 중복 신호가 효과적 |
| E. Edge cases (ADR 0009 회귀) | 1 | 1 | 1 | **새 gap 식별** |
| **합계** | **12** | **2** | **1** | 15개 중 High-confidence 정답 11개 |

전반적으로 "AI가 작은 컨텍스트로 페이지를 이해"라는 ADR 0005·0011 약속은 **대부분 성립**. 하지만 E2·E3에서 **spec에만 있고 Markdown에는 드러나지 않는 규약**이 있어 fresh agent가 추론에 의존하거나 실패하는 gap이 드러남.

## 과제별 판정

### A. Navigation

| # | 과제 | 기대 | 결과 | 판정 |
|---|---|---|---|---|
| A1 | Audit log URL | `/audit` | `/audit` (high) | ✅ PASS |
| A2 | dashboard의 active 항목 | Dashboard, `· current` 근거 | 정답 + `· current` 근거 명시 (high) | ✅ PASS |
| A3 | 두 페이지가 같은 workspace인가 | Yes (role/href 공유) | 정답이지만 nav 항목 집합 차이를 "불일치 가능성"으로 지적 (medium) | ⚠️ PARTIAL |
| A4 | 전체 유니크 nav 개수 | 5 | 5 (high) | ✅ PASS |

**A3의 관찰**: 에이전트가 users.md는 Dashboard/Users/Roles/Audit log 4개, dashboard.md는 Dashboard/Users/Reports 3개로 **각 페이지마다 nav 세트가 다른 것이 의도인지 드리프트인지 판별 불가**라고 리포트. 실제로 이 예시는 "페이지 관련 nav만 노출"을 의도했지만, 동일 admin 앱의 공통 nav가 페이지마다 부분집합으로 달라지면 **AI는 "어떤 섹션이 있는지" 전역 파악이 불가능**.

### B. Action extraction

| # | 과제 | 기대 | 결과 | 판정 |
|---|---|---|---|---|
| B1 | u_bob_01 삭제 URI | `mcp://tool/deleteUser?id=u_bob_01` | 정답 (high) | ✅ PASS |
| B2 | createUser 필수 필드 | name(string, minLen 1), email(string, format email), role(string, enum admin\|user) | 전부 정확 (high) | ✅ PASS |
| B3 | evt_a03 open URI | `mcp://tool/viewEvent?id=evt_a03` | 정답 (high) | ✅ PASS |
| B4 | refreshDashboard 파라미터 여부 | 없음 (input 미선언) | "input 키 부재가 유일 신호"라고 정확히 추론 (high) | ✅ PASS |

**B4 서술**: 에이전트가 "absence of schema is the sole signal"이라 기록. 즉 "input 필드를 아예 생략하면 no-params"라는 규약을 **Markdown 자체가 명시하지는 않으나 추론 가능**. 현재로선 OK.

### C. Layout & purpose

| # | 과제 | 기대 | 결과 | 판정 |
|---|---|---|---|---|
| C1 | CRUD vs summary 분별 | users=CRUD, dashboard=summary | 양쪽 purpose + tools + body 블록 조합으로 정확히 분별 (high) | ✅ PASS |
| C2 | 페이지 role | admin (둘 다) | 정답 (high) | ✅ PASS |

**C1 관찰**: 에이전트가 layout id 자체보다 `purpose`, body의 Table/Form 구성, tools 종류(mutation vs read) 조합을 증거로 들었음. 즉 **layout id는 부차 신호**이고 envelope purpose + tools가 주요 컨텍스트원.

### D. Constraints

| # | 과제 | 기대 | 결과 | 판정 |
|---|---|---|---|---|
| D1 | irreversible 작업 존재? | Yes, deleteUser | envelope constraint(severity danger) + Alert(caution) + tool description 세 신호를 모두 인용 (high) | ✅ PASS |
| D2 | 캐시 freshness + 갱신법 | 60s, refreshDashboard | `counts-cached` constraint + tool URI 모두 적시 (high) | ✅ PASS |

### E. Edge cases (ADR 0009 회귀)

| # | 과제 | 기대 | 결과 | 판정 |
|---|---|---|---|---|
| E1 | Bob의 plain-text email | `bob@example.com` | `\@` 를 Markdown escape로 올바르게 해석 (high) | ✅ PASS |
| E2 | dashboard의 Refresh 버튼이 directive + link 중복 — 한 번? 두 번? | 한 번 (ADR 0009 §9 dual representation) | "one logical action"으로 정답이지만 confidence medium, "markdown이 명시하지 않음"이라 기록 | ⚠️ PARTIAL |
| E3 | Create 폼 내부 Button 표현 + 실행 횟수 | directive만 (fallback off). 한 번 | "ambiguous … text does not explicitly resolve duplication" — 판단 실패 (low) | ❌ FAIL |

## 식별된 Gap

### Gap 1 (E2) — directive + link-as-action의 dual 의미가 Markdown에 encode 안 됨

**현상**: fresh agent가 `::button[Refresh]{action=X}` 뒤에 `[Refresh](mcp://tool/X)` 가 연이어 있는 것을 보고 "redundant rendering일 것"으로 추론은 성공하나 **확신하지 못함**. ADR 0009 §9가 "이중 표현"을 규범으로 못 박았지만 그 규범은 spec 문서에만 있고 Markdown 본문에는 없음.

**영향**: AI가 spec 없이 Markdown만 받는 경우(우리 테스트 조건) 잘못된 해석 가능성 — 예: 두 번 호출, 혹은 두 링크가 서로 다른 엔드포인트일 것이라 오해.

**후보 개선**:
1. envelope 또는 fenced metadata에 `conventions: { "duplicate-button-link": "dual-render" }` 같은 힌트 삽입
2. fallback link에 `title` 속성 부착: `[Refresh](mcp://tool/X "fallback")`
3. Button directive에 `id` 속성을 부착하고 link의 URI에 같은 id를 쿼리로 포함 — 동일 호출임이 URI 층에서 드러남
4. 현재 상태 유지(spec 의존) + AI 시스템 프롬프트에 규약 주입 (readable-ui 생태계 표준 "프리엠블" 마련)

각 방안의 trade-off는 후속 ADR에서 정리 필요.

### Gap 2 (E3) — Form 내부 Button의 action 속성 이중 선언

**현상**: `:::form{action="createUser"}` 안에 `::button[Create user]{action="createUser"}` 가 동일한 action을 반복 선언. fresh agent는 "form이 선언한 action을 버튼이 override하는지, 같은 action을 두 번 호출하는지 판별 불가"로 low-confidence 답변.

**정확한 동작** (spec 기준): Form이 submit trigger고 Button의 `action=`은 같은 값으로 **중복 선언**이나 단일 호출. 하지만 Markdown만 보면 그 규범이 보이지 않음.

**후보 개선**:
1. Form 내부 Button은 `action` 속성을 **생략**하도록 serializer 변경 (Form의 action을 상속) — 가장 근본적 해결
2. Form 내부 Button을 `type=submit` 등 semantic 표식으로 바꿔 다른 의미임을 명시
3. Form directive가 내부 Button을 삼켜서 `::form{action=X label="Create user"}` 처럼 submit label만 attr로 남기기

1번이 구현·Markdown 양쪽에서 가장 단순. ADR 0009 §5가 "Form 내부는 fallback off"만 결정했으므로, Button의 `action=` 속성도 Form 내부에서는 `""`로 생략하는 것이 자연스러운 확장.

### Gap 3 (A3) — 페이지별 nav 세트 불일치

**현상**: users.md에는 Roles/Audit log가, dashboard.md에는 Reports가 각각 등장. 같은 앱 안에서 페이지마다 다른 nav라는 AI에게는 일관성 부족 신호.

**두 가지 해석**:
1. **의도된 page-contextual nav**: "현재 페이지에 연관된 admin 섹션만 노출"이 의도. 이 경우 envelope에 `nav_scope: contextual` 같은 힌트 필요.
2. **드리프트**: 예시 제작자가 실수로 불일치를 만듦. 이 경우 "전역 nav 일관성"을 ADR/ lint에서 강제.

실제 admin 앱에서는 전역 nav는 대체로 일관. page-contextual 서브네비(breadcrumb+section tabs)는 보통 별도 컴포넌트. 현재 설계가 "하나의 nav prop에 앱 전역 네비와 페이지 로컬 네비가 섞일 수 있다"는 모호함을 허용 — ADR 0011 개정 후보.

## Positive signals (바로 잘 작동한 것)

1. **envelope `role: admin`** — 페이지·tool 양쪽 일관 선언이 에이전트의 권한 판단을 단박에 해결 (C2, D1)
2. **Alert + envelope constraint 이중 선언** — D1에서 세 가지 독립 신호(constraint severity=danger, Alert blockquote, tool description)가 일치해 에이전트 confidence를 크게 올림. 중복이지만 AI-친화적
3. **Action URI에 param을 query로** — B1/B3에서 셀 이스케이프(`u\_bob\_01`)에 혼동 없이 URI query(`?id=u_bob_01`)를 집어냄. ADR 0009 §8 규범이 의도대로 작동
4. **`nav` flush + `· current` suffix** — A2에서 active 항목 인식이 high confidence로 성공. ADR 0011 §3 결정이 유효함을 확인
5. **`layout: sidebar` vs `topbar` enum** — C1에서 레이아웃 id 자체는 부차 신호였지만, enum 값이 purpose/body와 함께 있어 AI가 "같은 카테고리"임을 인지하는 컨텍스트 고정에 기여
6. **input 스키마 부재 → no-params** — B4에서 Markdown에 명시 안 된 규약을 에이전트가 성공적으로 추론. envelope YAML이 self-explanatory하게 설계됐다는 뒷받침

## 판정

**ADR 0011 (sidebar/topbar layouts) 자체는 통과**. `nav` flush 규약과 active suffix는 의도대로 작동하며 AI가 올바르게 해석.

**Gap 2건(E2·E3)은 ADR 0009 범위**. layout 추가 때문에 생긴 문제가 아니라, directive-fallback dual representation의 Markdown 내 표현력 부족. 후속 ADR 대상:

- **ADR 0012 후보**: "Directive + link fallback의 in-markdown 의미 명시" — Gap 1 해결
- **ADR 0013 후보**: "Form 내부 Button의 action 속성 생략" — Gap 2 해결 (0009 §5 확장)

**Gap 3(nav 세트 불일치)은 ADR 0011 범위**. 현재 v1에서는 명시 규범 부재로 "사용자가 알아서" 일관 nav를 주입할 것을 전제. ADR 0011 §5 또는 §Open/Follow-up에 "전역 nav 일관성은 사용자 책임. 향후 envelope에 `navScope: "global" | "section"` 도입 검토" 추가 권장.

## 테스트 재현

```bash
# fixture 재생성
cd apps/example
node <<'EOF' > /tmp/render.mjs
# (rui-render.mjs 본문을 삽입 — 본 리포트 작성 시 사용)
EOF

# fresh-context subagent 실행 — Claude Code 환경에서:
# Agent(subagent_type="general-purpose", prompt=<본 리포트 "Method" 섹션의 지시문>)
```

## Open questions

1. E2 Gap 해결을 위한 preamble/conventions 힌트는 envelope에 넣을지, 별도 well-known Markdown 섹션에 넣을지 (ADR 0012 주제) — **해결: ADR 0012 envelope.extensions.conventions + link title 하이브리드로 채택**
2. E3 Gap에 대해 Form 내부 Button의 attribute 생략이 기존 AI들의 파싱 회복력(robustness)을 깨지 않는지 실험 필요 — **해결: ADR 0013 attribute 생략 채택, v2 재검증에서 high confidence**
3. A3의 nav 일관성 강제는 런타임 warning으로 충분한지 vs envelope 명시 field로 올릴지 — **해결: ADR 0014 envelope `nav` 필드로 상승, Page prop은 하위호환 유지**

---

## v2 재검증 (ADR 0012·0013·0014 이행 후)

- Date: 2026-04-17
- Fixtures v2: 동일 경로 `/tmp/readable-ui-tests/{users,dashboard}.md` (ADR 0012·0013·0014 반영본)
- Method: fresh-context Claude 서브에이전트에게 Gap 3건(E2/E3/A3)만 타겟한 focused 과제 3개 재실행.

### 결과

| # | v1 판정 | v1 confidence | v2 판정 | v2 confidence | 변화 |
|---|---|---|---|---|---|
| E2 (directive+link dual) | PARTIAL | medium | ✅ PASS | **high** | medium → high |
| E3 (Form 내부 Button action) | FAIL | low | ✅ PASS | **high** | low → high |
| A3 (페이지별 nav 일관성) | PARTIAL | medium | ✅ PASS | **high** | medium → high |

### v2 에이전트가 핵심 신호로 인용한 것

- **E2**: envelope `extensions.conventions.duplicate-button-link: dual-render` + link title `"fallback"` 두 신호를 모두 인용. "without it, a naive reader could plausibly assume two separate fire-able controls" 라고 load-bearing 판단을 근거로 들어 ADR 0012의 A+B 하이브리드가 정확히 의도대로 작동함을 확인.
- **E3**: "The `::button` inside the form carries no `action=`, while the dashboard's standalone `::button` does. This asymmetry cleanly distinguishes 'form submit control' from 'standalone action trigger'" — ADR 0013의 HTML form/submit 멘탈모델 정합이 self-explanatory하게 파악됨.
- **A3**: "both pages list the identical five nav items in the same order ... only the `active: true` marker shifts" — ADR 0014의 envelope nav 단일 소스 + active 마커 이동이 "global sitemap" 시그널로 즉시 해석.

### 부수 관찰

에이전트는 Card/Form 중첩 directive가 4-colon vs 3-colon 펜싱으로 구분되는 것도 "subtle but deliberate directive-nesting convention" 으로 정확히 파악. 카탈로그 규약이 Markdown 층에서 충분히 자기설명적임을 추가 확인.

### 최종 스코어 요약

| Gap | ADR | 조치 | 결과 |
|---|---|---|---|
| E2 | 0012 | envelope conventions + link title | medium → **high** |
| E3 | 0013 | Form-내부 Button action 생략 | low → **high** |
| A3 | 0014 | envelope nav 메타 + scope enum | medium → **high** |

3건 모두 고신뢰 판별 가능. ADR 0011 (sidebar/topbar) 레이아웃 결정은 ADR 0012/0013/0014 후속 ADR 3건과 결합하여 admin 1차의 LLM 친화성 기준선 수립 완료.
