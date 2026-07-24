import { useCallback, useEffect, useState } from "react";
import AppShell from "../components/layout/AppShell";
import AppIcon from "../components/ui/AppIcon";
import DashboardPageHeader from "../components/ui/DashboardPageHeader";
import Modal from "../components/ui/Modal";
import StatusBadge from "../components/ui/StatusBadge";
import CheckInWizard from "../components/weekly-check-in/CheckInWizard";
import { useAuth } from "../context/useAuth";
import { listAllCourses } from "../services/courseApi";
import {
  createCourseEnvironmentLog,
  deleteCourseEnvironmentLog,
  listAllCourseEnvironmentLogs,
  updateCourseEnvironmentLog,
} from "../services/courseEnvironmentLogApi";
import { listAllWellnessDimensionScores } from "../services/wellnessDimensionScoreApi";
import {
  calculateWellnessDimensions,
  createWeeklyCheckIn,
  getCurrentWeeklyCheckIn,
  listWeeklyCheckIns,
  updateWeeklyCheckIn,
} from "../services/weeklyCheckInApi";

const ratingFields = [
  { key: "stress_level", label: "Stress level", low: "Very low", high: "Very high" },
  { key: "mood_level", label: "Mood", low: "Very low", high: "Very good" },
  { key: "sleep_quality", label: "Sleep quality", low: "Very poor", high: "Very good" },
  { key: "motivation_level", label: "Motivation", low: "Very low", high: "Very high" },
  { key: "burnout_level", label: "Burnout", low: "Very low", high: "Very high" },
  { key: "energy_level", label: "Energy", low: "Very low", high: "Very high" },
];

const concernFields = [
  { key: "workload_difficulty", label: "Workload" },
  { key: "unclear_instruction_level", label: "Unclear instructions" },
  { key: "grading_concern_level", label: "Grading" },
  { key: "professor_approachability_concern", label: "Approachability" },
  { key: "groupmate_issue_level", label: "Groupmates" },
];

const checkInPayloadFields = [
  "week_start",
  "stress_level",
  "mood_level",
  "sleep_quality",
  "motivation_level",
  "burnout_level",
  "energy_level",
  "available_study_hours",
  "reflection",
];

const logPayloadFields = [
  "workload_difficulty",
  "unclear_instruction_level",
  "grading_concern_level",
  "professor_approachability_concern",
  "groupmate_issue_level",
  "concern_notes",
];

function formatWeek(value) {
  const start = new Date(`${value}T00:00:00`);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  return `${start.toLocaleDateString("en-PH", { month: "short", day: "numeric" })} – ${end.toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}`;
}

function ratingLabel(field, value) {
  if (value === 1) return field.low;
  if (value === 5) return field.high;
  return ["", "", "Low", "Moderate", "High"][value];
}

function pickFields(value, fields) {
  return fields.reduce((payload, field) => {
    payload[field] = value[field];
    return payload;
  }, {});
}

function sortCheckIns(checkIns) {
  return [...checkIns].sort((left, right) => (
    new Date(right.week_start) - new Date(left.week_start)
  ));
}

function upsertById(items, item) {
  return items.some((current) => current.id === item.id)
    ? items.map((current) => current.id === item.id ? item : current)
    : [item, ...items];
}

function isCurrentScore(score, checkIn) {
  if (!score || !checkIn?.updated_at) return Boolean(score);
  const scoreUpdatedAt = score.updated_at || score.calculated_at;
  if (!scoreUpdatedAt) return true;
  return new Date(scoreUpdatedAt) >= new Date(checkIn.updated_at);
}

function logsForCheckIn(logs, checkIn) {
  if (!checkIn) return [];
  return logs.filter((log) => (
    log.check_in_id === checkIn.id
    || (!log.check_in_id && log.week_start === checkIn.week_start)
  ));
}

async function fetchWeeklyCheckInData(authenticatedRequest) {
  const [currentResult, checkIns, courses, courseLogs, dimensionScores] = await Promise.all([
    getCurrentWeeklyCheckIn(authenticatedRequest),
    listWeeklyCheckIns(authenticatedRequest),
    listAllCourses(authenticatedRequest),
    listAllCourseEnvironmentLogs(authenticatedRequest),
    listAllWellnessDimensionScores(authenticatedRequest),
  ]);

  const completeCheckIns = currentResult.checkIn
    ? upsertById(checkIns, currentResult.checkIn)
    : checkIns;

  return {
    checkIns: sortCheckIns(completeCheckIns),
    courseLogs,
    courses,
    currentWeekStart: currentResult.weekStart,
    dimensionScores,
  };
}

