import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
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
import WeeklyCheckIn from "./WeeklyCheckIn";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../services/courseApi", () => ({
  listAllCourses: vi.fn(),
}));
vi.mock("../services/courseEnvironmentLogApi", () => ({
  createCourseEnvironmentLog: vi.fn(),
  deleteCourseEnvironmentLog: vi.fn(),
  listAllCourseEnvironmentLogs: vi.fn(),
  updateCourseEnvironmentLog: vi.fn(),
}));
vi.mock("../services/wellnessDimensionScoreApi", () => ({
  listAllWellnessDimensionScores: vi.fn(),
}));
vi.mock("../services/weeklyCheckInApi", () => ({
  calculateWellnessDimensions: vi.fn(),
  createWeeklyCheckIn: vi.fn(),
  getCurrentWeeklyCheckIn: vi.fn(),
  listWeeklyCheckIns: vi.fn(),
  updateWeeklyCheckIn: vi.fn(),
}));
vi.mock("../components/weekly-check-in/CheckInWizard", () => ({
  default: function MockCheckInWizard(props) {
    const checkIn = props.initialCheckIn || {
      week_start: props.currentWeekStart,
      stress_level: 3,
      mood_level: 4,
      sleep_quality: 3,
      motivation_level: 4,
      burnout_level: 2,
      energy_level: 3,
      available_study_hours: 10,
      reflection: "A real check-in",
    };
    return (
      <div>
        <p>{props.courses.map((course) => course.code).join(", ") || "No courses"}</p>
        {props.submissionError && <p>{props.submissionError}</p>}
        <button type="button" onClick={() => props.onSave(checkIn, [])}>
          Submit mocked wizard
        </button>
      </div>
    );
  },
}));

const authenticatedRequest = vi.fn();
const currentCheckIn = {
  id: "11111111-1111-4111-8111-111111111111",
  week_start: "2026-07-20",
  stress_level: 4,
  mood_level: 3,
  sleep_quality: 2,
  motivation_level: 3,
  burnout_level: 4,
  energy_level: 2,
  available_study_hours: 8,
  reflection: "A persisted reflection",
  submitted_at: "2026-07-20T09:00:00.000Z",
  updated_at: "2026-07-20T09:00:00.000Z",
};
const course = {
  id: "22222222-2222-4222-8222-222222222222",
  code: "ITISDEV",
  name: "IT Systems Development",
};
const courseLog = {
  id: "33333333-3333-4333-8333-333333333333",
  check_in_id: currentCheckIn.id,
  course_id: course.id,
  course_code: course.code,
  course_name: course.name,
  workload_difficulty: 4,
  unclear_instruction_level: null,
  grading_concern_level: null,
  professor_approachability_concern: null,
  groupmate_issue_level: null,
  concern_notes: null,
};
const dimensionScore = {
  id: "44444444-4444-4444-8444-444444444444",
  check_in_id: currentCheckIn.id,
  academic_engagement_score: 80,
  personal_wellbeing_score: 70,
  logistical_load_score: 60,
  role_load_score: 50,
  course_environment_score: 40,
  calculated_at: "2026-07-20T10:00:00.000Z",
};

function renderPage() {
  return render(
    <MemoryRouter>
      <WeeklyCheckIn />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  useAuth.mockReturnValue({
    authenticatedRequest,
    logout: vi.fn(),
    student: { first_name: "Jamie", last_name: "Student" },
    user: { email: "jamie@example.com" },
  });
  getCurrentWeeklyCheckIn.mockResolvedValue({
    weekStart: currentCheckIn.week_start,
    completed: true,
    checkIn: currentCheckIn,
  });
  listWeeklyCheckIns.mockResolvedValue([currentCheckIn]);
  listAllCourses.mockResolvedValue([course]);
  listAllCourseEnvironmentLogs.mockResolvedValue([courseLog]);
  listAllWellnessDimensionScores.mockResolvedValue([dimensionScore]);
  createWeeklyCheckIn.mockResolvedValue(currentCheckIn);
  updateWeeklyCheckIn.mockResolvedValue(currentCheckIn);
  createCourseEnvironmentLog.mockResolvedValue(courseLog);
  updateCourseEnvironmentLog.mockResolvedValue(courseLog);
  deleteCourseEnvironmentLog.mockResolvedValue(null);
  calculateWellnessDimensions.mockResolvedValue(dimensionScore);
});

