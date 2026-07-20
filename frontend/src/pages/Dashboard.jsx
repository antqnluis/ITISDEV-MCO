import { Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import AppIcon from "../components/ui/AppIcon";
import DashboardPageHeader from "../components/ui/DashboardPageHeader";
import StatusBadge from "../components/ui/StatusBadge";
import { usePrototypeData } from "../context/usePrototypeData";

const dimensions = [
  { key: "academic_engagement_score", label: "Academic engagement", icon: "book" },
  { key: "personal_wellbeing_score", label: "Personal wellbeing", icon: "heart" },
  { key: "logistical_load_score", label: "Logistical load", icon: "calendar" },
  { key: "role_load_score", label: "Role load", icon: "briefcase" },
  { key: "course_environment_score", label: "Course environment", icon: "records" },
];

const checkInMetrics = [
  { key: "stress_level", label: "Stress", inverse: true },
  { key: "mood_level", label: "Mood" },
  { key: "sleep_quality", label: "Sleep" },
  { key: "motivation_level", label: "Motivation" },
  { key: "burnout_level", label: "Burnout", inverse: true },
  { key: "energy_level", label: "Energy" },
];

function riskLevel(score) {
  if (score >= 70) return { label: "High concern", value: "high", color: "bg-[#c75d52]" };
  if (score >= 40) return { label: "Moderate", value: "moderate", color: "bg-[#d49a46]" };
  return { label: "Low concern", value: "low", color: "bg-[#4b9470]" };
}

function formatDate(value, options = {}) {
  return new Intl.DateTimeFormat("en-PH", { month: "short", day: "numeric", ...options }).format(new Date(value));
}

function formatTime(value) {
  return new Intl.DateTimeFormat("en-PH", { hour: "numeric", minute: "2-digit" }).format(new Date(value));
}

function greeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

function Dashboard() {
  const { student, profile, checkIns, dimensionScores, calendarEvents, academicRecords } = usePrototypeData();
  const latestCheckIn = [...checkIns].sort((a, b) => new Date(b.week_start) - new Date(a.week_start))[0] || null;
  const latestScore = latestCheckIn
    ? dimensionScores.find((score) => score.check_in_id === latestCheckIn.id)
    : null;
  const upcomingEvents = calendarEvents
    .filter((event) => event.status === "scheduled" && new Date(event.starts_at) >= new Date())
    .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at))
    .slice(0, 4);
  const upcomingRecords = academicRecords.filter((record) => record.submission_status === "upcoming").length;
  const attentionRecords = academicRecords.filter((record) => ["late", "missed"].includes(record.submission_status)).length;
  const roleHours = [
    profile.work_hours_per_week,
    profile.ojt_hours_per_week,
    profile.athlete_hours_per_week,
    profile.caregiving_hours_per_week,
    profile.organization_hours_per_week,
  ].reduce((sum, value) => sum + Number(value || 0), 0);

  return (
    <AppShell>
      <DashboardPageHeader
        eyebrow={latestCheckIn ? `Week of ${formatDate(`${latestCheckIn.week_start}T00:00:00`, { year: "numeric" })}` : "This week"}
        title={`${greeting()}, ${student.first_name}.`}
        description="Here is a clear view of your current wellbeing signals, commitments, and academic workload."
        actions={(
          <Link to="/check-in" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#3f7854] px-4 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(37,89,58,0.2)] transition hover:bg-[#356c49] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#285d3b]">
            <AppIcon name="check" className="size-[18px]" /> Update check-in
          </Link>
        )}
      />

      {latestScore ? (
        <section className="mb-6 overflow-hidden rounded-[22px] border border-[#eadbc3] bg-[#fffaf0] shadow-[0_8px_24px_rgba(75,59,31,0.06)]">
          <div className="grid gap-7 p-6 sm:p-8 lg:grid-cols-[0.9fr_1.4fr] lg:items-center">
            <div>
              <div className="flex items-center gap-2 text-[#9a651f]">
                <span className="grid size-9 place-items-center rounded-full bg-[#ffefd0]"><AppIcon name="warning" className="size-[18px]" /></span>
                <span className="text-xs font-bold uppercase tracking-[0.13em]">Weekly risk signals</span>
              </div>
              <h2 className="mt-4 font-serif text-2xl font-semibold tracking-[-0.025em] text-[#30271a]">Several areas need attention.</h2>
              <p className="mt-2 text-sm leading-6 text-[#75664f]">These scores measure concern, not performance. A lower score means a lower current risk signal.</p>
              <div className="mt-5 flex items-center gap-3 text-xs text-[#7a6b53]">
                <span>0 — low concern</span><span className="h-px flex-1 bg-gradient-to-r from-[#55a17c] via-[#d5a04e] to-[#c75d52]" /><span>100 — high concern</span>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              {dimensions.map((dimension) => {
                const value = Number(latestScore[dimension.key]);
                const risk = riskLevel(value);
                return (
                  <article key={dimension.key} className="rounded-2xl border border-[#eee3d0] bg-white/80 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="grid size-8 place-items-center rounded-lg bg-[#f5f1e8] text-[#6a664f]"><AppIcon name={dimension.icon} className="size-4" /></span>
                      <StatusBadge value={risk.value} label={risk.label} />
                    </div>
                    <p className="mt-4 text-[28px] font-semibold tracking-[-0.04em] text-[#262d28]">{value}<span className="ml-0.5 text-sm font-medium text-[#849089]">/100</span></p>
                    <p className="mt-1 min-h-10 text-xs font-medium leading-5 text-[#5e6e67]">{dimension.label}</p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-[#e8ebe8]"><span className={`block h-full rounded-full ${risk.color}`} style={{ width: `${value}%` }} /></div>
                  </article>
                );
              })}
            </div>
          </div>
        </section>
      ) : (
        <section className="mb-6 rounded-[22px] border border-dashed border-[#b8c8bc] bg-[#f1f7f1] p-7 text-center">
          <AppIcon name="sparkles" className="mx-auto size-7 text-[#4b8360]" />
          <h2 className="mt-3 font-serif text-xl font-semibold text-[#174635]">Your dimension scores are not available yet</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#667972]">Complete a weekly check-in and add your current course concerns to generate the five risk dimensions.</p>
        </section>
      )}

      <div className="grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
        <section className="rounded-[20px] border border-[#e1e7e2] bg-white p-6 shadow-[0_5px_20px_rgba(22,51,40,0.04)] sm:p-7">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#789087]">Latest check-in</p>
              <h2 className="mt-1.5 font-serif text-2xl font-semibold text-[#163d2f]">How you reported feeling</h2>
            </div>
            {latestCheckIn && <span className="shrink-0 text-xs text-[#7b8b85]">Submitted {formatDate(latestCheckIn.submitted_at)}</span>}
          </div>
          {latestCheckIn ? (
            <>
              <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                {checkInMetrics.map((metric) => {
                  const value = latestCheckIn[metric.key];
                  const favorable = metric.inverse ? 6 - value : value;
                  return (
                    <div key={metric.key} className="rounded-xl bg-[#f6f8f5] p-4">
                      <div className="flex items-center justify-between"><p className="text-sm font-medium text-[#50665d]">{metric.label}</p><p className="text-sm font-bold text-[#173e30]">{value}/5</p></div>
                      <div className="mt-3 flex gap-1" aria-label={`${metric.label}: ${value} out of 5`}>
                        {[1, 2, 3, 4, 5].map((step) => <span key={step} className={`h-1.5 flex-1 rounded-full ${step <= favorable ? "bg-[#68a57c]" : "bg-[#dfe7e1]"}`} />)}
                      </div>
                    </div>
                  );
                })}
              </div>
              <blockquote className="mt-5 border-l-2 border-[#91b49b] pl-4 text-sm italic leading-6 text-[#60736b]">“{latestCheckIn.reflection}”</blockquote>
            </>
          ) : (
            <p className="mt-5 rounded-xl bg-[#f7f8f6] p-5 text-sm text-[#667972]">No weekly check-in has been submitted yet.</p>
          )}
        </section>

        <section className="rounded-[20px] border border-[#e1e7e2] bg-white p-6 shadow-[0_5px_20px_rgba(22,51,40,0.04)] sm:p-7">
          <div className="flex items-center justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#789087]">Schedule</p>
              <h2 className="mt-1.5 font-serif text-2xl font-semibold text-[#163d2f]">Coming up</h2>
            </div>
            <Link to="/calendar" className="inline-flex items-center gap-1 text-sm font-semibold text-[#39724e] hover:underline">View calendar <AppIcon name="arrowRight" className="size-4" /></Link>
          </div>
          <div className="mt-5 divide-y divide-[#edf0ed]">
            {upcomingEvents.length > 0 ? upcomingEvents.map((event) => (
              <div key={event.id} className="flex gap-4 py-4 first:pt-0 last:pb-0">
                <div className="w-12 shrink-0 rounded-xl bg-[#eef5ef] py-2 text-center">
                  <p className="text-[10px] font-bold uppercase text-[#528063]">{formatDate(event.starts_at, { weekday: "short" }).split(" ")[0]}</p>
                  <p className="mt-0.5 text-lg font-semibold text-[#244c39]">{new Date(event.starts_at).getDate()}</p>
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-[#213d32]">{event.title}</p>
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-[#75857f]"><AppIcon name="clock" className="size-3.5" />{event.all_day ? "All day" : formatTime(event.starts_at)} · {event.location}</p>
                </div>
              </div>
            )) : <p className="py-6 text-center text-sm text-[#718078]">Nothing else scheduled this week.</p>}
          </div>
        </section>
      </div>

      <div className="mt-6 grid gap-4 sm:grid-cols-3">
        <Link to="/academic-records" className="group rounded-[18px] border border-[#e1e7e2] bg-white p-5 shadow-[0_4px_16px_rgba(22,51,40,0.035)] transition hover:-translate-y-0.5 hover:border-[#bed0c2] hover:shadow-[0_10px_28px_rgba(22,51,40,0.08)]">
          <div className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-xl bg-[#edf4ee] text-[#47775a]"><AppIcon name="records" className="size-[18px]" /></span><AppIcon name="arrowRight" className="size-4 text-[#97a69f] transition group-hover:translate-x-0.5" /></div>
          <p className="mt-4 text-2xl font-semibold text-[#18392d]">{upcomingRecords}</p><p className="mt-1 text-sm text-[#667972]">Upcoming academic requirements</p>
        </Link>
        <Link to="/academic-records" className="group rounded-[18px] border border-[#e1e7e2] bg-white p-5 shadow-[0_4px_16px_rgba(22,51,40,0.035)] transition hover:-translate-y-0.5 hover:border-[#bed0c2] hover:shadow-[0_10px_28px_rgba(22,51,40,0.08)]">
          <div className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-xl bg-[#fff1e4] text-[#9b672b]"><AppIcon name="warning" className="size-[18px]" /></span><AppIcon name="arrowRight" className="size-4 text-[#97a69f] transition group-hover:translate-x-0.5" /></div>
          <p className="mt-4 text-2xl font-semibold text-[#18392d]">{attentionRecords}</p><p className="mt-1 text-sm text-[#667972]">Late or missed submissions</p>
        </Link>
        <Link to="/settings" className="group rounded-[18px] border border-[#e1e7e2] bg-white p-5 shadow-[0_4px_16px_rgba(22,51,40,0.035)] transition hover:-translate-y-0.5 hover:border-[#bed0c2] hover:shadow-[0_10px_28px_rgba(22,51,40,0.08)]">
          <div className="flex items-center justify-between"><span className="grid size-9 place-items-center rounded-xl bg-[#edf4ee] text-[#47775a]"><AppIcon name="briefcase" className="size-[18px]" /></span><AppIcon name="arrowRight" className="size-4 text-[#97a69f] transition group-hover:translate-x-0.5" /></div>
          <p className="mt-4 text-2xl font-semibold text-[#18392d]">{roleHours}<span className="ml-1 text-sm font-medium text-[#75857f]">hrs</span></p><p className="mt-1 text-sm text-[#667972]">Recurring responsibilities per week</p>
        </Link>
      </div>
    </AppShell>
  );
}

export default Dashboard;
