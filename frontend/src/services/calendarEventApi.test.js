import { describe, expect, it, vi } from "vitest";
import {
  createCalendarEvent,
  deleteCalendarEvent,
  listAllCalendarEvents,
  updateCalendarEvent,
} from "./calendarEventApi";

describe("calendarEventApi", () => {
  it("loads every page for an encoded date range", async () => {
    const authenticatedRequest = vi.fn()
      .mockResolvedValueOnce({
        events: [{ id: "event-1" }],
        pagination: { has_more: true },
      })
      .mockResolvedValueOnce({
        events: [{ id: "event-2" }],
        pagination: { has_more: false },
      });

    const events = await listAllCalendarEvents(authenticatedRequest, {
      from: "2026-07-19T16:00:00.000Z",
      to: "2026-07-26T15:59:59.999Z",
    });

    expect(events).toEqual([{ id: "event-1" }, { id: "event-2" }]);
    expect(authenticatedRequest.mock.calls[0][0]).toContain("/api/calendar-events?");
    expect(authenticatedRequest.mock.calls[0][0]).toContain(
      "from=2026-07-19T16%3A00%3A00.000Z",
    );
    expect(authenticatedRequest.mock.calls[1][0]).toContain("offset=1");
  });

  it("creates, updates, and deletes events", async () => {
    const payload = {
      event_type: "class",
      title: "Systems lecture",
      starts_at: "2026-07-20T01:00:00.000Z",
    };
    const event = { id: "event-1", ...payload };
    const authenticatedRequest = vi.fn()
      .mockResolvedValueOnce({ calendarEvent: event })
      .mockResolvedValueOnce({ calendarEvent: { ...event, title: "Updated lecture" } })
      .mockResolvedValueOnce(null);

    await expect(createCalendarEvent(authenticatedRequest, payload)).resolves.toEqual(event);
    await expect(
      updateCalendarEvent(authenticatedRequest, event.id, { title: "Updated lecture" }),
    ).resolves.toMatchObject({ title: "Updated lecture" });
    await expect(deleteCalendarEvent(authenticatedRequest, event.id)).resolves.toBeNull();

    expect(authenticatedRequest).toHaveBeenNthCalledWith(1, "/api/calendar-events", {
      method: "POST",
      body: payload,
    });
    expect(authenticatedRequest).toHaveBeenNthCalledWith(
      2,
      "/api/calendar-events/event-1",
      { method: "PATCH", body: { title: "Updated lecture" } },
    );
    expect(authenticatedRequest).toHaveBeenNthCalledWith(
      3,
      "/api/calendar-events/event-1",
      { method: "DELETE" },
    );
  });
});
