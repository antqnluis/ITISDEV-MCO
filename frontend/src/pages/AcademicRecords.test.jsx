import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../context/useAuth";
import {
  createAcademicRecord,
  deleteAcademicRecord,
  listAllAcademicRecords,
  updateAcademicRecord,
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
  deleteAcademicRecord: vi.fn(),
  listAllAcademicRecords: vi.fn(),
  updateAcademicRecord: vi.fn(),
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
const manualRecord = {
  id: "33333333-3333-4333-8333-333333333333",
  course_id: course.id,
  course,
  source: "manual",
  record_type: "assignment",
  title: "MCO 2",
  due_at: "2026-08-15T15:59:00.000Z",
  submitted_at: null,
  submission_status: "upcoming",
  score: null,
  max_score: null,
  grade_percentage: null,
};

function deferred() {
  let resolve;
  const promise = new Promise((resolvePromise) => {
    resolve = resolvePromise;
  });
  return { promise, resolve };
}

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
  updateAcademicRecord.mockImplementation(async (_request, id, payload) => ({
    ...manualRecord,
    ...payload,
    id,
  }));
  deleteAcademicRecord.mockResolvedValue(null);
});

describe("Academic Records page", () => {
  it("loads API data and marks mock records read-only", async () => {
    renderPage();

    expect(screen.getByText(/Loading courses/i)).toBeInTheDocument();
    expect(await screen.findByText("IT Systems Development")).toBeInTheDocument();
    expect(screen.getByText("Seeded grade")).toBeInTheDocument();
    expect(screen.getByText(/Demo · Read only/i)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit Seeded grade" }))
      .not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete Seeded grade" }))
      .not.toBeInTheDocument();
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

  it("edits a manual record without changing its course", async () => {
    const user = userEvent.setup();
    listAllAcademicRecords.mockResolvedValue([manualRecord]);
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Edit MCO 2" }));
    expect(screen.getByRole("heading", { name: "Edit academic record" }))
      .toBeInTheDocument();
    expect(screen.getByText("Editing record in")).toBeInTheDocument();
    expect(screen.getByLabelText("Due Date")).toHaveValue("2026-08-15");
    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "Updated MCO 2");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(updateAcademicRecord).toHaveBeenCalledWith(
      authenticatedRequest,
      manualRecord.id,
      {
        record_type: "assignment",
        title: "Updated MCO 2",
        due_at: "2026-08-15T15:59:00.000Z",
        submission_status: "upcoming",
        score: null,
        max_score: null,
      },
    );
    expect(await screen.findByText("Updated MCO 2")).toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "Edit academic record" }))
      .not.toBeInTheDocument();
  });

  it("keeps edit failures visible and allows retry", async () => {
    const user = userEvent.setup();
    listAllAcademicRecords.mockResolvedValue([manualRecord]);
    updateAcademicRecord.mockRejectedValueOnce(new Error("Update unavailable"));
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Edit MCO 2" }));
    await user.clear(screen.getByLabelText("Title"));
    await user.type(screen.getByLabelText("Title"), "Updated MCO 2");
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    expect(await screen.findByRole("alert")).toHaveTextContent("Update unavailable");
    expect(screen.getByRole("heading", { name: "Edit academic record" }))
      .toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Updated MCO 2")).toBeInTheDocument();
    expect(updateAcademicRecord).toHaveBeenCalledTimes(2);
  });

  it("cancels deletion without making a request", async () => {
    const user = userEvent.setup();
    listAllAcademicRecords.mockResolvedValue([manualRecord]);
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Delete MCO 2" }));
    expect(screen.getByRole("heading", { name: "Delete academic record?" }))
      .toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Cancel" }));

    expect(deleteAcademicRecord).not.toHaveBeenCalled();
    expect(screen.getByText("MCO 2")).toBeInTheDocument();
  });

  it("removes a record only after confirmed deletion succeeds", async () => {
    const user = userEvent.setup();
    const deletion = deferred();
    listAllAcademicRecords.mockResolvedValue([manualRecord]);
    deleteAcademicRecord.mockReturnValue(deletion.promise);
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Delete MCO 2" }));
    await user.click(screen.getByRole("button", { name: "Delete record" }));

    expect(deleteAcademicRecord).toHaveBeenCalledWith(
      authenticatedRequest,
      manualRecord.id,
    );
    expect(screen.getByRole("button", { name: "Deleting…" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Close dialog" })).toBeDisabled();
    expect(screen.getAllByText("MCO 2")).toHaveLength(2);

    await act(async () => {
      deletion.resolve(null);
    });
    expect(screen.queryByText("MCO 2")).not.toBeInTheDocument();
  });

  it("keeps the confirmation open when deletion fails", async () => {
    const user = userEvent.setup();
    listAllAcademicRecords.mockResolvedValue([manualRecord]);
    deleteAcademicRecord.mockRejectedValue(new Error(
      "This academic record cannot be deleted because it is linked to a calendar event",
    ));
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Delete MCO 2" }));
    await user.click(screen.getByRole("button", { name: "Delete record" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "linked to a calendar event",
    );
    expect(screen.getByRole("heading", { name: "Delete academic record?" }))
      .toBeInTheDocument();
    expect(screen.getAllByText("MCO 2")).toHaveLength(2);
  });
});
