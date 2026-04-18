# readable-ui bench — 2026-04-18T03-33-45-531Z

- git: `5bd03ea`
- node: `v22.14.0`
- transports: readable-ui, ax-tree, headful-md
- scenarios: 7

## Per-scenario results

### `home` — /

> 이 사이트에서 Users 관리 페이지로 이동하려면 어떤 링크를 눌러야 하지?

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | — | — | — | — | — | — | — |
| ax-tree | 63632 | 63587 | 15968 | 9.9 | 12 | 1330.67 | — |
| headful-md | 1106 | 1091 | 305 | 0.1 | 0 | — | — |

### `dashboard` — /dashboard

> 최근 활동 4건 중 `rotateKey` 이벤트의 타깃 리소스를 알려줘.

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | 2672 | 2667 | 793 | 6.5 | 5 | 158.60 | 1 |
| ax-tree | 80545 | 80539 | 20361 | 11.2 | 11 | 1851 | 25.68 |
| headful-md | 914 | 912 | 334 | 0.1 | 1 | 334 | 0.42 |

### `users` — /users

> status 가 active 인 user 목록을 정렬 키 `createdAt:desc` 로 다음 페이지까지 보려면 어떤 호출을 해야 하지?

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | 5386 | 5367 | 1494 | 6.5 | 13 | 114.92 | 1 |
| ax-tree | 132092 | 131959 | 34063 | 12.1 | 29 | 1174.59 | 22.80 |
| headful-md | 1155 | 1132 | 425 | 0.2 | 4 | 106.25 | 0.28 |

### `user-detail` — /users/u_alice_01

> 이 사용자 계정을 삭제하려면 어떤 버튼 흐름을 거치지? preview 단계 tool 이름도 알려줘.

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | 3055 | 3050 | 907 | 7.1 | 3 | 302.33 | 1 |
| ax-tree | 84274 | 84236 | 21921 | 6.0 | 10 | 2192.10 | 24.17 |
| headful-md | 705 | 689 | 271 | 0.1 | 3 | 90.33 | 0.30 |

### `reports` — /reports

> Revenue by plan 표에서 MRR 이 가장 큰 plan 의 id 와 customers 수를 알려줘.

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | 4052 | 4044 | 1197 | 5.3 | 8 | 149.63 | 1 |
| ax-tree | 128665 | 128636 | 33358 | 11.4 | 15 | 2223.87 | 27.87 |
| headful-md | 1518 | 1507 | 526 | 0.1 | 1 | 526 | 0.44 |

### `audit` — /audit

> actor=alice@example.com 필터 상태에서 최근 10건 중 `rotateKey` 액션의 건수는?

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | 35162 | 35035 | 13164 | 6.1 | 5 | 2632.80 | 1 |
| ax-tree | 106360 | 106302 | 27794 | 3.9 | 17 | 1634.94 | 2.11 |
| headful-md | 1195 | 1179 | 425 | 0.1 | 0 | — | 0.03 |

### `jobs` — /jobs

> status=error 필터 결과가 비어 있다는 사실을 확인하고, 사용 가능한 전체 상태 팔레트 5개를 나열해줘.

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | 2153 | 2148 | 608 | 4.8 | 0 | — | 1 |
| ax-tree | 69025 | 69016 | 17885 | 8.1 | 12 | 1490.42 | 29.42 |
| headful-md | 744 | 741 | 245 | 0.1 | 0 | — | 0.40 |

## Across-scenario summary

| transport | metric | median | mean | min | max |
|---|---|---:|---:|---:|---:|
| readable-ui | bytes | 3553.50 | 8746.67 | 2153 | 35162 |
| readable-ui | chars | 3547 | 8718.50 | 2148 | 35035 |
| readable-ui | tokens | 1052 | 3027.17 | 608 | 13164 |
| readable-ui | renderTimeMs | 6.31 | 6.06 | 4.80 | 7.07 |
| readable-ui | actionable | 5 | 5.67 | 0 | 13 |
| ax-tree | bytes | 84274 | 94941.86 | 63632 | 132092 |
| ax-tree | chars | 84236 | 94896.43 | 63587 | 131959 |
| ax-tree | tokens | 21921 | 24478.57 | 15968 | 34063 |
| ax-tree | renderTimeMs | 9.93 | 8.93 | 3.91 | 12.07 |
| ax-tree | actionable | 12 | 15.14 | 10 | 29 |
| headful-md | bytes | 1106 | 1048.14 | 705 | 1518 |
| headful-md | chars | 1091 | 1035.86 | 689 | 1507 |
| headful-md | tokens | 334 | 361.57 | 245 | 526 |
| headful-md | renderTimeMs | 0.08 | 0.10 | 0.07 | 0.18 |
| headful-md | actionable | 1 | 1.29 | 0 | 4 |

## Takeaways

- ax-tree uses 2100.7% more tokens than readable-ui on average across 6 scenarios (mean sizeRatio 22.01).
- headful-md uses 68.7% fewer tokens than readable-ui on average across 6 scenarios (mean sizeRatio 0.31).
- readable-ui skipped 1 scenario(s): home (no .md envelope route).
