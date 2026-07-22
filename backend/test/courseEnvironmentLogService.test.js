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
const courseId = "44444444-4444-4444-8444-444444444444";
const otherCourseId = "55555555-5555-4555-8555-555555555555";
const course = { id: courseId, code: "ITISDEV", name: "IT Systems Development" };
const baseLog = {
    id: logId,
    student_id: studentId,
    check_in_id: null,
    course_id: courseId,
    course,
    week_start: "2026-07-06",
    workload_difficulty: 4,
    unclear_instruction_level: null,
    grading_concern_level: null,
    professor_approachability_concern: null,
    groupmate_issue_level: null,
    concern_notes: "Several deadlines are due this week."
};
const validPayload = {
    course_id: courseId,
    week_start: "2026-07-06",
    workload_difficulty: 4
};

function lookup(data, filters = []) {
    return {
        select: () => ({
            eq(field, value) { filters.push([field, value]); return this; },
            maybeSingle: async () => ({ data, error: null })
        })
    };
}

test("createCourseEnvironmentLog verifies course ownership and writes course_id", async () => {
    const courseFilters = [];
    let insertedValues;
    const supabase = {
        from(table) {
            if (table === "courses") return lookup({ id: courseId }, courseFilters);
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

    await createCourseEnvironmentLog(supabase, studentId, {
        ...validPayload,
        concern_notes: "  High workload.  "
    });
    assert.deepEqual(courseFilters, [["id", courseId], ["student_id", studentId]]);
    assert.deepEqual(insertedValues, {
        ...validPayload,
        concern_notes: "High workload.",
        student_id: studentId
    });

    await assert.rejects(
        createCourseEnvironmentLog({}, studentId, { ...validPayload, workload_difficulty: 6 }),
        (error) => error.statusCode === 400 && error.message.includes("workload_difficulty")
    );
    await assert.rejects(
        createCourseEnvironmentLog({}, studentId, { ...validPayload, week_start: "2026-07-07" }),
        (error) => error.statusCode === 400 && error.message === "week_start must be a Monday"
    );
    await assert.rejects(
        createCourseEnvironmentLog({}, studentId, {
            course_id: courseId,
            week_start: "2026-07-06"
        }),
        (error) => error.statusCode === 400 && error.message.includes("concern")
    );
    await assert.rejects(
        createCourseEnvironmentLog({}, studentId, { ...validPayload, course_code: "ITISDEV" }),
        (error) => error.statusCode === 400 && error.message.includes("course_code")
    );
});

test("createCourseEnvironmentLog verifies optional check-in ownership", async () => {
    const filters = [];
    const supabase = {
        from(table) {
            if (table === "courses") return lookup({ id: courseId });
            if (table === "weekly_check_ins") return lookup({ id: checkInId }, filters);
            return {
                insert: (values) => ({
                    select: () => ({
                        single: async () => ({ data: { ...baseLog, ...values }, error: null })
                    })
                })
            };
        }
    };

    await createCourseEnvironmentLog(supabase, studentId, {
        ...validPayload,
        check_in_id: checkInId
    });
    assert.deepEqual(filters, [["id", checkInId], ["student_id", studentId]]);

    const missingCourse = { from: () => lookup(null) };
    await assert.rejects(
        createCourseEnvironmentLog(missingCourse, studentId, validPayload),
        (error) => error.statusCode === 404 && error.message === "Course not found"
    );
});

test("createCourseEnvironmentLog maps duplicate course-week conflicts", async () => {
    const supabase = {
        from(table) {
            if (table === "courses") return lookup({ id: courseId });
            return {
                insert: () => ({
                    select: () => ({
                        single: async () => ({ data: null, error: { code: "23505" } })
                    })
                })
            };
        }
    };
    await assert.rejects(
        createCourseEnvironmentLog(supabase, studentId, validPayload),
        (error) => error.statusCode === 409 && error.message.includes("already exists")
    );
});

test("listCourseEnvironmentLogs filters by course_id and returns nested course", async () => {
    const calls = { eq: [], order: [], range: null };
    const request = {
        eq(field, value) { calls.eq.push([field, value]); return this; },
        order(column, options) { calls.order.push([column, options]); return this; },
        range(from, to) {
            calls.range = [from, to];
            return Promise.resolve({ data: [baseLog], count: 3, error: null });
        }
    };
    const supabase = {
        from: () => ({
            select(columns, options) {
                assert.match(columns, /course:courses/);
                assert.deepEqual(options, { count: "exact" });
                return request;
            }
        })
    };

    const result = await listCourseEnvironmentLogs(supabase, studentId, {
        limit: "2",
        offset: "1",
        week_start: "2026-07-06",
        course_id: courseId,
        check_in_id: checkInId
    });
    assert.deepEqual(calls.eq, [
        ["student_id", studentId],
        ["week_start", "2026-07-06"],
        ["course_id", courseId],
        ["check_in_id", checkInId]
    ]);
    assert.deepEqual(calls.order, [
        ["week_start", { ascending: false }],
        ["course_id", { ascending: true }],
        ["id", { ascending: true }]
    ]);
    assert.equal(result.logs[0].course.name, "IT Systems Development");
    assert.deepEqual(calls.range, [1, 2]);
});

test("getCourseEnvironmentLog validates and owner-scopes IDs", async () => {
    const filters = [];
    const supabase = { from: () => lookup(baseLog, filters) };
    assert.equal((await getCourseEnvironmentLog(supabase, studentId, logId)).id, logId);
    assert.deepEqual(filters, [["id", logId], ["student_id", studentId]]);
    await assert.rejects(
        getCourseEnvironmentLog({}, studentId, "not-a-uuid"),
        (error) => error.statusCode === 400 && error.message.includes("UUID")
    );
});

test("updateCourseEnvironmentLog verifies changed courses and preserves content", async () => {
    let logCalls = 0;
    let updateValues;
    const supabase = {
        from(table) {
            if (table === "courses") return lookup({ id: otherCourseId });
            logCalls += 1;
            if (logCalls === 1) return lookup(baseLog);
            return {
                update(values) {
                    updateValues = values;
                    return {
                        eq() { return this; },
                        select: () => ({
                            maybeSingle: async () => ({ data: { ...baseLog, ...values }, error: null })
                        })
                    };
                }
            };
        }
    };

    const log = await updateCourseEnvironmentLog(supabase, studentId, logId, {
        course_id: otherCourseId,
        workload_difficulty: null,
        concern_notes: "  Updated notes.  "
    });
    assert.deepEqual(updateValues, {
        course_id: otherCourseId,
        workload_difficulty: null,
        concern_notes: "Updated notes."
    });
    assert.equal(log.course_id, otherCourseId);
});

test("deleteCourseEnvironmentLog scopes deletion", async () => {
    const filters = [];
    const supabase = {
        from: () => ({
            delete: () => ({
                eq(field, value) { filters.push([field, value]); return this; },
                select: () => ({ maybeSingle: async () => ({ data: { id: logId }, error: null }) })
            })
        })
    };
    await deleteCourseEnvironmentLog(supabase, studentId, logId);
    assert.deepEqual(filters, [["id", logId], ["student_id", studentId]]);
});
