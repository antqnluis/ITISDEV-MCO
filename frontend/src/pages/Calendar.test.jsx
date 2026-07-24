import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useAuth } from "../context/useAuth";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listAllCalendarEvents,
  updateCalendarEvent,
} from "../services/calendarEventApi";
import Calendar from "./Calendar";

vi.mock("../context/useAuth", () => ({ useAuth: vi.fn() }));
vi.mock("../services/calendarEventApi", () => ({
  createCalendarEvent: vi.fn(),
  deleteCalendarEvent: vi.fn(),
  listAllCalendarEvents: vi.fn(),
  updateCalendarEvent: vi.fn(),
}));

const authenticatedRequest = vi.fn();

function mondayOf(date) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  const day = value.getDay() || 7;
  value.setDate(value.getDate() - day + 1);
  return value;
}

function toDateInput(value) {
  const date = new Date(value);
  const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return shifted.toISOString().slice(0, 10);
}

const currentMonday = mondayOf(new Date());
const currentEvent = {
  id: "11111111-1111-4111-8111-111111111111",
  academic_record_id: null,
  source: "manual",
  event_type: "class",
  title: "Systems lecture",
  description: "Backend event",
  location: "G302",
  starts_at: new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate(), 9).toISOString(),
  ends_at: new Date(currentMonday.getFullYear(), currentMonday.getMonth(), currentMonday.getDate(), 10).toISOString(),
  all_day: false,
  status: "scheduled",
  completed_at: null,
};

function renderPage() {
  return render(
    <MemoryRouter>
      <Calendar />
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
  listAllCalendarEvents.mockResolvedValue([currentEvent]);
  createCalendarEvent.mockImplementation(async (_request, payload) => ({
    id: "22222222-2222-4222-8222-222222222222",
    source: "manual",
    completed_at: null,
    ...payload,
  }));
  updateCalendarEvent.mockImplementation(async (_request, id, payload) => ({
    ...currentEvent,
    ...payload,
    id,
  }));
  deleteCalendarEvent.mockResolvedValue(null);
});

describe("Calendar page", () => {
  it("loads the visible week and refetches after week navigation", async () => {
    const user = userEvent.setup();
    renderPage();

    expect(screen.getByText("Loading calendar events…")).toBeInTheDocument();
    expect(await screen.findByText("Systems lecture")).toBeInTheDocument();
    expect(listAllCalendarEvents).toHaveBeenCalledWith(
      authenticatedRequest,
      expect.objectContaining({
        from: currentMonday.toISOString(),
      }),
    );

    await user.click(screen.getByRole("button", { name: "Next week" }));
    await waitFor(() => expect(listAllCalendarEvents).toHaveBeenCalledTimes(2));
    const secondRange = listAllCalendarEvents.mock.calls[1][1];
    expect(new Date(secondRange.from).getTime()).toBe(
      currentMonday.getTime() + 7 * 24 * 60 * 60 * 1000,
    );
  });

  it("shows load failures and retries", async () => {
    const user = userEvent.setup();
    listAllCalendarEvents
      .mockRejectedValueOnce(new Error("Calendar unavailable"))
      .mockResolvedValueOnce([currentEvent]);
    renderPage();

    expect(await screen.findByText("Calendar unavailable")).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Try again" }));
    expect(await screen.findByText("Systems lecture")).toBeInTheDocument();
    expect(listAllCalendarEvents).toHaveBeenCalledTimes(2);
  });

  it("creates an all-day event using only backend-supported fields", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Add event" }));
    await user.type(screen.getByLabelText("Event title"), "Study day");
    await user.click(screen.getByLabelText("This is an all-day event"));
    const selectedDate = screen.getByLabelText("Date").value;
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Add event" }));

    await waitFor(() => expect(createCalendarEvent).toHaveBeenCalled());
    expect(createCalendarEvent).toHaveBeenCalledWith(authenticatedRequest, {
      academic_record_id: null,
      title: "Study day",
      event_type: "class",
      starts_at: new Date(`${selectedDate}T00:00:00`).toISOString(),
      ends_at: new Date(`${selectedDate}T23:59:00`).toISOString(),
      all_day: true,
      location: null,
      description: null,
      status: "scheduled",
    });
    expect(await screen.findByText("Study day")).toBeInTheDocument();
  });

  it("updates an event and surfaces backend save errors without closing", async () => {
    const user = userEvent.setup();
    updateCalendarEvent
      .mockRejectedValueOnce(new Error("Event could not be updated"))
      .mockImplementationOnce(async (_request, id, payload) => ({
        ...currentEvent,
        ...payload,
        id,
      }));
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Edit Systems lecture" }));
    const title = screen.getByLabelText("Event title");
    await user.clear(title);
    await user.type(title, "Updated lecture");
    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Event could not be updated")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Save changes" }));
    expect(await screen.findByText("Updated lecture")).toBeInTheDocument();
    expect(updateCalendarEvent).toHaveBeenLastCalledWith(
      authenticatedRequest,
      currentEvent.id,
      expect.objectContaining({ title: "Updated lecture" }),
    );
  });

  it("removes an event from the view when an update moves it outside the week", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Edit Systems lecture" }));
    const nextWeek = new Date(currentMonday.getTime() + 7 * 24 * 60 * 60 * 1000);
    await user.clear(screen.getByLabelText("Date"));
    await user.type(screen.getByLabelText("Date"), toDateInput(nextWeek));
    await user.click(screen.getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(updateCalendarEvent).toHaveBeenCalled());
    expect(screen.queryByText("Systems lecture")).not.toBeInTheDocument();
  });

  it("validates time order before sending the event", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Add event" }));
    await user.type(screen.getByLabelText("Event title"), "Invalid event");
    await user.clear(screen.getByLabelText("Starts"));
    await user.type(screen.getByLabelText("Starts"), "11:00");
    await user.clear(screen.getByLabelText("Ends"));
    await user.type(screen.getByLabelText("Ends"), "10:00");
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Add event" }));

    expect(
      screen.getByText(/end time must be the same as or later/i),
    ).toBeInTheDocument();
    expect(createCalendarEvent).not.toHaveBeenCalled();
  });

  it("requires in-app confirmation before deleting an event", async () => {
    const user = userEvent.setup();
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Edit Systems lecture" }));
    await user.click(screen.getByRole("button", { name: "Delete event" }));
    expect(screen.getByText(/This cannot be undone/i)).toBeInTheDocument();
    expect(deleteCalendarEvent).not.toHaveBeenCalled();

    await user.click(screen.getByRole("button", { name: "Keep event" }));
    expect(screen.getByRole("heading", { name: "Edit calendar event" })).toBeInTheDocument();
    await user.click(screen.getByRole("button", { name: "Delete event" }));
    await user.click(screen.getByRole("button", { name: "Delete event" }));

    await waitFor(() => {
      expect(deleteCalendarEvent).toHaveBeenCalledWith(
        authenticatedRequest,
        currentEvent.id,
      );
    });
    expect(screen.queryByText("Systems lecture")).not.toBeInTheDocument();
  });

  it("keeps the confirmation open when deletion fails", async () => {
    const user = userEvent.setup();
    deleteCalendarEvent.mockRejectedValueOnce(new Error("Delete unavailable"));
    renderPage();

    await user.click(await screen.findByRole("button", { name: "Edit Systems lecture" }));
    await user.click(screen.getByRole("button", { name: "Delete event" }));
    await user.click(screen.getByRole("button", { name: "Delete event" }));

    expect(await screen.findByText("Delete unavailable")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Delete calendar event" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete event" })).toBeEnabled();
  });
});
