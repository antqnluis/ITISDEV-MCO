import { describe, expect, test } from "vitest";
import {
  buildWellnessPlanData,
  isAnalysisCurrent,
} from "./wellnessPlanData.js";

const latestCheckIn = {
  id: "check-in-current",
  week_start: "2026-07-20",
  submitted_at: "2026-07-28T07:00:00.000Z",
  updated_at: "2026-07-28T07:00:00.000Z",
  reflection: "Heavy workload and limited sleep.",
};

const latestScore = {
  id: "score-current",
  check_in_id: latestCheckIn.id,
  academic_engagement_score: 54,
  personal_wellbeing_score: 82.5,
  logistical_load_score: 63.7,
  role_load_score: 76.36,
  course_environment_score: 74.38,
  calculated_at: "2026-07-28T07:05:00.000Z",
  updated_at: "2026-07-28T07:05:00.000Z",
};

const aiResult = {
  id: "analysis-current",
  check_in_id: latestCheckIn.id,
  dimension_scores_id: latestScore.id,
  swi_score: "71.08",
  risk_category: "high",
  stress_severity_level: "severe",
  primary_stress_context: "mixed",
  weekly_summary: "The live AI summary identifies several competing pressures.",
  reflection_keywords: ["deadlines", "sleep", "workload"],
  recommendations: [
    "Protect one recovery block this evening.",
    "Ask an instructor about sequencing the closest deadlines.",
  ],
  generated_at: "2026-07-28T07:10:00.000Z",
  updated_at: "2026-07-28T07:10:00.000Z",
};

describe("buildWellnessPlanData", () => {
  test("maps live AI analysis and student records without synthetic results", () => {
    const plan = buildWellnessPlanData({
      aiResult,
      latestCheckIn,
      latestScore,
      history: [
        {
          id: "check-in-previous",
          week_start: "2026-07-13",
          submitted_at: "2026-07-20T07:00:00.000Z",
          reflection: "The previous week was manageable.",
        },
      ],
    });

    expect(plan.hasAnalysis).toBe(true);
    expect(plan.studentWellnessIndex).toBe(71.08);
    expect(plan.riskCategory).toBe("high");
    expect(plan.stressSeverityLevel).toBe("severe");
    expect(plan.primaryStressContext).toBe("mixed");
    expect(plan.summary).toBe(aiResult.weekly_summary);
    expect(plan.reflectionKeywords).toEqual(aiResult.reflection_keywords);
    expect(plan.actions).toEqual(aiResult.recommendations);
    expect(plan.currentCondition).toBe(latestCheckIn.reflection);
    expect(plan.priorities).toEqual([
      "Personal Wellbeing",
      "Role Load",
      "Course Environment",
    ]);
    expect(plan.dimensions).toHaveLength(5);
    expect(plan.checkInHistory).toHaveLength(1);
    expect(plan.generatedAt).not.toBe("Pending");
  });

  test("keeps AI fields pending until an analysis exists", () => {
    const plan = buildWellnessPlanData({
      latestCheckIn,
      latestScore,
      aiResult: null,
    });

    expect(plan.hasAnalysis).toBe(false);
    expect(plan.studentWellnessIndex).toBeNull();
    expect(plan.riskCategory).toBe("pending");
    expect(plan.stressSeverityLevel).toBe("pending");
    expect(plan.primaryStressContext).toBeNull();
    expect(plan.summary).toContain("Generate this week’s AI wellness analysis");
    expect(plan.actions).toEqual([]);
    expect(plan.dimensions[1].score).toBe(82.5);
  });

  test("normalizes legacy recommendation objects and ignores malformed values", () => {
    const plan = buildWellnessPlanData({
      latestCheckIn,
      latestScore,
      aiResult: {
        ...aiResult,
        recommendations: [
          { priority: "high", action: "  Use one protected study block.  " },
          "  Protect sleep tonight. ",
          { priority: "low" },
          null,
        ],
        reflection_keywords: ["  sleep ", 4, "", null],
      },
    });

    expect(plan.actions).toEqual([
      "Use one protected study block.",
      "Protect sleep tonight.",
    ]);
    expect(plan.reflectionKeywords).toEqual(["sleep"]);
  });

  test("treats invalid database scores and unsupported AI enums as pending", () => {
    const plan = buildWellnessPlanData({
      latestCheckIn,
      latestScore: {
        ...latestScore,
        academic_engagement_score: 101,
        personal_wellbeing_score: "not-a-score",
      },
      aiResult: {
        ...aiResult,
        swi_score: -1,
        risk_category: "urgent",
        stress_severity_level: "unknown",
        primary_stress_context: "other",
      },
    });

    expect(plan.studentWellnessIndex).toBeNull();
    expect(plan.riskCategory).toBe("pending");
    expect(plan.stressSeverityLevel).toBe("pending");
    expect(plan.primaryStressContext).toBeNull();
    expect(plan.dimensions[0].score).toBeNull();
    expect(plan.dimensions[1].score).toBeNull();
  });
});

describe("isAnalysisCurrent", () => {
  test("accepts an analysis generated after its matching check-in and score", () => {
    expect(isAnalysisCurrent(aiResult, latestCheckIn, latestScore)).toBe(true);
  });

  test("rejects stale, mismatched, and incomplete analyses", () => {
    expect(isAnalysisCurrent(
      { ...aiResult, updated_at: "2026-07-28T07:04:00.000Z" },
      latestCheckIn,
      latestScore,
    )).toBe(false);
    expect(isAnalysisCurrent(
      { ...aiResult, check_in_id: "different-check-in" },
      latestCheckIn,
      latestScore,
    )).toBe(false);
    expect(isAnalysisCurrent(
      { ...aiResult, dimension_scores_id: "different-score" },
      latestCheckIn,
      latestScore,
    )).toBe(false);
    expect(isAnalysisCurrent(
      { ...aiResult, updated_at: null, generated_at: null },
      latestCheckIn,
      latestScore,
    )).toBe(false);
  });
});
