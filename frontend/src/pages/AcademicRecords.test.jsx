import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../context/useAuth";
import {
  createAcademicRecord,
  listAllAcademicRecords,
} from "../services/academicRecordApi";
import { createCourse, listAllCourses } from "../services/courseApi";
import AcademicRecords from "./AcademicRecords";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../services/courseApi", () => ({
  createCourse: vi.fn(),
  listAllCourses: vi.fn(),
}));
vi.mock("../services/academicRecordApi", () => ({
  createAcademicRecord: vi.fn(),
  listAllAcademicRecords: vi.fn(),
}));

const authenticatedRequest = vi.fn();
const course = {
  id: "11111111-1111-4111-8111-111111111111",
  code: "ITISDEV",
  name: "IT Systems Development",
};
const mockRecord = {
  id: "22222222-2222-4222-8222-222222222222",
  course_id: course.id,
  course,
  source: "mock",
  record_type: "grade_snapshot",
  title: "Seeded grade",
  due_at: null,
  submission_status: "not_applicable",
  score: 88,
  max_score: 100,
  grade_percentage: 88,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <AcademicRecords />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useAuth.mockReturnValue({
    authenticatedRequest,
    logout: vi.fn(),
    student: { first_name: "Jamie", last_name: "Student" },
    user: { email: "jamie@example.com" },
  });
  listAllCourses.mockResolvedValue([course]);
  listAllAcademicRecords.mockResolvedValue([mockRecord]);
});

describe("Academic Records page", () => {
  it("loads API data and marks mock records read-only", async () => {
    renderPage();

    expect(screen.getByText(/Loading courses/i)).toBeInTheDocument();
    expect(await screen.findByText("IT Systems Development")).toBeInTheDocument();
    expect(screen.getByText("Seeded grade")).toBeInTheDocument();
    expect(screen.getByText(/Demo · Read only/i)).toBeInTheDocument();
    expect(screen.getByText("No due date")).toBeInTheDocument();
    expect(listAllCourses).toHaveBeenCalledWith(authenticatedRequest);
    expect(listAllAcademicRecords).toHaveBeenCalledWith(authenticatedRequest);
  });

  it("creates a record using only backend-supported fields", async () => {
    const user = userEvent.setup();
    const createdRecord = {
      ...mockRecord,
      id: "33333333-3333-4333-8333-333333333333",
      source: "manual",
      record_type: "assignment",
      title: "MCO 2",
      score: null,
      max_score: null,
      grade_percentage: null,
    };
    createAcademicRecord.mockResolvedValue(createdRecord);
    renderPage();

    await screen.findByText("IT Systems Development");
    await user.click(screen.getByRole("button", { name: /Add Academic Record/i }));
    expect(screen.getByText(/Workload estimates · Coming soon/i)).toBeInTheDocument();
    expect(screen.getByLabelText("Estimated Workload")).toBeDisabled();
    await user.type(screen.getByLabelText("Title"), "MCO 2");
    await user.click(screen.getByRole("button", { name: "Add record" }));

    expect(createAcademicRecord).toHaveBeenCalledWith(authenticatedRequest, {
      course_id: course.id,
      record_type: "assignment",
      title: "MCO 2",
      due_at: null,
      submission_status: "upcoming",
      score: null,
      max_score: null,
    });
    expect(await screen.findByText("MCO 2")).toBeInTheDocument();
  });

  it("requires score and maximum score to be entered together", async () => {
    const user = userEvent.setup();
    renderPage();

    await screen.findByText("IT Systems Development");
    await user.click(screen.getByRole("button", { name: /Add Academic Record/i }));
    await user.type(screen.getByLabelText("Title"), "MCO 3");
    await user.type(screen.getByLabelText("Score"), "75");
    await user.click(screen.getByRole("button", { name: "Add record" }));

    expect(
      screen.getByText(/Enter both the score and maximum score/i),
    ).toBeInTheDocument();
    expect(createAcademicRecord).not.toHaveBeenCalled();
  });

  it("shows load failures and retries", async () => {
    const user = userEvent.setup();
    listAllCourses
      .mockRejectedValueOnce(new Error("Courses unavailable"))
      .mockResolvedValueOnce([course]);
    renderPage();

    expect(await screen.findByText("Courses unavailable")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("IT Systems Development")).toBeInTheDocument();
    expect(listAllCourses).toHaveBeenCalledTimes(2);
  });

  it("creates the first course and surfaces backend errors without closing", async () => {
    const user = userEvent.setup();
    listAllCourses.mockResolvedValue([]);
    listAllAcademicRecords.mockResolvedValue([]);
    createCourse
      .mockRejectedValueOnce(new Error("A course with this code already exists"))
      .mockResolvedValueOnce(course);
    renderPage();

    await user.click(await screen.findByRole("button", { name: /Add First Course/i }));
    await user.type(screen.getByLabelText("Course Code"), "ITISDEV");
    await user.type(screen.getByLabelText("Course Name"), "IT Systems Development");
    await user.click(screen.getByRole("button", { name: "Save course" }));
    expect(await screen.findByText("A course with this code already exists")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save course" }));
    expect(await screen.findByText("IT Systems Development")).toBeInTheDocument();
  });
});
