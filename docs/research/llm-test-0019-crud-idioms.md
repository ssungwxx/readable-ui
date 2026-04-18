# LLM 친화성 검증 — ADR 0019 CRUD 액션 관용구 (Delete 확인 · EmptyState · 행 상태)

- Date: 2026-04-18
- Subject: [ADR 0019](../adr/0019-crud-action-idioms.md) 이행 검증 — 위험 동작 2단계 전이, EmptyState의 Alert 단일화, 행 상태 CodeSpan 통일이 fresh-context LLM에 자기설명적으로 읽히는가
- Fixtures (가상 직렬화): `apps/example/app/users/page-content.tsx`, `apps/example/app/audit/page-content.tsx`, `apps/example/app/reports/page-content.tsx`. 실제 dev server 미기동 — `renderPage`(`packages/core/src/index.ts`)와 `Table.toMarkdown`(`packages/react/src/components.tsx:1183~1313`) 직렬화 코드를 정적으로 추적해 출력 Markdown을 재구성.
- Method: ADR 0019가 정의한 3개 관용구를 9개 시나리오로 분해, 각 시나리오에 대해 (a) 의도된 해석 (b) 실제(또는 권고) Markdown 샘플 (c) fresh-context LLM 시뮬레이션 (d) 갭 (e) 권고를 기록. 사전 컨텍스트(코드/ADR/spec)를 모르는 LLM이 본문만으로 ADR이 의도한 결론에 도달하는지 평가.

## 결과 요약

| 카테고리 | Pass (high) | Partial (medium) | Fail (low) | 노트 |
|---|---|---|---|---|
| L. Delete 확인 (S1·S2·S3) | 1 | 1 | 1 | example 앱이 1단계 직접 호출 — ADR 0019 §1 위반 회귀 발견 |
| M. EmptyState (S4·S5·S6) | 1 | 1 | 1 | 권고 자체는 의도대로 작동, 다만 자동 lint·empty-Table-only 시 신호 부족 |
| N. 행 상태 CodeSpan (S7·S8·S9) | 0 | 2 | 1 | Table 엔진이 자동 wrap을 안 하고 example 저자도 manual wrap을 안 해 spec 미이행 |
| **합계** | **2** | **4** | **3** | 9개 중 high 2건 — ADR 0019 의도 대비 **편차 큼** |

ADR 0019의 결정은 "신규 컴포넌트/예약어 0개로 닫음"을 약속하나, 그 trade-off로 **런타임 강제·기본 placeholder가 모두 비어있음**. 그 결과 ADR-spec-구현 3중 동기화에서 spec과 example 사이 갭이 다수 식별. 본 검증은 ADR 0019의 결정 자체보다 **이행(rollout)** 이 미완임을 드러냄.

## 시나리오별 판정

### L. Delete 확인 (ADR 0019 §1)

ADR 0019 §1: destructive tool은 `<verb><Resource>Preview` → `<verb><Resource>` 2단계 전이. 1단계 라벨은 `<Verb>…` suffix + `variant=danger`.

#### S1. 1단계 진입 라벨 + variant 인식

**의도된 해석**: LLM이 `::button[Delete…]{variant=danger action=deleteUserPreview}` 를 보고 "지금 누르면 미리보기 단계로 진입, 실제 삭제 아님"으로 해석. `…` suffix와 `variant=danger` 두 신호 일치.

**가상 Markdown 샘플** (ADR 0019 §1을 example/users에 적용했다면):

```markdown
::button[Delete…]{variant=danger action=deleteUserPreview}

[Delete…](mcp://tool/deleteUserPreview?id=u_bob_01 "fallback")
```

**fresh LLM 시뮬레이션**: `…`(horizontal ellipsis)과 `variant=danger` + action 이름 `deleteUserPreview`의 `Preview` suffix 세 신호가 모두 정합. "곧바로 deleteUser 가 실행되지 않고 먼저 미리보기 단계가 뜬다" 결론에 high confidence 도달 가능. envelope `extensions.conventions["destructive-action"] = "two-step-preview"` 가 같이 있다면 더욱 강해짐.

**갭**: 갭 자체는 작음. **다만 example 앱이 이 1단계 자체를 만들지 않는다** — 별도 시나리오 S2에서 다룸.

**권고**: **ADR 0012 패턴을 따라 `destructive-action: "two-step-preview"` convention key를 `DEFAULT_CONVENTIONS`(`packages/core/src/index.ts:207`)에 추가** 권장. 현재는 envelope 저자가 수동으로 넣어야 하나, 0012/0013/0014/0017 선례대로 자동 주입이 일관적. 의도대로 작동(대부분의 신호가 high) — 갭 없음에 가까움.

---

#### S2. example 앱의 현행 deleteUser는 ADR 0019 §1 위반 (회귀)

