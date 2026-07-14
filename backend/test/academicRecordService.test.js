const assert = require("node:assert/strict");
const test = require("node:test");

const {
    listAcademicRecords,
    getAcademicRecord,
    importAcademicRecord
} = require("../src/services/academicRecordService");

const studentId = "11111111-1111-4111-8111-111111111111";
const recordId = "22222222-2222-4222-8222-222222222222";
const baseRecord = {
    id: recordId,
    student_id: studentId,
    source: "canvas",
    external_record_id: "canvas-assignment-1",
    course_code: "ITISDEV",
    course_name: "IT Systems Development",
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

function createListSupabase(response) {
    const calls = { eq: [], gte: [], lte: [], order: [], range: null };
    const request = {
        eq(field, value) {
            calls.eq.push([field, value]);
            return this;
        },
        gte(field, value) {
            calls.gte.push([field, value]);
            return this;
        },
        lte(field, value) {
            calls.lte.push([field, value]);
            return this;
        },
        order(column, options) {
            calls.order.push([column, options]);
            return this;
        },
        range(from, to) {
            calls.range = [from, to];
            return Promise.resolve(response);
        }
    };

    return {
        calls,
        supabase: {
            from(table) {
                assert.equal(table, "academic_records");
                return {
                    select(columns, options) {
                        assert.match(columns, /grade_percentage/);
                        assert.deepEqual(options, { count: "exact" });
                        return request;
                    }
                };
            }
        }
    };
}

test("listAcademicRecords scopes, filters, paginates, and orders the caller's records", async () => {
    const { supabase, calls } = createListSupabase({
        data: [baseRecord],
        count: 3,
        error: null
    });

    const result = await listAcademicRecords(supabase, studentId, {
        limit: "2",
        offset: "1",
        source: "canvas",
        record_type: "assignment",
        course_code: "ITISDEV",
        due_from: "2026-07-01",
        due_to: "2026-07-31"
    });

    assert.deepEqual(calls.eq, [
        ["student_id", studentId],
        ["source", "canvas"],
        ["record_type", "assignment"],
        ["course_code", "ITISDEV"]
    ]);
    assert.deepEqual(calls.gte, [["due_at", "2026-07-01T00:00:00.000Z"]]);
    assert.deepEqual(calls.lte, [["due_at", "2026-07-31T23:59:59.999Z"]]);
    assert.deepEqual(calls.order, [
        ["due_at", { ascending: true, nullsFirst: false }],
        ["id", { ascending: true }]
    ]);
    assert.deepEqual(calls.range, [1, 2]);
    assert.deepEqual(result, {
        records: [baseRecord],
        pagination: { limit: 2, offset: 1, total: 3, has_more: true }
    });
});

test("listAcademicRecords validates pagination and filter parameters", async () => {
    await assert.rejects(
        listAcademicRecords({}, studentId, { limit: "101" }),
        (error) => error.statusCode === 400 && error.message.includes("limit")
    );
    await assert.rejects(
        listAcademicRecords({}, studentId, { source: "other" }),
        (error) => error.statusCode === 400 && error.message.includes("source")
    );
    await assert.rejects(
        listAcademicRecords({}, studentId, { due_from: "2026-08-01", due_to: "2026-07-31" }),
        (error) => error.statusCode === 400 && error.message.includes("due_from")
    );
});

test("getAcademicRecord validates the ID and scopes the lookup to its owner", async () => {
    const filters = [];
    const supabase = {
        from(table) {
            assert.equal(table, "academic_records");
            return {
                select: () => ({
                    eq(field, value) {
                        filters.push([field, value]);
                        return this;
                    },
                    maybeSingle: async () => ({ data: baseRecord, error: null })
                })
            };
        }
    };

    const record = await getAcademicRecord(supabase, studentId, recordId);
    assert.equal(record.id, recordId);
    assert.deepEqual(filters, [["id", recordId], ["student_id", studentId]]);

    await assert.rejects(
        getAcademicRecord({}, studentId, "not-a-uuid"),
        (error) => error.statusCode === 400 && error.message.includes("UUID")
    );

    const missingSupabase = {
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
        getAcademicRecord(missingSupabase, studentId, recordId),
        (error) => error.statusCode === 404
    );
});

test("importAcademicRecord inserts a validated record without an external ID", async () => {
    let inserted;
    const serviceSupabase = {
        from(table) {
            assert.equal(table, "academic_records");
            return {
                insert(values) {
                    inserted = values;
                    return {
                        select: () => ({
                            single: async () => ({ data: { ...baseRecord, ...values }, error: null })
                        })
                    };
                }
            };
        }
    };

    const imported = await importAcademicRecord({
        student_id: studentId,
        course_code: " ITISDEV ",
        course_name: " IT Systems Development ",
        record_type: "assignment",
        title: " Academic records API ",
        score: 18,
        max_score: 20,
        due_at: "2026-07-20T17:00:00+08:00"
    }, serviceSupabase);

    assert.deepEqual(inserted, {
        student_id: studentId,
        source: "mock",
        external_record_id: null,
        course_code: "ITISDEV",
        course_name: "IT Systems Development",
        record_type: "assignment",
        title: "Academic records API",
        due_at: "2026-07-20T09:00:00.000Z",
        submitted_at: null,
        submission_status: "not_applicable",
        score: 18,
        max_score: 20
    });
    assert.equal(imported.student_id, studentId);
});

test("importAcademicRecord updates a matching external record", async () => {
    let updated;
    let lookupFilters = [];
    let fromCalls = 0;
    const serviceSupabase = {
        from() {
            fromCalls += 1;
            if (fromCalls === 1) {
                return {
                    select: () => ({
                        eq(field, value) {
                            lookupFilters.push([field, value]);
                            return this;
                        },
                        maybeSingle: async () => ({ data: { id: recordId }, error: null })
                    })
                };
            }

            return {
                update(values) {
                    updated = values;
                    return {
                        eq(field, value) {
                            assert.equal(field, "id");
                            assert.equal(value, recordId);
                            return {
                                select: () => ({
                                    single: async () => ({ data: { ...baseRecord, ...values }, error: null })
                                })
                            };
                        }
                    };
                }
            };
        }
    };

    const imported = await importAcademicRecord({
        student_id: studentId,
        source: "canvas",
        external_record_id: "canvas-assignment-1",
        course_code: "ITISDEV",
        course_name: "IT Systems Development",
        record_type: "assignment",
        title: "Academic records API",
        due_at: "2026-07-20T09:00:00.000Z",
        submitted_at: null,
        submission_status: "upcoming",
        recorded_at: "2026-07-12T00:00:00.000Z",
        score: 20,
        max_score: 20
    }, serviceSupabase);

    assert.deepEqual(lookupFilters, [
        ["student_id", studentId],
        ["source", "canvas"],
        ["external_record_id", "canvas-assignment-1"]
    ]);
    assert.equal(updated.score, 20);
    assert.equal(updated.max_score, 20);
    assert.equal(imported.score, 20);
});

test("importAcademicRecord recovers from a concurrent external-record insert", async () => {
    let fromCalls = 0;
    const serviceSupabase = {
        from() {
            fromCalls += 1;
            if (fromCalls === 1) {
                return createExternalLookup(null);
            }
            if (fromCalls === 2) {
                return {
                    insert: () => ({
                        select: () => ({
                            single: async () => ({ data: null, error: { code: "23505" } })
                        })
                    })
                };
            }
            if (fromCalls === 3) {
                return createExternalLookup({ id: recordId });
            }
            return {
                update: () => ({
                    eq: () => ({
                        select: () => ({
                            single: async () => ({ data: baseRecord, error: null })
                        })
                    })
                })
            };
        }
    };

    const imported = await importAcademicRecord({
        student_id: studentId,
        source: "canvas",
        external_record_id: "canvas-assignment-1",
        course_code: "ITISDEV",
        course_name: "IT Systems Development",
        record_type: "assignment",
        title: "Academic records API"
    }, serviceSupabase);

    assert.equal(imported.id, recordId);
    assert.equal(fromCalls, 4);
});

test("importAcademicRecord rejects invalid payloads and unavailable service-role access", async () => {
    await assert.rejects(
        importAcademicRecord({
            student_id: studentId,
            course_code: "ITISDEV",
            course_name: "IT Systems Development",
            record_type: "assignment",
            title: "Mismatched score",
            score: 10
        }, {}),
        (error) => error.statusCode === 400 && error.message.includes("score")
    );

    await assert.rejects(
        importAcademicRecord({
            student_id: "not-a-uuid",
            source: "canvas",
            external_record_id: "canvas-assignment-1",
            course_code: "ITISDEV",
            course_name: "IT Systems Development",
            record_type: "assignment",
            title: "Academic records API"
        }, {}),
        (error) => error.statusCode === 400 && error.message.includes("student_id")
    );

    await assert.rejects(
        importAcademicRecord(baseRecord, null),
        (error) => error.statusCode === 503 && error.message.includes("SERVICE_ROLE")
    );
});

function createExternalLookup(data) {
    return {
        select: () => ({
            eq() {
                return this;
            },
            maybeSingle: async () => ({ data, error: null })
        })
    };
}
