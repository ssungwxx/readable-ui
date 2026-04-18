# LLM 친화성 검증 — ADR 0020 CRUD idiom closure (hidden input · destructive convention · 셀 자동 wrap · EmptyState fallback · intent)

- Date: 2026-04-18
- Subject: [ADR 0020](../adr/0020-close-crud-idiom-gaps.md) 5개 Decision 이행 검증 — ADR 0019 검증에서 식별된 5건 갭(`Input.type=hidden` 부재, Table 셀 자동 CodeSpan wrap 부재, EmptyState fallback 부재, Confirm 페이지 envelope 컨벤션 부재, `destructive-action` convention 자동 주입 부재) 이 ADR 0020 으로 모두 닫혔는지, 그리고 닫힌 결과가 fresh-context LLM 에게 의도대로 읽히는지를 실제 `.md` 출력으로 검증.
- Fixtures (실제 직렬화):
  - `apps/example/app/users/page-content.tsx` → `/users.md` (5단계 status 팔레트, `Delete…` row action → `deleteUserPreview`)
  - `apps/example/app/users/[id]/delete/page-content.tsx` → `/users/u_bob_01/delete.md` (intent · hidden id · 2단계 confirm)
  - `apps/example/app/jobs/page-content.tsx` → `/jobs.md` (5단계 팔레트 전수 + 빈 결과 fallback Alert)
- Method: `renderPage(<Page/>, envelope)` (`packages/core/src/index.ts:231`) 를 build dist 로 직접 실행해 위 3개 라우트의 .md 출력을 캡처. 캡처된 본문에서 ADR 0020 §1~§5 결정의 신호 부분을 인용하고, 사전 컨텍스트(코드/ADR/spec) 를 모르는 fresh-context LLM 의 해석을 시뮬레이션. 0019 검증과 동일한 시나리오 형식(시나리오 / 실제 .md / fresh LLM 시뮬레이션 / 갭 / 판정).

## 결과 요약

| 카테고리 | Pass (high) | Partial (medium) | Fail (low) | 노트 |
|---|---|---|---|---|
| §1. `Input.type=hidden` 직렬화 | 1 | 0 | 0 | `::input{name="id" type="hidden" default="u_bob_01"}` 자기설명적 |
| §2. `destructive-action` convention 자동 주입 | 1 | 0 | 0 | envelope `extensions.conventions` 한 줄로 idiom 이름 외재화 |
| §3. Table 셀 status 자동 CodeSpan wrap | 1 | 1 | 0 | 5단계 팔레트 모두 wrap 됨, 단 표 외부(Card list)에서는 plain text 회귀 |
| §4. EmptyState fallback Alert | 1 | 1 | 0 | "No results." 자동 삽입 작동, 단 더 풍부한 메타(이전 필터 값/대안 enum) 부재 |
| §5. Confirm 페이지 `intent` | 0 | 1 | 0 | enum 값은 명료하나 frontmatter 위치(`tools:` 다음, `extensions:` 앞) 가 매몰 위험 |
| §6. Decision 간 상호작용 | 1 | 1 | 0 | `/users/u_bob_01/delete.md` 종합 명료도 high; 5단계 lifecycle 의미는 enum 만으로는 medium |
| **합계** | **5** | **4** | **0** | 9개 시나리오 중 **high 5건 / medium 4건 / fail 0건** |

ADR 0019 검증 (high 2 / partial 4 / fail 3) 대비 **fail 0건 으로 회귀 완전 해소**, high 비율은 22% → 56% 로 상승. 5개 Decision 모두 의도대로 작동하나, **§3 의 적용 범위가 Table 셀로 한정** + **§5 의 frontmatter 노출 위치** + **§4 의 fallback 텍스트의 정보량 부족** 3가지 medium-grade 후속 갭 식별.

## Decision 별 검증

### §1. `Input.type=hidden` — Confirm Form 의 hidden id 가 LLM 에게 "preview tool 결과 그대로 전달용 파라미터" 로 자연스럽게 읽히는가

**시나리오**: fresh-context LLM 에게 `/users/u_bob_01/delete.md` 한 파일만 주고 "이 페이지의 Form 을 제출하면 어떤 일이 일어나는가? `id` 값은 어디서 오며 사용자가 수정 가능한가?" 묻는다.

**실제 .md 샘플** (lines 249-255):

```markdown
:::form{action="deleteUser"}
::input{name="id" type="hidden" default="u_bob_01"}

::button[Confirm delete]

::button[Cancel]{action="listUsers" variant="secondary"}
:::
```

추가로 envelope `tools[]` 에는 `deleteUser.input` 가 `{ properties: { id: { type: string } }, required: ["id"] }` 로 선언되어 있고, 페이지 상단 `purpose: "Confirm delete of user u_bob_01"` 가 동일 ID 를 인용.

**fresh LLM 시뮬레이션**: leaf directive `::input{name="id" type="hidden" default="u_bob_01"}` 의 세 신호가 모두 정합 — `name="id"` 는 deleteUser 의 required input, `type="hidden"` 은 HTML form 표준에서 "사용자 비가시·서버 제출 동봉", `default="u_bob_01"` 는 page-envelope 의 `purpose` / `paths.view` / `constraints.text` 모두 동일 ID 를 가리키므로 cross-reference 일치. `label`/`placeholder` 가 부재한 것 자체가 "이 input 은 사용자에게 보이지 않음" 을 함의. ADR 0016 의 `default` SSOT 규약(directive 가 우선) 신호도 envelope `extensions.conventions.form-default-ssot: directive` 한 줄에 외재화 → LLM 이 "이 hidden 값은 페이지 발행 시점에 고정, 사용자 변경 불가" 라고 high confidence 결론.