**의도된 해석**: example/users의 Delete row action이 ADR 0019 §1을 따라 `deleteUserPreview` 를 가리키고, 클릭 시 confirm 페이지가 떠야 함.

**실제 Markdown 샘플** (`packages/react/src/components.tsx:1218~1227` Table actions 직렬화 → `apps/example/app/users/page-content.tsx:162~167` 의 row action 정의):

```markdown
| u_bob_01 | bob\@example.com | user | active | 2026-04-10 | [Edit](mcp://tool/updateUser?id=u_bob_01) · [Delete](mcp://tool/deleteUser?id=u_bob_01) |
```

**fresh LLM 시뮬레이션**: 셀의 두 번째 링크가 직접 `mcp://tool/deleteUser?id=u_bob_01` 를 가리킨다. envelope `tools[]` 에 `deleteUser`만 있고 `deleteUserPreview` 가 없으며, link 라벨도 그냥 `Delete` (suffix `…` 없음). agent의 합리적 결론: **"클릭 즉시 영구 삭제됨"**. 이는 envelope `constraints[delete-irreversible]` 와 페이지 상단 `Alert{kind=caution}` "Deleting a user is permanent and cannot be undone" 와도 정합 — 즉, agent는 신중히 판단한다 해도 **immediate-execute 모델**로 해석한다.

ADR 0019 §1의 "2단계 전이"가 본 fixture에 **존재하지 않음**. ADR과 example 앱이 어긋나 있음.

**갭**: **회귀 ❌ FAIL**. ADR 0019 §1이 정한 정규형 자체를 example 앱이 채택하지 않음. spec/component-catalog.md §Button 274~276행에는 규약이 명문화되어 있으나, example 앱의 코드/렌더링 어디에도 preview tool 도입이 없음.

**권고**:
1. **즉시(short-term)**: `apps/example/app/users/page-content.tsx`에 `deleteUserPreview` envelope tool을 선언하고, Table row action의 `tool: "deleteUser"` → `tool: "deleteUserPreview"` 로 변경. 라벨도 `"Delete…"` 로. 이로써 ADR 0019 §1 1단계가 fixture에 등장.
2. **2단계 페이지**: `/users/delete?id=u_bob_01` route를 추가하거나, MCP tool response를 page-envelope으로 재구현 (`apps/example/app/users/[id]/delete/page-content.tsx`). 구성: 상세 Card + `Alert{kind=caution}` + Form(`Confirm delete` Button + `Cancel` Button).
3. **lint(중기)**: ADR 0019 §Open "Preview tool 네이밍 강제 — v2 lint" 항목 우선순위 상향. envelope `tools[]` 중 `name` 이 `delete`/`archive` 등으로 시작하면서 `*Preview` 페어가 없는 경우 build-time warning. ADR 0009 같은 카탈로그 닫힘 lint와 동일 라인.
4. **최소 보강(envelope 차원)**: `destructive-action: "two-step-preview"` convention key 자동 주입 (S1 권고와 동일). example 미수정이라도 LLM이 "이 시스템은 2단계가 정규형이지만 본 페이지는 단계 생략된 변종" 으로 인식 가능 — 임시 완화책.

---

#### S3. 2단계 confirm 페이지 (Card + Alert + Form)

**의도된 해석**: preview tool 응답이 단건 상세 Card(어떤 리소스가 영향받는지) + `Alert{kind=caution}`(되돌릴 수 없음) + Form(Confirm/Cancel 두 버튼)으로 구성. LLM이 "여기서 한 번 더 Confirm을 호출해야 실제 삭제" 로 해석.

**가상 Markdown 샘플** (ADR 0019 §1.2 정규형):

```markdown
:::card{title=Delete user}
- **Email**: bob\@example.com
- **Role**: user
- **Status**: `active`
- **Created**: 2026-04-10
:::

> [!CAUTION]
> Deleting this user is permanent and cannot be undone.
> Their audit history will remain attached to the anonymous id `u_bob_01`.

:::form{action=deleteUser}
::input{name=id type=hidden default=u_bob_01}

::button[Confirm delete]{variant=danger}

::button[Cancel]{variant=secondary action=listUsers}
:::
```

**fresh LLM 시뮬레이션**: 강력한 정합 — Card는 "어떤 레코드가 영향받는가" 를 명시(ADR 0018 단건 상세 정규형), `[!CAUTION]` 은 GFM alert 의미가 명료, `:::form{action=deleteUser}` + Form 내부 Button(action 생략 — ADR 0013) 은 "Confirm 클릭 = deleteUser 호출"을 한 점에서 표현. Cancel 의 `action=listUsers`(다른 action) 는 ADR 0013 "다른 action은 명시 유지" 규약과 정합.

