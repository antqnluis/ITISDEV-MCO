const assert = require("node:assert/strict");
const test = require("node:test");

const {
    createCheckIn,
    listCheckIns,
    getCurrentCheckIn,
    getCheckIn,
    updateCheckIn,
    deleteCheckIn
} = require("../src/services/weeklyCheckInService");

const baseCheckIn = {
    id: "check-in-id",
    student_id: "student-id",
    week_start: "2026-07-06",
    stress_level: 4,
    mood_level: 3,
    sleep_quality: 2,
    motivation_level: 3,
    burnout_level: 4,
    energy_level: 2,
    available_study_hours: 8,
    reflection: "Several deadlines are due this week."
};

const validPayload = {
    week_start: "2026-07-06",
    stress_level: 4,
    mood_level: 3,
    sleep_quality: 2,
    motivation_level: 3,
    burnout_level: 4,
    energy_level: 2
};

test("createCheckIn validates input and assigns the authenticated student", async () => {
    let insertedValues;
    const supabase = {
        from: (table) => {
            assert.equal(table, "weekly_check_ins");
            return {
                insert: (values) => {
                    insertedValues = values;
                    return {
                        select: () => ({
                            single: async () => ({ data: { ...baseCheckIn, ...values }, error: null })
                        })
                    };
                }
            };
        }
    };

    const checkIn = await createCheckIn(supabase, "student-id", {
        ...validPayload,
        reflection: "  Managing several deadlines.  ",
        available_study_hours: 10
    });

    assert.deepEqual(insertedValues, {
        ...validPayload,
        reflection: "Managing several deadlines.",
        available_study_hours: 10,
        student_id: "student-id"
    });
    assert.equal(checkIn.student_id, "student-id");

    await assert.rejects(
        createCheckIn({}, "student-id", { ...validPayload, sleep_quality: 6 }),
        (error) => error.statusCode === 400 && error.message.includes("sleep_quality")
    );
    await assert.rejects(
        createCheckIn({}, "student-id", { ...validPayload, week_start: "2026-02-29" }),
        (error) => error.statusCode === 400 && error.message.includes("week_start")
    );
    await assert.rejects(
        createCheckIn({}, "student-id", { ...validPayload, week_start: "2026-07-07" }),
        (error) => error.statusCode === 400 && error.message === "week_start must be a Monday"
    );
});

test("createCheckIn reports a duplicate weekly entry", async () => {
    const supabase = {
        from: () => ({
            insert: () => ({
                select: () => ({
                    single: async () => ({ data: null, error: { code: "23505" } })
                })
            })
        })
    };

    await assert.rejects(
        createCheckIn(supabase, "student-id", validPayload),
        (error) => error.statusCode === 409 && error.message.includes("already exists")
    );
});

test("listCheckIns scopes records to the authenticated student and orders newest first", async () => {
    let requestedStudentId;
    let order;
    const supabase = {
        from: () => ({
            select: () => ({
                eq: (field, value) => {
                    assert.equal(field, "student_id");
                    requestedStudentId = value;
                    return {
                        order: (column, options) => {
                            order = { column, options };
                            return Promise.resolve({ data: [baseCheckIn], error: null });
                        }
                    };
                }
            })
        })
    };

    const checkIns = await listCheckIns(supabase, "student-id");

    assert.equal(requestedStudentId, "student-id");
    assert.deepEqual(order, { column: "week_start", options: { ascending: false } });
    assert.deepEqual(checkIns, [baseCheckIn]);
});

