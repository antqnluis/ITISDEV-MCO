function formatWeekLabel(weekStart) {
  const value = new Date(`${weekStart}T00:00:00`);
  const end = new Date(value);
  end.setDate(value.getDate() + 6);
  return `${value.toLocaleDateString("en-PH", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`;
}

function getWellnessIndex(checkIn) {
  if (!checkIn) return 74;

  const ratings = [
    6 - checkIn.stress_level,
    checkIn.mood_level,
    checkIn.sleep_quality,
    checkIn.motivation_level,
    6 - checkIn.burnout_level,
    checkIn.energy_level,
  ].filter(Number.isFinite);

  return ratings.length
    ? Math.round((ratings.reduce((total, value) => total + value, 0) / (ratings.length * 5)) * 100)
    : 74;
}

function getSeverity(score) {
  if (score >= 80) return "Low";
  if (score >= 60) return "Moderate";
  if (score >= 40) return "Elevated";
  if (score >= 20) return "Severe";
  return "Critical";
}

function getPrimaryContext(checkIn) {
  const stressLevel = checkIn?.stress_level || 0;
  const burnoutLevel = checkIn?.burnout_level || 0;
  if (stressLevel >= 4 || burnoutLevel >= 4) return "Academic overload and recovery pressure";
  return "Balanced but needs attention";
}

function getDimensionSummary(score, label) {
  if (score >= 80) return `${label} is currently stable and should stay on your radar.`;
  if (score >= 60) return `${label} is showing moderate strain and may benefit from light support.`;
  if (score >= 40) return `${label} needs a closer look this week.`;
  return `${label} is a major concern and should be addressed first.`;
}

function getPriorityItems(latestScore) {
  const dimensions = [
    { label: "Academic engagement", score: latestScore?.academic_engagement_score ?? 0 },
    { label: "Personal wellbeing", score: latestScore?.personal_wellbeing_score ?? 0 },
    { label: "Role load", score: latestScore?.role_load_score ?? 0 },
  ];
  return dimensions
    .sort((a, b) => a.score - b.score)
    .slice(0, 3)
    .map((item) => item.label);
}

function getActions() {
  return [
    {
      title: "Protect recovery time",
      reason: "Your current reflection points to fatigue and limited recovery capacity.",
      timing: "Tonight and tomorrow morning",
      dimension: "Personal wellbeing",
    },
    {
      title: "Reduce one urgent task this week",
      reason: "A heavy workload is creating pressure across your academic commitments.",
      timing: "Before your next class block",
      dimension: "Academic engagement",
    },
    {
      title: "Ask for support with a course or responsibility",
      reason: "Unclear expectations or competing roles are likely contributing to current strain.",
      timing: "Within the next 48 hours",
      dimension: "Role load",
    },
  ];
}

function getSupportResources() {
  return [
    "Counseling and Psychological Services",
    "Office of Student Affairs",
    "Academic advising office",
  ];
}

export function buildWellnessPlanData({ student, profile, latestCheckIn, latestScore, history = [] }) {
  const wellnessIndex = getWellnessIndex(latestCheckIn);
  const severity = getSeverity(wellnessIndex);
  return {
    weekCovered: formatWeekLabel(latestCheckIn?.week_start || "2026-01-01"),
    generatedAt: latestCheckIn?.submitted_at ? new Date(latestCheckIn.submitted_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : new Date().toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }),
    studentName: `${student?.first_name || "Student"} ${student?.last_name || ""}`.trim(),
    college: profile?.college || "Your college",
    studentWellnessIndex: wellnessIndex,
    stressSeverityLevel: severity,
    primaryStressContext: getPrimaryContext(latestCheckIn),
    currentCondition: latestCheckIn?.reflection || "The current week shows elevated strain and a need for focused support.",
    dimensions: [
      {
        key: "academic_engagement",
        label: "Academic Engagement",
        score: latestScore?.academic_engagement_score ?? 0,
        explanation: getDimensionSummary(latestScore?.academic_engagement_score ?? 0, "Academic engagement"),
      },
      {
        key: "personal_wellbeing",
        label: "Personal Wellbeing",
        score: latestScore?.personal_wellbeing_score ?? 0,
        explanation: getDimensionSummary(latestScore?.personal_wellbeing_score ?? 0, "Personal wellbeing"),
      },
      {
        key: "logistical_load",
        label: "Logistical Load",
        score: latestScore?.logistical_load_score ?? 0,
        explanation: getDimensionSummary(latestScore?.logistical_load_score ?? 0, "Logistical load"),
      },
      {
        key: "role_load",
        label: "Role Load",
        score: latestScore?.role_load_score ?? 0,
        explanation: getDimensionSummary(latestScore?.role_load_score ?? 0, "Role load"),
      },
      {
        key: "course_environment",
        label: "Course Environment",
        score: latestScore?.course_environment_score ?? 0,
        explanation: getDimensionSummary(latestScore?.course_environment_score ?? 0, "Course environment"),
      },
    ],
    summary: "This week’s AI-supported wellness plan highlights sustained pressure across academic, personal, and role-based responsibilities. The plan focuses on reducing overload, protecting recovery, and using support resources before strain escalates.",
    priorities: getPriorityItems(latestScore),
    actions: getActions(),
    supportResources: getSupportResources(),
    previousPlans: history.map((plan) => ({
      id: plan.id,
      weekLabel: formatWeekLabel(plan.week_start),
      generatedAt: plan.submitted_at ? new Date(plan.submitted_at).toLocaleString("en-PH", { dateStyle: "medium", timeStyle: "short" }) : "Pending",
      summary: plan.reflection || "Previous reflection",
    })),
  };
}