**다만 두 가지 결정 미해소**:
1. **`Input.type="hidden"` 허용 여부** — ADR 0019 §Open에 "후속 소형 ADR" 로 미결. 현재 `packages/react/src/components.tsx:509` `type` 유니온은 `"text" | "email" | "password" | "number" | "url" | "date" | "datetime-local" | "tel" | "search"` 만 허용 — `hidden` 부재. preview→confirm Form에서 id를 어떻게 보낼지 **현 코드로는 불가능**.
2. **2단계 응답 페이지 발행 경로** — preview tool 의 응답을 page-envelope으로 직렬화하는 spec 가이드 부재. `mcp://tool/deleteUserPreview?id=u_bob_01` 호출 시 host(MCP client)가 어떻게 페이지로 렌더할지 컨벤션이 없음.

**갭**: ⚠️ **PARTIAL**. 정규형 자체는 self-explanatory하나 **`Input.type="hidden"` 부재가 ADR 0019의 정규형을 코드 레벨에서 작성 불가능하게 만든다**. ADR 0019 §Open에 명시된 미결 항목이 곧장 ADR 0019의 핵심 결정의 실현 가능성을 막는 dependency 역설. 또한 preview tool 응답의 페이지 직렬화 컨벤션이 spec에 없음.

**권고**:
1. **소형 ADR 0020 후보**: `Input.type="hidden"` 허용 + `<input type=hidden>` HTML 매핑 + Markdown 직렬화 형태(`::input{name=id type=hidden default=u_bob_01}`). ADR 0019의 closure 가 이 후속 ADR에 의존함을 ADR 0019 §Open에서 강조.
2. 또는 **대안**: hidden input 대신 Form이 `action=deleteUser` 의 query string으로 id를 받도록 — `:::form{action=deleteUser?id=u_bob_01}`. 그러나 이는 Form action 의미를 오버로드하며 ADR 0009 §8 "URI query는 action URI 자체에만 등장" 규범과 충돌. 채택 비권장.
3. **spec/component-catalog.md §단건 상세 관용구 옆** 에 "preview tool 응답의 confirm 페이지" 정규형 (Card + Alert + Form) 소절 추가. ADR 0019 §1.2 본문을 spec으로 승격.

---

### M. EmptyState (ADR 0019 §2)

ADR 0019 §2: 전용 directive 미도입. `Alert` 단일화 — 리소스 부재(404)는 `kind=warning`, Table `rows: []` 빈 목록은 `kind=note` 형제 배치. 자동 placeholder 삽입 없음.

#### S4. 리소스 부재 (404) — 단건 상세 페이지

**의도된 해석**: 단건 GET 결과가 없을 때 Card 미출력, `Alert{kind=warning}` 단독 + 복구 링크 1개. LLM이 "이 ID는 존재하지 않음" + "어디로 돌아가면 되는가" 동시 파악.

**가상 Markdown 샘플** (`/users/u_ghost_99` 가상 라우트):

```markdown
> [!WARNING]
> User `u_ghost_99` not found.
> The account may have been deleted or you may not have permission to view it.
> [Back to users](/users)
```

**fresh LLM 시뮬레이션**: GFM `[!WARNING]` 은 표준 의미(주의가 필요한 상태). 본문에 ID 인용 + 가능한 원인 두 가지 + 단일 복구 링크. envelope `purpose: "Show one user account"` 와 결합하면 "조회는 시도됐으나 대상 부재" 가 명확. high confidence.

**다만 한 가지 미세한 모호**: WARNING이 "리소스 부재" 외에도 "권한 부족", "일시적 장애", "사용자 입력 오류" 등으로도 쓰일 수 있어 LLM이 **kind=warning 의 의미축이 너무 넓어 어떤 종류의 부재인지 추가 단서가 본문에 의존**한다고 기록할 가능성. ADR 0019 §2 표 ("리소스 전체 부재 → Alert{kind=warning}") 가 spec/component-catalog.md §Alert 114~117 에 외재화되어 있으나 envelope에는 없음.

**갭**: 갭 거의 없음 (✅ PASS). 단 LLM이 "404" 의미를 envelope 어딘가의 명시 신호로 잡고 싶어 할 가능성. 예컨대 envelope에 `state: "not-found"` 같은 구조화 신호가 있다면 high confidence 가 더 견고.

**권고**: 우선순위 낮음. 향후 v2에서 envelope `state: "ok" | "not-found" | "forbidden" | "loading" | "error"` 추가 검토 (Loading/Error 후속 ADR과 함께). 현 ADR 0019 §2 결정은 통과.

---

#### S5. Table `rows: []` + 형제 Alert

**의도된 해석**: 헤더만 있는 빈 Table + 그 다음 형제로 `Alert{kind=note}` "No rows match the current filter". `total=0` 도 attribute에 명시. LLM이 "현재 필터로는 결과 없음, 필터를 풀거나 다른 조건을 시도" 로 해석.

