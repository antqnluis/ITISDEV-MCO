import { describe, expect, test } from "vitest";
import {
  buildWellnessPlanData,
  WELLNESS_PLAN_CRITICAL_DEMO_INPUT,
  WELLNESS_PLAN_DEMO_INPUT,
  WELLNESS_PLAN_SEVERE_DEMO_INPUT,
} from "./wellnessPlanData.js";

const dimensionFields = {
  academic_engagement_score: 91,
  personal_wellbeing_score: 92,
  logistical_load_score: 82,
  role_load_score: 94,
  course_environment_score: 81,
};

describe("buildWellnessPlanData", () => {
  test("treats higher dimension scores as greater concern", () => {
    const plan = buildWellnessPlanData({
      latestCheckIn: {
        week_start: "2026-07-20",
        submitted_at: "2026-07-28T07:00:00.000Z",
        reflection: "Heavy workload",
      },
      latestScore: dimensionFields,
      history: [
        {
          id: "check-in-1",
          week_start: "2026-07-13",
          submitted_at: "2026-07-20T07:00:00.000Z",
          reflection: "Steady week",
        },
      ],
    });

    expect(plan.studentWellnessIndex).toBe(88);
    expect(plan.riskCategory).toBe("high");
    expect(plan.stressSeverityLevel).toBe("severe");
    expect(plan.primaryStressContext).toBe("mixed");
    expect(plan.priorities).toEqual([
      "Role Load",
      "Personal Wellbeing",
      "Academic Engagement",
    ]);
    expect(plan.dimensions[0].explanation).toContain("high concern");
    expect(plan.actions[0]).toMatchObject({
      title: "Ask for help with one responsibility",
      dimension: "Role Load",
    });
    expect(plan.checkInHistory).toHaveLength(1);
  });

  test("uses the documented low and moderate concern ranges", () => {
    const lowPlan = buildWellnessPlanData({
      latestScore: {
        academic_engagement_score: 10,
        personal_wellbeing_score: 20,
        logistical_load_score: 15,
        role_load_score: 5,
        course_environment_score: 0,
      },
    });
    const moderatePlan = buildWellnessPlanData({
      latestScore: {
        academic_engagement_score: 50,
        personal_wellbeing_score: 60,
        logistical_load_score: 40,
        role_load_score: 45,
        course_environment_score: 55,
      },
    });

    expect(lowPlan.studentWellnessIndex).toBe(10);
    expect(lowPlan.riskCategory).toBe("low");
    expect(lowPlan.stressSeverityLevel).toBe("low_normal");
    expect(lowPlan.dimensions[0].explanation).toContain("low concern");
    expect(moderatePlan.studentWellnessIndex).toBe(50);
    expect(moderatePlan.riskCategory).toBe("moderate");
    expect(moderatePlan.stressSeverityLevel).toBe("moderate");
    expect(moderatePlan.primaryStressContext).toBe("personal_wellbeing");
  });

  test("normalizes numeric strings and clamps scores to the supported range", () => {
    const plan = buildWellnessPlanData({
      latestScore: {
        academic_engagement_score: "120",
        personal_wellbeing_score: "-5",
        logistical_load_score: "50",
        role_load_score: 80,
        course_environment_score: 30,
      },
    });

    expect(plan.dimensions.map(({ score }) => score)).toEqual([100, 0, 50, 80, 30]);
    expect(plan.studentWellnessIndex).toBe(52);
    expect(plan.riskCategory).toBe("moderate");
    expect(plan.priorities).toEqual([
      "Academic Engagement",
      "Role Load",
      "Logistical Load",
    ]);
  });

  test("returns pending analysis values instead of fabricating missing scores", () => {
    const plan = buildWellnessPlanData({
      latestCheckIn: {
        week_start: "2026-07-20",
      },
      latestScore: {
        academic_engagement_score: 25,
        personal_wellbeing_score: "not-a-score",
      },
    });

    expect(plan.studentWellnessIndex).toBeNull();
    expect(plan.riskCategory).toBe("pending");
    expect(plan.stressSeverityLevel).toBe("pending");
    expect(plan.primaryStressContext).toBeNull();
    expect(plan.dimensions[1].score).toBeNull();
    expect(plan.summary).toContain("once all five concern dimensions are calculated");
  });

  test("provides a complete and internally consistent demo fixture", () => {
    const plan = buildWellnessPlanData(WELLNESS_PLAN_DEMO_INPUT);

    expect(plan.weekCovered).not.toBe("Week unavailable");
    expect(plan.generatedAt).not.toBe("Pending");
    expect(plan.studentWellnessIndex).toBe(88);
    expect(plan.dimensions).toHaveLength(5);
    expect(plan.priorities).toHaveLength(3);
    expect(plan.actions).toHaveLength(3);
    expect(plan.checkInHistory).toHaveLength(1);
  });

  test("supports explicit severe and critical frontend demo fixtures", () => {
    const severePlan = buildWellnessPlanData(WELLNESS_PLAN_SEVERE_DEMO_INPUT);
    const criticalPlan = buildWellnessPlanData(WELLNESS_PLAN_CRITICAL_DEMO_INPUT);

    expect(WELLNESS_PLAN_DEMO_INPUT).toBe(WELLNESS_PLAN_SEVERE_DEMO_INPUT);
    expect(severePlan.stressSeverityLevel).toBe("severe");
    expect(criticalPlan.stressSeverityLevel).toBe("critical");
    expect(criticalPlan.riskCategory).toBe("high");
  });

  test("ignores unsupported demo severity overrides", () => {
    const plan = buildWellnessPlanData({
      demoSeverity: "unsupported",
      latestScore: {
        academic_engagement_score: 10,
        personal_wellbeing_score: 20,
        logistical_load_score: 15,
        role_load_score: 5,
        course_environment_score: 0,
      },
    });

    expect(plan.stressSeverityLevel).toBe("low_normal");
  });
});