async function synchronizeCourseLogs(
  authenticatedRequest,
  savedCheckIn,
  desiredLogs,
  existingLogs,
) {
  const desiredIds = new Set(desiredLogs.map((log) => log.id).filter(Boolean));
  const mutations = desiredLogs.map((log) => {
    const fields = pickFields(log, logPayloadFields);
    const existing = log.id
      ? existingLogs.find((current) => current.id === log.id)
      : null;

    if (existing) {
      return updateCourseEnvironmentLog(authenticatedRequest, existing.id, {
        ...fields,
        check_in_id: savedCheckIn.id,
      });
    }

    return createCourseEnvironmentLog(authenticatedRequest, {
      ...fields,
      check_in_id: savedCheckIn.id,
      course_id: log.course_id,
      week_start: savedCheckIn.week_start,
    });
  });

  existingLogs.forEach((log) => {
    if (!desiredIds.has(log.id)) {
      mutations.push(deleteCourseEnvironmentLog(authenticatedRequest, log.id));
    }
  });

  await Promise.all(mutations);
}

function WeeklyCheckIn() {
  const { authenticatedRequest } = useAuth();
  const [checkIns, setCheckIns] = useState([]);
  const [courseLogs, setCourseLogs] = useState([]);
  const [courses, setCourses] = useState([]);
  const [currentWeekStart, setCurrentWeekStart] = useState("");
  const [dimensionScores, setDimensionScores] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formVersion, setFormVersion] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionError, setSubmissionError] = useState("");
  const [calculationWarning, setCalculationWarning] = useState("");

  const applyData = useCallback((data, preferredId = null) => {
    setCheckIns(data.checkIns);
    setCourseLogs(data.courseLogs);
    setCourses(data.courses);
    setCurrentWeekStart(data.currentWeekStart);
    setDimensionScores(data.dimensionScores);
    setSelectedId((currentId) => {
      if (preferredId && data.checkIns.some((checkIn) => checkIn.id === preferredId)) {
        return preferredId;
      }
      if (currentId && data.checkIns.some((checkIn) => checkIn.id === currentId)) {
        return currentId;
      }
      return data.checkIns.find((checkIn) => checkIn.week_start === data.currentWeekStart)?.id
        || data.checkIns[0]?.id
        || null;
    });
  }, []);

  const refreshData = useCallback(async (preferredId = null) => {
    const data = await fetchWeeklyCheckInData(authenticatedRequest);
    applyData(data, preferredId);
    return data;
  }, [applyData, authenticatedRequest]);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setIsLoading(true);
      setLoadError("");
      try {
        const data = await fetchWeeklyCheckInData(authenticatedRequest);
        if (!cancelled) applyData(data);
      } catch (error) {
        if (!cancelled) {
          setLoadError(error.message || "Unable to load weekly check-ins.");
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    loadData();
    return () => {
      cancelled = true;
    };
  }, [applyData, authenticatedRequest, loadAttempt]);

  const current = checkIns.find((checkIn) => checkIn.week_start === currentWeekStart) || null;
  const selected = checkIns.find((checkIn) => checkIn.id === selectedId)
    || current
    || checkIns[0]
    || null;
  const selectedLogs = logsForCheckIn(courseLogs, selected);
  const scoreForSelected = selected
    ? dimensionScores.find((score) => score.check_in_id === selected.id)
    : null;
  const selectedScore = isCurrentScore(scoreForSelected, selected)
    ? scoreForSelected
    : null;
  const currentLogs = logsForCheckIn(courseLogs, current);

  function openForm() {
    setSubmissionError("");
    setCalculationWarning("");
    setFormOpen(true);
  }

  async function handleSave(checkIn, desiredLogs) {
    setIsSubmitting(true);
    setSubmissionError("");
    setCalculationWarning("");

    let savedCheckIn;
    try {
      const payload = pickFields(checkIn, checkInPayloadFields);
      savedCheckIn = checkIn.id
        ? await updateWeeklyCheckIn(authenticatedRequest, checkIn.id, payload)
        : await createWeeklyCheckIn(authenticatedRequest, payload);
      setCheckIns((items) => sortCheckIns(upsertById(items, savedCheckIn)));
      setSelectedId(savedCheckIn.id);

      const existingLogs = logsForCheckIn(courseLogs, savedCheckIn);
      await synchronizeCourseLogs(
        authenticatedRequest,
        savedCheckIn,
        desiredLogs,
        existingLogs,
      );
    } catch (error) {
      try {
        await refreshData(savedCheckIn?.id || null);
      } catch {
        // Keep the last known state available when refreshing also fails.
      }
      setSubmissionError(error.message || "Unable to save this weekly check-in.");
      setFormVersion((version) => version + 1);
      setIsSubmitting(false);
      return;
    }

    let warning = "";
    try {
      await calculateWellnessDimensions(authenticatedRequest, savedCheckIn.id);
    } catch {
      warning = "Your check-in was saved, but its wellness dimensions could not be calculated yet.";
    }

    try {
      await refreshData(savedCheckIn.id);
    } catch {
      warning = warning
        || "Your check-in was saved, but the latest results could not be reloaded. Refresh the page to try again.";
    }

    setCalculationWarning(warning);
    setFormOpen(false);
    setIsSubmitting(false);
  }

  return (
    <AppShell>
      <DashboardPageHeader
        eyebrow="Weekly reflection"
        title="Weekly Check-in"
        description="Capture how the week felt and note course-specific concerns. Ratings use the same 1–5 scales stored by AnimoLog."
        actions={!isLoading && !loadError ? <button type="button" onClick={openForm} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#3f7854] px-4 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(37,89,58,0.2)] hover:bg-[#356c49]"><AppIcon name={current ? "edit" : "plus"} className="size-[18px]" />{current ? "Update this week" : "Start check-in"}</button> : null}
      />

      {calculationWarning && (
        <div role="status" className="mb-6 rounded-2xl border border-[#e6ca9c] bg-[#fff8eb] px-5 py-4 text-sm font-medium text-[#835f28]">
          {calculationWarning}
        </div>
      )}

      {isLoading ? (
        <section aria-live="polite" className="rounded-[20px] border border-[#e0e7e2] bg-white px-6 py-14 text-center">
          <span className="mx-auto block size-9 animate-spin rounded-full border-4 border-[#d6e4d9] border-t-[#3f7854]" aria-hidden="true" />
          <p className="mt-4 text-sm font-medium text-[#60736b]">Loading weekly check-ins…</p>
        </section>
      ) : loadError ? (
        <section role="alert" className="rounded-[20px] border border-danger/25 bg-[#fff7f5] px-6 py-10 text-center">
          <h2 className="font-serif text-2xl font-semibold text-[#763e39]">Weekly check-ins could not be loaded</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-danger">{loadError}</p>
          <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="mt-6 inline-flex h-11 items-center rounded-xl bg-[#3f7854] px-5 text-sm font-semibold text-white hover:bg-[#356c49]">
            Try again
          </button>
        </section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[280px_1fr]">
          <aside className="rounded-[20px] border border-[#e0e7e2] bg-white p-4 shadow-[0_5px_20px_rgba(22,51,40,0.035)] lg:self-start">
            <h2 className="px-2 py-2 text-xs font-bold uppercase tracking-[0.13em] text-[#789087]">Check-in history</h2>
            <div className="mt-1 space-y-1.5">
              {checkIns.length ? checkIns.map((checkIn) => {
                const isCurrent = checkIn.week_start === currentWeekStart;
                return (
                  <button key={checkIn.id} type="button" onClick={() => setSelectedId(checkIn.id)} className={`w-full rounded-xl px-3.5 py-3 text-left transition ${selected?.id === checkIn.id ? "bg-[#eaf3eb] ring-1 ring-[#c9dccd]" : "hover:bg-[#f5f7f5]"}`}>
                    <div className="flex items-center justify-between gap-2"><span className={`text-sm font-semibold ${selected?.id === checkIn.id ? "text-[#285f3e]" : "text-[#40584e]"}`}>{isCurrent ? "This week" : formatWeek(checkIn.week_start)}</span>{isCurrent && <StatusBadge value="completed" label="Done" />}</div>
                    {isCurrent && <p className="mt-1 text-xs text-[#7b8984]">{formatWeek(checkIn.week_start)}</p>}
                  </button>
                );
              }) : (
                <p className="px-2 py-4 text-sm leading-6 text-[#718078]">No check-in history yet.</p>
              )}
            </div>
          </aside>

          {selected ? (
            <div className="space-y-6">
              <section className="rounded-[20px] border border-[#e0e7e2] bg-white p-6 shadow-[0_5px_20px_rgba(22,51,40,0.035)] sm:p-7">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div><p className="text-xs font-bold uppercase tracking-[0.13em] text-[#789087]">Week of</p><h2 className="mt-1 font-serif text-2xl font-semibold text-[#173e30]">{formatWeek(selected.week_start)}</h2></div>
                  <p className="text-xs text-[#7c8b85]">Submitted {new Date(selected.submitted_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}</p>
                </div>
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {ratingFields.map((field) => {
                    const value = selected[field.key];
                    return <div key={field.key} className="rounded-xl border border-[#e5ebe7] bg-[#fafbf9] p-4"><div className="flex items-center justify-between gap-2"><p className="text-sm font-medium text-[#52675e]">{field.label}</p><p className="text-lg font-bold text-[#244c39]">{value}<span className="text-xs text-[#89968f]">/5</span></p></div><p className="mt-2 text-xs text-[#7b8984]">{ratingLabel(field, value)}</p></div>;
                  })}
                </div>
                <div className="mt-5 grid gap-4 sm:grid-cols-[0.35fr_1fr]">
                  <div className="rounded-xl bg-[#edf5ef] p-4"><p className="text-xs font-semibold uppercase tracking-wide text-[#63806f]">Study time</p><p className="mt-2 text-xl font-bold text-[#285b3d]">{selected.available_study_hours} hours</p></div>
                  <blockquote className="rounded-xl bg-[#f6f7f5] p-4 text-sm italic leading-6 text-[#60736b]">“{selected.reflection || "No reflection was added."}”</blockquote>
                </div>
              </section>

              <div className="grid gap-6 xl:grid-cols-2">
                <section className="rounded-[20px] border border-[#e0e7e2] bg-white p-6">
                  <div className="flex items-center justify-between"><div><p className="text-xs font-bold uppercase tracking-[0.13em] text-[#789087]">Calculated output</p><h2 className="mt-1 font-serif text-xl font-semibold text-[#173e30]">Risk dimensions</h2></div><AppIcon name="sparkles" className="size-5 text-[#5b896a]" /></div>
                  {selectedScore ? <div className="mt-5 space-y-3">{[
                    ["Academic engagement", selectedScore.academic_engagement_score], ["Personal wellbeing", selectedScore.personal_wellbeing_score], ["Logistical load", selectedScore.logistical_load_score], ["Role load", selectedScore.role_load_score], ["Course environment", selectedScore.course_environment_score],
                  ].map(([label, rawValue]) => {
                    const value = Number(rawValue);
                    return <div key={label}><div className="flex items-center justify-between text-xs"><span className="font-medium text-[#5c7067]">{label}</span><span className="font-bold text-[#29483b]">{value}/100</span></div><div className="mt-1.5 h-1.5 rounded-full bg-[#e6ebe7]"><span className={`block h-full rounded-full ${value >= 70 ? "bg-[#c75d52]" : value >= 40 ? "bg-[#d49a46]" : "bg-[#4b9470]"}`} style={{ width: `${value}%` }} /></div></div>;
                  })}</div> : <div className="mt-5 rounded-xl bg-[#f5f7f5] p-5 text-sm leading-6 text-[#718078]">No dimension calculation is available for this check-in yet.</div>}
                </section>

                <section className="rounded-[20px] border border-[#e0e7e2] bg-white p-6">
                  <div><p className="text-xs font-bold uppercase tracking-[0.13em] text-[#789087]">Course environment</p><h2 className="mt-1 font-serif text-xl font-semibold text-[#173e30]">{selectedLogs.length} course{selectedLogs.length === 1 ? "" : "s"} noted</h2></div>
                  <div className="mt-4 space-y-3">
                    {selectedLogs.length ? selectedLogs.map((log) => {
                      const values = concernFields.map((field) => log[field.key]).filter(Boolean);
                      const peak = values.length ? Math.max(...values) : 0;
                      return <article key={log.id} className="rounded-xl border border-[#e5ebe7] p-4"><div className="flex items-center justify-between gap-3"><div><p className="text-sm font-bold text-[#29483b]">{log.course_code}</p><p className="mt-0.5 text-xs text-[#76867f]">{log.course_name}</p></div><StatusBadge value={peak >= 4 ? "high" : peak >= 3 ? "moderate" : "low"} label={`Peak ${peak}/5`} /></div><p className="mt-3 line-clamp-2 text-xs leading-5 text-[#65776f]">{log.concern_notes || "Ratings only"}</p></article>;
                    }) : <div className="rounded-xl bg-[#f5f7f5] p-5 text-sm text-[#718078]">No course-specific concerns were recorded.</div>}
                  </div>
                </section>
              </div>
            </div>
          ) : (
            <section className="rounded-[20px] border border-dashed border-[#c5d3c9] bg-white p-12 text-center"><AppIcon name="check" className="mx-auto size-8 text-[#5b896a]" /><h2 className="mt-4 font-serif text-2xl font-semibold text-[#173e30]">No check-ins yet</h2><p className="mt-2 text-sm text-[#718078]">Start with a quick reflection for the current week.</p></section>
          )}
        </div>
      )}

      {formOpen && currentWeekStart && (
        <Modal open onClose={() => setFormOpen(false)} closeDisabled={isSubmitting} title={current ? "Update this week’s check-in" : "Weekly check-in"} description="Your responses describe the current Monday–Sunday week." size="max-w-5xl">
          <CheckInWizard
            key={`${current?.id || "new"}-${formVersion}`}
            courses={courses}
            currentWeekStart={currentWeekStart}
            initialCheckIn={current}
            existingLogs={currentLogs}
            isSubmitting={isSubmitting}
            submissionError={submissionError}
            onSave={handleSave}
            onCancel={() => setFormOpen(false)}
          />
        </Modal>
      )}
    </AppShell>
  );
}

export default WeeklyCheckIn;
