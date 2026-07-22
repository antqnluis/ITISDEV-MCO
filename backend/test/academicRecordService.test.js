const assert = require("node:assert/strict");
const test = require("node:test");

const {
    createAcademicRecord,
    listAcademicRecords,
    getAcademicRecord,
    updateAcademicRecord,
    deleteAcademicRecord,
    createMockAcademicRecord
} = require("../src/services/academicRecordService");

const studentId = "11111111-1111-4111-8111-111111111111";
const recordId = "22222222-2222-4222-8222-222222222222";
const courseId = "33333333-3333-4333-8333-333333333333";
const otherCourseId = "44444444-4444-4444-8444-444444444444";
const course = { id: courseId, code: "ITISDEV", name: "IT Systems Development" };
const baseRecord = {
    id: recordId,
    student_id: studentId,
    source: "manual",
    course_id: courseId,
    course,
    record_type: "assignment",
    title: "Academic records API",
    due_at: "2026-07-20T09:00:00.000Z",
    submitted_at: null,
    submission_status: "upcoming",
    score: null,
    max_score: null,
    grade_percentage: null,
    recorded_at: "2026-07-12T00:00:00.000Z"
};
const validPayload = {
    course_id: courseId,
    record_type: "assignment",
    title: "Academic records API"
};

function lookup(record) {
    return {
        select: () => ({
            eq() {
                return this;
            },
            maybeSingle: async () => ({ data: record, error: null })
        })
    };
}

test("createAcademicRecord requires an owned course and writes only course_id", async () => {
    const courseFilters = [];
    let insertedValues;
    const supabase = {
        from(table) {
            if (table === "courses") {
                return {
                    select: () => ({
                        eq(field, value) {
                            courseFilters.push([field, value]);
                            return this;
                        },
                        maybeSingle: async () => ({ data: { id: courseId }, error: null })
                    })
                };
            }
            assert.equal(table, "academic_records");
            return {
                insert(values) {
                    insertedValues = values;
                    return {
                        select: () => ({
                            single: async () => ({ data: { ...baseRecord, ...values }, error: null })
                        })
                    };
                }
            };
        }
    };

    await createAcademicRecord(supabase, studentId, {
        ...validPayload,
        title: " Academic records API ",
        score: 18,
        max_score: 20,
        due_at: "2026-07-20T17:00:00+08:00"
    });

    assert.deepEqual(courseFilters, [["id", courseId], ["student_id", studentId]]);
    assert.deepEqual(insertedValues, {
        student_id: studentId,
        source: "manual",
        course_id: courseId,
        record_type: "assignment",
        title: "Academic records API",
        score: 18,
        max_score: 20,
        due_at: "2026-07-20T09:00:00.000Z"
    });

    await assert.rejects(
        createAcademicRecord({}, studentId, { ...validPayload, score: 10 }),
        (error) => error.statusCode === 400 && error.message.includes("score")
    );
    await assert.rejects(
        createAcademicRecord({}, studentId, {
            ...validPayload,
            course_code: "ITISDEV"
        }),
        (error) => error.statusCode === 400 && error.message.includes("course_code")
    );
});

test("createAcademicRecord rejects a course outside the authenticated student", async () => {
    const supabase = { from: () => lookup(null) };
    await assert.rejects(
        createAcademicRecord(supabase, studentId, validPayload),
        (error) => error.statusCode === 404 && error.message === "Course not found"
    );
});

