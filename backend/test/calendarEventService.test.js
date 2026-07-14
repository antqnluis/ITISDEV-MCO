const assert = require("node:assert/strict");
const test = require("node:test");

const {
    createCalendarEvent,
    listCalendarEvents,
    getCalendarEvent,
    updateCalendarEvent,
    deleteCalendarEvent
} = require("../src/services/calendarEventService");

const studentId = "11111111-1111-4111-8111-111111111111";
const eventId = "22222222-2222-4222-8222-222222222222";
const recordId = "33333333-3333-4333-8333-333333333333";
const baseEvent = {
    id: eventId,
    student_id: studentId,
    academic_record_id: null,
    source: "manual",
    event_type: "study_block",
    title: "Finish calendar API",
    description: null,
    location: null,
    starts_at: "2026-07-14T01:00:00.000Z",
    ends_at: "2026-07-14T03:00:00.000Z",
    all_day: false,
    status: "scheduled",
    completed_at: null
};
const validPayload = {
    event_type: "study_block",
    title: "Finish calendar API",
    starts_at: "2026-07-14T01:00:00.000Z",
    ends_at: "2026-07-14T03:00:00.000Z"
};

test("createCalendarEvent assigns a manual source and a server-managed completion time", async () => {
    let insertedValues;
    const supabase = {
        from(table) {
            assert.equal(table, "calendar_events");
            return {
                insert(values) {
                    insertedValues = values;
                    return {
                        select: () => ({
                            single: async () => ({ data: { ...baseEvent, ...values }, error: null })
                        })
                    };
                }
            };
        }
    };

    const event = await createCalendarEvent(supabase, studentId, {
        ...validPayload,
        title: "  Finish calendar API  ",
        status: "completed"
    });

    assert.equal(insertedValues.student_id, studentId);
    assert.equal(insertedValues.source, "manual");
    assert.equal(insertedValues.title, "Finish calendar API");
    assert.match(insertedValues.completed_at, /^\d{4}-\d{2}-\d{2}T/);
    assert.equal(event.status, "completed");

    await assert.rejects(
        createCalendarEvent({}, studentId, { ...validPayload, source: "mock" }),
        (error) => error.statusCode === 400 && error.message.includes("source")
    );
    await assert.rejects(
        createCalendarEvent({}, studentId, { ...validPayload, ends_at: "2026-07-14T00:00:00.000Z" }),
        (error) => error.statusCode === 400 && error.message.includes("ends_at")
    );
    await assert.rejects(
        createCalendarEvent({}, studentId, { ...validPayload, title: " " }),
        (error) => error.statusCode === 400 && error.message.includes("title")
    );
});

test("createCalendarEvent verifies an attached academic record belongs to the student", async () => {
    const filters = [];
    let insertedValues;
    const supabase = {
        from(table) {
            if (table === "academic_records") {
                return {
                    select: () => ({
                        eq(field, value) {
                            filters.push([field, value]);
                            return this;
                        },
                        maybeSingle: async () => ({ data: { id: recordId }, error: null })
                    })
                };
            }

            assert.equal(table, "calendar_events");
            return {
                insert(values) {
                    insertedValues = values;
                    return {
                        select: () => ({ single: async () => ({ data: { ...baseEvent, ...values }, error: null }) })
                    };
                }
            };
        }
    };

    await createCalendarEvent(supabase, studentId, { ...validPayload, academic_record_id: recordId });
    assert.deepEqual(filters, [["id", recordId], ["student_id", studentId]]);
    assert.equal(insertedValues.academic_record_id, recordId);

    const missingRecordSupabase = {
        from: () => ({
            select: () => ({
                eq() {
                    return this;
                },
                maybeSingle: async () => ({ data: null, error: null })
            })
        })
    };
    await assert.rejects(
        createCalendarEvent(missingRecordSupabase, studentId, { ...validPayload, academic_record_id: recordId }),
        (error) => error.statusCode === 404 && error.message.includes("Academic record")
    );
});

