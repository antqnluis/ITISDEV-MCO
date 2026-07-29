import { describe, expect, it } from "vitest";
import {
  getStudentWellnessIndex,
  getSwiConcernStatus,
} from "./wellnessScore";

const completeScore = {
  academic_engagement_score: 70.11,
  personal_wellbeing_score: 68.22,
  logistical_load_score: 71.33,
  role_load_score: 69.44,
  course_environment_score: 71.85,
};

describe("getStudentWellnessIndex", () => {
  it("averages all five concern dimensions to two decimal places", () => {
    expect(getStudentWellnessIndex(completeScore)).toBe(70.19);
  });

  it("accepts numeric database strings and keeps zero as a valid score", () => {
    expect(getStudentWellnessIndex({
      academic_engagement_score: "0",
      personal_wellbeing_score: "20",
      logistical_load_score: "40",
      role_load_score: "60",
      course_environment_score: "80",
    })).toBe(40);
  });

  it.each([
    null,
    { ...completeScore, role_load_score: null },
    { ...completeScore, role_load_score: "" },
    { ...completeScore, role_load_score: "invalid" },
    { ...completeScore, role_load_score: 101 },
    { ...completeScore, role_load_score: -1 },
  ])("returns pending data as null for %j", (score) => {
    expect(getStudentWellnessIndex(score)).toBeNull();
  });
});

describe("getSwiConcernStatus", () => {
  it.each([
    [0, "Low concern"],
    [39.99, "Low concern"],
    [40, "Moderate concern"],
    [69.99, "Moderate concern"],
    [70, "High concern"],
    [100, "High concern"],
  ])("maps %s to %s", (score, label) => {
    expect(getSwiConcernStatus(score).label).toBe(label);
  });

  it("reports pending for a missing score", () => {
    expect(getSwiConcernStatus(null).label).toBe("Pending");
  });
});
