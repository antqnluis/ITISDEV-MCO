export const WELLNESS_DIMENSION_SCORE_FIELDS = [
  "academic_engagement_score",
  "personal_wellbeing_score",
  "logistical_load_score",
  "role_load_score",
  "course_environment_score",
];

export function getStudentWellnessIndex(dimensionScore) {
  if (!dimensionScore) return null;

  const values = WELLNESS_DIMENSION_SCORE_FIELDS.map((field) => {
    const value = dimensionScore[field];
    return value === null || value === undefined || value === ""
      ? Number.NaN
      : Number(value);
  });

  if (values.some((value) => !Number.isFinite(value) || value < 0 || value > 100)) {
    return null;
  }

  const average = values.reduce((total, value) => total + value, 0) / values.length;
  return Number(average.toFixed(2));
}

export function getSwiConcernStatus(score) {
  if (!Number.isFinite(score)) {
    return {
      label: "Pending",
      tone: "All five dimension scores are required to calculate this index.",
    };
  }

  if (score >= 70) {
    return {
      label: "High concern",
      tone: "This result is in the high-concern range.",
    };
  }

  if (score >= 40) {
    return {
      label: "Moderate concern",
      tone: "This result is in the moderate-concern range.",
    };
  }

  return {
    label: "Low concern",
    tone: "This result is in the low-concern range.",
  };
}
