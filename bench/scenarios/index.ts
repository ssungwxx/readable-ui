// Scenario set for the bench harness.
// Spec: bench/docs/metrics.md §2 — 7 scenarios reusing apps/example routes.

import type { BenchScenario } from "../src/types.js";

export const scenarios: readonly BenchScenario[] = [
  {
    id: "home",
    url: "/",
    title: "readable-ui example",
    taskDescription:
      "이 사이트에서 Users 관리 페이지로 이동하려면 어떤 링크를 눌러야 하지?",
  },
  {
    id: "dashboard",
    url: "/dashboard",
    title: "Admin dashboard",
    taskDescription:
      "최근 활동 4건 중 `rotateKey` 이벤트의 타깃 리소스를 알려줘.",
  },
  {
    id: "users",
    url: "/users",
    title: "User management",
    taskDescription:
      "status 가 active 인 user 목록을 정렬 키 `createdAt:desc` 로 다음 페이지까지 보려면 어떤 호출을 해야 하지?",
  },
  {
    id: "user-detail",
    url: "/users/u_alice_01",
    title: "User detail (Alice)",
    taskDescription:
      "이 사용자 계정을 삭제하려면 어떤 버튼 흐름을 거치지? preview 단계 tool 이름도 알려줘.",
  },
  {
    id: "reports",
    url: "/reports",
    title: "Reports",
    taskDescription:
      "Revenue by plan 표에서 MRR 이 가장 큰 plan 의 id 와 customers 수를 알려줘.",
  },
  {
    id: "audit",
    url: "/audit",
    title: "Audit log",
    taskDescription:
      "actor=alice@example.com 필터 상태에서 최근 10건 중 `rotateKey` 액션의 건수는?",
  },
  {
    id: "jobs",
    url: "/jobs",
    title: "Background jobs",
    taskDescription:
      "status=error 필터 결과가 비어 있다는 사실을 확인하고, 사용 가능한 전체 상태 팔레트 5개를 나열해줘.",
  },
] as const;

export function scenarioById(id: string): BenchScenario | undefined {
  return scenarios.find((s) => s.id === id);
}