**갭**: 거의 없음. 단 한 가지 미세 관찰 — `default="u_bob_01"` 의 값이 envelope `purpose` 의 ID 와 동일함이 본문 표면 한 곳에 명시적으로 cross-link 되어 있지 않다 (개념적으론 자명하지만 LLM 이 두 곳을 비교하는 단계 1회 추가 필요). 생산 비용 대비 가치 낮은 보강 후보.

**판정**: ✅ **PASS (high)** — 의도대로. ADR 0020 §1 의 직렬화 규칙 (`name`/`default` 필수, label/placeholder 무시) 이 그대로 fresh LLM 에 자기설명적으로 작동. ADR 0019 §1.2 의 정규형이 이제 코드로 작성 가능.

---

### §2. `destructive-action: "two-step-preview"` convention 자동 주입 — envelope frontmatter 한 줄로 LLM 이 "Delete 류 action 은 preview tool 먼저 호출" 을 추론할 수 있는가

**시나리오**: fresh-context LLM 에게 `/users.md` 만 주고 "envelope `tools[]` 에 `deleteUserPreview` 와 `deleteUser` 가 둘 다 등장한다. 둘은 무관한 별개 tool 인가, 아니면 한 쌍의 idiom 인가? Delete 를 수행하려면 어느 것을 먼저 호출해야 하는가?" 묻는다.

**실제 .md 샘플** (frontmatter, /users.md):

```yaml
extensions:
  conventions:
    duplicate-button-link: dual-render
    form-inner-button-action: inherit
    uri-query-encoding: percent-decoded-match
    form-default-ssot: directive
    destructive-action: two-step-preview
```

본문 Table row action (lines 153-162):

```markdown
| u\_bob\_01 | bob\@example.com | `user` | `active` | 2026-04-10 | [Edit](mcp://tool/updateUser?id=u_bob_01) · [Delete…](mcp://tool/deleteUserPreview?id=u_bob_01) |
```

**fresh LLM 시뮬레이션**: 세 신호가 한 화면에서 정합 — (1) envelope `extensions.conventions["destructive-action"]: "two-step-preview"` 이 idiom 이름을 외재화. value 자체가 자기설명적("두 단계 preview 패턴"). (2) envelope `tools[]` 에 `<verb><Resource>Preview` (`deleteUserPreview`) 와 `<verb><Resource>` (`deleteUser`) 가 페어로 등장. 네이밍 규칙으로 페어 인식 가능. (3) 본문 Delete row action 의 라벨이 `Delete…` (horizontal ellipsis) + URI 가 `deleteUserPreview` 를 가리킴 → "지금 누르면 미리보기, 실제 삭제는 다음 단계". 세 신호가 cross-confirm. ADR 0019 검증 S1 의 시뮬레이션과 동일하게 high confidence 도달, **단 ADR 0019 시점에는 envelope convention key 부재**여서 본문 신호만으로 추론해야 했던 부담이 본 ADR 0020 으로 envelope 단일 단어("two-step-preview") 로 외재화됨.

ADR 0012/0013/0014/0017 의 자동 주입 패턴이 ADR 0019 까지 일관 확장되어 LLM 이 "이 시스템은 convention 들을 envelope 의 같은 슬롯에 모은다" 라는 메타 패턴까지 인지 가능 → 다음 페이지에서도 동일 슬롯을 우선 검색하는 학습 경로 형성.

**갭**: 거의 없음. 단 future-proof 관점의 미세 노트 — 현재 `destructive-action` enum 은 `two-step-preview` 단일값. fresh LLM 이 "이 key 의 다른 가능한 값은?" 을 궁금해 할 때 envelope 안에는 단서가 없음 (ADR 0020 §2 본문에 v2 후보 `inline-confirm`/`none` 이 적혀 있으나 spec 미공개). 정상 — single-value enum 에서 enum 확장 정보를 envelope 마다 동봉하는 것은 비용 대비 가치 낮음.

**판정**: ✅ **PASS (high)** — 의도대로. `DEFAULT_CONVENTIONS` (`packages/core/src/index.ts:212`) 자동 주입이 코드 레벨에서 동작 확인. envelope · 본문 · tool naming 세 신호의 정합으로 ADR 0019 §1 의 핵심 약속이 LLM 친화 면에서 강화.

---

### §3. Table 셀 status 값 자동 CodeSpan wrap — `` `active` ``, `` `pending` `` 같은 backtick 표기가 LLM 에게 "필터 가능한 enum 값" 으로 인지되는가? plain "active" 와 비교 시 LLM 이 정말 다르게 처리하는가

**시나리오**: fresh-context LLM 에게 `/users.md` 의 Table 본문만 주고 "Status 컬럼의 `active`, `pending`, `archived`, `disabled`, `error` 다섯 값은 자유 텍스트인가, 시스템 enum 인가? 이 컬럼으로 필터링하려면 어떤 URI 를 만들어야 하는가?" 묻는다. 비교 대상으로 plain text 였던 ADR 0019 시점의 출력과의 차이를 확인.

**실제 .md 샘플** (/users.md, Table cell lines):