test("getCurrentCheckIn uses the Manila week and returns an optional owned check-in", async () => {
    const filters = [];
    const request = {
        select: () => request,
        eq(field, value) {
            filters.push([field, value]);
            return request;
        },
        maybeSingle: async () => ({ data: baseCheckIn, error: null })
    };
    const supabase = {
        from(table) {
            assert.equal(table, "weekly_check_ins");
            return request;
        }
    };

    const result = await getCurrentCheckIn(supabase, "student-id", {
        now: new Date("2026-07-06T01:00:00.000Z")
    });

    assert.equal(result.weekStart, "2026-07-06");
    assert.equal(result.checkIn, baseCheckIn);
    assert.deepEqual(filters, [
        ["student_id", "student-id"],
        ["week_start", "2026-07-06"]
    ]);

    request.maybeSingle = async () => ({ data: null, error: null });
    const missingResult = await getCurrentCheckIn(supabase, "student-id", {
        now: new Date("2026-07-06T01:00:00.000Z")
    });
    assert.equal(missingResult.checkIn, null);
});

test("getCurrentCheckIn reports invalid clocks and database failures", async () => {
    await assert.rejects(
        getCurrentCheckIn({}, "student-id", { now: new Date("invalid") }),
        (error) => error.statusCode === 500 && error.message.includes("current week")
    );

    const request = {
        select: () => request,
        eq: () => request,
        maybeSingle: async () => ({ data: null, error: new Error("database unavailable") })
    };
    await assert.rejects(
        getCurrentCheckIn({ from: () => request }, "student-id", {
            now: new Date("2026-07-06T01:00:00.000Z")
        }),
        (error) => error.statusCode === 500 && error.message.includes("current weekly check-in")
    );
});

test("getCheckIn and updateCheckIn scope records to their owner", async () => {
    const getFilters = [];
    const getSupabase = {
        from: () => ({
            select: () => ({
                eq: (field, value) => {
                    getFilters.push([field, value]);
                    return {
                        eq: (nextField, nextValue) => {
                            getFilters.push([nextField, nextValue]);
                            return {
                                maybeSingle: async () => ({ data: baseCheckIn, error: null })
                            };
                        }
                    };
                }
            })
        })
    };

    await getCheckIn(getSupabase, "student-id", "check-in-id");
    assert.deepEqual(getFilters, [["id", "check-in-id"], ["student_id", "student-id"]]);

    let updateValues;
    const updateSupabase = {
        from: () => ({
            update: (values) => {
                updateValues = values;
                return {
                    eq: (field, value) => {
                        assert.equal(field, "id");
                        assert.equal(value, "check-in-id");
                        return {
                            eq: (ownerField, ownerId) => {
                                assert.equal(ownerField, "student_id");
                                assert.equal(ownerId, "student-id");
                                return {
                                    select: () => ({
                                        maybeSingle: async () => ({
                                            data: { ...baseCheckIn, ...values },
                                            error: null
                                        })
                                    })
                                };
                            }
                        };
                    }
                };
            }
        })
    };

    const checkIn = await updateCheckIn(updateSupabase, "student-id", "check-in-id", {
        stress_level: 2,
        reflection: " "
    });

    assert.deepEqual(updateValues, { stress_level: 2, reflection: null });
    assert.equal(checkIn.stress_level, 2);

    await assert.rejects(
        updateCheckIn({}, "student-id", "check-in-id", { week_start: "2026-07-08" }),
        (error) => error.statusCode === 400 && error.message === "week_start must be a Monday"
    );
});

test("deleteCheckIn returns not found and linked-record conflicts clearly", async () => {
    const missingSupabase = {
        from: () => ({
            delete: () => ({
                eq: () => ({
                    eq: () => ({
                        select: () => ({
                            maybeSingle: async () => ({ data: null, error: null })
                        })
                    })
                })
            })
        })
    };

    await assert.rejects(
        deleteCheckIn(missingSupabase, "student-id", "missing-id"),
        (error) => error.statusCode === 404
    );

    const linkedSupabase = {
        from: () => ({
            delete: () => ({
                eq: () => ({
                    eq: () => ({
                        select: () => ({
                            maybeSingle: async () => ({ data: null, error: { code: "23503" } })
                        })
                    })
                })
            })
        })
    };

    await assert.rejects(
        deleteCheckIn(linkedSupabase, "student-id", "check-in-id"),
        (error) => error.statusCode === 409 && error.message.includes("linked records")
    );
});