describe("Weekly Check-in page", () => {
  it("loads persisted check-ins, logs, courses, and dimension scores", async () => {
    renderPage();

    expect(screen.getByText("Loading weekly check-ins…")).toBeInTheDocument();
    expect(await screen.findByText(/A persisted reflection/)).toBeInTheDocument();
    expect(screen.getByText("This week")).toBeInTheDocument();
    expect(screen.getByText("ITISDEV")).toBeInTheDocument();
    expect(screen.getByText("80/100")).toBeInTheDocument();
    expect(listWeeklyCheckIns).toHaveBeenCalledWith(authenticatedRequest);
    expect(listAllCourseEnvironmentLogs).toHaveBeenCalledWith(authenticatedRequest);
    expect(listAllWellnessDimensionScores).toHaveBeenCalledWith(authenticatedRequest);
  });

  it("shows load failures and retries all backend data", async () => {
    const user = userEvent.setup();
    getCurrentWeeklyCheckIn
      .mockRejectedValueOnce(new Error("Check-ins unavailable"))
      .mockResolvedValue({
        weekStart: currentCheckIn.week_start,
        completed: true,
        checkIn: currentCheckIn,
      });
    renderPage();

    expect(await screen.findByText("Check-ins unavailable")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText(/A persisted reflection/)).toBeInTheDocument();
    expect(getCurrentWeeklyCheckIn).toHaveBeenCalledTimes(2);
  });

  it("creates the current check-in and calculates dimensions", async () => {
    const user = userEvent.setup();
    const createdCheckIn = {
      ...currentCheckIn,
      reflection: "A real check-in",
    };
    getCurrentWeeklyCheckIn
      .mockResolvedValueOnce({
        weekStart: currentCheckIn.week_start,
        completed: false,
        checkIn: null,
      })
      .mockResolvedValue({
        weekStart: currentCheckIn.week_start,
        completed: true,
        checkIn: createdCheckIn,
      });
    listWeeklyCheckIns
      .mockResolvedValueOnce([])
      .mockResolvedValue([createdCheckIn]);
    listAllCourseEnvironmentLogs.mockResolvedValue([]);
    listAllWellnessDimensionScores.mockResolvedValue([]);
    createWeeklyCheckIn.mockResolvedValue(createdCheckIn);
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Start check-in" }));
    await user.click(screen.getByRole("button", { name: "Submit mocked wizard" }));

    await waitFor(() => {
      expect(createWeeklyCheckIn).toHaveBeenCalledWith(
        authenticatedRequest,
        expect.objectContaining({
          week_start: currentCheckIn.week_start,
          stress_level: 3,
          reflection: "A real check-in",
        }),
      );
      expect(calculateWellnessDimensions).toHaveBeenCalledWith(
        authenticatedRequest,
        createdCheckIn.id,
      );
    });
    expect(await screen.findByText(/A real check-in/)).toBeInTheDocument();
  });

  it("updates a check-in, deletes a cleared course log, and warns if calculation fails", async () => {
    const user = userEvent.setup();
    calculateWellnessDimensions.mockRejectedValue(new Error("Calculation unavailable"));
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Update this week" }));
    expect(screen.getAllByText("ITISDEV")).toHaveLength(2);
    await user.click(screen.getByRole("button", { name: "Submit mocked wizard" }));

    await waitFor(() => {
      expect(updateWeeklyCheckIn).toHaveBeenCalledWith(
        authenticatedRequest,
        currentCheckIn.id,
        expect.objectContaining({
          week_start: currentCheckIn.week_start,
          reflection: currentCheckIn.reflection,
        }),
      );
      expect(deleteCourseEnvironmentLog).toHaveBeenCalledWith(
        authenticatedRequest,
        courseLog.id,
      );
    });
    expect(
      await screen.findByText(/wellness dimensions could not be calculated yet/i),
    ).toBeInTheDocument();
  });
});
