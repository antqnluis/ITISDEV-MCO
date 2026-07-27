import { useMemo } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import PageHeader from "../components/ui/PageHeader";
import WellnessCard from "../components/ui/WellnessCard";
import MetricCard from "../components/ui/MetricCard";
import { usePrototypeData } from "../context/usePrototypeData";
import { getCurrentWeekStart } from "../data/demoData";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function formatWeekLabel(weekStart) {
  const value = new Date(`${weekStart}T00:00:00`);
  const end = new Date(value);
  end.setDate(value.getDate() + 6);
  return `${value.toLocaleDateString("en-PH", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-PH", { month: "short", day: "numeric" })}`;
}

function formatDateTime(value) {
  return new Date(value).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getWellnessStatus(score) {
  if (score >= 80) return { label: "Thriving", tone: "Excellent" };
  if (score >= 65) return { label: "Steady", tone: "Stable" };
  if (score >= 45) return { label: "Needs support", tone: "Watch" };
  return { label: "At risk", tone: "Urgent" };
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

function getMetricBadge(value) {
  const normalized = Number(value);
  if (Number.isNaN(normalized)) return "Pending";
  if (normalized <= 2) return "Low";
  if (normalized <= 3) return "Moderate";
  if (normalized <= 4) return "Elevated";
  return "High";
}

function getRiskBadge(value) {
  if (value >= 70) return "High concern";
  if (value >= 40) return "Moderate concern";
  return "Low concern";
}

function Dashboard() {
  const { student, checkIns, dimensionScores, calendarEvents, academicRecords } = usePrototypeData();

  const currentWeekStart = useMemo(() => getCurrentWeekStart(), []);

  const latestCheckIn = useMemo(() => {
    if (!checkIns.length) return null;
    return [...checkIns].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))[0];
  }, [checkIns]);

  const latestScore = useMemo(() => {
    if (!latestCheckIn) return null;
    return dimensionScores.find((score) => score.check_in_id === latestCheckIn.id) || null;
  }, [dimensionScores, latestCheckIn]);

  const wellnessScore = getWellnessIndex(latestCheckIn);

  const wellnessStatus = getWellnessStatus(wellnessScore);

  const wellnessMetrics = latestCheckIn
    ? [
        {
          title: "Stress",
          value: `${latestCheckIn.stress_level}/5`,
          badge: getMetricBadge(latestCheckIn.stress_level),
          description: "How intense your stress feels this week.",
        },
        {
          title: "Sleep quality",
          value: `${latestCheckIn.sleep_quality}/5`,
          badge: getMetricBadge(latestCheckIn.sleep_quality),
          description: "How rested you felt after the week.",
        },
        {
          title: "Mood",
          value: `${latestCheckIn.mood_level}/5`,
          badge: getMetricBadge(latestCheckIn.mood_level),
          description: "Your overall emotional outlook.",
        },
        {
          title: "Energy",
          value: `${latestCheckIn.energy_level}/5`,
          badge: getMetricBadge(latestCheckIn.energy_level),
          description: "How energized you felt to take on tasks.",
        },
        {
          title: "Motivation",
          value: `${latestCheckIn.motivation_level}/5`,
          badge: getMetricBadge(latestCheckIn.motivation_level),
          description: "How supported you felt in staying engaged.",
        },
        {
          title: "Burnout",
          value: `${latestCheckIn.burnout_level}/5`,
          badge: getMetricBadge(latestCheckIn.burnout_level),
          description: "How worn down you felt by the end of the week.",
        },
      ]
    : [
        {
          title: "Stress",
          value: "—",
          badge: "Pending",
          description: "A check-in will unlock this metric.",
        },
        {
          title: "Sleep quality",
          value: "—",
          badge: "Pending",
          description: "A check-in will unlock this metric.",
        },
        {
          title: "Mood",
          value: "—",
          badge: "Pending",
          description: "A check-in will unlock this metric.",
        },
        {
          title: "Energy",
          value: "—",
          badge: "Pending",
          description: "A check-in will unlock this metric.",
        },
        {
          title: "Motivation",
          value: "—",
          badge: "Pending",
          description: "A check-in will unlock this metric.",
        },
        {
          title: "Burnout",
          value: "—",
          badge: "Pending",
          description: "A check-in will unlock this metric.",
        },
      ];

  const riskDimensions = latestScore
    ? [
        {
          title: "Academic engagement",
          value: `${latestScore.academic_engagement_score}/100`,
          badge: getRiskBadge(latestScore.academic_engagement_score),
          description: "How engaged you felt with classes and coursework.",
        },
        {
          title: "Personal wellbeing",
          value: `${latestScore.personal_wellbeing_score}/100`,
          badge: getRiskBadge(latestScore.personal_wellbeing_score),
          description: "How supported your everyday wellbeing felt.",
        },
        {
          title: "Logistical load",
          value: `${latestScore.logistical_load_score}/100`,
          badge: getRiskBadge(latestScore.logistical_load_score),
          description: "How manageable your schedule felt overall.",
        },
        {
          title: "Role load",
          value: `${latestScore.role_load_score}/100`,
          badge: getRiskBadge(latestScore.role_load_score),
          description: "How balanced your roles and responsibilities felt.",
        },
        {
          title: "Course environment",
          value: `${latestScore.course_environment_score}/100`,
          badge: getRiskBadge(latestScore.course_environment_score),
          description: "How clear and workable the course context felt.",
        },
      ]
    : [
        {
          title: "Academic engagement",
          value: "—",
          badge: "Pending",
          description: "A check-in is required to show this dimension.",
        },
        {
          title: "Personal wellbeing",
          value: "—",
          badge: "Pending",
          description: "A check-in is required to show this dimension.",
        },
        {
          title: "Logistical load",
          value: "—",
          badge: "Pending",
          description: "A check-in is required to show this dimension.",
        },
        {
          title: "Role load",
          value: "—",
          badge: "Pending",
          description: "A check-in is required to show this dimension.",
        },
        {
          title: "Course environment",
          value: "—",
          badge: "Pending",
          description: "A check-in is required to show this dimension.",
        },
      ];

  const upcomingEvents = useMemo(() => {
    return calendarEvents
      .filter((event) => new Date(event.starts_at) >= new Date() && event.status !== "cancelled")
      .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
      .slice(0, 4);
  }, [calendarEvents]);

  const academicDeadlines = useMemo(() => {
    return academicRecords
      .filter((record) => record.due_at && record.submission_status === "upcoming")
      .sort((a, b) => new Date(a.due_at) - new Date(b.due_at))
      .slice(0, 4);
  }, [academicRecords]);

  const academicAlerts = useMemo(() => {
    return academicRecords
      .filter((record) => record.submission_status === "late" || record.submission_status === "missed")
      .sort((a, b) => new Date(b.due_at) - new Date(a.due_at))
      .slice(0, 4);
  }, [academicRecords]);

  return (
    <AppShell>
      <div className="mx-auto w-full max-w-[1200px] space-y-7">
        <div className="text-center">
          <PageHeader
            title={`${getGreeting()}, ${student.first_name}.`}
            subtitle={`Current week • ${formatWeekLabel(currentWeekStart)} • ${latestCheckIn ? "Latest weekly check-in available" : "No weekly check-in recorded yet"}`}
            className="text-center"
          />
        </div>

        <WellnessCard
          score={wellnessScore}
          status={wellnessStatus.label}
          title={`Your student wellness index is ${wellnessScore}/100.`}
          description={
            latestCheckIn?.reflection
              ? `${latestCheckIn.reflection} ${wellnessStatus.tone} overall.`
              : "Your dashboard will fill in with more insights as you add weekly check-ins."
          }
        />

        <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-[20px] border border-[#e0e7e2] bg-white p-6 shadow-[0_6px_22px_rgba(22,51,40,0.04)]">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#789087]">Latest weekly check-in</p>
                <h2 className="mt-1 font-serif text-xl font-semibold text-[#173e30]">Your latest summary</h2>
              </div>
              <Link to="/check-in" className="text-sm font-semibold text-[#3f7854] hover:text-[#2f6345]">
                Open full check-in →
              </Link>
            </div>

            {latestCheckIn ? (
              <div className="mt-6 grid gap-4 md:grid-cols-[1.2fr_0.8fr]">
                <div className="rounded-xl border border-[#e9eeea] bg-[#fbfdfb] p-4">
                  <p className="text-sm font-semibold text-[#345449]">Reflection</p>
                  <p className="mt-2 text-sm leading-6 text-[#5d7169]">{latestCheckIn.reflection}</p>
                </div>
                <div className="space-y-3">
                  <div className="rounded-xl border border-[#e9eeea] bg-[#fbfdfb] p-4">
                    <p className="text-sm font-semibold text-[#345449]">Available study hours</p>
                    <p className="mt-2 text-2xl font-semibold text-[#173e30]">{latestCheckIn.available_study_hours} hrs</p>
                  </div>
                  <div className="rounded-xl border border-[#e9eeea] bg-[#fbfdfb] p-4">
                    <p className="text-sm font-semibold text-[#345449]">Submitted</p>
                    <p className="mt-2 text-sm text-[#5d7169]">{formatDateTime(latestCheckIn.submitted_at)}</p>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 rounded-xl border border-dashed border-[#cfd9d1] bg-[#f9fcf9] p-6 text-center text-sm text-[#6f7f77]">
                No check-in has been recorded yet. Start one to see your latest summary here.
              </div>
            )}
          </div>

          <div className="rounded-[20px] border border-[#e0e7e2] bg-white p-6 shadow-[0_6px_22px_rgba(22,51,40,0.04)]">
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#789087]">Quick actions</p>
            <div className="mt-4 space-y-3">
              <Link to="/check-in" className="flex items-center justify-between rounded-xl border border-[#dfe8e0] bg-[#f4fbf6] px-4 py-3 text-sm font-semibold text-[#234638] hover:bg-[#e8f4ec]">
                <span>Start or update weekly check-in</span>
                <span>→</span>
              </Link>
              <Link to="/calendar" className="flex items-center justify-between rounded-xl border border-[#dfe8e0] bg-[#fcfdfb] px-4 py-3 text-sm font-semibold text-[#234638] hover:bg-[#f2f6f2]">
                <span>Add a calendar event</span>
                <span>→</span>
              </Link>
              <Link to="/academic-records" className="flex items-center justify-between rounded-xl border border-[#dfe8e0] bg-[#fcfdfb] px-4 py-3 text-sm font-semibold text-[#234638] hover:bg-[#f2f6f2]">
                <span>Add an academic record</span>
                <span>→</span>
              </Link>
            </div>

            <div className="mt-6 border-t border-[#e8ede9] pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#789087]">Go to full pages</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Link to="/calendar" className="rounded-full border border-[#dfe8e0] px-3 py-1.5 text-sm text-[#4d665c] hover:bg-[#f2f6f2]">Calendar</Link>
                <Link to="/check-in" className="rounded-full border border-[#dfe8e0] px-3 py-1.5 text-sm text-[#4d665c] hover:bg-[#f2f6f2]">Weekly Check-in</Link>
                <Link to="/academic-records" className="rounded-full border border-[#dfe8e0] px-3 py-1.5 text-sm text-[#4d665c] hover:bg-[#f2f6f2]">Academic Records</Link>
              </div>
            </div>
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold text-[#173e30]">Wellness metrics</h2>
            <p className="text-sm text-[#6e8178]">Based on your latest weekly check-in</p>
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {wellnessMetrics.map((metric) => (
              <MetricCard key={metric.title} title={metric.title} value={metric.value} badge={metric.badge}>
                {metric.description}
              </MetricCard>
            ))}
          </div>
        </section>

        <section>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-serif text-xl font-semibold text-[#173e30]">Risk and concern dimensions</h2>
            <p className="text-sm text-[#6e8178]">Current wellbeing signals</p>
          </div>
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 xl:grid-cols-3">
            {riskDimensions.map((dimension) => (
              <MetricCard key={dimension.title} title={dimension.title} value={dimension.value} badge={dimension.badge}>
                {dimension.description}
              </MetricCard>
            ))}
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-2">
          <div className="rounded-[20px] border border-[#e0e7e2] bg-white p-6 shadow-[0_6px_22px_rgba(22,51,40,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#789087]">Upcoming events</p>
                <h2 className="mt-1 font-serif text-xl font-semibold text-[#173e30]">Calendar at a glance</h2>
              </div>
              <Link to="/calendar" className="text-sm font-semibold text-[#3f7854] hover:text-[#2f6345]">View full calendar →</Link>
            </div>

            {upcomingEvents.length ? (
              <div className="mt-5 space-y-3">
                {upcomingEvents.map((event) => (
                  <div key={event.id} className="rounded-xl border border-[#e8eee9] bg-[#fbfdfb] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#173e30]">{event.title}</p>
                        <p className="mt-1 text-sm text-[#5d7169]">{event.location || "No location set"}</p>
                      </div>
                      <span className="rounded-full bg-[#eef5ef] px-2.5 py-1 text-xs font-semibold text-[#3f7854]">
                        {event.event_type.replaceAll("_", " ")}
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-[#6e8178]">{formatDateTime(event.starts_at)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-[#cfd9d1] bg-[#f9fcf9] p-6 text-center text-sm text-[#6f7f77]">
                No upcoming events yet. Add one to keep your schedule visible.
              </div>
            )}
          </div>

          <div className="rounded-[20px] border border-[#e0e7e2] bg-white p-6 shadow-[0_6px_22px_rgba(22,51,40,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#789087]">Academic deadlines</p>
                <h2 className="mt-1 font-serif text-xl font-semibold text-[#173e30]">Important deadlines</h2>
              </div>
              <Link to="/academic-records" className="text-sm font-semibold text-[#3f7854] hover:text-[#2f6345]">Manage records →</Link>
            </div>

            {academicDeadlines.length ? (
              <div className="mt-5 space-y-3">
                {academicDeadlines.map((record) => (
                  <div key={record.id} className="rounded-xl border border-[#e8eee9] bg-[#fbfdfb] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#173e30]">{record.title}</p>
                        <p className="mt-1 text-sm text-[#5d7169]">{record.course_code} • {record.record_type}</p>
                      </div>
                      <span className="rounded-full bg-[#fff6e8] px-2.5 py-1 text-xs font-semibold text-[#a86a1a]">
                        Upcoming
                      </span>
                    </div>
                    <p className="mt-3 text-sm text-[#6e8178]">Due {formatDateTime(record.due_at)}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-xl border border-dashed border-[#cfd9d1] bg-[#f9fcf9] p-6 text-center text-sm text-[#6f7f77]">
                No upcoming academic deadlines right now.
              </div>
            )}

            <div className="mt-6 border-t border-[#e8ede9] pt-5">
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#789087]">Alerts</p>
              {academicAlerts.length ? (
                <div className="mt-4 space-y-3">
                  {academicAlerts.map((record) => (
                    <div key={record.id} className="rounded-xl border border-[#f2d9d6] bg-[#fff8f7] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#8a403b]">{record.title}</p>
                          <p className="mt-1 text-sm text-[#8f5f5b]">{record.course_code} • {record.submission_status}</p>
                        </div>
                        <span className="rounded-full bg-[#ffe3df] px-2.5 py-1 text-xs font-semibold text-[#a04a3d]">
                          Needs attention
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-4 rounded-xl border border-dashed border-[#cfd9d1] bg-[#f9fcf9] p-4 text-sm text-[#6f7f77]">
                  No missed or late submissions to display.
                </div>
              )}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}

export default Dashboard;
