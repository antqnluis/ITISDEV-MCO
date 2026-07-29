const DIMENSION_DEFINITIONS = [
  {
    key: "academic_engagement",
    field: "academic_engagement_score",
    label: "Academic Engagement",
    action: {
      title: "Reduce one urgent academic task",
      reason: "Academic engagement is the strongest source of concern in this plan.",
      timing: "Before your next class block",
    },
  },
  {
    key: "personal_wellbeing",
    field: "personal_wellbeing_score",
    label: "Personal Wellbeing",
    action: {
      title: "Protect recovery time",
      reason: "Personal wellbeing needs focused recovery and a lighter immediate load.",
      timing: "Tonight and tomorrow morning",
    },
  },
  {
    key: "logistical_load",
    field: "logistical_load_score",
    label: "Logistical Load",
    action: {
      title: "Simplify one logistical commitment",
      reason: "Scheduling, travel, or access constraints are adding avoidable pressure.",
      timing: "Before planning the next two days",
    },
  },
  {
    key: "role_load",
    field: "role_load_score",
    label: "Role Load",
    action: {
      title: "Ask for help with one responsibility",
      reason: "Competing responsibilities are limiting the time available for recovery and study.",
      timing: "Within the next 48 hours",
    },
  },
  {
    key: "course_environment",
    field: "course_environment_score",
    label: "Course Environment",
    action: {
      title: "Clarify one course concern",
      reason: "A course-specific concern would benefit from direct clarification or support.",
      timing: "Before the next meeting for that course",
    },
  },
];

export const WELLNESS_PLAN_DEMO_INPUT = {
  student: {
    first_name: "Pauline",
    last_name: "Reyes",
  },
  profile: {
    college: "CCS",
  },
  latestCheckIn: {
    id: "demo-check-in-current",
    week_start: "2026-07-20",
    submitted_at: "2026-07-28T07:00:00.000Z",
    stress_level: 5,
    mood_level: 2,
    sleep_quality: 2,
    motivation_level: 3,
    burnout_level: 5,
    energy_level: 2,
    reflection: "Heavy academic deadlines and overlapping responsibilities made recovery difficult.",
  },
  latestScore: {
    check_in_id: "demo-check-in-current",
    academic_engagement_score: 91,
    personal_wellbeing_score: 92,
    logistical_load_score: 82,
    role_load_score: 94,
    course_environment_score: 81,
    calculated_at: "2026-07-28T07:05:00.000Z",
  },
  history: [
    {
      id: "demo-check-in-previous",
      week_start: "2026-07-13",
      submitted_at: "2026-07-20T07:00:00.000Z",
      reflection: "The week was busy but manageable with planned study blocks.",
    },
  ],
};

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

function normalizeScore(value) {
  if (value === null || value === undefined || value === "") return null;

  const score = Number(value);
  if (!Number.isFinite(score)) return null;
  return Math.min(100, Math.max(0, score));
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

function getConcernIndex(dimensions) {
  const scores = dimensions.map(({ score }) => score);
  if (scores.some((score) => score === null)) return null;
  return Math.round(scores.reduce((total, score) => total + score, 0) / scores.length);
}

function getRiskCategory(score) {
  if (score === null) return "pending";
  if (score < 40) return "low";
  if (score < 70) return "moderate";
  return "high";
}

function getSeverity(score) {
  if (score === null) return "pending";
  if (score < 40) return "low_normal";
  if (score < 70) return "moderate";
  return "severe";
}

function orderAvailableDimensions(dimensions) {
  return dimensions
    .filter(({ score }) => score !== null)
    .sort((left, right) => right.score - left.score);
}

function getPrimaryContext(dimensions) {
  const ordered = orderAvailableDimensions(dimensions);
  if (ordered.length !== DIMENSION_DEFINITIONS.length) return null;
  if (ordered.every(({ score }) => score > 75)) return "mixed";
  return ordered[0].key;
}

function getContextLabel(context) {
  if (context === "mixed") return "mixed wellness dimensions";
  return DIMENSION_DEFINITIONS.find(({ key }) => key === context)?.label.toLowerCase()
    || "the available wellness dimensions";
}

function getSummary(riskCategory, primaryContext) {
  if (riskCategory === "pending") {
    return "A wellness summary will be available once all five concern dimensions are calculated.";
  }

  const context = getContextLabel(primaryContext);
  if (riskCategory === "low") {
    return `This mock wellness plan shows low overall concern, with ${context} as the main area to continue monitoring.`;
  }
  if (riskCategory === "moderate") {
    return `This mock wellness plan shows moderate overall concern, led by ${context}. Small, focused adjustments may help keep the pressure from increasing.`;
  }
  return `This mock wellness plan shows high overall concern across the measured dimensions, led by ${context}. Prioritize immediate workload reduction, recovery, and appropriate support.`;
}

function getPriorityItems(dimensions) {
  return orderAvailableDimensions(dimensions)
    .slice(0, 3)
    .map(({ label }) => label);
}

function getActions(dimensions) {
  const definitionsByKey = new Map(
    DIMENSION_DEFINITIONS.map((definition) => [definition.key, definition]),
  );

  return orderAvailableDimensions(dimensions)
    .slice(0, 3)
    .map(({ key, label }) => {
      const action = definitionsByKey.get(key).action;
      return {
        ...action,
        dimension: label,
      };
    });
}

function getSupportResources() {
  return [
    "Counseling and Psychological Services",
    "Office of Student Affairs",
    "Academic advising office",
  ];
}

export function buildWellnessPlanData({
  student,
  profile,
  latestCheckIn,
  latestScore,
  history = [],
} = {}) {
  const dimensions = getDimensions(latestScore);
  const concernIndex = getConcernIndex(dimensions);
  const riskCategory = getRiskCategory(concernIndex);
  const primaryContext = getPrimaryContext(dimensions);

  return {
    weekCovered: formatWeekLabel(latestCheckIn?.week_start),
    generatedAt: formatDateTime(
      latestScore?.calculated_at || latestCheckIn?.submitted_at,
    ),
    studentName: `${student?.first_name || "Student"} ${student?.last_name || ""}`.trim(),
    college: profile?.college || "Your college",
    studentWellnessIndex: concernIndex,
    riskCategory,
    stressSeverityLevel: getSeverity(concernIndex),
    primaryStressContext: primaryContext,
    currentCondition: latestCheckIn?.reflection
      || "No written reflection was provided for this check-in.",
    dimensions,
    summary: getSummary(riskCategory, primaryContext),
    priorities: getPriorityItems(dimensions),
    actions: getActions(dimensions),
    supportResources: getSupportResources(),
    checkInHistory: history.map((checkIn) => ({
      id: checkIn.id,
      weekLabel: formatWeekLabel(checkIn.week_start),
      submittedAt: formatDateTime(checkIn.submitted_at),
      summary: checkIn.reflection || "No written reflection was provided.",
    })),
  };
}