test("listCalendarEvents scopes manual events and queries the selected overlap range", async () => {
    const calls = { eq: [], lte: [], or: [], order: [], range: null };
    const request = {
        eq(field, value) {
            calls.eq.push([field, value]);
            return this;
        },
        lte(field, value) {
            calls.lte.push([field, value]);
            return this;
        },
        or(value) {
            calls.or.push(value);
            return this;
        },
        order(column, options) {
            calls.order.push([column, options]);
            return this;
        },
        range(from, to) {
            calls.range = [from, to];
            return Promise.resolve({ data: [baseEvent], count: 3, error: null });
        }
    };
    const supabase = {
        from(table) {
            assert.equal(table, "calendar_events");
            return {
                select(columns, options) {
                    assert.match(columns, /completed_at/);
                    assert.deepEqual(options, { count: "exact" });
                    return request;
                }
            };
        }
    };

    const result = await listCalendarEvents(supabase, studentId, {
        from: "2026-07-14T00:00:00.000Z",
        to: "2026-07-20T23:59:59.999Z",
        event_type: "study_block",
        status: "scheduled",
        limit: "2",
        offset: "1"
    });

    assert.deepEqual(calls.eq, [
        ["student_id", studentId],
        ["source", "manual"],
        ["event_type", "study_block"],
        ["status", "scheduled"]
    ]);
    assert.deepEqual(calls.lte, [["starts_at", "2026-07-20T23:59:59.999Z"]]);
    assert.deepEqual(calls.or, ["ends_at.is.null,ends_at.gte.2026-07-14T00:00:00.000Z"]);
    assert.deepEqual(calls.order, [
        ["starts_at", { ascending: true }],
        ["id", { ascending: true }]
    ]);
    assert.deepEqual(calls.range, [1, 2]);
    assert.deepEqual(result, {
        events: [baseEvent],
        pagination: { limit: 2, offset: 1, total: 3, has_more: true }
    });

    await assert.rejects(
        listCalendarEvents({}, studentId, { from: "2026-07-14T00:00:00.000Z" }),
        (error) => error.statusCode === 400 && error.message.includes("from and to")
    );
    await assert.rejects(
        listCalendarEvents({}, studentId, {
            from: "2026-07-14T00:00:00.000Z",
            to: "2026-07-13T00:00:00.000Z"
        }),
        (error) => error.statusCode === 400 && error.message.includes("to")
    );
});

test("getCalendarEvent scopes lookups to the authenticated student's manual events", async () => {
    const filters = [];
    const supabase = {
        from(table) {
            assert.equal(table, "calendar_events");
            return {
                select: () => ({
                    eq(field, value) {
                        filters.push([field, value]);
                        return this;
                    },
                    maybeSingle: async () => ({ data: baseEvent, error: null })
                })
            };
        }
    };

    const event = await getCalendarEvent(supabase, studentId, eventId);
    assert.equal(event.id, eventId);
    assert.deepEqual(filters, [["id", eventId], ["student_id", studentId], ["source", "manual"]]);

    await assert.rejects(
        getCalendarEvent({}, studentId, "not-a-uuid"),
        (error) => error.statusCode === 400 && error.message.includes("UUID")
    );
});

test("updateCalendarEvent checks the merged time range and manages completed_at from status", async () => {
    let fromCalls = 0;
    let updateValues;
    const updateFilters = [];
    const supabase = {
        from(table) {
            assert.equal(table, "calendar_events");
            fromCalls += 1;
            if (fromCalls === 1) {
                return {
                    select: () => ({
                        eq() {
                            return this;
                        },
                        maybeSingle: async () => ({ data: baseEvent, error: null })
                    })
                };
            }

            return {
                update(values) {
                    updateValues = values;
                    return {
                        eq(field, value) {
                            updateFilters.push([field, value]);
                            return this;
                        },
                        select: () => ({ maybeSingle: async () => ({ data: { ...baseEvent, ...values }, error: null }) })
                    };
                }
            };
        }
    };

    const event = await updateCalendarEvent(supabase, studentId, eventId, { status: "completed" });
    assert.equal(updateValues.status, "completed");
    assert.match(updateValues.completed_at, /^\d{4}-\d{2}-\d{2}T/);
    assert.deepEqual(updateFilters, [
        ["id", eventId],
        ["student_id", studentId],
        ["source", "manual"]
    ]);
    assert.equal(event.status, "completed");

    const currentCompletedEvent = { ...baseEvent, status: "completed", completed_at: "2026-07-14T04:00:00.000Z" };
    const invalidRangeSupabase = {
        from: () => ({
            select: () => ({
                eq() {
                    return this;
                },
                maybeSingle: async () => ({ data: currentCompletedEvent, error: null })
            })
        })
    };
    await assert.rejects(
        updateCalendarEvent(invalidRangeSupabase, studentId, eventId, {
            starts_at: "2026-07-14T05:00:00.000Z"
        }),
        (error) => error.statusCode === 400 && error.message.includes("ends_at")
    );
});

test("deleteCalendarEvent scopes the delete and reports unavailable events", async () => {
    let fromCalls = 0;
    const filters = [];
    const supabase = {
        from(table) {
            assert.equal(table, "calendar_events");
            fromCalls += 1;
            if (fromCalls === 1) {
                return {
                    select: () => ({
                        eq() {
                            return this;
                        },
                        maybeSingle: async () => ({ data: baseEvent, error: null })
                    })
                };
            }

            return {
                delete: () => ({
                    eq(field, value) {
                        filters.push([field, value]);
                        return this;
                    },
                    select: () => ({ maybeSingle: async () => ({ data: { id: eventId }, error: null }) })
                })
            };
        }
    };

    await deleteCalendarEvent(supabase, studentId, eventId);
    assert.deepEqual(filters, [
        ["id", eventId],
        ["student_id", studentId],
        ["source", "manual"]
    ]);

    const missingEventSupabase = {
        from: () => ({
            select: () => ({
                eq() {
                    return this;
                },
                maybeSingle: async () => ({ data: null, error: null })
            })
        })
    };
    await assert.rejects(
        deleteCalendarEvent(missingEventSupabase, studentId, eventId),
        (error) => error.statusCode === 404 && error.message.includes("Calendar event")
    );
});