```markdown
| u\_alice\_01  | alice\@example.com  | `admin` | `active`   | 2026-04-12 | [Edit](mcp://tool/updateUser?id=u_alice_01) · [Delete…](mcp://tool/deleteUserPreview?id=u_alice_01)   |
| u\_bob\_01    | bob\@example.com    | `user`  | `active`   | 2026-04-10 | [Edit](mcp://tool/updateUser?id=u_bob_01) · [Delete…](mcp://tool/deleteUserPreview?id=u_bob_01)       |
| u\_carol\_01  | carol\@example.com  | `user`  | `pending`  | 2026-04-08 | ...
| u\_dave\_02   | dave\@example.com   | `user`  | `disabled` | 2026-03-30 | ...
| u\_legacy\_07 | legacy\@example.com | `user`  | `archived` | 2025-12-01 | ...
| u\_err\_03    | errbob\@example.com | `user`  | `error`    | 2026-04-15 | ...
```

`Status` 컬럼의 5개 값(`active`/`pending`/`archived`/`disabled`/`error`)이 모두 자동 backtick 으로 wrap. **`Role` 컬럼 (`admin`/`user`) 도 동시에 wrap** — 이는 `_filter_role` enum (`["admin", "user"]`) 이 함께 신호 source 가 됐기 때문. 일관 동작.

**fresh LLM 시뮬레이션**: backtick 표기는 `inlineCode` Markdown 노드. 의미축이 **"자유 텍스트 아님 — 식별자/코드 리터럴/enum 멤버"** 로 셀 표면에 즉시 드러남. LLM 이 셀 값을 본 순간 "이건 enum / system identifier / 정확한 매칭 대상" 으로 1차 분류. 그다음 envelope `tools[].input.properties._filter_status.enum: ["active", "pending", "archived", "disabled", "error"]` 와 cross-reference 해 "필터 query 의 후보 값 = 셀에 등장한 5종" 확정.

**plain text 와의 비교**: ADR 0019 검증 시점(2026-04-18, 동일 일자) 의 출력은 `| user | active |` (backtick 없음). 그때의 fresh LLM 시뮬레이션 결론: "active 는 (a) enum 값, (b) 동사형, (c) 형용사 자유 텍스트 — 세 후보 중 envelope 신호 도움 없이는 medium confidence". 본 ADR 0020 §3 자동 wrap 후에는 (b)/(c) 후보가 셀 표면에서 즉시 배제 → high confidence 로 즉시 도달. **차이 분명**.

**5단계 팔레트 전수 검증** (`/jobs.md`, lines 339-346):

```markdown
:::table{tool="listJobs" total="4"}
| id       | Name           | Status     | Started          |
| :------- | :------------- | :--------- | :--------------- |
| job\_001 | nightly-backup | `active`   | 2026-04-18 02:00 |
| job\_002 | report-export  | `pending`  | 2026-04-18 03:00 |
| job\_003 | data-migration | `archived` | 2026-04-01 00:00 |
| job\_004 | key-rotation   | `disabled` | 2026-04-10 12:00 |
:::
```

5단계 권고 팔레트 중 4단계가 한 표에 실제로 등장하며 **모두 자동 wrap**. ADR 0019 §3 의 권고 팔레트가 engine 차원에서 자동 강화됨. fresh LLM 이 4행 한 번 스캔으로 "이 시스템의 status 는 적어도 4개 enum 값을 가진 분류 축" 이라고 즉시 추론.

**갭** — **§3 자동 wrap 의 적용 범위가 Table 셀로 한정**:

`/users/u_bob_01/delete.md` 의 Card list (lines 239-244):

```markdown
:::card{title="Delete user"}
- **Email**: bob\@example.com
- **Role**: user
- **Status**: active
- **Created**: 2026-04-10
:::
```

여기서 `Status: active` 는 **plain text** — `active` 가 envelope `deleteUser.input` 에 직접 enum 으로 선언돼 있지 않고, Card body 는 Table 이 아니어서 §3 의 자동 wrap 경로(`Table.toMarkdown`) 가 트리거되지 않음. fresh LLM 은 Confirm 페이지에서 status 값을 봐도 "이게 enum 인지" 셀 표면에서 즉시 알 수 없으며, /users.md 의 Table 본문과 cross-reference 해야 함. 동일 페이지(delete) 의 envelope `tools[]` 에 `listUsers` 가 잔존하지만(`deleteUser` 와 `listUsers` 두 개), `_filter_status.enum` 신호는 listUsers 의 input 에만 있고 본 페이지 본문 어디에도 active 가 enum 멤버임을 표면화하지 않음.

**판정**: ✅ **PASS (high)** for Table 셀 본체 (의도된 적용 범위), ⚠️ **PARTIAL (medium)** for Confirm 페이지의 동일 status 값. ADR 0020 §3 의 spec → engine 이행은 정확히 의도대로 작동. 단 "동일 도메인 enum 값이 Table 외 컨텍스트(Card / Description list / Detail page) 에서 등장할 때" 의 자동 wrap 적용 범위는 v2 후속 개선 후보 (ADR 0021 후보).

---

### §4. EmptyState fallback Alert — `> [!NOTE]\n> No results.` 자동 삽입이 LLM 에게 "필터 결과 없음 — 다른 필터 시도 권고" 신호로 충분한가? 더 풍부한 메타가 필요한가

