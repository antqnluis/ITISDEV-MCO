import { expect, test } from "vitest";
import { buildWellnessPlanData } from "./wellnessPlanData.js";

test("buildWellnessPlanData returns a structured plan from latest check-in data", () => {
  const plan = buildWellnessPlanData({
    student: { first_name: "Pauline", last_name: "Reyes" },
    profile: { college: "CCS" },
    latestCheckIn: {
      week_start: "2026-07-20",
      submitted_at: "2026-07-28T07:00:00.000Z",
      stress_level: 5,
      mood_level: 2,
      sleep_quality: 2,
      motivation_level: 3,
      burnout_level: 5,
      energy_level: 2,
      reflection: "Heavy workload",
    },
    latestScore: {
      academic_engagement_score: 91,
      personal_wellbeing_score: 92,
      logistical_load_score: 82,
      role_load_score: 94,
      course_environment_score: 81,
    },
    history: [
      {
        id: "check-in-1",
        week_start: "2026-07-13",
        submitted_at: "2026-07-20T07:00:00.000Z",
        reflection: "Steady week",
      },
    ],
  });

  expect(plan.studentWellnessIndex).toBe(37);
  expect(plan.stressSeverityLevel).toBe("Severe");
  expect(plan.primaryStressContext).toBe("Academic overload and recovery pressure");
  expect(plan.priorities).toHaveLength(3);
  expect(plan.actions[0].title).toBe("Protect recovery time");
  expect(plan.previousPlans).toHaveLength(1);
});
