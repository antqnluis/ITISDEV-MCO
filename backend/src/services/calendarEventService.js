const CALENDAR_EVENT_SELECT = [
    "id",
    "student_id",
    "academic_record_id",
    "source",
    "event_type",
    "title",
    "description",
    "location",
    "starts_at",
    "ends_at",
    "all_day",
    "status",
    "completed_at",
    "created_at",
    "updated_at"
].join(", ");

const EVENT_TYPES = new Set([
    "class",
    "assignment_deadline",
    "exam",
    "study_block",
    "rest_block",
    "ojt",
    "organization",
    "athletics",
    "caregiving",
    "work",
    "personal",
    "other"
]);
const STATUSES = new Set(["scheduled", "completed", "cancelled"]);
const EDITABLE_FIELDS = new Set([
    "academic_record_id",
    "event_type",
    "title",
    "description",
    "location",
    "starts_at",
    "ends_at",
    "all_day",
    "status"
]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createServiceError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(object, property) {
    return Object.prototype.hasOwnProperty.call(object, property);
}

function normalizeUuid(value, fieldName) {
    if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
        throw createServiceError(`${fieldName} must be a valid UUID`);
    }

    return value;
}

function normalizeRequiredText(value, fieldName, maximumLength) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw createServiceError(`${fieldName} must be a non-empty string`);
    }

    const normalized = value.trim();
    if (normalized.length > maximumLength) {
        throw createServiceError(`${fieldName} must be at most ${maximumLength} characters`);
    }

    return normalized;
}

function normalizeOptionalText(value, fieldName, maximumLength) {
    if (value === null) {
        return null;
    }
    if (typeof value !== "string") {
        throw createServiceError(`${fieldName} must be a string or null`);
    }

    const normalized = value.trim();
    if (normalized.length > maximumLength) {
        throw createServiceError(`${fieldName} must be at most ${maximumLength} characters`);
    }

    return normalized || null;
}

function normalizeTimestamp(value, fieldName) {
    if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
        throw createServiceError(`${fieldName} must be a valid ISO date-time string`);
    }

    return new Date(value).toISOString();
}

function normalizeOptionalTimestamp(value, fieldName) {
    return value === null ? null : normalizeTimestamp(value, fieldName);
}

function normalizeEnum(value, fieldName, allowedValues) {
    if (typeof value !== "string" || !allowedValues.has(value)) {
        throw createServiceError(`${fieldName} is invalid`);
    }

    return value;
}

function normalizePaginationValue(value, fieldName, defaultValue, minimum, maximum) {
    if (value === undefined) {
        return defaultValue;
    }

    if (typeof value !== "string" || !/^\d+$/.test(value)) {
        throw createServiceError(`${fieldName} must be an integer`);
    }

    const normalized = Number(value);
    if (!Number.isSafeInteger(normalized) || normalized < minimum || normalized > maximum) {
        throw createServiceError(`${fieldName} must be between ${minimum} and ${maximum}`);
    }

    return normalized;
}

function assertValidTimeRange(event) {
    if (event.ends_at && event.starts_at && new Date(event.ends_at) < new Date(event.starts_at)) {
        throw createServiceError("ends_at must be greater than or equal to starts_at");
    }
}

function normalizeEventInput(payload, { isCreate = false } = {}) {
    if (!isPlainObject(payload)) {
        throw createServiceError("Request body must be a JSON object");
    }

    const keys = Object.keys(payload);
    if (!isCreate && keys.length === 0) {
        throw createServiceError("At least one calendar-event field is required");
    }
    for (const field of keys) {
        if (!EDITABLE_FIELDS.has(field)) {
            throw createServiceError(`${field} is not an editable calendar-event field`);
        }
    }

    if (isCreate) {
        for (const field of ["event_type", "title", "starts_at"]) {
            if (!hasOwn(payload, field)) {
                throw createServiceError(`${field} is required`);
            }
        }
    }

    const event = {};
    for (const [field, value] of Object.entries(payload)) {
        if (field === "academic_record_id") {
            event[field] = value === null ? null : normalizeUuid(value, field);
        } else if (field === "event_type") {
            event[field] = normalizeEnum(value, field, EVENT_TYPES);
        } else if (field === "title") {
            event[field] = normalizeRequiredText(value, field, 300);
        } else if (field === "description") {
            event[field] = normalizeOptionalText(value, field, 4000);
        } else if (field === "location") {
            event[field] = normalizeOptionalText(value, field, 500);
        } else if (field === "starts_at") {
            event[field] = normalizeTimestamp(value, field);
        } else if (field === "ends_at") {
            event[field] = normalizeOptionalTimestamp(value, field);
        } else if (field === "all_day") {
            if (typeof value !== "boolean") {
                throw createServiceError("all_day must be a boolean");
            }
            event[field] = value;
        } else if (field === "status") {
            event[field] = normalizeEnum(value, field, STATUSES);
        }
    }

    assertValidTimeRange(event);
    return event;
}

