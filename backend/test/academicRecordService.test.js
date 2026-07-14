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
const baseRecord = {
    id: recordId,
    student_id: studentId,
    source: "manual",
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

const validPayload = {
    course_code: "ITISDEV",
    course_name: "IT Systems Development",
    record_type: "assignment",
    title: "Academic records API"
};

function createRecordLookup(record = baseRecord) {
    return {
        select: () => ({
            eq() {
                return this;
            },
            maybeSingle: async () => ({ data: record, error: null })
        })
    };
}

test("createAcademicRecord validates manual input and assigns ownership fields", async () => {
    let insertedValues;
    const supabase = {
        from(table) {
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

    const record = await createAcademicRecord(supabase, studentId, {
        ...validPayload,
        course_code: " ITISDEV ",
        title: " Academic records API ",
        score: 18,
        max_score: 20,
        due_at: "2026-07-20T17:00:00+08:00"
    });

    assert.deepEqual(insertedValues, {
        student_id: studentId,
        source: "manual",
        course_code: "ITISDEV",
        course_name: "IT Systems Development",
        record_type: "assignment",
        title: "Academic records API",
        score: 18,
        max_score: 20,
        due_at: "2026-07-20T09:00:00.000Z"
    });
    assert.equal(record.source, "manual");

    await assert.rejects(
        createAcademicRecord({}, studentId, { ...validPayload, score: 10 }),
        (error) => error.statusCode === 400 && error.message.includes("score")
    );
    await assert.rejects(
        createAcademicRecord({}, studentId, { ...validPayload, source: "mock" }),
        (error) => error.statusCode === 400 && error.message.includes("source")
    );
    await assert.rejects(
        createAcademicRecord({}, studentId, { ...validPayload, grade_percentage: 100 }),
        (error) => error.statusCode === 400 && error.message.includes("grade_percentage")
    );
});

test("listAcademicRecords scopes, filters, paginates, and orders records", async () => {
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
            return Promise.resolve({ data: [baseRecord], count: 3, error: null });
        }
    };
    const supabase = {
        from(table) {
            assert.equal(table, "academic_records");
            return {
                select(columns, options) {
                    assert.match(columns, /grade_percentage/);
                    assert.doesNotMatch(columns, /external_record_id/);
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
        course_code: "ITISDEV",
        due_from: "2026-07-01",
        due_to: "2026-07-31"
    });

    assert.deepEqual(calls.eq, [
        ["student_id", studentId],
        ["source", "mock"],
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

    await assert.rejects(
        listAcademicRecords({}, studentId, { source: "canvas" }),
        (error) => error.statusCode === 400 && error.message.includes("source")
    );
    await assert.rejects(
        listAcademicRecords({}, studentId, { limit: "101" }),
        (error) => error.statusCode === 400 && error.message.includes("limit")
    );
});

test("getAcademicRecord validates IDs and scopes the lookup to the owner", async () => {
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
});

test("updateAcademicRecord validates score pairs, scopes the write, and protects mocks", async () => {
    let calls = 0;
    let updateValues;
    const supabase = {
        from(table) {
            assert.equal(table, "academic_records");
            calls += 1;
            if (calls === 1) {
                return createRecordLookup(baseRecord);
            }

            return {
                update(values) {
                    updateValues = values;
                    return {
                        eq(field, value) {
                            assert.equal(field, "id");
                            assert.equal(value, recordId);
                            return {
                                eq(ownerField, ownerId) {
                                    assert.equal(ownerField, "student_id");
                                    assert.equal(ownerId, studentId);
                                    return {
                                        eq(sourceField, source) {
                                            assert.equal(sourceField, "source");
                                            assert.equal(source, "manual");
                                            return {
                                                select: () => ({
                                                    maybeSingle: async () => ({
                                                        data: { ...baseRecord, ...values },
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
        }
    };

    const record = await updateAcademicRecord(supabase, studentId, recordId, {
        score: 20,
        max_score: 20,
        submitted_at: null
    });
    assert.deepEqual(updateValues, { score: 20, max_score: 20, submitted_at: null });
    assert.equal(record.score, 20);

    const mockSupabase = { from: () => createRecordLookup({ ...baseRecord, source: "mock" }) };
    await assert.rejects(
        updateAcademicRecord(mockSupabase, studentId, recordId, { title: "Cannot update mock" }),
        (error) => error.statusCode === 403 && error.message.includes("Mock")
    );
});

test("deleteAcademicRecord scopes manual deletion and protects mock records", async () => {
    let calls = 0;
    const filters = [];
    const supabase = {
        from(table) {
            assert.equal(table, "academic_records");
            calls += 1;
            if (calls === 1) {
                return createRecordLookup(baseRecord);
            }

            return {
                delete: () => ({
                    eq(field, value) {
                        filters.push([field, value]);
                        return this;
                    },
                    select: () => ({
                        maybeSingle: async () => ({ data: { id: recordId }, error: null })
                    })
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

    const mockSupabase = { from: () => createRecordLookup({ ...baseRecord, source: "mock" }) };
    await assert.rejects(
        deleteAcademicRecord(mockSupabase, studentId, recordId),
        (error) => error.statusCode === 403 && error.message.includes("Mock")
    );
});

test("createMockAcademicRecord inserts trusted mock data without Canvas import fields", async () => {
    let insertedValues;
    const serviceSupabase = {
        from(table) {
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

    const record = await createMockAcademicRecord({
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
    assert.equal(record.source, "mock");

    await assert.rejects(
        createMockAcademicRecord({ student_id: studentId, ...validPayload, source: "manual" }, serviceSupabase),
        (error) => error.statusCode === 400 && error.message.includes("source")
    );
    await assert.rejects(
        createMockAcademicRecord({ student_id: studentId, ...validPayload }, null),
        (error) => error.statusCode === 503 && error.message.includes("SERVICE_ROLE")
    );
});
