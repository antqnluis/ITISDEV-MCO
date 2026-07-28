import { useMemo } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import DashboardPageHeader from "../components/ui/DashboardPageHeader";
import AppIcon from "../components/ui/AppIcon";
import { usePrototypeData } from "../context/usePrototypeData";
import { buildWellnessPlanData } from "../utils/wellnessPlanData";

function WellnessPlan() {
  const { student, profile, checkIns, dimensionScores } = usePrototypeData();

  const latestCheckIn = useMemo(() => {
    if (!checkIns.length) return null;
    return [...checkIns].sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))[0];
  }, [checkIns]);

  const latestScore = useMemo(() => {
    if (!latestCheckIn) return null;
    return dimensionScores.find((score) => score.check_in_id === latestCheckIn.id) || null;
  }, [dimensionScores, latestCheckIn]);

  const history = useMemo(() => {
    return [...checkIns]
      .sort((a, b) => new Date(b.submitted_at) - new Date(a.submitted_at))
      .slice(1);
  }, [checkIns]);

  const plan = useMemo(() => buildWellnessPlanData({
    student,
    profile,
    latestCheckIn,
    latestScore,
    history,
  }), [student, profile, latestCheckIn, latestScore, history]);

  return (
    <AppShell>
      <DashboardPageHeader
        eyebrow="AI wellness analysis"
        title="Wellness Plan"
        description="A mock AI-generated weekly wellness view using your latest check-in data and dimension scores."
        actions={
          <Link to="/check-in" className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#3f7854] px-4 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(37,89,58,0.2)] hover:bg-[#356c49]">
            <AppIcon name="sparkles" className="size-[18px]" />
            Review latest check-in
          </Link>
        }
      />

      <div className="space-y-6">
        <section className="rounded-[24px] border border-[#e1e8e1] bg-white p-6 shadow-[0_8px_24px_rgba(22,51,40,0.04)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#789087]">Weekly plan overview</p>
              <h2 className="mt-2 font-serif text-2xl font-semibold text-[#173e30]">{plan.weekCovered}</h2>
              <p className="mt-2 text-sm text-[#688075]">Generated {plan.generatedAt}</p>
            </div>
            <div className="rounded-2xl bg-[#f1f7f2] p-4 text-left">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#69826f]">Student Wellness Index</p>
              <p className="mt-2 text-4xl font-bold text-[#234638]">{plan.studentWellnessIndex}/100</p>
              <p className="mt-2 text-sm text-[#5b7166]">{plan.stressSeverityLevel} stress severity</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-2xl border border-[#e7ece7] bg-[#fbfdfb] p-5">
              <p className="text-sm font-semibold text-[#345449]">Primary stress context</p>
              <p className="mt-2 text-sm leading-6 text-[#5c7068]">{plan.primaryStressContext}</p>
              <p className="mt-4 text-sm font-semibold text-[#345449]">Current condition</p>
              <p className="mt-2 text-sm leading-6 text-[#5c7068]">{plan.currentCondition}</p>
            </div>
            <div className="rounded-2xl border border-[#e7ece7] bg-[#fbfdfb] p-5">
              <p className="text-sm font-semibold text-[#345449]">AI-generated summary</p>
              <p className="mt-2 text-sm leading-6 text-[#5c7068]">{plan.summary}</p>
            </div>
          </div>
        </section>

        <section className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[24px] border border-[#e1e8e1] bg-white p-6 shadow-[0_8px_24px_rgba(22,51,40,0.04)]">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#789087]">Wellness dimensions</p>
                <h2 className="mt-1 font-serif text-xl font-semibold text-[#173e30]">Dimension results</h2>
              </div>
              <span className="rounded-full bg-[#eef5ef] px-3 py-1 text-xs font-semibold text-[#4b7858]">Mock AI output</span>
            </div>
            <div className="mt-5 space-y-4">
              {plan.dimensions.map((dimension) => (
                <div key={dimension.key} className="rounded-2xl border border-[#e9eee8] bg-[#fcfefd] p-4">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-[#29483b]">{dimension.label}</p>
                    <p className="text-sm font-bold text-[#234638]">{dimension.score}/100</p>
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-[#edf3ee]">
                    <div className="h-2 rounded-full bg-[#4b9470]" style={{ width: `${dimension.score}%` }} />
                  </div>
                  <p className="mt-3 text-sm leading-6 text-[#64766f]">{dimension.explanation}</p>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-[24px] border border-[#e1e8e1] bg-white p-6 shadow-[0_8px_24px_rgba(22,51,40,0.04)]">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#789087]">Priority concerns</p>
            <h2 className="mt-1 font-serif text-xl font-semibold text-[#173e30]">What to address first</h2>
            <ul className="mt-5 space-y-3">
              {plan.priorities.map((priority, index) => (
                <li key={priority} className="rounded-2xl border border-[#e7ece7] bg-[#fbfdfb] p-4 text-sm text-[#5a6d63]">
                  <span className="mr-2 inline-flex size-7 items-center justify-center rounded-full bg-[#edf5ef] text-xs font-semibold text-[#3f7854]">{index + 1}</span>
                  {priority}
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="rounded-[24px] border border-[#e1e8e1] bg-white p-6 shadow-[0_8px_24px_rgba(22,51,40,0.04)]">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#789087]">Recommended actions</p>
              <h2 className="mt-1 font-serif text-xl font-semibold text-[#173e30]">Personalized next steps</h2>
            </div>
            <span className="rounded-full bg-[#fff7e8] px-3 py-1 text-xs font-semibold text-[#a86a1a]">Suggested timing included</span>
          </div>
          <div className="mt-5 grid gap-4 lg:grid-cols-3">
            {plan.actions.map((action) => (
              <article key={action.title} className="rounded-2xl border border-[#e7ece7] bg-[#fcfefd] p-4">
                <p className="text-sm font-semibold text-[#29483b]">{action.title}</p>
                <p className="mt-3 text-sm leading-6 text-[#64766f]">{action.reason}</p>
                <div className="mt-4 space-y-2 text-sm text-[#5b7166]">
                  <p><span className="font-semibold text-[#35594a]">Timing:</span> {action.timing}</p>
                  <p><span className="font-semibold text-[#35594a]">Wellness dimension:</span> {action.dimension}</p>
                </div>
              </article>
            ))}
          </div>
        </section>

        <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
          <div className="rounded-[24px] border border-[#e1e8e1] bg-white p-6 shadow-[0_8px_24px_rgba(22,51,40,0.04)]">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#789087]">Support resources</p>
            <h2 className="mt-1 font-serif text-xl font-semibold text-[#173e30]">Resources for elevated needs</h2>
            <ul className="mt-5 space-y-3">
              {plan.supportResources.map((resource) => (
                <li key={resource} className="rounded-2xl border border-[#e7ece7] bg-[#fbfdfb] p-4 text-sm text-[#5a6d63]">{resource}</li>
              ))}
            </ul>
          </div>

          <div className="rounded-[24px] border border-[#e1e8e1] bg-white p-6 shadow-[0_8px_24px_rgba(22,51,40,0.04)]">
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#789087]">Previous wellness plans</p>
            <h2 className="mt-1 font-serif text-xl font-semibold text-[#173e30]">Earlier weekly check-ins</h2>
            {plan.previousPlans.length ? (
              <div className="mt-5 space-y-3">
                {plan.previousPlans.map((entry) => (
                  <div key={entry.id} className="rounded-2xl border border-[#e7ece7] bg-[#fbfdfb] p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-semibold text-[#29483b]">{entry.weekLabel}</p>
                        <p className="mt-1 text-xs text-[#73837b]">Generated {entry.generatedAt}</p>
                      </div>
                      <span className="rounded-full bg-[#eef5ef] px-2.5 py-1 text-xs font-semibold text-[#4b7858]">Previous</span>
                    </div>
                    <p className="mt-3 text-sm leading-6 text-[#64766f]">{entry.summary}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-[#cfd8cf] bg-[#f9fcf9] p-6 text-sm text-[#6f7d76]">No earlier wellness plans are available yet.</div>
            )}
          </div>
        </section>
      </div>
    </AppShell>
  );
}

export default WellnessPlan;
