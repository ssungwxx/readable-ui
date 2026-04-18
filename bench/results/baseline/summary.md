# readable-ui bench — 2026-04-18T05-04-18-922Z

- git: `5a60c7c`
- node: `v22.14.0`
- transports: readable-ui, ax-tree, headful-md
- scenarios: 7

## Per-scenario results

### `home` — /

> 이 사이트에서 Users 관리 페이지로 이동하려면 어떤 링크를 눌러야 하지?

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | — | — | — | — | — | — | — |
| ax-tree | 63719 | 63674 | 15991 | 4.7 | 12 | 1332.58 | — |
| headful-md | 1135 | 1120 | 312 | 0.1 | 0 | — | — |

### `dashboard` — /dashboard

> 최근 활동 4건 중 `rotateKey` 이벤트의 타깃 리소스를 알려줘.

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | 2672 | 2667 | 793 | 7.5 | 5 | 158.60 | 1 |
| ax-tree | 80545 | 80539 | 20359 | 4.3 | 11 | 1850.82 | 25.67 |
| headful-md | 914 | 912 | 334 | 0.1 | 1 | 334 | 0.42 |

### `users` — /users

> status 가 active 인 user 목록을 정렬 키 `createdAt:desc` 로 다음 페이지까지 보려면 어떤 호출을 해야 하지?

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | 5386 | 5367 | 1494 | 7.6 | 13 | 114.92 | 1 |
| ax-tree | 132092 | 131959 | 34060 | 4.8 | 29 | 1174.48 | 22.80 |
| headful-md | 1155 | 1132 | 425 | 0.2 | 4 | 106.25 | 0.28 |

### `user-detail` — /users/u_alice_01

> 이 사용자 계정을 삭제하려면 어떤 버튼 흐름을 거치지? preview 단계 tool 이름도 알려줘.

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | 3132 | 3127 | 927 | 8.0 | 3 | 309 | 1 |
| ax-tree | 85859 | 85821 | 22328 | 4.6 | 10 | 2232.80 | 24.09 |
| headful-md | 719 | 703 | 275 | 0.1 | 3 | 91.67 | 0.30 |

### `reports` — /reports

> Revenue by plan 표에서 MRR 이 가장 큰 plan 의 id 와 customers 수를 알려줘.

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | 4834 | 4805 | 1504 | 6.5 | 8 | 188 | 1 |
| ax-tree | 178220 | 178137 | 46406 | 7.9 | 15 | 3093.73 | 30.86 |
| headful-md | 1723 | 1690 | 666 | 0.2 | 1 | 666 | 0.44 |

### `audit` — /audit

> actor=alice@example.com 필터 상태에서 최근 10건 중 `rotateKey` 액션의 건수는?

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | 35162 | 35035 | 13164 | 7.4 | 5 | 2632.80 | 1 |
| ax-tree | 106360 | 106302 | 27813 | 5.1 | 17 | 1636.06 | 2.11 |
| headful-md | 1195 | 1179 | 425 | 0.1 | 0 | — | 0.03 |

### `jobs` — /jobs

> status=error 필터 결과가 비어 있다는 사실을 확인하고, 사용 가능한 전체 상태 팔레트 5개를 나열해줘.

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | 2153 | 2148 | 608 | 6.1 | 0 | — | 1 |
| ax-tree | 69025 | 69016 | 17880 | 3.8 | 12 | 1490 | 29.41 |
| headful-md | 744 | 741 | 245 | 0.1 | 0 | — | 0.40 |

## Across-scenario summary

| transport | metric | median | mean | min | max |
|---|---|---:|---:|---:|---:|
| readable-ui | bytes | 3983 | 8889.83 | 2153 | 35162 |
| readable-ui | chars | 3966 | 8858.17 | 2148 | 35035 |
| readable-ui | tokens | 1210.50 | 3081.67 | 608 | 13164 |
| readable-ui | renderTimeMs | 7.42 | 7.16 | 6.08 | 7.96 |
| readable-ui | actionable | 5 | 5.67 | 0 | 13 |
| ax-tree | bytes | 85859 | 102260 | 63719 | 178220 |
| ax-tree | chars | 85821 | 102206.86 | 63674 | 178137 |
| ax-tree | tokens | 22328 | 26405.29 | 15991 | 46406 |
| ax-tree | renderTimeMs | 4.69 | 5.02 | 3.75 | 7.93 |
| ax-tree | actionable | 12 | 15.14 | 10 | 29 |
| headful-md | bytes | 1135 | 1083.57 | 719 | 1723 |
| headful-md | chars | 1120 | 1068.14 | 703 | 1690 |
| headful-md | tokens | 334 | 383.14 | 245 | 666 |
| headful-md | renderTimeMs | 0.13 | 0.14 | 0.06 | 0.25 |
| headful-md | actionable | 1 | 1.29 | 0 | 4 |

## Takeaways

- ax-tree uses 2148.9% more tokens than readable-ui across 6 scenarios (mean sizeRatio 22.49, median 24.88).
- headful-md uses 68.7% fewer tokens than readable-ui across 6 scenarios (mean sizeRatio 0.31, median 0.35).
- readable-ui skipped 1 scenario(s): home (no .md envelope route).
