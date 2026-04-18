# readable-ui bench — 2026-04-18T07-03-04-354Z

- git: `7e536b6`
- node: `v22.14.0`
- transports: readable-ui, ax-tree, headful-md
- scenarios: 7

## Per-scenario results

### `home` — /

> 이 사이트에서 Users 관리 페이지로 이동하려면 어떤 링크를 눌러야 하지?

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | — | — | — | — | — | — | — |
| ax-tree | 84631 | 84554 | 22687 | 5.4 | 16 | 1417.94 | — |
| headful-md | 1476 | 1453 | 417 | 0.1 | 0 | — | — |

### `dashboard` — /dashboard

> 최근 활동 4건 중 `rotateKey` 이벤트의 타깃 리소스를 알려줘.

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | 2816 | 2811 | 829 | 7.0 | 5 | 165.80 | 1 |
| ax-tree | 86765 | 86759 | 23255 | 9.9 | 13 | 1788.85 | 28.05 |
| headful-md | 936 | 934 | 340 | 0.1 | 1 | 340 | 0.41 |

### `users` — /users

> status 가 active 인 user 목록을 정렬 키 `createdAt:desc` 로 다음 페이지까지 보려면 어떤 호출을 해야 하지?

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | 5530 | 5511 | 1530 | 6.7 | 13 | 117.69 | 1 |
| ax-tree | 139693 | 139560 | 37387 | 16.2 | 31 | 1206.03 | 24.44 |
| headful-md | 1177 | 1154 | 431 | 0.2 | 4 | 107.75 | 0.28 |

### `user-detail` — /users/u_alice_01

> 이 사용자 계정을 삭제하려면 어떤 버튼 흐름을 거치지? preview 단계 tool 이름도 알려줘.

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | 3276 | 3271 | 963 | 7.0 | 3 | 321 | 1 |
| ax-tree | 88914 | 88876 | 23883 | 4.5 | 10 | 2388.30 | 24.80 |
| headful-md | 719 | 703 | 275 | 0.1 | 3 | 91.67 | 0.29 |

### `reports` — /reports

> Revenue by plan 표에서 MRR 이 가장 큰 plan 의 id 와 customers 수를 알려줘.

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | 4978 | 4949 | 1540 | 5.7 | 8 | 192.50 | 1 |
| ax-tree | 188054 | 187971 | 50478 | 17.0 | 17 | 2969.29 | 32.78 |
| headful-md | 1745 | 1712 | 672 | 0.1 | 1 | 672 | 0.44 |

### `audit` — /audit

> actor=alice@example.com 필터 상태에서 최근 10건 중 `rotateKey` 액션의 건수는?

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | 35306 | 35179 | 13200 | 5.7 | 5 | 2640 | 1 |
| ax-tree | 112862 | 112804 | 30397 | 10.0 | 19 | 1599.84 | 2.30 |
| headful-md | 1217 | 1201 | 431 | 0.1 | 0 | — | 0.03 |

### `jobs` — /jobs

> status=error 필터 결과가 비어 있다는 사실을 확인하고, 사용 가능한 전체 상태 팔레트 5개를 나열해줘.

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | 2297 | 2292 | 644 | 4.7 | 0 | — | 1 |
| ax-tree | 74125 | 74116 | 19818 | 6.9 | 14 | 1415.57 | 30.77 |
| headful-md | 766 | 763 | 251 | 0.0 | 0 | — | 0.39 |

## Across-scenario summary

| transport | metric | median | mean | min | max |
|---|---|---:|---:|---:|---:|
| readable-ui | bytes | 4127 | 9033.83 | 2297 | 35306 |
| readable-ui | chars | 4110 | 9002.17 | 2292 | 35179 |
| readable-ui | tokens | 1246.50 | 3117.67 | 644 | 13200 |
| readable-ui | renderTimeMs | 6.18 | 6.12 | 4.74 | 7.01 |
| readable-ui | actionable | 5 | 5.67 | 0 | 13 |
| ax-tree | bytes | 88914 | 110720.57 | 74125 | 188054 |
| ax-tree | chars | 88876 | 110662.86 | 74116 | 187971 |
| ax-tree | tokens | 23883 | 29700.71 | 19818 | 50478 |
| ax-tree | renderTimeMs | 9.90 | 10.00 | 4.55 | 16.98 |
| ax-tree | actionable | 16 | 17.14 | 10 | 31 |
| headful-md | bytes | 1177 | 1148 | 719 | 1745 |
| headful-md | chars | 1154 | 1131.43 | 703 | 1712 |
| headful-md | tokens | 417 | 402.43 | 251 | 672 |
| headful-md | renderTimeMs | 0.09 | 0.10 | 0.05 | 0.16 |
| headful-md | actionable | 1 | 1.29 | 0 | 4 |

## Takeaways

- ax-tree uses 2285.7% more tokens than readable-ui across 6 scenarios (mean sizeRatio 23.86, median 26.43).
- headful-md uses 69.4% fewer tokens than readable-ui across 6 scenarios (mean sizeRatio 0.31, median 0.34).
- readable-ui skipped 1 scenario(s): home (no .md envelope route).
