const PAGE_SIZE = 100;

function buildListPath({ from, to, offset }) {
  const query = new URLSearchParams({
    from,
    to,
    limit: String(PAGE_SIZE),
    offset: String(offset),
  });
  return `/api/calendar-events?${query.toString()}`;
}

export async function listAllCalendarEvents(authenticatedRequest, { from, to }) {
  const events = [];
  let offset = 0;

  while (true) {
    const response = await authenticatedRequest(buildListPath({ from, to, offset }));
    const page = response.events || [];
    events.push(...page);

    if (!response.pagination?.has_more || page.length === 0) break;
    offset += page.length;
  }

  return events;
}

export async function createCalendarEvent(authenticatedRequest, payload) {
  const response = await authenticatedRequest("/api/calendar-events", {
    method: "POST",
    body: payload,
  });
  return response.calendarEvent;
}

export async function updateCalendarEvent(authenticatedRequest, id, payload) {
  const response = await authenticatedRequest(`/api/calendar-events/${id}`, {
    method: "PATCH",
    body: payload,
  });
  return response.calendarEvent;
}

export function deleteCalendarEvent(authenticatedRequest, id) {
  return authenticatedRequest(`/api/calendar-events/${id}`, {
    method: "DELETE",
  });
}
