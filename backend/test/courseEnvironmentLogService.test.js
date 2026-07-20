const assert = require("node:assert/strict");
const test = require("node:test");

const {
    createCourseEnvironmentLog,
    listCourseEnvironmentLogs,
    getCourseEnvironmentLog,
    updateCourseEnvironmentLog,
    deleteCourseEnvironmentLog
} = require("../src/services/courseEnvironmentLogService");

const studentId = "11111111-1111-4111-8111-111111111111";
const logId = "22222222-2222-4222-8222-222222222222";
const checkInId = "33333333-3333-4333-8333-333333333333";
const baseLog = {
    id: logId,
    student_id: studentId,
    check_in_id: null,
    course_code: "ITISDEV",
    course_name: "IT Systems Development",
    week_start: "2026-07-06",
    workload_difficulty: 4,
    unclear_instruction_level: null,
    grading_concern_level: null,
    professor_approachability_concern: null,
    groupmate_issue_level: null,
    concern_notes: "Several deadlines are due this week."
};

const validPayload = {
    course_code: "ITISDEV",
    course_name: "IT Systems Development",
    week_start: "2026-07-06",
    workload_difficulty: 4
};

test("createCourseEnvironmentLog validates input and assigns the authenticated student", async () => {
    let insertedValues;
    const supabase = {
        from(table) {
            assert.equal(table, "course_environment_logs");
            return {
                insert(values) {
                    insertedValues = values;
                    return {
                        select: () => ({
                            single: async () => ({ data: { ...baseLog, ...values }, error: null })
                        })
                    };
                }
            };
        }
    };

    const log = await createCourseEnvironmentLog(supabase, studentId, {
        ...validPayload,
        course_code: " ITISDEV ",
        concern_notes: "  High workload.  "
    });

    assert.deepEqual(insertedValues, {
        ...validPayload,
        course_code: "ITISDEV",
        concern_notes: "High workload.",
        student_id: studentId
    });
    assert.equal(log.student_id, studentId);

    await assert.rejects(
        createCourseEnvironmentLog({}, studentId, { ...validPayload, workload_difficulty: 6 }),
        (error) => error.statusCode === 400 && error.message.includes("workload_difficulty")
    );
    await assert.rejects(
        createCourseEnvironmentLog({}, studentId, {
            course_code: "ITISDEV",
            course_name: "IT Systems Development",
            week_start: "2026-02-29"
        }),
        (error) => error.statusCode === 400 && error.message.includes("week_start")
    );
    await assert.rejects(
        createCourseEnvironmentLog({}, studentId, {
            ...validPayload,
            week_start: "2026-07-07"
        }),
        (error) => error.statusCode === 400 && error.message === "week_start must be a Monday"
    );
    await assert.rejects(
        createCourseEnvironmentLog({}, studentId, {
            course_code: "ITISDEV",
            course_name: "IT Systems Development",
            week_start: "2026-07-06"
        }),
        (error) => error.statusCode === 400 && error.message.includes("concern")
    );
});

test("createCourseEnvironmentLog verifies an attached weekly check-in belongs to the student", async () => {
    const filters = [];
    let insertedValues;
    const supabase = {
        from(table) {
            if (table === "weekly_check_ins") {
                return {
                    select: () => ({
                        eq(field, value) {
                            filters.push([field, value]);
                            return this;
                        },
                        maybeSingle: async () => ({ data: { id: checkInId }, error: null })
                    })
                };
            }

            assert.equal(table, "course_environment_logs");
            return {
                insert(values) {
                    insertedValues = values;
                    return {
                        select: () => ({
                            single: async () => ({ data: { ...baseLog, ...values }, error: null })
                        })
                    };
                }
            };
        }
    };

    await createCourseEnvironmentLog(supabase, studentId, { ...validPayload, check_in_id: checkInId });
    assert.deepEqual(filters, [["id", checkInId], ["student_id", studentId]]);
    assert.equal(insertedValues.check_in_id, checkInId);

    const missingCheckInSupabase = {
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
        createCourseEnvironmentLog(missingCheckInSupabase, studentId, {
            ...validPayload,
            check_in_id: checkInId
        }),
        (error) => error.statusCode === 404 && error.message.includes("Weekly check-in")
    );
});

test("createCourseEnvironmentLog reports duplicate course and week entries", async () => {
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
        createCourseEnvironmentLog(supabase, studentId, validPayload),
        (error) => error.statusCode === 409 && error.message.includes("already exists")
    );
});