**가상 Markdown 샘플** (`apps/example/app/users` 에 가상 필터 `_filter_status=banned` 적용):

```markdown
:::table{tool=listUsers page=1 of=1 size=20 total=0 sort=createdAt:desc filter-status=banned caption="Active users"}
| id | Email | Role | Status | Created | Actions |
| -- | ----- | ---- | ------ | ------- | ------- |
:::

> [!NOTE]
> No users match `status=banned`. Try removing the filter or using `status=active`.
> [Reset filter](mcp://tool/listUsers)
```

**fresh LLM 시뮬레이션**: directive attribute `total=0` 이 **두 신호 일치 패턴** (테이블 본문 0행 + total=0) 으로 ADR 0015/0019의 self-explanatory 약속을 충족. `[!NOTE]` 는 정보성, 본문 첫 문장이 원인을 명시, 마지막에 복구 링크. high confidence.

**다만 다음 미세 갭**:
1. `caption="Active users"` 가 비어있는데도 그대로 출력됨 → 의미 충돌 ("Active users" 인데 0건). 저자가 caption을 동적으로 비워야 하는지 컨벤션 부재.
2. **자동 placeholder 미삽입**이 ADR 0019 §2의 명시 결정이지만, 만약 저자가 형제 Alert를 **잊으면** 헤더만 있는 빈 표가 그대로 출력 — agent에게는 "비어있음 - 그러나 의도된 것인지 데이터 로딩 실패인지 모름" 모호. lint 또는 dev-time warning이 없으면 누수 가능.

**갭**: ⚠️ **PARTIAL**. 정규형 자체는 의도대로 작동하나 **저자 책임이 큰 정책** — `total=0` 명시도 "권장", 형제 Alert도 "저자 배치"라 하나라도 누락 시 agent confidence가 medium 이하로 내려간다.

**권고**:
1. **lint warning**: `:::table{...}` 의 `total=0` 또는 inner table body 0행 시, 다음 형제가 `Alert{kind=note}` 인지 검사. 누락 시 dev-time warning.
2. **caption 가이드**: ADR 0019 §2 또는 spec/component-catalog.md §Table 195행 옆에 "`rows: []` 일 때 caption은 정적 의미를 유지(예: 'Active users')하되 Alert가 현재 결과의 부재 사유를 설명한다" 한 문장 추가. 저자 혼란 방지.
3. **두 신호 보강**: directive attribute에 `state="empty"` 같은 명시 신호 추가 후보. `mode="summary"` 와 동일 슬롯에 들어갈 수 있는 단순 enum. 그러나 ADR 0019가 "신규 예약어 0개" 를 약속했으므로 v2 후속.

---

#### S6. 단일 페이지에 빈 Table 단독 (Alert 없음)

**의도된 해석**: 저자가 ADR 0019 §2의 형제 Alert 권고를 **이행하지 않은 케이스**. ADR은 "엔진 자동 placeholder 삽입 없음" 을 명시했으므로 헤더만 있는 빈 표가 그대로 나간다. agent 해석은 미정.

**실제 가능 Markdown** (`reports` 페이지에서 `weekly`/`topPlans` 데이터가 비어있는 시나리오):

```markdown
:::table{caption="Weekly KPI snapshot"}
| id | Week | Signups | Active | Revenue | Actions |
| -- | ---- | ------- | ------ | ------- | ------- |
:::
```

**fresh LLM 시뮬레이션**: `:::table` directive에 `tool=`/`total=`/`page=` 이 **모두 부재**. agent의 합리적 추측들:
- (a) 데이터 로딩 실패 — 시스템이 fetch 했으나 결과 미리턴
- (b) 빈 결과 — 정상 응답이지만 0건
- (c) 권한 부족 — 데이터는 있으나 본 user 가 보지 못함
- (d) 데이터 영역이 아직 미구현 (placeholder)

**셋 중 어느 것도 본문이 결정해 주지 못한다**. ADR 0019 §2 의 "엔진 자동 placeholder 삽입 없음" 결정이 **저자 누락 시의 fallback 부재** 와 결합되어 LLM에게 ambiguous 상태로 노출.

**갭**: ❌ **FAIL** (저자 누락 시나리오). ADR 0019 §2 의 "Negative" 항목 ("런타임 강제 없음, lint 보강 필요") 이 그대로 현실화.

