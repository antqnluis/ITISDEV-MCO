import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import WellnessSupportAlert from "../components/wellness-plan/WellnessSupportAlert";
import DashboardPageHeader from "../components/ui/DashboardPageHeader";
import AppIcon from "../components/ui/AppIcon";
import { useAuth } from "../context/useAuth";
import { listAllWellnessDimensionScores } from "../services/wellnessDimensionScoreApi";
import {
  analyzeWeeklyCheckIn,
  getWeeklyAnalysis,
  listWeeklyCheckIns,
} from "../services/weeklyCheckInApi";
import {
  buildWellnessPlanData,
  isAnalysisCurrent,
} from "../utils/wellnessPlanData";

const severityLabels = {
  low_normal: "Low/normal",
  moderate: "Moderate",
  severe: "Severe",
  critical: "Critical",
  pending: "Pending",
};

const riskLabels = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  pending: "Pending",
};

const contextLabels = {
  academic_engagement: "Academic engagement",
  personal_wellbeing: "Personal wellbeing",
  logistical_load: "Logistical load",
  role_load: "Role load",
  course_environment: "Course environment",
  mixed: "Mixed wellness dimensions",
};

function getConcernBarClass(score) {
  if (score === null) return "bg-[#b9c4be]";
  if (score >= 70) return "bg-[#c75d52]";
  if (score >= 40) return "bg-[#d49a46]";
  return "bg-[#4b9470]";
}

function sortCheckIns(checkIns) {
  return [...checkIns].sort((left, right) => {
    const weekDifference = String(right.week_start).localeCompare(
      String(left.week_start),
    );
    if (weekDifference !== 0) return weekDifference;
    return new Date(right.submitted_at) - new Date(left.submitted_at);
  });
}

async function fetchWellnessPlanData(authenticatedRequest) {
  const [checkIns, dimensionScores] = await Promise.all([
    listWeeklyCheckIns(authenticatedRequest),
    listAllWellnessDimensionScores(authenticatedRequest),
  ]);
  const sortedCheckIns = sortCheckIns(checkIns);
  const latestCheckIn = sortedCheckIns[0] || null;
  const latestScore = latestCheckIn
    ? dimensionScores.find((score) => score.check_in_id === latestCheckIn.id) || null
    : null;
  const aiResult = latestCheckIn && latestScore
    ? await getWeeklyAnalysis(authenticatedRequest, latestCheckIn.id)
    : null;

  return {
    aiResult,
    checkIns: sortedCheckIns,
    latestCheckIn,
    latestScore,
  };
}

