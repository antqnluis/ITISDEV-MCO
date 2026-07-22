const assert = require("node:assert/strict");
const test = require("node:test");

const {
    createCourse,
    listCourses,
    getCourse,
    updateCourse,
    deleteCourse
} = require("../src/services/courseService");

const studentId = "11111111-1111-4111-8111-111111111111";
const courseId = "22222222-2222-4222-8222-222222222222";
const baseCourse = {
    id: courseId,
    student_id: studentId,
    code: "ITISDEV",
    name: "IT Systems Development",
    created_at: "2026-07-01T00:00:00.000Z",
    updated_at: "2026-07-01T00:00:00.000Z"
};

function lookup(data = baseCourse) {
    return {
        select: () => ({
            eq() { return this; },
            maybeSingle: async () => ({ data, error: null })
        })
    };
}

test("createCourse normalizes identity metadata and scopes ownership", async () => {
    let insertedValues;
    const supabase = {
        from(table) {
            assert.equal(table, "courses");
            return {
                insert(values) {
                    insertedValues = values;
                    return {
                        select: () => ({
                            single: async () => ({ data: { ...baseCourse, ...values }, error: null })
                        })
                    };
                }
            };
        }
    };

    await createCourse(supabase, studentId, {
        code: " itisdev ",
        name: " IT Systems Development "
    });
    assert.deepEqual(insertedValues, {
        student_id: studentId,
        code: "ITISDEV",
        name: "IT Systems Development"
    });

    await assert.rejects(
        createCourse({}, studentId, { code: "ITISDEV" }),
        (error) => error.statusCode === 400 && error.message.includes("name")
    );
    await assert.rejects(
        createCourse({}, studentId, { code: "X".repeat(31), name: "Long code" }),
        (error) => error.statusCode === 400 && error.message.includes("30")
    );
});

test("createCourse maps duplicate student course codes to 409", async () => {
    const supabase = {
        from: () => ({
            insert: () => ({
                select: () => ({ single: async () => ({ data: null, error: { code: "23505" } }) })
            })
        })
    };
    await assert.rejects(
        createCourse(supabase, studentId, { code: "ITISDEV", name: "IT Systems Development" }),
        (error) => error.statusCode === 409 && error.message.includes("already exists")
    );
});

test("listCourses scopes, orders, and paginates", async () => {
    const calls = { eq: [], order: [], range: null };
    const request = {
        eq(field, value) { calls.eq.push([field, value]); return this; },
        order(field, options) { calls.order.push([field, options]); return this; },
        range(from, to) {
            calls.range = [from, to];
            return Promise.resolve({ data: [baseCourse], count: 3, error: null });
        }
    };
    const supabase = {
        from: () => ({
            select(columns, options) {
                assert.match(columns, /updated_at/);
                assert.deepEqual(options, { count: "exact" });
                return request;
            }
        })
    };

    const result = await listCourses(supabase, studentId, { limit: "2", offset: "1" });
    assert.deepEqual(calls.eq, [["student_id", studentId]]);
    assert.deepEqual(calls.order, [
        ["code", { ascending: true }],
        ["id", { ascending: true }]
    ]);
    assert.deepEqual(calls.range, [1, 2]);
    assert.equal(result.pagination.has_more, true);

    await assert.rejects(
        listCourses({}, studentId, { search: "IT" }),
        (error) => error.statusCode === 400 && error.message.includes("search")
    );
});

test("getCourse validates IDs and scopes ownership", async () => {
    const filters = [];
    const supabase = {
        from: () => ({
            select: () => ({
                eq(field, value) { filters.push([field, value]); return this; },
                maybeSingle: async () => ({ data: baseCourse, error: null })
            })
        })
    };
    assert.equal((await getCourse(supabase, studentId, courseId)).id, courseId);
    assert.deepEqual(filters, [["id", courseId], ["student_id", studentId]]);
    await assert.rejects(
        getCourse({}, studentId, "invalid"),
        (error) => error.statusCode === 400 && error.message.includes("UUID")
    );
});

test("updateCourse normalizes changes and maps duplicate codes", async () => {
    let calls = 0;
    let changes;
    const supabase = {
        from() {
            calls += 1;
            if (calls === 1) return lookup();
            return {
                update(values) {
                    changes = values;
                    return {
                        eq() { return this; },
                        select: () => ({
                            maybeSingle: async () => ({ data: { ...baseCourse, ...values }, error: null })
                        })
                    };
                }
            };
        }
    };
    await updateCourse(supabase, studentId, courseId, { code: " newcode " });
    assert.deepEqual(changes, { code: "NEWCODE" });

    let duplicateCalls = 0;
    const duplicateSupabase = {
        from() {
            duplicateCalls += 1;
            if (duplicateCalls === 1) return lookup();
            return {
                update: () => ({
                    eq() { return this; },
                    select: () => ({ maybeSingle: async () => ({ data: null, error: { code: "23505" } }) })
                })
            };
        }
    };
    await assert.rejects(
        updateCourse(duplicateSupabase, studentId, courseId, { code: "DBADMN" }),
        (error) => error.statusCode === 409
    );
});

test("deleteCourse returns 409 when linked history restricts deletion", async () => {
    let calls = 0;
    const supabase = {
        from() {
            calls += 1;
            if (calls === 1) return lookup();
            return {
                delete: () => ({
                    eq() { return this; },
                    select: () => ({
                        maybeSingle: async () => ({ data: null, error: { code: "23503" } })
                    })
                })
            };
        }
    };
    await assert.rejects(
        deleteCourse(supabase, studentId, courseId),
        (error) => error.statusCode === 409 && error.message.includes("linked")
    );
});