function normalizeListOptions(query = {}) {
    if (!isPlainObject(query)) {
        throw createServiceError("Query parameters must be an object");
    }

    const allowedFields = new Set(["from", "to", "event_type", "status", "limit", "offset"]);
    for (const field of Object.keys(query)) {
        if (!allowedFields.has(field)) {
            throw createServiceError(`${field} is not a supported query parameter`);
        }
    }
    if (!hasOwn(query, "from") || !hasOwn(query, "to")) {
        throw createServiceError("from and to query parameters are required");
    }

    const from = normalizeTimestamp(query.from, "from");
    const to = normalizeTimestamp(query.to, "to");
    if (new Date(to) < new Date(from)) {
        throw createServiceError("to must be greater than or equal to from");
    }

    return {
        from,
        to,
        eventType: query.event_type === undefined
            ? null
            : normalizeEnum(query.event_type, "event_type", EVENT_TYPES),
        status: query.status === undefined ? null : normalizeEnum(query.status, "status", STATUSES),
        limit: normalizePaginationValue(query.limit, "limit", 25, 1, 100),
        offset: normalizePaginationValue(query.offset, "offset", 0, 0, 100000)
    };
}

function throwDatabaseError(error, operation) {
    throw createServiceError(`Unable to ${operation} the calendar event`, 500);
}

async function assertAcademicRecordBelongsToStudent(supabase, studentId, academicRecordId) {
    const { data, error } = await supabase
        .from("academic_records")
        .select("id")
        .eq("id", academicRecordId)
        .eq("student_id", studentId)
        .maybeSingle();

    if (error) {
        throw createServiceError("Unable to verify the academic record", 500);
    }
    if (!data) {
        throw createServiceError("Academic record not found", 404);
    }
}

async function getCalendarEvent(supabase, studentId, eventId) {
    const normalizedEventId = normalizeUuid(eventId, "Calendar event id");
    const { data, error } = await supabase
        .from("calendar_events")
        .select(CALENDAR_EVENT_SELECT)
        .eq("id", normalizedEventId)
        .eq("student_id", studentId)
        .eq("source", "manual")
        .maybeSingle();

    if (error) {
        throw createServiceError("Unable to retrieve the calendar event", 500);
    }
    if (!data) {
        throw createServiceError("Calendar event not found", 404);
    }

    return data;
}

async function createCalendarEvent(supabase, studentId, payload) {
    const event = normalizeEventInput(payload, { isCreate: true });
    if (event.academic_record_id) {
        await assertAcademicRecordBelongsToStudent(supabase, studentId, event.academic_record_id);
    }

    const values = {
        ...event,
        student_id: studentId,
        source: "manual",
        completed_at: event.status === "completed" ? new Date().toISOString() : null
    };
    const { data, error } = await supabase
        .from("calendar_events")
        .insert(values)
        .select(CALENDAR_EVENT_SELECT)
        .single();

    if (error) {
        throwDatabaseError(error, "create");
    }

    return data;
}

async function listCalendarEvents(supabase, studentId, query) {
    const options = normalizeListOptions(query);
    let request = supabase
        .from("calendar_events")
        .select(CALENDAR_EVENT_SELECT, { count: "exact" })
        .eq("student_id", studentId)
        .eq("source", "manual")
        .lte("starts_at", options.to)
        .or(`ends_at.is.null,ends_at.gte.${options.from}`);

    if (options.eventType) {
        request = request.eq("event_type", options.eventType);
    }
    if (options.status) {
        request = request.eq("status", options.status);
    }

    const { data, error, count } = await request
        .order("starts_at", { ascending: true })
        .order("id", { ascending: true })
        .range(options.offset, options.offset + options.limit - 1);

    if (error) {
        throw createServiceError("Unable to retrieve calendar events", 500);
    }

    const events = data || [];
    const total = count || 0;
    return {
        events,
        pagination: {
            limit: options.limit,
            offset: options.offset,
            total,
            has_more: options.offset + events.length < total
        }
    };
}

async function updateCalendarEvent(supabase, studentId, eventId, payload) {
    const changes = normalizeEventInput(payload);
    const currentEvent = await getCalendarEvent(supabase, studentId, eventId);
    const updatedEvent = { ...currentEvent, ...changes };
    assertValidTimeRange(updatedEvent);

    if (hasOwn(changes, "academic_record_id") && changes.academic_record_id) {
        await assertAcademicRecordBelongsToStudent(supabase, studentId, changes.academic_record_id);
    }
    if (hasOwn(changes, "status")) {
        changes.completed_at = changes.status === "completed" ? new Date().toISOString() : null;
    }

    const { data, error } = await supabase
        .from("calendar_events")
        .update(changes)
        .eq("id", currentEvent.id)
        .eq("student_id", studentId)
        .eq("source", "manual")
        .select(CALENDAR_EVENT_SELECT)
        .maybeSingle();

    if (error) {
        throwDatabaseError(error, "update");
    }
    if (!data) {
        throw createServiceError("Calendar event not found", 404);
    }

    return data;
}

async function deleteCalendarEvent(supabase, studentId, eventId) {
    const currentEvent = await getCalendarEvent(supabase, studentId, eventId);
    const { data, error } = await supabase
        .from("calendar_events")
        .delete()
        .eq("id", currentEvent.id)
        .eq("student_id", studentId)
        .eq("source", "manual")
        .select("id")
        .maybeSingle();

    if (error) {
        throwDatabaseError(error, "delete");
    }
    if (!data) {
        throw createServiceError("Calendar event not found", 404);
    }
}

module.exports = {
    createCalendarEvent,
    listCalendarEvents,
    getCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent
};