function WellnessPlan() {
  const { authenticatedRequest } = useAuth();
  const [checkIns, setCheckIns] = useState([]);
  const [latestCheckIn, setLatestCheckIn] = useState(null);
  const [latestScore, setLatestScore] = useState(null);
  const [aiResult, setAiResult] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationError, setGenerationError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadPlan() {
      setIsLoading(true);
      setLoadError("");
      setGenerationError("");

      try {
        const data = await fetchWellnessPlanData(authenticatedRequest);
        if (!cancelled) {
          setCheckIns(data.checkIns);
          setLatestCheckIn(data.latestCheckIn);
          setLatestScore(data.latestScore);
          setAiResult(data.aiResult);
        }
      } catch (error) {
        if (!cancelled) {
          setLoadError(error.message || "Unable to load your wellness plan.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadPlan();
    return () => {
      cancelled = true;
    };
  }, [authenticatedRequest, loadAttempt]);

  const currentAnalysis = useMemo(
    () => (
      isAnalysisCurrent(aiResult, latestCheckIn, latestScore)
        ? aiResult
        : null
    ),
    [aiResult, latestCheckIn, latestScore],
  );
  const analysisIsOutdated = Boolean(aiResult && !currentAnalysis);
  const history = useMemo(
    () => checkIns.filter((checkIn) => checkIn.id !== latestCheckIn?.id),
    [checkIns, latestCheckIn],
  );
  const plan = useMemo(
    () => buildWellnessPlanData({
      aiResult: currentAnalysis,
      history,
      latestCheckIn,
      latestScore,
    }),
    [currentAnalysis, history, latestCheckIn, latestScore],
  );

  async function generateAnalysis() {
    if (!latestCheckIn || !latestScore || isGenerating) return;

    setIsGenerating(true);
    setGenerationError("");
    try {
      const result = await analyzeWeeklyCheckIn(
        authenticatedRequest,
        latestCheckIn.id,
        latestScore.id,
      );
      setAiResult(result);
    } catch (error) {
      setGenerationError(
        error.message || "Unable to generate your AI wellness analysis.",
      );
    } finally {
      setIsGenerating(false);
    }
  }

  const canGenerate = !isLoading
    && !loadError
    && latestCheckIn
    && latestScore
    && !currentAnalysis;

  return (
    <AppShell>
      <DashboardPageHeader
        eyebrow="AI wellness analysis"
        title="Wellness Plan"
        description="Review your latest calculated wellness dimensions and personalized AI guidance."
        actions={
          <div className="flex flex-wrap items-center gap-3">
            {canGenerate && (
              <button
                type="button"
                onClick={generateAnalysis}
                disabled={isGenerating}
                className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#3f7854] px-4 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(37,89,58,0.2)] hover:bg-[#356c49] disabled:cursor-not-allowed disabled:opacity-65"
              >
                <AppIcon name="sparkles" className="size-[18px]" />
                {isGenerating
                  ? "Generating…"
                  : analysisIsOutdated
                    ? "Update AI plan"
                    : "Generate AI plan"}
              </button>
            )}
            <Link
              to="/check-in"
              className="inline-flex h-11 items-center gap-2 rounded-xl border border-[#cfdcd2] bg-white px-4 text-sm font-semibold text-[#3f7854] hover:bg-[#f3f8f4]"
            >
              Review latest check-in
            </Link>
          </div>
        }
      />

      {isLoading ? (
        <section aria-live="polite" className="rounded-[20px] border border-[#e0e7e2] bg-white px-6 py-14 text-center">
          <span className="mx-auto block size-9 animate-spin rounded-full border-4 border-[#d6e4d9] border-t-[#3f7854]" aria-hidden="true" />
          <p className="mt-4 text-sm font-medium text-[#60736b]">Loading your wellness plan…</p>
        </section>
      ) : loadError ? (
        <section role="alert" className="rounded-[20px] border border-danger/25 bg-[#fff7f5] px-6 py-10 text-center">
          <h2 className="font-serif text-2xl font-semibold text-[#763e39]">Your wellness plan could not be loaded</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-danger">{loadError}</p>
          <button
            type="button"
            onClick={() => setLoadAttempt((attempt) => attempt + 1)}
            className="mt-6 inline-flex h-11 items-center rounded-xl bg-[#3f7854] px-5 text-sm font-semibold text-white hover:bg-[#356c49]"
          >
            Try again
          </button>
        </section>
      ) : !latestCheckIn ? (
        <section className="rounded-[20px] border border-dashed border-[#c5d3c9] bg-white p-12 text-center">
          <AppIcon name="sparkles" className="mx-auto size-8 text-[#5b896a]" />
          <h2 className="mt-4 font-serif text-2xl font-semibold text-[#173e30]">Start with a weekly check-in</h2>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-[#718078]">A completed check-in is required before AnimoLog can calculate dimensions or generate an AI wellness plan.</p>
          <Link to="/check-in" className="mt-6 inline-flex h-11 items-center rounded-xl bg-[#3f7854] px-5 text-sm font-semibold text-white hover:bg-[#356c49]">
            Start weekly check-in
          </Link>
        </section>
      ) : !latestScore ? (
        <section className="rounded-[20px] border border-[#e6ca9c] bg-[#fff8eb] px-6 py-10 text-center">
          <h2 className="font-serif text-2xl font-semibold text-[#704f1f]">Wellness dimensions are not ready</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#835f28]">The latest check-in was found, but its five dimension scores are unavailable. Review or save the check-in again before generating an AI plan.</p>
          <Link to="/check-in" className="mt-6 inline-flex h-11 items-center rounded-xl bg-[#8b641f] px-5 text-sm font-semibold text-white hover:bg-[#745218]">
            Review weekly check-in
          </Link>
        </section>
      ) : (
        <div className="space-y-6">
          {!currentAnalysis && (
            <section role="status" className="flex flex-col gap-4 rounded-[20px] border border-[#dce5de] bg-[#f9fcf9] p-5 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#29483b]">
                  {analysisIsOutdated
                    ? "Your check-in has newer wellness data"
                    : "Your calculated dimensions are ready"}
                </p>
                <p className="mt-1 text-xs leading-5 text-[#6a7d73]">
                  {analysisIsOutdated
                    ? "Update the AI plan to replace the older summary and recommendations."
                    : "Generate the AI plan when you are ready to create a personalized summary and recommendations."}
                </p>
              </div>
              <button
                type="button"
                onClick={generateAnalysis}
                disabled={isGenerating}
                className="inline-flex h-10 shrink-0 items-center justify-center rounded-xl bg-[#3f7854] px-4 text-sm font-semibold text-white hover:bg-[#356c49] disabled:cursor-not-allowed disabled:opacity-65"
              >
                {isGenerating
                  ? "Generating…"
                  : analysisIsOutdated
                    ? "Update AI plan"
                    : "Generate AI plan"}
              </button>
            </section>
          )}

          {generationError && (
            <section role="alert" className="rounded-2xl border border-danger/25 bg-[#fff7f5] px-5 py-4 text-sm text-danger">
              <p className="font-semibold">The AI plan could not be generated.</p>
              <p className="mt-1">{generationError}</p>
            </section>
          )}

          <WellnessSupportAlert severity={plan.stressSeverityLevel} />

          <section className="rounded-[24px] border border-[#e1e8e1] bg-white p-6 shadow-[0_8px_24px_rgba(22,51,40,0.04)]">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#789087]">Weekly plan overview</p>
                <h2 className="mt-2 font-serif text-2xl font-semibold text-[#173e30]">{plan.weekCovered}</h2>
                <p className="mt-2 text-sm text-[#688075]">
                  {plan.hasAnalysis
                    ? `Generated ${plan.generatedAt}`
                    : "AI analysis has not been generated for these results."}
                </p>
              </div>
              <div className="rounded-2xl bg-[#f1f7f2] p-4 text-left">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#69826f]">Student Wellness Index (concern)</p>
                <p className="mt-2 text-4xl font-bold text-[#234638]">
                  {plan.studentWellnessIndex === null ? "Pending" : `${plan.studentWellnessIndex}/100`}
                </p>
                <p className="mt-2 text-sm text-[#5b7166]">
                  {riskLabels[plan.riskCategory]} risk · {severityLabels[plan.stressSeverityLevel]} stress severity
                </p>
                <p className="mt-1 text-xs text-[#75877e]">Higher scores indicate greater concern.</p>
              </div>
            </div>

            <div className="mt-6 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-2xl border border-[#e7ece7] bg-[#fbfdfb] p-5">
                <p className="text-sm font-semibold text-[#345449]">Primary stress context</p>
                <p className="mt-2 text-sm leading-6 text-[#5c7068]">
                  {contextLabels[plan.primaryStressContext] || "Pending AI analysis"}
                </p>
                <p className="mt-4 text-sm font-semibold text-[#345449]">Current condition</p>
                <p className="mt-2 text-sm leading-6 text-[#5c7068]">{plan.currentCondition}</p>
              </div>
              <div className="rounded-2xl border border-[#e7ece7] bg-[#fbfdfb] p-5">
                <p className="text-sm font-semibold text-[#345449]">AI-generated summary</p>
                <p className="mt-2 text-sm leading-6 text-[#5c7068]">{plan.summary}</p>
                {plan.reflectionKeywords.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-2" aria-label="Reflection keywords">
                    {plan.reflectionKeywords.map((keyword) => (
                      <span key={keyword} className="rounded-full bg-[#eef5ef] px-3 py-1 text-xs font-semibold text-[#4b7858]">
                        {keyword}
                      </span>
                    ))}
                  </div>
                )}
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
                <span className="rounded-full bg-[#eef5ef] px-3 py-1 text-xs font-semibold text-[#4b7858]">Calculated student data</span>
              </div>
              <div className="mt-5 space-y-4">
                {plan.dimensions.map((dimension) => (
                  <div key={dimension.key} className="rounded-2xl border border-[#e9eee8] bg-[#fcfefd] p-4">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-[#29483b]">{dimension.label}</p>
                      <p className="text-sm font-bold text-[#234638]">
                        {dimension.score === null ? "Pending" : `${dimension.score}/100`}
                      </p>
                    </div>
                    <div className="mt-2 h-2 rounded-full bg-[#edf3ee]">
                      <div
                        className={`h-2 rounded-full ${getConcernBarClass(dimension.score)}`}
                        style={{ width: `${dimension.score ?? 0}%` }}
                      />
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
              <span className="rounded-full bg-[#fff7e8] px-3 py-1 text-xs font-semibold text-[#a86a1a]">AI-generated</span>
            </div>
            {plan.actions.length ? (
              <div className="mt-5 grid gap-4 lg:grid-cols-3">
                {plan.actions.map((action, index) => (
                  <article key={`${index}-${action}`} className="rounded-2xl border border-[#e7ece7] bg-[#fcfefd] p-4">
                    <span className="inline-flex size-7 items-center justify-center rounded-full bg-[#edf5ef] text-xs font-semibold text-[#3f7854]">{index + 1}</span>
                    <p className="mt-3 text-sm leading-6 text-[#64766f]">{action}</p>
                  </article>
                ))}
              </div>
            ) : (
              <div className="mt-5 rounded-2xl border border-dashed border-[#cfd8cf] bg-[#f9fcf9] p-6 text-sm text-[#6f7d76]">
                Generate the AI wellness analysis to receive personalized recommendations.
              </div>
            )}
          </section>

          <section className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr]">
            <div id="support-resources" className="scroll-mt-24 rounded-[24px] border border-[#e1e8e1] bg-white p-6 shadow-[0_8px_24px_rgba(22,51,40,0.04)]">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#789087]">Support resources</p>
              <h2 className="mt-1 font-serif text-xl font-semibold text-[#173e30]">Resources for elevated needs</h2>
              <ul className="mt-5 space-y-3">
                {plan.supportResources.map((resource) => (
                  <li key={resource} className="rounded-2xl border border-[#e7ece7] bg-[#fbfdfb] p-4 text-sm text-[#5a6d63]">{resource}</li>
                ))}
              </ul>
            </div>

            <div className="rounded-[24px] border border-[#e1e8e1] bg-white p-6 shadow-[0_8px_24px_rgba(22,51,40,0.04)]">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-[#789087]">Check-in history</p>
              <h2 className="mt-1 font-serif text-xl font-semibold text-[#173e30]">Earlier weekly check-ins</h2>
              {plan.checkInHistory.length ? (
                <div className="mt-5 space-y-3">
                  {plan.checkInHistory.map((entry) => (
                    <div key={entry.id} className="rounded-2xl border border-[#e7ece7] bg-[#fbfdfb] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-semibold text-[#29483b]">{entry.weekLabel}</p>
                          <p className="mt-1 text-xs text-[#73837b]">Submitted {entry.submittedAt}</p>
                        </div>
                        <span className="rounded-full bg-[#eef5ef] px-2.5 py-1 text-xs font-semibold text-[#4b7858]">Check-in</span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-[#64766f]">{entry.summary}</p>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="mt-5 rounded-2xl border border-dashed border-[#cfd8cf] bg-[#f9fcf9] p-6 text-sm text-[#6f7d76]">No earlier check-ins are available yet.</div>
              )}
            </div>
          </section>
        </div>
      )}
    </AppShell>
  );
}

export default WellnessPlan;
