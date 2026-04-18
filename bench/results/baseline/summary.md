# readable-ui bench — 2026-04-18T06-06-43-127Z

- git: `bc9c941`
- node: `v22.14.0`
- transports: readable-ui, ax-tree, headful-md
- scenarios: 7

## Per-scenario results

### `home` — /

> 이 사이트에서 Users 관리 페이지로 이동하려면 어떤 링크를 눌러야 하지?

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | — | — | — | — | — | — | — |
| ax-tree | 80820 | 80743 | 20310 | 4.4 | 16 | 1269.38 | — |
| headful-md | 1476 | 1453 | 417 | 0.1 | 0 | — | — |

### `dashboard` — /dashboard

> 최근 활동 4건 중 `rotateKey` 이벤트의 타깃 리소스를 알려줘.

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | 2816 | 2811 | 829 | 7.3 | 5 | 165.80 | 1 |
| ax-tree | 83137 | 83131 | 20998 | 4.8 | 13 | 1615.23 | 25.33 |
| headful-md | 936 | 934 | 340 | 0.1 | 1 | 340 | 0.41 |

### `users` — /users

> status 가 active 인 user 목록을 정렬 키 `createdAt:desc` 로 다음 페이지까지 보려면 어떤 호출을 해야 하지?

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | 5530 | 5511 | 1530 | 6.9 | 13 | 117.69 | 1 |
| ax-tree | 134702 | 134569 | 34719 | 6.1 | 31 | 1119.97 | 22.69 |
| headful-md | 1177 | 1154 | 431 | 0.2 | 4 | 107.75 | 0.28 |

### `user-detail` — /users/u_alice_01

> 이 사용자 계정을 삭제하려면 어떤 버튼 흐름을 거치지? preview 단계 tool 이름도 알려줘.

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | 3276 | 3271 | 963 | 7.9 | 3 | 321 | 1 |
| ax-tree | 85859 | 85821 | 22293 | 4.5 | 10 | 2229.30 | 23.15 |
| headful-md | 719 | 703 | 275 | 0.1 | 3 | 91.67 | 0.29 |

### `reports` — /reports

> Revenue by plan 표에서 MRR 이 가장 큰 plan 의 id 와 customers 수를 알려줘.

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | 4978 | 4949 | 1540 | 6.3 | 8 | 192.50 | 1 |
| ax-tree | 180830 | 180747 | 47061 | 8.7 | 17 | 2768.29 | 30.56 |
| headful-md | 1745 | 1712 | 672 | 0.1 | 1 | 672 | 0.44 |

### `audit` — /audit

> actor=alice@example.com 필터 상태에서 최근 10건 중 `rotateKey` 액션의 건수는?

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | 35306 | 35179 | 13200 | 6.6 | 5 | 2640 | 1 |
| ax-tree | 108970 | 108912 | 28459 | 5.0 | 19 | 1497.84 | 2.16 |
| headful-md | 1217 | 1201 | 431 | 0.1 | 0 | — | 0.03 |

### `jobs` — /jobs

> status=error 필터 결과가 비어 있다는 사실을 확인하고, 사용 가능한 전체 상태 팔레트 5개를 나열해줘.

| transport | bytes | chars | tokens | renderTimeMs | actionable | infoDensity | sizeRatio |
|---|---:|---:|---:|---:|---:|---:|---:|
| readable-ui | 2297 | 2292 | 644 | 6.0 | 0 | — | 1 |
| ax-tree | 71635 | 71626 | 18531 | 5.0 | 14 | 1323.64 | 28.77 |
| headful-md | 766 | 763 | 251 | 0.1 | 0 | — | 0.39 |

## Across-scenario summary

| transport | metric | median | mean | min | max |
|---|---|---:|---:|---:|---:|
| readable-ui | bytes | 4127 | 9033.83 | 2297 | 35306 |
| readable-ui | chars | 4110 | 9002.17 | 2292 | 35179 |
| readable-ui | tokens | 1246.50 | 3117.67 | 644 | 13200 |
| readable-ui | renderTimeMs | 6.75 | 6.85 | 6.05 | 7.94 |
| readable-ui | actionable | 5 | 5.67 | 0 | 13 |
| ax-tree | bytes | 85859 | 106564.71 | 71635 | 180830 |
| ax-tree | chars | 85821 | 106507 | 71626 | 180747 |
| ax-tree | tokens | 22293 | 27481.57 | 18531 | 47061 |
| ax-tree | renderTimeMs | 4.98 | 5.50 | 4.40 | 8.75 |
| ax-tree | actionable | 16 | 17.14 | 10 | 31 |
| headful-md | bytes | 1177 | 1148 | 719 | 1745 |
| headful-md | chars | 1154 | 1131.43 | 703 | 1712 |
| headful-md | tokens | 417 | 402.43 | 251 | 672 |
| headful-md | renderTimeMs | 0.12 | 0.12 | 0.06 | 0.23 |
| headful-md | actionable | 1 | 1.29 | 0 | 4 |

## Takeaways

- ax-tree uses 2111.0% more tokens than readable-ui across 6 scenarios (mean sizeRatio 22.11, median 24.24).
- headful-md uses 69.4% fewer tokens than readable-ui across 6 scenarios (mean sizeRatio 0.31, median 0.34).
- readable-ui skipped 1 scenario(s): home (no .md envelope route).