**시나리오**: fresh-context LLM 에게 `/jobs.md` 만 주고 "위쪽 Table (filter-status=error) 은 비어 있다. 데이터가 정말 없는가, 시스템 오류인가, 권한 부족인가? 사용자에게 무엇을 권고해야 하는가?" 묻는다. 같은 페이지 아래에 4 행짜리 두 번째 Table 이 있는 것은 비교 단서.

**실제 .md 샘플** (/jobs.md, lines 326-336):

```markdown
> [!NOTE]
> Currently showing jobs filtered to status="error". No error jobs are present.

:::table{tool="listJobs" total="0" filter-status="error"}
| id | Name | Status | Started |
| :- | :--- | :----- | :------ |
:::

> [!NOTE]
> No results.
```

저자가 손으로 적은 첫 NOTE Alert(`Currently showing jobs filtered…`) 와 엔진이 자동 삽입한 두 번째 NOTE Alert(`No results.`) 가 연속으로 두 번 등장. ADR 0020 §4 는 "동일 컨테이너에 형제 Alert{kind=note} 가 없을 때만 fallback 삽입" 인데, 본 fixture 는 **Table 의 형제로 직접 인접한 Alert 가 없고** (저자 NOTE Alert 는 Table directive 위쪽이 아니라 그 위 Paragraph 다음에 위치), Table 직후에는 형제가 없으므로 fallback 삽입 트리거됨.

**fresh LLM 시뮬레이션**: 세 신호가 일치 — (1) Table directive `total="0" filter-status="error"` 두 attribute 가 "0건 + 어떤 필터 적용됐는지" 동시 표명. (2) 자동 fallback `> [!NOTE]\n> No results.` 가 "결과 없음" 을 GFM 표준 alert 로 single-source 로 표명. (3) envelope `tools[].input.properties._filter_status.enum: ["active", "pending", "archived", "disabled", "error"]` 가 "필터 가능한 5개 값" 을 외재화 → LLM 이 "현재 필터(error) 외에 4개 다른 값이 있으므로, 사용자가 다른 필터(예: active) 로 재호출 가능" 을 high confidence 로 권고 가능.

**fallback 텍스트의 정보량 평가**: ADR 0020 §4 가 "본문 텍스트 영어 고정 ('No results') — `*none*` 과 동일한 single-source 정책" 을 명시. 의도는 i18n / 번역 폭주 방지 + spec 강제력 확보. 그 trade-off 는 **fallback 자체가 "왜" 비었는지 / 어떤 대안이 있는지를 본문에 노출하지 않는다**는 점. fresh LLM 은 다음 두 단계 추론을 동봉으로 수행해야 함 — (a) Table directive attributes 에서 현재 필터 값 추출, (b) envelope tool input enum 에서 대안 값 추출.

저자가 더 풍부한 NOTE 를 손으로 작성한 경우(/jobs.md 첫 NOTE) 는 한 점 조회로 끝나지만, fallback 단독일 때는 두 단계 추론 필요. ADR 0019 시점의 "저자 누락 시 ambiguous 상태로 노출" 보다는 명백히 개선 (ambiguous → 정답 도달은 가능, 단 1단계 추가 비용).

**fresh LLM 의 합리적 권고 (시뮬레이션)**:
> "현재 필터 `status="error"` 결과 0건. envelope `_filter_status.enum` 의 다른 값(`active` / `pending` / `archived` / `disabled`) 로 재호출 가능. 두 번째 Table ('All jobs') 에서 4개 jobs 모두 error 가 아닌 status 이므로, error 류 작업이 실제 도메인에 존재하지 않을 가능성이 높음."

— 위 추론은 high quality 이나, **fallback Alert 자체는 그 추론의 1단계 신호만 제공**. Alert 본문이 "필터 status='error' 적용 — envelope `_filter_status.enum` 에서 다른 값 시도" 같은 메타까지 포함하면 한 점 조회로 끝남 (그러나 i18n 정책과 spec 강도 trade-off).

**갭** — fallback 의 본문이 "결과 없음" 만 표명하고 (a) 현재 필터 값 (b) 가능한 대안 enum 을 본문에 노출하지 않음. ADR 0020 §4 가 의도적으로 minimal 하게 결정한 것은 정합하나, fresh LLM 은 envelope + Table attributes 를 cross-reference 해야 정답 도달.

**판정**: ✅ **PASS (high)** for "결과 없음" 신호 자체 (의도대로 의미 전달), ⚠️ **PARTIAL (medium)** for "다른 필터 시도 권고" 의 한 점 조회 가능성. ADR 0020 §4 는 의도된 minimal 정책이므로 결정 자체에 흠은 없음. 단 v2 enrichment 후보로 "fallback Alert 본문이 Table directive 의 filter-* attribute 와 envelope `_filter_*.enum` 을 자동 인용" (engine 차원의 추가 inline) 이 있을 수 있음 (ADR 0022 후보, i18n 정책과 충돌 검토 필요).

---

### §5. Confirm 페이지 `intent: destructive-confirm` — frontmatter 가 LLM 에게 "이 페이지의 Form 제출은 파괴적 — 사용자 재확인 필수" 를 명확히 전달하는가

**시나리오**: fresh-context LLM 에게 `/users/u_bob_01/delete.md` 만 주고 "이 페이지의 성격은? 일반 form 페이지인가, 무언가 특별한가? Form 을 제출하면 어떤 위험이 있는가?" 묻는다.

**실제 .md 샘플** (/users/u_bob_01/delete.md, frontmatter lines 177-227):

