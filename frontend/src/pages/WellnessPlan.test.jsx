import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import WellnessPlan from "./WellnessPlan";

const mocks = vi.hoisted(() => ({
  analyzeWeeklyCheckIn: vi.fn(),
  authenticatedRequest: vi.fn(),
  getWeeklyAnalysis: vi.fn(),
  listAllWellnessDimensionScores: vi.fn(),
  listWeeklyCheckIns: vi.fn(),
}));

vi.mock("../components/layout/AppShell", () => ({
  default: function MockAppShell({ children }) {
    return <div>{children}</div>;
  },
}));

vi.mock("../context/useAuth", () => ({
  useAuth: () => ({
    authenticatedRequest: mocks.authenticatedRequest,
  }),
}));

vi.mock("../services/wellnessDimensionScoreApi", () => ({
  listAllWellnessDimensionScores: mocks.listAllWellnessDimensionScores,
}));

vi.mock("../services/weeklyCheckInApi", () => ({
  analyzeWeeklyCheckIn: mocks.analyzeWeeklyCheckIn,
  getWeeklyAnalysis: mocks.getWeeklyAnalysis,
  listWeeklyCheckIns: mocks.listWeeklyCheckIns,
}));

const latestCheckIn = {
  id: "check-in-current",
  week_start: "2026-07-20",
  submitted_at: "2026-07-28T07:00:00.000Z",
  updated_at: "2026-07-28T07:00:00.000Z",
  reflection: "Heavy workload and limited sleep.",
};

const previousCheckIn = {
  id: "check-in-previous",
  week_start: "2026-07-13",
  submitted_at: "2026-07-20T07:00:00.000Z",
  updated_at: "2026-07-20T07:00:00.000Z",
  reflection: "The previous week was manageable.",
};

const latestScore = {
  id: "score-current",
  check_in_id: latestCheckIn.id,
  academic_engagement_score: 54,
  personal_wellbeing_score: 82.5,
  logistical_load_score: 63.7,
  role_load_score: 76.36,
  course_environment_score: 74.38,
  calculated_at: "2026-07-28T07:05:00.000Z",
  updated_at: "2026-07-28T07:05:00.000Z",
};

const savedAnalysis = {
  id: "analysis-current",
  check_in_id: latestCheckIn.id,
  dimension_scores_id: latestScore.id,
  swi_score: 71.08,
  risk_category: "high",
  stress_severity_level: "severe",
  primary_stress_context: "mixed",
  weekly_summary: "The saved AI summary identifies several competing pressures.",
  reflection_keywords: ["deadlines", "sleep"],
  recommendations: [
    "Protect one recovery block this evening.",
    "Ask an instructor about sequencing the closest deadlines.",
  ],
  generated_at: "2026-07-28T07:10:00.000Z",
  updated_at: "2026-07-28T07:10:00.000Z",
};

function renderPage() {
  return render(
    <MemoryRouter>
      <WellnessPlan />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.listWeeklyCheckIns.mockResolvedValue([
    previousCheckIn,
    latestCheckIn,
  ]);
  mocks.listAllWellnessDimensionScores.mockResolvedValue([latestScore]);
  mocks.getWeeklyAnalysis.mockResolvedValue(savedAnalysis);
});