test("listAcademicRecords filters by course_id and returns nested course metadata", async () => {
    const calls = { eq: [], gte: [], lte: [], order: [], range: null };
    const request = {
        eq(field, value) { calls.eq.push([field, value]); return this; },
        gte(field, value) { calls.gte.push([field, value]); return this; },
        lte(field, value) { calls.lte.push([field, value]); return this; },
        order(column, options) { calls.order.push([column, options]); return this; },
        range(from, to) {
            calls.range = [from, to];
            return Promise.resolve({ data: [baseRecord], count: 3, error: null });
        }
    };
    const supabase = {
        from(table) {
            assert.equal(table, "academic_records");
            return {
                select(columns, options) {
                    assert.match(columns, /course:courses/);
                    assert.deepEqual(options, { count: "exact" });
                    return request;
                }
            };
        }
    };

    const result = await listAcademicRecords(supabase, studentId, {
        limit: "2",
        offset: "1",
        source: "mock",
        record_type: "assignment",
        course_id: courseId,
        due_from: "2026-07-01",
        due_to: "2026-07-31"
    });

    assert.deepEqual(calls.eq, [
        ["student_id", studentId],
        ["source", "mock"],
        ["record_type", "assignment"],
        ["course_id", courseId]
    ]);
    assert.deepEqual(calls.range, [1, 2]);
    assert.equal(result.records[0].course.code, "ITISDEV");
    assert.equal(result.pagination.has_more, true);

    await assert.rejects(
        listAcademicRecords({}, studentId, { course_code: "ITISDEV" }),
        (error) => error.statusCode === 400 && error.message.includes("course_code")
    );
});

test("getAcademicRecord validates IDs and scopes the lookup", async () => {
    const filters = [];
    const supabase = {
        from: () => ({
            select: (columns) => {
                assert.match(columns, /course:courses/);
                return {
                    eq(field, value) { filters.push([field, value]); return this; },
                    maybeSingle: async () => ({ data: baseRecord, error: null })
                };
            }
        })
    };

    assert.equal((await getAcademicRecord(supabase, studentId, recordId)).id, recordId);
    assert.deepEqual(filters, [["id", recordId], ["student_id", studentId]]);
    await assert.rejects(
        getAcademicRecord({}, studentId, "not-a-uuid"),
        (error) => error.statusCode === 400 && error.message.includes("UUID")
    );
});

test("updateAcademicRecord verifies a changed course and protects mock records", async () => {
    let academicCalls = 0;
    let updateValues;
    const supabase = {
        from(table) {
            if (table === "courses") {
                return lookup({ id: otherCourseId });
            }
            academicCalls += 1;
            if (academicCalls === 1) return lookup(baseRecord);
            return {
                update(values) {
                    updateValues = values;
                    return {
                        eq() { return this; },
                        select: () => ({
                            maybeSingle: async () => ({ data: { ...baseRecord, ...values }, error: null })
                        })
                    };
                }
            };
        }
    };

    const record = await updateAcademicRecord(supabase, studentId, recordId, {
        course_id: otherCourseId,
        score: 20,
        max_score: 20
    });
    assert.deepEqual(updateValues, { course_id: otherCourseId, score: 20, max_score: 20 });
    assert.equal(record.course_id, otherCourseId);

    const mockSupabase = { from: () => lookup({ ...baseRecord, source: "mock" }) };
    await assert.rejects(
        updateAcademicRecord(mockSupabase, studentId, recordId, { title: "No" }),
        (error) => error.statusCode === 403 && error.message.includes("Mock")
    );
});

test("deleteAcademicRecord scopes manual deletion and protects mock records", async () => {
    let calls = 0;
    const filters = [];
    const supabase = {
        from() {
            calls += 1;
            if (calls === 1) return lookup(baseRecord);
            return {
                delete: () => ({
                    eq(field, value) { filters.push([field, value]); return this; },
                    select: () => ({ maybeSingle: async () => ({ data: { id: recordId }, error: null }) })
                })
            };
        }
    };

    await deleteAcademicRecord(supabase, studentId, recordId);
    assert.deepEqual(filters, [
        ["id", recordId],
        ["student_id", studentId],
        ["source", "manual"]
    ]);
});

test("createMockAcademicRecord verifies course ownership before inserting", async () => {
    let insertedValues;
    const serviceSupabase = {
        from(table) {
            if (table === "courses") return lookup({ id: courseId });
            return {
                insert(values) {
                    insertedValues = values;
                    return {
                        select: () => ({
                            single: async () => ({ data: { ...baseRecord, ...values }, error: null })
                        })
                    };
                }
            };
        }
    };

    await createMockAcademicRecord({
        student_id: studentId,
        ...validPayload,
        recorded_at: "2026-07-12T08:00:00+08:00"
    }, serviceSupabase);
    assert.deepEqual(insertedValues, {
        student_id: studentId,
        source: "mock",
        ...validPayload,
        recorded_at: "2026-07-12T00:00:00.000Z"
    });
});