**권고**:
1. **lint 강제 (권장)**: S5 권고 1번과 동일. dev-time warning을 ship-time error 로 격상하는 옵션도 검토.
2. **engine fallback (보수적 대안)**: ADR 0019 §2 결정을 약화하지 않으면서, `:::table` directive 가 inner table body 0 행이고 동일 컨테이너에 형제 Alert이 없을 때 **자동 1줄 주석 노드 삽입** (`<!-- empty: no rows; author may add Alert -->`). 직렬화 누락 신호로 작동. 그러나 이는 ADR 0019의 "자동 placeholder 미삽입" 결정과 약한 충돌 — 별도 ADR 후속 검토 필요.
3. **catalog 명시 강화**: spec/component-catalog.md §Table 195 "`rows: []` 처리" 에 "**MUST 형제 Alert 동반**" 으로 강도 격상 (현재는 "권장"). MUST 격상은 v1 깨지는 변경 없으므로 비용 낮음.

---

### N. 행 상태 CodeSpan (ADR 0019 §3)

ADR 0019 §3: Table 셀 내부 상태 값은 `CodeSpan` 표기. 5단계 권고 팔레트(비강제): `active`, `pending`, `archived`, `disabled`, `error`. v1 시각 강제 없음.

#### S7. example/users 의 status 셀이 plain text로 직렬화되는 회귀

**의도된 해석**: `status: "active"` 셀이 Markdown에서 `` `active` `` (CodeSpan) 으로 출력. agent가 backtick 표기로부터 "이는 enum 값" 임을 1차 신호로 받고, envelope `tools[].input.properties._filter_status.enum: ["active", "inactive"]` 와 교차해 도메인 의미 확정.

**실제 Markdown 샘플** (`packages/react/src/components.tsx:1244` `value: String(r[c.key] ?? "")` — 셀은 무조건 plain text):

```markdown
| u_bob_01 | bob\@example.com | user | active | 2026-04-10 | [Edit](mcp://tool/updateUser?id=u_bob_01) · [Delete](mcp://tool/deleteUser?id=u_bob_01) |
```

`status` 컬럼 값 `active` 가 backtick 없이 plain text로 출력. ADR 0019 §3 ("Table 셀 내부 상태 값은 CodeSpan으로 표기한다") 와 **명백히 어긋남**.

**fresh LLM 시뮬레이션**: agent는 `active` 라는 plain word를 보고 다음 후보를 모두 두게 됨:
- (a) enum 값 (status)
- (b) 동사 형태 ("이 사용자가 active 함")
- (c) 형용사 단순 텍스트

envelope `tools[].input.properties._filter_status.enum: ["active", "inactive"]` 가 외부 신호로 도와주지만, **셀 자체에 backtick 이 없으므로 "이 위치의 값은 enum/code-like 식별자다" 라는 신호가 셀 층에 부재**. agent confidence: low → medium.

**갭**: ❌ **FAIL** (회귀). ADR 0019 §3은 spec/component-catalog.md §Table 197행에 명문화되었으나, **engine 도 example 도 이행 안 함**. ADR 0019 §Consequences "Neutral: CodeSpan 행 상태 직렬화 이미 동작" 표현은 부정확 — `Table` row의 cell 직렬화 경로(`packages/react/src/components.tsx:1240~1245`)는 String(value) 만 호출하며, CodeSpan wrap 은 없음. 저자가 row 데이터에 ReactNode를 넣어 `<CodeSpan>active</CodeSpan>` 을 줘야 하는데 `TableProps<R>.rows` 의 타입은 `R` 의 plain field 라서 ReactNode를 받지 않음.

**권고** (3가지 후보, 비교):
1. **engine 자동 wrap (권장)**: Table cell 직렬화 시 envelope `tools[].input.properties._filter_<col>.enum` 또는 `tools[列_tool].output.<col>.enum` 을 참조해, 해당 컬럼 값이 enum 멤버이면 CodeSpan 으로 wrap. 자동, 저자 부담 0. **단점**: enum 부재 시 작동 안 함, 도메인 특수 상태가 5단계 팔레트 외이면 미적용.
2. **TableColumn 옵션**: `TableColumn<R>` 에 `kind?: "status" | "id" | "text"` 추가. `kind="status"` 면 CodeSpan wrap. 명시적, 단순. **단점**: 신규 prop, ADR 0019 의 "신규 예약어 0개" 약속과 약하게 충돌(컴포넌트 prop이지만).
3. **셀 render override (v2)**: `TableColumn.render?: (value, row) => ReactNode` 를 도입해 저자가 직접 `<CodeSpan>` 출력. 가장 일반적이지만 ADR 0019 §3 "v2에서 render override로 배지 승격 예약" 과 동일 라인 — 이미 ADR 0019 §3 자체가 v2 미루기를 명시. 즉, **v1 에서는 자동 wrap (방안 1) 이 가장 현실적**.

**최우선 권고**: 방안 1 채택 + envelope tools input.enum 또는 output.enum 을 단일 신호로 사용. 아울러 TableProps에 `statusColumn?: keyof R` 같은 단순 hint도 병행 가능. 본 갭은 ADR 0019의 핵심 결정 §3 자체가 spec→코드로 안 옮겨진 케이스이므로 **즉시 보정 우선순위 높음**.

