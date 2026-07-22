import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";
import { AuthContext } from "../context/authContext";
import Onboarding from "./Onboarding";

function authValue(completeOnboarding) {
  return {
    status: "authenticated",
    accountDestination: "/onboarding",
    postConsentDestination: "/onboarding",
    user: { email: "student@example.com" },
    student: {
      consent_given: true,
      privacy_notice_version: "v1.0",
    },
    acceptConsent: vi.fn(),
    completeOnboarding,
    login: vi.fn(),
    logout: vi.fn(),
    register: vi.fn(),
  };
}

function renderOnboarding(completeOnboarding = vi.fn()) {
  return render(
    <AuthContext.Provider value={authValue(completeOnboarding)}>
      <MemoryRouter initialEntries={["/onboarding"]}>
        <Routes>
          <Route path="/onboarding" element={<Onboarding />} />
          <Route path="/dashboard" element={<p>dashboard destination</p>} />
        </Routes>
      </MemoryRouter>
    </AuthContext.Provider>,
  );
}

async function openAcademicStep(user) {
  await user.click(screen.getByRole("button", { name: "Got it" }));
  await user.click(screen.getByRole("button", { name: "Let's Begin" }));
}

async function completeAcademics(user) {
  await user.selectOptions(screen.getByLabelText("College"), "College of Computer Studies");
  await user.selectOptions(screen.getByLabelText("Program"), "BS Information Technology");
  await user.selectOptions(screen.getByLabelText("Current Year Level"), "3");
  await user.selectOptions(screen.getByLabelText("Current Academic Term"), "2");
  await user.click(screen.getByRole("button", { name: "Next" }));
}

async function advanceToGoals(user) {
  await user.click(screen.getByRole("button", { name: "Next" }));
  await user.click(screen.getByRole("button", { name: "Skip for now" }));
}

describe("student onboarding", () => {
  it("requires every academic selection before advancing", async () => {
    const user = userEvent.setup();
    const completeOnboarding = vi.fn();
    renderOnboarding(completeOnboarding);
    await openAcademicStep(user);

    expect(screen.queryByRole("option", { name: "Summer Term" })).not.toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("Select your college.")).toBeInTheDocument();
    expect(screen.getByText("Select your program.")).toBeInTheDocument();
    expect(screen.getByText("Select your current year level.")).toBeInTheDocument();
    expect(screen.getByText("Select your current academic term.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Tell us about your academics" })).toBeInTheDocument();
    expect(completeOnboarding).not.toHaveBeenCalled();
  });

  it("blocks invalid responsibility hours", async () => {
    const user = userEvent.setup();
    const completeOnboarding = vi.fn();
    renderOnboarding(completeOnboarding);
    await openAcademicStep(user);
    await completeAcademics(user);

    await user.click(screen.getByRole("button", { name: "Athlete" }));
    await user.type(screen.getByLabelText("Athlete"), "169");
    await user.click(screen.getByRole("button", { name: "Next" }));

    expect(screen.getByText("Hours must be between 0 and 168.")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Recurring Responsibilities" })).toBeInTheDocument();
    expect(completeOnboarding).not.toHaveBeenCalled();
  });

  it("maps the complete wizard state to the backend profile contract", async () => {
    const user = userEvent.setup();
    const completeOnboarding = vi.fn().mockResolvedValue("/dashboard");
    renderOnboarding(completeOnboarding);
    await openAcademicStep(user);
    await completeAcademics(user);

    await user.click(screen.getByRole("button", { name: "Student Organization" }));
    await user.click(screen.getByRole("button", { name: "Scholarship" }));
    await user.click(screen.getByRole("button", { name: "Other" }));
    await user.type(screen.getByLabelText("Student Organization"), "8");
    await user.type(screen.getByLabelText("Scholarship"), "3");
    await user.type(screen.getByLabelText("Other"), "2.5");
    await user.type(screen.getByLabelText("Describe this responsibility"), "Family business");
    await advanceToGoals(user);
    await user.click(screen.getByRole("button", { name: "Managing Stress" }));
    await user.click(screen.getByRole("button", { name: "Create Profile" }));

    await waitFor(() => expect(completeOnboarding).toHaveBeenCalledWith({
      college: "College of Computer Studies",
      program: "BS Information Technology",
      year_level: 3,
      current_academic_term: 2,
      wellness_goals: ["Managing Stress"],
      has_organization_responsibility: true,
      organization_hours_per_week: 8,
      is_athlete: false,
      athlete_hours_per_week: 0,
      has_ojt: false,
      ojt_hours_per_week: 0,
      is_employed: false,
      work_hours_per_week: 0,
      has_caregiving_responsibility: false,
      caregiving_hours_per_week: 0,
      additional_context: "Recurring responsibilities: Scholarship: 3 hours/week; Other (Family business): 2.5 hours/week",
    }));
    expect(await screen.findByRole("heading", { name: "You're All Set!" })).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Go to Dashboard" }));
    expect(await screen.findByText("dashboard destination")).toBeInTheDocument();
  });

  it("keeps entered data and allows retry after a server failure", async () => {
    const user = userEvent.setup();
    const completeOnboarding = vi.fn()
      .mockRejectedValueOnce(new Error("Unable to create the student profile"))
      .mockResolvedValueOnce("/dashboard");
    renderOnboarding(completeOnboarding);
    await openAcademicStep(user);
    await completeAcademics(user);
    await advanceToGoals(user);

    await user.click(screen.getByRole("button", { name: "Create Profile" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Unable to create the student profile");
    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(screen.getByRole("button", { name: "Back" }));
    await user.click(screen.getByRole("button", { name: "Back" }));
    expect(screen.getByLabelText("College")).toHaveValue("College of Computer Studies");

    await user.click(screen.getByRole("button", { name: "Next" }));
    await advanceToGoals(user);
    await user.click(screen.getByRole("button", { name: "Create Profile" }));

    expect(await screen.findByRole("heading", { name: "You're All Set!" })).toBeInTheDocument();
    expect(completeOnboarding).toHaveBeenCalledTimes(2);
  });

  it("shows a loading state and prevents duplicate profile submissions", async () => {
    const user = userEvent.setup();
    let resolveSubmission;
    const completeOnboarding = vi.fn(() => new Promise((resolve) => {
      resolveSubmission = resolve;
    }));
    renderOnboarding(completeOnboarding);
    await openAcademicStep(user);
    await completeAcademics(user);
    await advanceToGoals(user);

    await user.click(screen.getByRole("button", { name: "Create Profile" }));

    const submittingButton = screen.getByRole("button", { name: "Creating profile…" });
    expect(submittingButton).toBeDisabled();
    await user.click(submittingButton);
    expect(completeOnboarding).toHaveBeenCalledOnce();

    resolveSubmission("/dashboard");
    expect(await screen.findByRole("heading", { name: "You're All Set!" })).toBeInTheDocument();
  });
});