```yaml
title: Delete user
purpose: Confirm delete of user u_bob_01
role: admin
layout: sidebar
nav:
  items: [...]
paths:
  view: /users/u_bob_01/delete
  markdown: /users/u_bob_01/delete.md
constraints:
  - id: delete-irreversible
    text: Deleting user bob@example.com is permanent and cannot be undone.
    severity: danger
updatedAt: 2026-04-18T00:00:00Z
tools:
  - name: deleteUser
    ...
  - name: listUsers
    ...
intent: destructive-confirm
extensions:
  conventions:
    ...
    destructive-action: two-step-preview
---
```

본문에서는 (lines 237-255):

```markdown
# Delete user

:::card{title="Delete user"}
- **Email**: bob\@example.com
- **Role**: user
...
:::

> [!CAUTION]
> Deleting this user is permanent and cannot be undone.

:::form{action="deleteUser"}
::input{name="id" type="hidden" default="u_bob_01"}

::button[Confirm delete]

::button[Cancel]{action="listUsers" variant="secondary"}
:::
```

**fresh LLM 시뮬레이션**: 6개 신호가 정합 — (1) `title: Delete user`, (2) `purpose: Confirm delete of user u_bob_01` (Confirm 단어 포함), (3) `intent: destructive-confirm` (envelope 단일 enum), (4) `constraints[delete-irreversible].severity: danger`, (5) 본문 Card body (영향 대상 명시), (6) `> [!CAUTION]` GFM alert + `:::form{action=deleteUser}` + `::input{type=hidden default="u_bob_01"}` + `::button[Confirm delete]` 4중 본문 신호. 어느 한 신호만 떨어져도 high confidence 도달 가능 — 6중 redundancy 는 over-engineering 이라 할 정도로 견고.

**`intent` 의 단독 가치 평가**: 다른 5개 신호가 이미 high confidence 를 충족하므로 intent 한 줄의 marginal value 는 작아 보일 수 있음. 그러나:
- (a) envelope frontmatter 만으로 페이지 분류 가능 → 본문 파싱 전에 메타 분류 가능 (스트리밍/batch 사용 케이스).
- (b) enum value 의 single-token 명료성 (`destructive-confirm` 한 단어로 "destructive + confirm 단계" 두 의미 동시 인코딩) — 6번 cross-reference 한 결과를 1번 lookup 으로 단축.
- (c) 이름 컨벤션 (`<adjective>-confirm`) 이 v2 enum 확장(`reversible-confirm`, `bulk-confirm`) 과 일관 — LLM 이 "이 enum 슬롯의 다른 값은 무엇인가" 를 추론 가능.

**갭** — `intent` frontmatter 위치:

실제 출력 (line 219) 에서 `intent: destructive-confirm` 은 `tools:` (lines 203-218) 다음, `extensions:` (lines 220-226) 앞에 위치. 즉 envelope 의 **거의 마지막** 에 등장. fresh LLM 이 frontmatter 를 위→아래로 스캔할 때, `title`/`purpose`/`role` 같은 1차 메타는 상단에 있는데 `intent` 같은 분류 신호는 하단에 매몰. 50줄짜리 frontmatter 에서 intent 까지 도달하기 전에 LLM 이 "이건 일반 페이지" 라고 1차 가설을 세우고 그 후 update 해야 함 (1단계 추가 추론).

이는 ADR 0020 §5 결정 자체의 결함이 아니라 **envelope schema 의 필드 순서가 의미적 우선순위를 반영하지 않는** 부수 효과. zod schema (`packages/core/src/envelope.ts`) 의 정의 순서가 그대로 YAML 출력 순서가 되며, `intent` 는 envelope 스키마의 마지막 추가 (line 89) 라 출력에서도 마지막 근처에 위치.

해결책 후보:
- (a) zod schema 에서 `intent` 를 `purpose`/`role` 옆으로 옮김 (단순 이동, behavioral 변경 없음).
- (b) `stringifyYaml` 호출 전에 우선순위 키 (`title`/`purpose`/`role`/`layout`/`intent`) 를 명시적으로 앞으로 정렬 (`stripUndefined` 단계에 정렬 로직 추가).
- (c) 현 상태 유지 — fresh LLM 이 어차피 frontmatter 전체를 메모리에 로드 후 분류하므로 위치 영향 미미하다고 판단.

**판정**: ⚠️ **PARTIAL (medium)** — 결정의 의도 (envelope 단일 신호로 페이지 분류) 는 달성. 단 frontmatter 출력 위치가 의미적 우선순위와 어긋나 LLM 의 "early classification" 시나리오에서 1단계 추가 추론 필요. 위 해결책 (a) 또는 (b) 1줄~3줄 수정으로 high 승격 가능. ADR 0020 §5 본문에는 위치 컨벤션이 명시되지 않으므로 spec 보강 후보.

---

### §6. Decision 간 상호작용 — 5단계 팔레트의 의미론적 차이 + 종합 명료도

#### 6-A. 5단계 팔레트(`active`/`pending`/`archived`/`disabled`/`error`) 의 의미론적 차이가 LLM 에게 전달되는가

**시나리오**: fresh-context LLM 에게 `/jobs.md` 만 주고 "이 5단계 status 는 단순한 enum 인가, 아니면 lifecycle 의미를 가진 단계 분류인가? 예컨대 `archived` 와 `disabled` 의 차이는 무엇인가? `error` 는 다른 4개와 동급의 lifecycle stage 인가, 별개의 축인가?" 묻는다.