describe("Wellness Plan live data", () => {
  it("renders the latest saved AI analysis and real student records", async () => {
    renderPage();

    expect(await screen.findByText(savedAnalysis.weekly_summary)).toBeInTheDocument();
    expect(screen.getByText("71.08/100")).toBeInTheDocument();
    expect(screen.getByText(/High risk · Severe stress severity/i)).toBeInTheDocument();
    expect(screen.getByText("Mixed wellness dimensions")).toBeInTheDocument();
    expect(screen.getByText("Heavy workload and limited sleep.")).toBeInTheDocument();
    expect(screen.getByText("Protect one recovery block this evening.")).toBeInTheDocument();
    expect(screen.getByLabelText("Reflection keywords")).toHaveTextContent("deadlines");
    expect(screen.getByText("The previous week was manageable.")).toBeInTheDocument();
    expect(screen.getByText("Calculated student data")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate AI plan" })).not.toBeInTheDocument();
    expect(screen.queryByText(/mock|demo scenario/i)).not.toBeInTheDocument();

    expect(mocks.getWeeklyAnalysis).toHaveBeenCalledWith(
      mocks.authenticatedRequest,
      latestCheckIn.id,
    );
    expect(mocks.analyzeWeeklyCheckIn).not.toHaveBeenCalled();
  });

  it("generates a missing analysis only after the student clicks", async () => {
    const user = userEvent.setup();
    mocks.getWeeklyAnalysis.mockResolvedValue(null);
    mocks.analyzeWeeklyCheckIn.mockResolvedValue(savedAnalysis);
    renderPage();

    const generateButtons = await screen.findAllByRole("button", {
      name: "Generate AI plan",
    });
    expect(mocks.analyzeWeeklyCheckIn).not.toHaveBeenCalled();

    await user.click(generateButtons[0]);

    expect(mocks.analyzeWeeklyCheckIn).toHaveBeenCalledWith(
      mocks.authenticatedRequest,
      latestCheckIn.id,
      latestScore.id,
    );
    expect(await screen.findByText(savedAnalysis.weekly_summary)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Generate AI plan" })).not.toBeInTheDocument();
  });

  it("withholds stale AI content and offers an update action", async () => {
    mocks.getWeeklyAnalysis.mockResolvedValue({
      ...savedAnalysis,
      weekly_summary: "This stale summary should not be displayed.",
      updated_at: "2026-07-28T07:04:00.000Z",
      generated_at: "2026-07-28T07:04:00.000Z",
    });
    renderPage();

    expect(await screen.findByText(/newer wellness data/i)).toBeInTheDocument();
    expect(screen.getAllByRole("button", { name: "Update AI plan" })).not.toHaveLength(0);
    expect(screen.queryByText("This stale summary should not be displayed.")).not.toBeInTheDocument();
    expect(screen.getByText(/Generate this week’s AI wellness analysis/i)).toBeInTheDocument();
  });

  it("shows the generation error and allows the action to be retried", async () => {
    const user = userEvent.setup();
    mocks.getWeeklyAnalysis.mockResolvedValue(null);
    mocks.analyzeWeeklyCheckIn
      .mockRejectedValueOnce(new Error("Groq is temporarily unavailable"))
      .mockResolvedValueOnce(savedAnalysis);
    renderPage();

    await user.click((await screen.findAllByRole("button", {
      name: "Generate AI plan",
    }))[0]);
    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Groq is temporarily unavailable",
    );

    await user.click(screen.getAllByRole("button", {
      name: "Generate AI plan",
    })[0]);
    expect(await screen.findByText(savedAnalysis.weekly_summary)).toBeInTheDocument();
    expect(mocks.analyzeWeeklyCheckIn).toHaveBeenCalledTimes(2);
  });

  it("shows a retryable load error", async () => {
    const user = userEvent.setup();
    mocks.listWeeklyCheckIns
      .mockRejectedValueOnce(new Error("Unable to load check-ins"))
      .mockResolvedValueOnce([latestCheckIn]);
    mocks.listAllWellnessDimensionScores
      .mockResolvedValueOnce([latestScore])
      .mockResolvedValueOnce([latestScore]);
    renderPage();

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Unable to load check-ins",
    );
    await user.click(screen.getByRole("button", { name: "Try again" }));

    expect(await screen.findByText(savedAnalysis.weekly_summary)).toBeInTheDocument();
    expect(mocks.listWeeklyCheckIns).toHaveBeenCalledTimes(2);
  });

  it("shows clear empty states for missing check-ins and dimension scores", async () => {
    mocks.listWeeklyCheckIns.mockResolvedValue([]);
    mocks.listAllWellnessDimensionScores.mockResolvedValue([]);
    const firstRender = renderPage();

    expect(await screen.findByText("Start with a weekly check-in")).toBeInTheDocument();
    expect(mocks.getWeeklyAnalysis).not.toHaveBeenCalled();
    firstRender.unmount();

    vi.clearAllMocks();
    mocks.listWeeklyCheckIns.mockResolvedValue([latestCheckIn]);
    mocks.listAllWellnessDimensionScores.mockResolvedValue([]);
    mocks.getWeeklyAnalysis.mockResolvedValue(null);
    renderPage();

    expect(await screen.findByText("Wellness dimensions are not ready")).toBeInTheDocument();
    await waitFor(() => {
      expect(mocks.analyzeWeeklyCheckIn).not.toHaveBeenCalled();
    });
  });
});