---

#### S8. audit 로그의 `action` 컬럼이 CodeSpan 권고 후보

**의도된 해석**: audit 로그의 `action` 컬럼 (`updateUser`, `deleteUser`, `rotateKey`, `exportReport`, `createUser`) 는 envelope `tools[].name` 식별자 그 자체. ADR 0019 §3 "도메인 특수 상태도 CodeSpan이면 허용" 과 정합. agent가 backtick 신호로 "이 셀 값은 시스템 식별자, 자유 텍스트 아님" 으로 즉시 분리 가능.

**실제 Markdown 샘플** (`apps/example/app/audit/page-content.tsx:24~65` events 데이터):

```markdown
| evt_9f2a | 2026-04-18 05:42 | alice\@example.com | updateUser | u_bob_01 | 10.0.14.22 | [Open](mcp://tool/viewAuditEvent?id=evt_9f2a) |
| evt_9e71 | 2026-04-18 05:18 | alice\@example.com | deleteUser | u_legacy_07 | 10.0.14.22 | [Open](mcp://tool/viewAuditEvent?id=evt_9e71) |
```

**fresh LLM 시뮬레이션**: `updateUser`/`deleteUser` 가 plain text — agent 는 "action 이름이며 envelope tools 와 매칭 가능" 을 envelope을 보고 추론. 정답 도달은 가능하나 셀 표면에 신호 없음. 만약 `` `updateUser` `` `` `deleteUser` `` 였다면 envelope을 안 보더라도 "코드성 식별자" 즉시 인지.

**갭**: ⚠️ **PARTIAL**. ADR 0019 §3 의 "도메인 특수 상태" 조항 적용 사례인데, S7 의 동일 회귀(자동 wrap 부재) 가 그대로 발생. 다만 audit `action` 은 status 가 아니라 verb name 이므로 ADR 0019 §3 의 5단계 권고 팔레트 외이며, 자동 wrap 정책 적용 범위가 모호 (`enum` 신호 또는 envelope tool name reference 신호 둘 다 후보).

**권고**: S7 권고 1번 (자동 wrap)을 enum 신호 외에 **"envelope tools[].name 과 일치하는 셀 값"** 신호로도 확장. 즉 cell value가 declared tool name set 에 있으면 자동 CodeSpan. 추가 비용 낮고 audit 류 페이지의 자기설명성 직접 향상.

---

#### S9. 5단계 팔레트의 도메인 외 확장 — `inactive` 의 위치

**의도된 해석**: example/users 의 실제 도메인은 `status: "active" | "inactive"` 두 값. ADR 0019 §3 의 5단계 권고 팔레트는 `active`, `pending`, `archived`, `disabled`, `error` — `inactive` 가 **권고 팔레트에 없음**. ADR 0019 §3 "도메인 특수 상태도 CodeSpan이면 허용" 으로 허용은 됨.

**가상 Markdown 샘플** (Bob 의 status 가 `inactive` 였다면):

```markdown
| u_bob_01 | bob\@example.com | user | `inactive` | 2026-04-10 | ... |
```

**fresh LLM 시뮬레이션**: `inactive` 가 권고 팔레트에 없는데, agent 가 혹시 spec/카탈로그 스니펫을 미리 학습한 적이 있다면 (예: 미래 시점) "왜 권고 팔레트가 아닌가? `disabled` 와 `archived` 중 어느 것에 매핑되는가?" 같은 의문을 제기 가능. **ADR 0019 §3 "5단계 권고 팔레트 (비강제)" 의 비강제성이 본문에는 드러나지 않음** — agent 가 "권고" 와 "필수" 를 구분할 신호가 fixture 에 없음.

특히 `disabled` (권고 팔레트) 와 `inactive` (도메인 실제) 는 의미상 매우 가까워 LLM 이 "이 도메인은 왜 권고 명을 안 따랐는가, 매핑은 무엇인가" 를 회의 가능. envelope `tools[].input.properties._filter_status.enum: ["active", "inactive"]` 가 권위 있는 단일 출처이지만, 권고 팔레트와의 mismatch 자체가 confidence 감점.

**갭**: ⚠️ **PARTIAL**. 5단계 권고 팔레트의 비강제성 + 도메인 자유 확장이 fixture 표면에 드러나지 않음.