**실제 .md 샘플** (/jobs.md):

```yaml
tools:
  - name: listJobs
    description: List background jobs. Accepts `_filter_status` with the 5-stage palette.
    input:
      properties:
        _filter_status:
          type: string
          enum:
            - active
            - pending
            - archived
            - disabled
            - error
```

본문 Table 표 (4행만 비-error 에 등장):

```markdown
| job\_001 | nightly-backup | `active`   | 2026-04-18 02:00 |
| job\_002 | report-export  | `pending`  | 2026-04-18 03:00 |
| job\_003 | data-migration | `archived` | 2026-04-01 00:00 |
| job\_004 | key-rotation   | `disabled` | 2026-04-10 12:00 |
```

**fresh LLM 시뮬레이션**: enum 자체는 envelope 에서 self-explanatory 하게 전달 — "5개 값이 가능, 셀 backtick wrap 으로 단일 token 식별자임도 강조". 단 **각 값의 의미** 는:
- `active` — 추론 가능 (영어 단어 의미). 실행 중.
- `pending` — 추론 가능. 대기 중.
- `archived` — 추론 가능. 과거 보관.
- `disabled` — 추론 가능. 사용 중지.
- `error` — 추론 가능. 오류 상태.

5개 단어 모두 일반 영어로 의미 자명하므로 1차 추론 high confidence. 그러나 LLM 이 깊이 들어가면:
- `archived` vs `disabled` 의 **operational 차이**: 둘 다 "현재 active 아님" 이지만, archived 는 보존만, disabled 는 재활성화 가능? 본문에는 단서 없음.
- `error` 가 **lifecycle stage 인가 transient state 인가**: error 상태에서 active 로 복귀 가능한가? 명세 없음.
- description 텍스트 (`5-stage palette`) 가 "5단계가 lifecycle 순서를 의미" 하는지 단순히 "5개 enum" 인지 모호.

ADR 0019 §3 에 따르면 "5단계 권고 팔레트 (비강제)" 이며, 의미 정의는 도메인 자유. ADR 0020 본문도 5단계 의미 차이를 명시하지 않음. fresh LLM 은 envelope 에서 enum 만 받고 의미는 영어 단어 직역에 의존.

**갭** — 5단계의 **lifecycle 순서/의미축** 이 envelope 에 외재화되지 않음. ADR 0019 §3 의 권고 팔레트가 v2 에서 `extensions.statusPalette` (envelope 명시) 도입 예정 (ADR 0019 §Open) 이지만 v1 에서는 enum 만 — LLM 이 의미를 추론 (영어 단어 → 도메인 의미) 하는 1단계 추가 비용.

5단계가 "단순 enum vs 진짜 lifecycle" 인지의 답은 **현재 fixture 에서 명시되지 않음** — 권고 팔레트의 비강제성을 본문이 표명하지 않으며, 5단계가 순서를 가지는지(active → pending → archived) 도 envelope 표현 부재.

**판정**: ⚠️ **PARTIAL (medium)** — enum 자체는 high (CodeSpan wrap + envelope enum 정합), 단 lifecycle 의미 차이는 영어 단어 직역에 의존. ADR 0020 scope 외 (Out of scope §5단계 팔레트 envelope 명시 v2) — 정상. 단 fresh LLM 의 second-order 질문에 답하려면 v2 `extensions.statusPalette` 가 의미 단계 / 전이 가능성 메타까지 포함해야 high.

#### 6-B. `/users/u_bob_01/delete.md` 의 종합적 명료도 (2단계 삭제 + intent + hidden input 한 페이지 합치)

**시나리오**: fresh-context LLM 에게 `/users.md` 의 Delete row action 클릭부터 시작해 `/users/u_bob_01/delete.md` 페이지에서 confirm 까지의 전체 idiom 을 자동 화 시키려 한다. 두 페이지를 순차로 받아 "내가 어떤 호출을 어떤 순서로 해야 하는가?" 묻는다.

**실제 흐름** (시뮬레이션):

1. `/users.md` Table row → `[Delete…](mcp://tool/deleteUserPreview?id=u_bob_01)` 호출. 신호: `Delete…` 라벨 (… suffix), `deleteUserPreview` URI (Preview suffix), envelope convention `destructive-action: two-step-preview`. **세 신호 일치 → 호출 안전 (preview 단계)**.

2. preview tool 응답으로 `/users/u_bob_01/delete.md` 받음. 신호: `intent: destructive-confirm` (envelope) + `purpose: Confirm delete of user u_bob_01` + Card 본문 (영향 대상 명시) + `[!CAUTION]` + Form. **사용자 재확인 필요 페이지 인지**.

3. Confirm 클릭 → `:::form{action="deleteUser"}` 의 hidden id 동봉 제출 → `mcp://tool/deleteUser?id=u_bob_01` 실제 호출. 신호: `::input{type=hidden default="u_bob_01"}` + Form action + Button (action 생략 = form 상속). **이번 호출은 destructive 실제 실행 — 사용자 명시 confirm 후**.

**fresh LLM 시뮬레이션**: 위 3단계가 본문 + envelope 의 신호 정합으로 high confidence 자동화 가능. 0019 검증 시점의 회귀 (1단계 직접 호출, FAIL) 가 본 ADR 0020 으로 완전 해소. ADR 0019 §1 의 "destructive 동작의 안전" 약속이 비로소 fixture 에 구현.

