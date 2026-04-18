# ADR 0018 — Detail view (Read-one / show) 관용구

- Status: Proposed
- Date: 2026-04-18
- Related: [ADR 0007](./0007-layout-and-component-catalog.md), [ADR 0009](./0009-envelope-extensions-and-serialization-refinements.md), [ADR 0015](./0015-table-as-container-directive.md), [ADR 0016](./0016-form-default-value-convention.md)

## Context

readable-ui CRUD 중 **R(단건) — read-one / show** 을 위한 정식 관용구가 부재. admin 자동화 시나리오에서 단건 상세는 목록 진입 직후, 수정 폼 열기 전, Delete 확인 직전에 반복 등장하나 v1 카탈로그의 어떤 컴포넌트도 "필드:값 쌍"을 고유 의미로 담지 않는다.

현 관행 두 가지:
1. `Card + Heading + List + ListItem` 에 `**Email**: alice@x.com` 패턴 반복 — spec 미명문화, LLM·사람 각자 다른 형태.
2. `Table`을 2열(Field | Value) transpose — ADR 0015로 "페이지네이션 가능한 목록" 의미가 굳어 있어 단건 상세와 혼동.

## Decision

### 1. 단건 상세는 정식 관용구 1개로 고정 (신규 컴포넌트 미도입)

v1 카탈로그는 닫힌 집합(ADR 0007 §7), 본 ADR은 새 directive 등록 안 함. 대신 `component-catalog.md` §공통규약에 "단건 상세 관용구" 소절 정식 기재.

**Canonical form**:

```markdown
:::card{title="Details"}
- **Email**: alice@example.com
- **Role**: admin
- **Status**: active
- **Created**: 2026-04-12
:::
```

대응 JSX:

```tsx
<Card title="Details">
  <List>
    <ListItem><Strong>Email</Strong>: alice@example.com</ListItem>
    <ListItem><Strong>Role</Strong>: admin</ListItem>
  </List>
</Card>
```

### 2. 구성 규약

- 컨테이너: `Card`. title은 `"Details"` 또는 의미 제목. Section 단독도 허용.
- 리스트: unordered. task list 금지, ordered 금지.
- 각 ListItem: `Strong(field) + ": " + valueInline` 인라인 패턴 고정. valueInline은 `text`/`Emphasis`/`Strong`/`CodeSpan`/`Link` 조합. 추가 directive 금지.
- 필드 라벨: 문장 케이스, 단수 명사. DB 컬럼명(`user_email`) 금지.
- 빈 값: `*none*`. `null`/`-`/`"—"` 혼용 금지.
- 긴 값: 한 문장 초과 시 별도 Card/Section 분리.
- 관계: 내부 nested List 1단계 허용. 그 이상 금지.
- Action: Card 바깥 형제 레벨에 Button/Form. Card 내부 인라인 Button 금지.

### 3. Table 2열 transpose는 단건 상세 용도 사용 금지

ADR 0015가 `:::table{tool=X page=N ...}`에 "목록 재호출 컨테이너" 의미를 부여. 동일 directive가 "단일 레코드 덤프" 의미까지 겹치면 `tool` 속성 유무로 분기 필요, LLM 오분류 위험. 금지.

### 4. 편의 헬퍼는 카탈로그 밖에서만

예시 앱·docs 샘플에서 순수 JSX 헬퍼 제공 허용 (`defineDualComponent` 호출 안 함 → 카탈로그 확장 아님):

```tsx
function Details({ title = "Details", fields }: { title?: string; fields: Array<{ label: string; value: ReactNode }> }) {
  return (
    <Card title={title}>
      <List>
        {fields.map((f) => (
          <ListItem key={f.label}>
            <Strong>{f.label}</Strong>: {f.value}
          </ListItem>
        ))}
      </List>
    </Card>
  );
}
```

직렬화 결과는 §1 canonical form과 **바이트 단위 동일**해야 한다. `@readable-ui/react/components` export 대상 아님.

### 5. 빈 상세·누락 필드

- 리소스 없음(404): Card 내보내지 않고 `Alert{kind:"warning"}`로 표시. 본 ADR scope 외.
- 필드 일부 누락: `*none*` 명시. ListItem을 제거하지 않는다(LLM이 "필드 자체 없음"으로 오해 방지).

### 6. U(Update) 와의 연결

단건 상세 Card 바로 뒤에 `Form{action=updateUser}` 배치 권장. Form 내부 Input은 ADR 0016의 `default`로 현재 값 주입. 상세 Card("읽기 표현") + Form("수정 입력") 역할 분리.

## Consequences

**Positive**: R(단건) 닫힘. 기존 원소 재사용 — 코드 변경 없음. GFM 파서 미지원 뷰어에서도 가독. ADR 0015 의미 오버로드 제거. v2에서 `:::describe` 승격 여지 열림.

**Negative**: 런타임 강제 없음 — lint로 보강 필요. 헬퍼를 카탈로그 밖에 두어 DX 약간 희생. 2열 Table 금지 감지 불가.

**Neutral**: `:::card{title=Details}`는 기존 directive 재사용. 새 예약어·attribute 없음. `Strong`을 인라인 키로 쓰는 관용구는 사실상 표준.

## Alternatives considered

1. **신규 `DescribeList`/`FieldList`**: ADR 0007 개정 필요. 새 예약어·파서 복잡도. 이득 불명확. 기각.
2. **2열 Table transpose**: ADR 0015 `tool`/`page`/`sort`와 직접 충돌. 기각.
3. **Definition list(`<dl>`)**: GFM 표준 아님. 파서 의존 추가. 뷰어 호환성 저하. 기각.
4. **envelope `resource` 필드 신설**: 유용하나 envelope 역할 재정의 필요. 범위 초과. 별도 ADR.

## Migration

- 코드 변경 없음.
- `docs/spec/component-catalog.md` §공통규약 뒤에 "8. 단건 상세 관용구 (ADR 0018)" 소절. §Table "제약"에 "2열 transpose를 단건 상세 용도 사용 금지 — ADR 0018" 1줄.
- `docs/README.md` Accepted ADRs에 ADR 0018 행.

**`*none*` 표기 세부 규범 (ADR 0019에서 강화)**: 별표 1쌍, 괄호 없음, 소문자, 영어 고정. `*None*`/`*NONE*`/`*"none"*`/`(none)`/`null`/`—`/`N/A` 전면 금지. 로케일 번역은 v1 금지 (후속 ADR 대상).

## Open

- v2 `:::describe` + envelope `resource` 짝 승격 여부.
- 단건 상세 lint 규칙(2열 Table + 목록성 데이터 감지 → warning).
- Delete 확인 관용구(Item 4)와의 결합 재평가 → ADR 0019로 해소 완료.