**권고**:
1. **envelope 차원 명시**: `extensions.statusPalette` (ADR 0019 §Open) 를 v2 에서 도입할 때, "5단계는 권고이며 도메인 enum은 envelope tools.input enum 이 SSOT" 를 convention key 로 자동 주입. 예: `status-palette: "domain-enum-ssot"`.
2. **본 fixture 에서는 갭 없음 가까움**: agent 가 envelope enum 을 보고 도메인 진실에 도달 가능. 단, S7/S8 의 자동 wrap 권고가 선행되어야 backtick 신호 자체가 셀에 등장 — 그 다음 단계의 의미 매핑 (`inactive` ↔ `disabled`?) 은 ADR 0019 §3 의 "비강제" 결정과 정합.
3. **선택적 매핑 표**: spec/component-catalog.md §Table 197 옆에 "도메인 enum 이 5단계 외일 때 권고 매핑" 작은 표 — `inactive → disabled`, `suspended → archived` 등. 강제 아님, 시각적 통일을 도모하는 가이드. v2에서 검토.

---

## 식별된 Gap

### Gap I — example/users의 deleteUser가 ADR 0019 §1을 따르지 않음 (회귀)

S2 참조. ADR 0019 §1 의 핵심 결정인 "2단계 전이" 가 example 앱에 반영 안 되어 있고, 라이브러리 핵심 카탈로그(`Input.type`)에 `hidden` 이 없어 정규형 작성 자체가 불가능.

**우선순위**: **높음**. ADR 0019 §1 은 "destructive 동작의 안전" 이라는 제품 약속의 근간이며, 이를 깨면 전체 ADR 의 가치가 약화.

**권고 묶음**:
1. `Input.type="hidden"` 허용 (소형 ADR 0020 후보, ADR 0019 §Open 항목 우선순위 상향).
2. `apps/example/app/users` 의 row Delete action 을 `deleteUserPreview` 로 교체 + preview 페이지 라우트 추가.
3. envelope `extensions.conventions.destructive-action: "two-step-preview"` 를 `DEFAULT_CONVENTIONS` 에 추가 (즉시, 코드 1줄).
4. v2 lint: `delete*`/`archive*` tool 이 `*Preview` 페어 없이 envelope 에 단독 등재되면 warning.

### Gap II — Table cell 자동 CodeSpan wrap 부재 (ADR 0019 §3 핵심 결정 미이행)

S7/S8 참조. ADR 0019 §3 이 spec 에는 명문화되었으나 engine·example 모두 미이행. row.status 가 plain text로 직렬화되어 셀 표면 신호 부족.

**우선순위**: **중–높음**. ADR 0019 §Consequences "Neutral: CodeSpan 행 상태 직렬화 이미 동작" 의 사실 오류 수정 + engine 이행이 동시에 필요.

**권고 묶음**:
1. Table cell 직렬화 시, envelope `tools[].input.properties._filter_<col>.enum` 또는 `tools[].output` schema 의 enum 멤버이면 자동 `inlineCode` wrap. 추가로 envelope `tools[].name` 과 일치하는 셀 값(audit `action` 류) 도 동일 처리.
2. (병행) `TableColumn<R>` 에 `as?: "code" | "text"` opt-in hint. 자동 추론 실패 시의 명시 우회 경로.
3. ADR 0019 §Consequences Neutral 항 정정.

### Gap III — EmptyState 저자 누락 시의 fallback 부재

S6 참조. ADR 0019 §2 의 "엔진 자동 placeholder 미삽입" 결정이 lint 부재와 결합되면 저자 누락 시 모호한 빈 표만 출력.

**우선순위**: **중간**. 발견 빈도 낮으나 발생 시 agent 해석 ambiguous → confident decision 불가.

**권고 묶음**:
1. dev-time lint warning (table body 0 row + `total=0` + 형제 Alert 부재 시).
2. spec/component-catalog.md §Table 195 의 표현을 "권장" 에서 "MUST" 로 격상.
3. (대안) engine 자동 HTML comment 삽입 — ADR 0019 §2 결정과 약한 충돌, 별도 ADR 검토.

### Gap IV — Confirm 페이지(2단계) 의 page-envelope 발행 컨벤션 부재

S3 참조. preview tool 응답을 어떻게 page 로 직렬화할지 spec 에 가이드 없음. ADR 0019 §1.2 의 정규형이 본문에는 정해져 있으나, **응답 envelope** 의 `purpose`/`role`/`paths` 컨벤션은 미정.

**우선순위**: **중간**. ADR 0019 §1 의 실제 작동을 위한 implementation gap.

**권고 묶음**:
1. spec/page-envelope.md 에 "Preview/Confirm 페이지 envelope" 섹션 추가. 예: `purpose: "Confirm <verb> of <Resource>"`, `paths.view` 는 부모 리소스 URL + `/delete` suffix 권고.
2. 또는 ADR 0019 Migration 에 "preview 응답의 envelope 컨벤션은 spec/page-envelope.md §Confirm 페이지 참조" 한 줄.

### Gap V — `destructive-action` convention 자동 주입 부재

S1 참조. ADR 0012/0013/0014/0017 선례대로 ADR 0019 도 envelope `extensions.conventions` 자동 주입을 통해 LLM-친화성 신호를 강화 가능. 현재 미주입.

