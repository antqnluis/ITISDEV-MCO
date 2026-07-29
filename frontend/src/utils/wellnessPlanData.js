const DIMENSION_DEFINITIONS = [
  {
    key: "academic_engagement",
    field: "academic_engagement_score",
    label: "Academic Engagement",
  },
  {
    key: "personal_wellbeing",
    field: "personal_wellbeing_score",
    label: "Personal Wellbeing",
  },
  {
    key: "logistical_load",
    field: "logistical_load_score",
    label: "Logistical Load",
  },
  {
    key: "role_load",
    field: "role_load_score",
    label: "Role Load",
  },
  {
    key: "course_environment",
    field: "course_environment_score",
    label: "Course Environment",
  },
];

const RISK_CATEGORIES = new Set(["low", "moderate", "high"]);
const STRESS_SEVERITIES = new Set([
  "low_normal",
  "moderate",
  "severe",
  "critical",
]);
const STRESS_CONTEXTS = new Set([
  ...DIMENSION_DEFINITIONS.map(({ key }) => key),
  "mixed",
]);

function formatWeekLabel(weekStart) {
  if (!weekStart) return "Week unavailable";

  const value = new Date(`${weekStart}T00:00:00`);
  if (Number.isNaN(value.getTime())) return "Week unavailable";

  const end = new Date(value);
  end.setDate(value.getDate() + 6);
  return `${value.toLocaleDateString("en-PH", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`;
}

function formatDateTime(value) {
  if (!value) return "Pending";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Pending";

  return date.toLocaleString("en-PH", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function parseTimestamp(value) {
  if (!value) return null;
  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function normalizeScore(value) {
  if (value === null || value === undefined || value === "") return null;

  const score = Number(value);
  if (!Number.isFinite(score) || score < 0 || score > 100) return null;
  return score;
}

function getDimensionSummary(score, label) {
  if (score === null) return `${label} has not been calculated yet.`;
  if (score >= 70) return `${label} is a high concern and should be prioritized.`;
  if (score >= 40) return `${label} shows moderate concern and needs attention this week.`;
  return `${label} is currently a low concern and appears stable.`;
}

function getDimensions(latestScore) {
  return DIMENSION_DEFINITIONS.map((definition) => {
    const score = normalizeScore(latestScore?.[definition.field]);
    return {
      key: definition.key,
      label: definition.label,
      score,
      explanation: getDimensionSummary(score, definition.label),
    };
  });
}

function orderAvailableDimensions(dimensions) {
  return [...dimensions]
    .filter(({ score }) => score !== null)
    .sort((left, right) => right.score - left.score);
}

function normalizeRecommendations(recommendations) {
  if (!Array.isArray(recommendations)) return [];

  return recommendations
    .map((recommendation) => {
      if (typeof recommendation === "string") return recommendation.trim();
      if (
        recommendation
        && typeof recommendation === "object"
        && typeof recommendation.action === "string"
      ) {
        return recommendation.action.trim();
      }
      return "";
    })
    .filter(Boolean);
}

function normalizeKeywords(keywords) {
  if (!Array.isArray(keywords)) return [];
  return keywords
    .filter((keyword) => typeof keyword === "string")
    .map((keyword) => keyword.trim())
    .filter(Boolean);
}

function getSupportResources() {
  return [
    "DLSU Counseling and Psychological Services",
    "Office of Student Affairs",
    "Academic advising office",
  ];
}

export function isAnalysisCurrent(aiResult, latestCheckIn, latestScore) {
  if (!aiResult || !latestCheckIn || !latestScore) return false;
  if (aiResult.check_in_id !== latestCheckIn.id) return false;
  if (aiResult.dimension_scores_id !== latestScore.id) return false;

  const analysisTimestamp = parseTimestamp(
    aiResult.updated_at || aiResult.generated_at,
  );
  if (analysisTimestamp === null) return false;

  const sourceTimestamps = [
    latestCheckIn.updated_at,
    latestScore.calculated_at,
    latestScore.updated_at,
  ]
    .map(parseTimestamp)
    .filter((timestamp) => timestamp !== null);

  return sourceTimestamps.every((timestamp) => analysisTimestamp >= timestamp);
}

export function buildWellnessPlanData({
  latestCheckIn,
  latestScore,
  history = [],
  aiResult = null,
} = {}) {
  const dimensions = getDimensions(latestScore);
  const summary = typeof aiResult?.weekly_summary === "string"
    ? aiResult.weekly_summary.trim()
    : "";

  return {
    hasAnalysis: Boolean(aiResult),
    weekCovered: formatWeekLabel(latestCheckIn?.week_start),
    generatedAt: formatDateTime(aiResult?.updated_at || aiResult?.generated_at),
    studentWellnessIndex: normalizeScore(aiResult?.swi_score),
    riskCategory: RISK_CATEGORIES.has(aiResult?.risk_category)
      ? aiResult.risk_category
      : "pending",
    stressSeverityLevel: STRESS_SEVERITIES.has(aiResult?.stress_severity_level)
      ? aiResult.stress_severity_level
      : "pending",
    primaryStressContext: STRESS_CONTEXTS.has(aiResult?.primary_stress_context)
      ? aiResult.primary_stress_context
      : null,
    currentCondition: latestCheckIn?.reflection
      || "No written reflection was provided for this check-in.",
    dimensions,
    summary: summary
      || "Generate this week’s AI wellness analysis to see a personalized summary.",
    reflectionKeywords: normalizeKeywords(aiResult?.reflection_keywords),
    priorities: orderAvailableDimensions(dimensions)
      .slice(0, 3)
      .map(({ label }) => label),
    actions: normalizeRecommendations(aiResult?.recommendations),
    supportResources: getSupportResources(),
    checkInHistory: history.map((checkIn) => ({
      id: checkIn.id,
      weekLabel: formatWeekLabel(checkIn.week_start),
      submittedAt: formatDateTime(checkIn.submitted_at),
      summary: checkIn.reflection || "No written reflection was provided.",
    })),
  };
}