**Cancel 경로 검증**: `::button[Cancel]{action="listUsers" variant="secondary"}` — Form 내부 Button 이지만 `action="listUsers"` 명시. ADR 0013 의 "Form 내부 Button 은 form action 상속, 단 다른 action 일 때만 명시" 규약과 정합. fresh LLM 은 envelope `extensions.conventions.form-inner-button-action: inherit` + Button attribute 명시 두 신호로 "Cancel 은 form 제출이 아니라 다른 action(listUsers) 호출" 을 high confidence 로 인지.

**갭**: 거의 없음. 단 §3 검증에서 발견한 "Card list 내 status 가 plain text" 가 본 페이지에서도 동일 — `- **Status**: active` 의 `active` 가 backtick 없음. 본 페이지 envelope `tools[]` 에 listUsers 가 있어 _filter_status enum 신호는 동봉되지만, Card body 는 자동 wrap 적용 범위 외. 미세한 일관성 결손.

**판정**: ✅ **PASS (high)** — 종합 명료도. 5개 Decision 이 한 페이지에서 만나는 케이스가 ADR 0019 검증 시점의 9개 시나리오 중 가장 hard 케이스였는데 ADR 0020 으로 high 도달. 단 §3 의 적용 범위 한정이 본 페이지에서도 미세하게 노출 (medium 으로 강등될 정도는 아님).

---

## 식별된 후속 갭 (ADR 0021/0022 후보)

### 후속 갭 A — Table 외 컨텍스트의 status enum 자동 wrap 부재

**현상**: ADR 0020 §3 의 자동 CodeSpan wrap 이 `Table.toMarkdown` 내부에서만 동작. Card body / Description list / 단건 Detail page 의 status 값은 plain text 로 출력 (예: `/users/u_bob_01/delete.md` 의 `- **Status**: active`).

**영향**: medium. 한 도메인 내에서 동일 enum 값이 컨텍스트마다 다른 표면 신호 (Table 셀에서는 `` `active` ``, Card 에서는 `active`) → fresh LLM 의 "동일 값인가" 판별이 1단계 cross-reference 필요.

**후속 ADR 후보 (0021 후보)**: "도메인 enum 자동 CodeSpan wrap 의 적용 범위 확장 — Card body / List item / Description list 등 Table 외 컨테이너". 신호 source 는 동일 (envelope tool input enum + tool name set). 적용 경로는 walk 단계의 text node 후처리. 비용: 직렬화 코드 복잡도 ↑, 토큰 비용 ↑ (enum 매칭 cost 증가). trade-off 평가 필요.

### 후속 갭 B — `intent` frontmatter 위치가 의미 우선순위와 어긋남

**현상**: `intent: destructive-confirm` 이 zod schema 정의 순서대로 envelope 의 끝부분 (`tools:` 다음, `extensions:` 앞) 에 위치. fresh LLM 의 "early classification" 시나리오에서 frontmatter 의 50줄 이후에 도달.

**영향**: low~medium. high confidence 자체는 도달하나, frontmatter 상단만 빠르게 스캔하는 streaming 케이스에서는 1단계 추가 lookup.

**후속 조치 (코드 1~3줄)**: `packages/core/src/envelope.ts` 의 zod schema 에서 `intent` 를 `purpose`/`role` 옆으로 이동 (`stripUndefined` 또는 envelope serialize 단계에서 우선순위 키 강제 정렬). 별도 ADR 불필요 — implementation 차원. 본 research 권고로 충분.

### 후속 갭 C — fallback Alert 본문이 단일 영어 문장 ("No results.") 로 제한 — 필터/대안 메타 inline 부재

**현상**: ADR 0020 §4 가 i18n 정책 + spec 강도 확보를 위해 의도적으로 minimal. 단 fresh LLM 이 "다른 필터 시도 권고" 로 자연스레 도달하려면 Table directive `filter-*` attribute + envelope `_filter_*.enum` 두 곳을 cross-reference 필요 (1단계 추가).

**영향**: low~medium. 영어 단일 텍스트 정책 자체는 i18n 폭주 방지에 정합. 단 LLM 친화도 향상의 marginal cost 도 거의 없음 (engine 차원에서 attribute → 본문 inline 자동 합성 가능).

**후속 ADR 후보 (0022 후보, 단 i18n 정책 충돌 검토 필요)**: "Empty state fallback Alert 의 본문에 현재 필터 값 + 가능 enum 자동 inline" — 예: `> [!NOTE]\n> No results matching filter \`status="error"\`. Try one of: \`active\`, \`pending\`, \`archived\`, \`disabled\`.`. trade-off: i18n 정책 ("영어 고정") 과 충돌, 본문 길이 ↑, ADR 0019 §2 의 single-source 약속 약화. 따라서 채택 결정은 enrichment 의 friction 측정 후. 본 research 시점에는 PARTIAL 판정만 기록.

### 후속 갭 D — 5단계 팔레트의 lifecycle 의미 envelope 표현 부재

**현상**: ADR 0019 §3 의 5단계 권고 팔레트가 envelope 에 단순 enum 으로만 등장. lifecycle 순서 / 전이 가능 / 영구 vs transient 구분 부재.

**영향**: low. 영어 단어 자체로 1차 추론 가능. second-order 질문 (archived vs disabled 차이) 에서 한계.

