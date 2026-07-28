import test from "node:test";
import assert from "node:assert/strict";
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

  assert.equal(plan.studentWellnessIndex, 24);
  assert.equal(plan.stressSeverityLevel, "Critical");
  assert.equal(plan.primaryStressContext, "Academic overload and recovery pressure");
  assert.equal(plan.priorities.length, 3);
  assert.equal(plan.actions[0].title, "Protect recovery time");
  assert.equal(plan.previousPlans.length, 1);
});