**우선순위**: 낮음(즉시 보정 비용도 낮음 — 코드 1줄, `packages/core/src/index.ts:207~212`).

**권고**: `DEFAULT_CONVENTIONS` 에 `"destructive-action": "two-step-preview"` 추가. v2 fixture 재검증 시 high confidence 보강 기대.

## Positive signals (의도대로 이미 작동하는 것)

1. **GFM `[!CAUTION]`/`[!WARNING]`/`[!NOTE]` 의 표준성** — S4/S5 에서 GFM alert 5종 의미가 fresh agent 에게 즉시 인지됨. ADR 0019 §2 가 신규 directive 도입을 회피하고 GFM 표준에 위임한 결정이 LLM-친화 면에서 적중.
2. **`*none*` 정규화 (ADR 0018·0019 §2)** — 별표 1쌍, 영어 고정, 대안 7가지 명시 금지가 spec 의 "단일 표기" 약속을 강화. 본 검증의 단건 상세 시나리오(S3) 에서도 자연스럽게 사용 가능.
3. **`destructive-action: "two-step-preview"` 의 ADR 0012 패턴 정합성** — 비록 자동 주입은 미구현이나, 패턴 자체(envelope conventions 키) 가 0012/0013/0014/0017 과 동일 라인 — 일관 적용 시 즉시 high.
4. **2단계 confirm 페이지의 의미 정렬 (S3)** — Card(영향 대상) + `[!CAUTION]`(되돌릴 수 없음) + Form(`Confirm <verb>` + `Cancel`) 의 3블록 구성이 HTML form 멘탈모델과 정합. ADR 0013 의 form-내부 button action 생략 규약이 자연스럽게 결합.

## 판정

**ADR 0019 자체의 "결정" 은 합리적**. 신규 컴포넌트/예약어 0개 약속, GFM alert 단일화, CodeSpan 통일 — 세 결정 모두 LLM-친화 관점에서 정합.

**그러나 "이행" 단계에서 다수 갭 식별**:
- **§1 Delete 2단계**: example/users 가 1단계 직접 호출 (회귀, FAIL). `Input.type="hidden"` 부재로 정규형 작성 자체 불가 (block).
- **§2 EmptyState**: 결정은 통과(PASS), 다만 저자 누락 시 fallback 부재 (PARTIAL).
- **§3 행 상태 CodeSpan**: engine 이 자동 wrap 안 함 + example 이 manual wrap 안 함 = spec 미이행 (FAIL).

**따라서 ADR 0019 의 "Pass/Fail" 종합 판정은 "Conditional pass — 결정은 채택, 이행은 후속 5건 Gap 해소 필요"**.

5건 gap 중 우선순위:
1. **Gap I (Delete 2단계)** + **Gap II (Table CodeSpan)** — 핵심 결정 직접 미이행. 즉시 보정.
2. **Gap IV (preview 페이지 envelope)** — Gap I 의 dependency.
3. **Gap V (convention 자동 주입)** — 1줄 코드, 즉시 적용.
4. **Gap III (EmptyState lint)** — lint 도입 대기.

## Open questions

1. **`Input.type="hidden"` 정규형** — ADR 0020 후보. 본 ADR 의 §1 closure 에 dependency.
2. **Preview tool 응답의 page-envelope 컨벤션** — spec/page-envelope.md 보강 또는 ADR 0019 Migration 보강.
3. **Table cell 자동 CodeSpan wrap 의 신호 source** — envelope `tools[].input enum` vs `output enum` vs `tools[].name` reference 중 어느 조합? 또는 `TableColumn.as` opt-in?
4. **`destructive-action` convention 의 의미 변형** — `two-step-preview` 외에 `inline-confirm` (button.confirm 미래 도입 시) / `none` 등 enum 확장 여지?
5. **5단계 팔레트의 envelope 명시 (`extensions.statusPalette`)** — v2 도입 시점 / 도메인 enum SSOT 우선순위 정책?
6. **Confirm 페이지의 `paths.view` URL 컨벤션** — `/users/u_bob_01/delete` (REST style) vs `/users?confirm=delete&id=...` (query style) 중 권장형?

---

## 후속 (재검증 트리거 조건)

본 research v2 재검증은 다음 두 조건이 동시 만족 시 의미 있음:
- Gap I 의 (1)~(3) 또는 Gap II 의 (1) 둘 중 하나라도 코드 반영
- example 앱의 users 페이지에 deleteUserPreview/Confirm 페이지 라우트 추가

위 조건에서 fresh-context agent 에게 새 fixture 의 (a) Delete 1단계 라벨 인식, (b) Confirm 페이지의 2단계 의미 인식, (c) status 셀의 backtick 신호 인식 — 3 과제를 부여해 medium → high 변환 여부를 측정한다.