test("listCourseEnvironmentLogs scopes, filters, paginates, and orders logs", async () => {
    const calls = { eq: [], order: [], range: null };
    const request = {
        eq(field, value) {
            calls.eq.push([field, value]);
            return this;
        },
        order(column, options) {
            calls.order.push([column, options]);
            return this;
        },
        range(from, to) {
            calls.range = [from, to];
            return Promise.resolve({ data: [baseLog], count: 3, error: null });
        }
    };
    const supabase = {
        from(table) {
            assert.equal(table, "course_environment_logs");
            return {
                select(columns, options) {
                    assert.match(columns, /concern_notes/);
                    assert.deepEqual(options, { count: "exact" });
                    return request;
                }
            };
        }
    };

    const result = await listCourseEnvironmentLogs(supabase, studentId, {
        limit: "2",
        offset: "1",
        week_start: "2026-07-06",
        course_code: "ITISDEV",
        check_in_id: checkInId
    });

    assert.deepEqual(calls.eq, [
        ["student_id", studentId],
        ["week_start", "2026-07-06"],
        ["course_code", "ITISDEV"],
        ["check_in_id", checkInId]
    ]);
    assert.deepEqual(calls.order, [
        ["week_start", { ascending: false }],
        ["course_code", { ascending: true }],
        ["id", { ascending: true }]
    ]);
    assert.deepEqual(calls.range, [1, 2]);
    assert.deepEqual(result, {
        logs: [baseLog],
        pagination: { limit: 2, offset: 1, total: 3, has_more: true }
    });

    await assert.rejects(
        listCourseEnvironmentLogs({}, studentId, { limit: "101" }),
        (error) => error.statusCode === 400 && error.message.includes("limit")
    );
    await assert.rejects(
        listCourseEnvironmentLogs({}, studentId, { unsupported: "value" }),
        (error) => error.statusCode === 400 && error.message.includes("unsupported")
    );
});

test("getCourseEnvironmentLog validates IDs and scopes the lookup to its owner", async () => {
    const filters = [];
    const supabase = {
        from(table) {
            assert.equal(table, "course_environment_logs");
            return {
                select: () => ({
                    eq(field, value) {
                        filters.push([field, value]);
                        return this;
                    },
                    maybeSingle: async () => ({ data: baseLog, error: null })
                })
            };
        }
    };

    const log = await getCourseEnvironmentLog(supabase, studentId, logId);
    assert.equal(log.id, logId);
    assert.deepEqual(filters, [["id", logId], ["student_id", studentId]]);

    await assert.rejects(
        getCourseEnvironmentLog({}, studentId, "not-a-uuid"),
        (error) => error.statusCode === 400 && error.message.includes("UUID")
    );
});

test("updateCourseEnvironmentLog preserves the content constraint and scopes the write", async () => {
    let fromCalls = 0;
    let updateValues;
    const supabase = {
        from(table) {
            assert.equal(table, "course_environment_logs");
            fromCalls += 1;
            if (fromCalls === 1) {
                return {
                    select: () => ({
                        eq() {
                            return this;
                        },
                        maybeSingle: async () => ({ data: baseLog, error: null })
                    })
                };
            }

            return {
                update(values) {
                    updateValues = values;
                    return {
                        eq(field, value) {
                            assert.equal(field, "id");
                            assert.equal(value, logId);
                            return {
                                eq(ownerField, ownerId) {
                                    assert.equal(ownerField, "student_id");
                                    assert.equal(ownerId, studentId);
                                    return {
                                        select: () => ({
                                            maybeSingle: async () => ({
                                                data: { ...baseLog, ...values },
                                                error: null
                                            })
                                        })
                                    };
                                }
                            };
                        }
                    };
                }
            };
        }
    };

    const log = await updateCourseEnvironmentLog(supabase, studentId, logId, {
        workload_difficulty: null,
        concern_notes: "  Updated notes.  "
    });
    assert.deepEqual(updateValues, {
        workload_difficulty: null,
        concern_notes: "Updated notes."
    });
    assert.equal(log.concern_notes, "Updated notes.");

    const emptyCurrentLog = {
        ...baseLog,
        workload_difficulty: null,
        concern_notes: "Only remaining content"
    };
    const emptyingSupabase = {
        from: () => ({
            select: () => ({
                eq() {
                    return this;
                },
                maybeSingle: async () => ({ data: emptyCurrentLog, error: null })
            })
        })
    };
    await assert.rejects(
        updateCourseEnvironmentLog(emptyingSupabase, studentId, logId, { concern_notes: null }),
        (error) => error.statusCode === 400 && error.message.includes("concern")
    );
});

test("deleteCourseEnvironmentLog scopes the deletion and reports missing logs", async () => {
    const filters = [];
    const supabase = {
        from(table) {
            assert.equal(table, "course_environment_logs");
            return {
                delete: () => ({
                    eq(field, value) {
                        filters.push([field, value]);
                        return this;
                    },
                    select: () => ({
                        maybeSingle: async () => ({ data: { id: logId }, error: null })
                    })
                })
            };
        }
    };

    await deleteCourseEnvironmentLog(supabase, studentId, logId);
    assert.deepEqual(filters, [["id", logId], ["student_id", studentId]]);

    const missingSupabase = {
        from: () => ({
            delete: () => ({
                eq() {
                    return this;
                },
                select: () => ({
                    maybeSingle: async () => ({ data: null, error: null })
                })
            })
        })
    };
    await assert.rejects(
        deleteCourseEnvironmentLog(missingSupabase, studentId, logId),
        (error) => error.statusCode === 404
    );
});