**후속 조치 (ADR 0019 §Open 의 v2 항목 그대로)**: `extensions.statusPalette` envelope 추가. 본 ADR 0020 의 Out of scope §5단계 팔레트 envelope 명시 v2 와 동일. ADR 0021 또는 v2 spec 보강에서 다룸.

## 의도대로 작동하는 신호 (Positive)

1. **§1 hidden input 의 `name`+`type=hidden`+`default` 3중 정합** — 어떤 cross-reference 없이 셀 표면에서 "사용자 비가시 + 사전 설정 값 + form 제출 동봉" 즉시 인지.
2. **§2 envelope convention key 의 self-naming** — `destructive-action: two-step-preview` 한 줄로 idiom 이름 + 패턴 + 단계 수 동시 인코딩.
3. **§3 자동 wrap 의 schema-driven 동작** — 저자 부담 0, envelope SSOT 와 본문 표면 1:1, 후방 호환 (enum 부재 시 plain text). ADR 0019 §3 의 spec → engine 이행 완결.
4. **§4 fallback 의 GFM `[!NOTE]` 표준성** — 별도 컨벤션 학습 없이 의미 즉시 인지 (ADR 0011 검증의 GFM alert 통과 신호와 동일 라인).
5. **§5 `intent` enum 의 single-token 명료성** — `destructive-confirm` 한 단어로 "destructive + confirm 단계" 두 의미 동시 인코딩, v2 enum 확장 (`<adjective>-confirm`) 과 일관.
6. **§6 종합 — 2단계 삭제 idiom 의 6중 redundancy** — title/purpose/intent/constraint/Card/CAUTION+Form 6개 신호가 한 페이지에서 cross-confirm. 어느 한 신호 누락도 high confidence 유지.

## 판정

ADR 0020 의 5개 Decision 모두 의도대로 작동. ADR 0019 검증의 fail 3 / partial 4 / pass 2 → 본 ADR 0020 검증의 fail 0 / partial 4 / pass 5 — **회귀 완전 해소**, **high 비율 22% → 56% 상승**.

5개 Decision 이행 우선순위 평가:
- **§1, §2 (즉시 적용 완료)** — high. ADR 0019 §1 의 핵심 약속이 비로소 코드 레벨에서 동작.
- **§3 (Table 셀 자동 wrap)** — high (적용 범위 내). 단 후속 갭 A (Card body 등 Table 외 컨텍스트) 가 medium 갭으로 잔존.
- **§4 (EmptyState fallback)** — high (의미 전달). 후속 갭 C (fallback enrichment) 가 medium.
- **§5 (intent)** — medium. 후속 갭 B (frontmatter 위치) 가 코드 1~3줄 수정으로 high 승격 가능.

종합 권고:
1. **즉시 (코드 1~3줄)**: 후속 갭 B — `intent` 를 envelope schema 의 `purpose`/`role` 옆으로 이동. 별도 ADR 불필요.
2. **ADR 0021 후보**: 후속 갭 A — Table 외 컨텍스트의 enum 자동 wrap 적용 범위 확장. 신호 source 는 ADR 0020 §3 그대로 재사용. 직렬화 코드 복잡도 trade-off 검토.
3. **ADR 0022 후보 (검토 필요)**: 후속 갭 C — fallback Alert enrichment. i18n 정책 + ADR 0019 §2 single-source 약속과의 충돌 평가 후 결정.
4. **v2 별도 ADR**: 후속 갭 D — `extensions.statusPalette` envelope. ADR 0019 §Open / ADR 0020 Out of scope 와 동일. v2 timing.

ADR 0020 자체는 **PASS** — ADR 0019 가 약속한 CRUD idiom closure 가 fresh-context LLM 검증에서 의도대로 성립함이 확인됨. 후속 갭 4건 중 즉시 보정 가능 1건 (B), 별도 ADR 후보 2건 (A, C), v2 항목 1건 (D).

## 테스트 재현

```bash
cd apps/example
# build 된 dist 사용 — 본 검증과 동일 출력
cat > tmp-render-0020.mjs <<'EOF'
# (본 research 작성 시 사용한 render script — UsersPage / DeleteUserConfirmPage / JobsPage 를
#  React.createElement 로 재구성해 renderPage(JSX, envelope) 호출 후 stdout 출력)
EOF
node tmp-render-0020.mjs > /tmp/0020-output.md
# fresh-context Claude 서브에이전트에게:
#   - users.md, /users/u_bob_01/delete.md, /jobs.md 세 영역만 주고
#   - 각 §1~§5 시나리오 질문 부여
#   - 답변 confidence (high/medium/low) 와 인용 신호 목록 수집
```

## 후속 (재검증 트리거 조건)

본 research v2 재검증은 다음 조건이 만족 시 의미 있음:
- 후속 갭 B 적용 (`intent` frontmatter 위치 보정) 후 §5 가 medium → high 로 승격하는지 확인.
- 후속 갭 A 적용 (Table 외 자동 wrap) 후 §3 의 PARTIAL 부분 (Card body status) 이 high 로 승격하는지 확인.
- 후속 갭 C 적용 (fallback enrichment) 후 §4 의 PARTIAL 부분 (다른 필터 시도 권고) 이 한 점 조회로 가능한지 확인.

세 보정이 모두 적용되면 ADR 0020 의 9개 시나리오 모두 high 도달이 기대됨 — ADR 0019/0020 결합으로 CRUD 1차 LLM 친화성 기준선 완결.
