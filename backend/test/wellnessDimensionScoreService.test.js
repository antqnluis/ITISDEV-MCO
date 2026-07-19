const assert = require("node:assert/strict");
const test = require("node:test");

const {
    calculateWellnessDimensionScores,
    listWellnessDimensionScores,
    getWellnessDimensionScore
} = require("../src/services/wellnessDimensionScoreService");

const studentId = "11111111-1111-4111-8111-111111111111";
const scoreId = "22222222-2222-4222-8222-222222222222";
const checkInId = "33333333-3333-4333-8333-333333333333";
const baseScore = {
    id: scoreId,
    student_id: studentId,
    check_in_id: checkInId,
    academic_engagement_score: 82,
    personal_wellbeing_score: 70,
    logistical_load_score: 68,
    role_load_score: 76,
    course_environment_score: 72,
    calculation_method: "rule_based",
    calculation_version: "1.0",
    calculated_at: "2026-07-13T13:15:00.000Z",
    created_at: "2026-07-13T13:15:00.000Z",
    updated_at: "2026-07-13T13:15:00.000Z"
};

const calculationCheckIn = {
    id: checkInId,
    student_id: studentId,
    week_start: "2026-07-13",
    stress_level: 3,
    mood_level: 3,
    sleep_quality: 3,
    motivation_level: 3,
    burnout_level: 3,
    energy_level: 3,
    available_study_hours: 15
};

const calculationProfile = {
    student_id: studentId,
    commute_minutes_per_day: 0,
    available_study_hours_per_week: 10,
    has_caregiving_responsibility: false,
    caregiving_hours_per_week: 0,
    is_employed: false,
    work_hours_per_week: 0,
    has_ojt: false,
    ojt_hours_per_week: 0,
    is_athlete: false,
    athlete_hours_per_week: 0,
    has_organization_responsibility: false,
    organization_hours_per_week: 0
};

const calculationCourseLog = {
    id: "44444444-4444-4444-8444-444444444444",
    week_start: calculationCheckIn.week_start,
    course_code: "ITISDEV",
    course_name: "IT Systems Development",
    workload_difficulty: 3,
    unclear_instruction_level: 3,
    grading_concern_level: 3,
    professor_approachability_concern: 3,
    groupmate_issue_level: 3,
    created_at: "2026-07-13T10:00:00.000Z"
};

function createCalculationStudentSupabase({
    checkIn = calculationCheckIn,
    profile = calculationProfile,
    academicRecords = [],
    courseLogs = [calculationCourseLog],
    errors = {}
} = {}) {
    const calls = { tables: [], filters: [], orders: [] };
    const responses = {
        weekly_check_ins: { data: checkIn, error: errors.weekly_check_ins || null },
        student_profiles: { data: profile, error: errors.student_profiles || null },
        academic_records: { data: academicRecords, error: errors.academic_records || null },
        course_environment_logs: {
            data: courseLogs,
            error: errors.course_environment_logs || null
        }
    };

    return {
        calls,
        supabase: {
            from(table) {
                assert.ok(Object.hasOwn(responses, table), `Unexpected calculation table: ${table}`);
                calls.tables.push(table);
                return {
                    select() {
                        const response = responses[table];
                        return {
                            eq(field, value) {
                                calls.filters.push([table, field, value]);
                                return this;
                            },
                            order(field, options) {
                                calls.orders.push([table, field, options]);
                                return this;
                            },
                            maybeSingle: async () => response,
                            then(resolve, reject) {
                                return Promise.resolve(response).then(resolve, reject);
                            }
                        };
                    }
                };
            }
        }
    };
}

function createCalculationServiceSupabase({ error = null } = {}) {
    const calls = { upserts: [] };
    return {
        calls,
        supabase: {
            from(table) {
                assert.equal(table, "wellness_dimension_scores");
                return {
                    upsert(values, options) {
                        calls.upserts.push([values, options]);
                        return {
                            select: () => ({
                                single: async () => ({
                                    data: error ? null : { ...baseScore, ...values },
                                    error
                                })
                            })
                        };
                    }
                };
            }
        }
    };
}

function createListSupabase(response, calls = { eq: [], order: [], range: null }) {
    const request = {
        eq(field, value) {
            calls.eq.push([field, value]);
            return this;
        },
        order(field, options) {
            calls.order.push([field, options]);
            return this;
        },
        range(from, to) {
            calls.range = [from, to];
            return Promise.resolve(response);
        }
    };

    return {
        from(table) {
            assert.equal(table, "wellness_dimension_scores");
            return {
                select(columns, options) {
                    assert.match(columns, /academic_engagement_score/);
                    assert.match(columns, /calculation_version/);
                    assert.deepEqual(options, { count: "exact" });
                    return request;
                }
            };
        }
    };
}

test("calculateWellnessDimensionScores loads owned inputs and upserts all five scores", async () => {
    const studentDatabase = createCalculationStudentSupabase();
    const serviceDatabase = createCalculationServiceSupabase();
    const now = new Date("2026-07-13T13:30:00.000Z");

    const result = await calculateWellnessDimensionScores({
        studentSupabase: studentDatabase.supabase,
        serviceSupabase: serviceDatabase.supabase,
        studentId,
        checkInId,
        now
    });

    assert.deepEqual(studentDatabase.calls.tables, [
        "weekly_check_ins",
        "student_profiles",
        "academic_records",
        "course_environment_logs"
    ]);
    assert.deepEqual(studentDatabase.calls.filters, [
        ["weekly_check_ins", "id", checkInId],
        ["weekly_check_ins", "student_id", studentId],
        ["student_profiles", "student_id", studentId],
        ["academic_records", "student_id", studentId],
        ["course_environment_logs", "student_id", studentId],
        ["course_environment_logs", "week_start", calculationCheckIn.week_start]
    ]);
    assert.deepEqual(studentDatabase.calls.orders, [
        ["course_environment_logs", "created_at", { ascending: true }],
        ["course_environment_logs", "id", { ascending: true }]
    ]);

    assert.equal(serviceDatabase.calls.upserts.length, 1);
    const [values, options] = serviceDatabase.calls.upserts[0];
    assert.deepEqual(options, { onConflict: "check_in_id" });
    assert.deepEqual(values, {
        student_id: studentId,
        check_in_id: checkInId,
        academic_engagement_score: 13.89,
        personal_wellbeing_score: 50,
        logistical_load_score: 0,
        role_load_score: 0,
        course_environment_score: 50,
        calculation_method: "rule_based",
        calculation_version: "1.0",
        calculated_at: now.toISOString()
    });
    assert.equal(result.check_in_id, checkInId);
    assert.equal(result.calculated_at, now.toISOString());
});

test("calculateWellnessDimensionScores stores nothing when a dimension is unavailable", async () => {
    const studentDatabase = createCalculationStudentSupabase({ courseLogs: [] });
    const serviceDatabase = createCalculationServiceSupabase();

    await assert.rejects(
        calculateWellnessDimensionScores({
            studentSupabase: studentDatabase.supabase,
            serviceSupabase: serviceDatabase.supabase,
            studentId,
            checkInId
        }),
        (error) => error.statusCode === 409
            && error.message.includes("course_environment_score")
    );
    assert.equal(serviceDatabase.calls.upserts.length, 0);
});

test("calculateWellnessDimensionScores requires a profile and service-role configuration", async () => {
    const missingProfileDatabase = createCalculationStudentSupabase({ profile: null });
    const serviceDatabase = createCalculationServiceSupabase();

    await assert.rejects(
        calculateWellnessDimensionScores({
            studentSupabase: missingProfileDatabase.supabase,
            serviceSupabase: serviceDatabase.supabase,
            studentId,
            checkInId
        }),
        (error) => error.statusCode === 409 && error.message.includes("profile")
    );
    await assert.rejects(
        calculateWellnessDimensionScores({
            studentSupabase: createCalculationStudentSupabase().supabase,
            serviceSupabase: null,
            studentId,
            checkInId
        }),
        (error) => error.statusCode === 503 && error.message.includes("not configured")
    );
    assert.equal(serviceDatabase.calls.upserts.length, 0);
});

test("calculateWellnessDimensionScores validates and ownership-scopes the target check-in", async () => {
    const serviceDatabase = createCalculationServiceSupabase();

    await assert.rejects(
        calculateWellnessDimensionScores({
            studentSupabase: {},
            serviceSupabase: serviceDatabase.supabase,
            studentId,
            checkInId: "not-a-uuid"
        }),
        (error) => error.statusCode === 400 && error.message.includes("UUID")
    );
    await assert.rejects(
        calculateWellnessDimensionScores({
            studentSupabase: createCalculationStudentSupabase({ checkIn: null }).supabase,
            serviceSupabase: serviceDatabase.supabase,
            studentId,
            checkInId
        }),
        (error) => error.statusCode === 404 && error.message === "Weekly check-in not found"
    );
    assert.equal(serviceDatabase.calls.upserts.length, 0);
});

test("calculateWellnessDimensionScores reports source and persistence failures", async () => {
    const serviceDatabase = createCalculationServiceSupabase();
    const failedReadDatabase = createCalculationStudentSupabase({
        errors: { weekly_check_ins: { message: "unavailable" } }
    });

    await assert.rejects(
        calculateWellnessDimensionScores({
            studentSupabase: failedReadDatabase.supabase,
            serviceSupabase: serviceDatabase.supabase,
            studentId,
            checkInId
        }),
        (error) => error.statusCode === 500
            && error.message === "Unable to retrieve the weekly check-in"
    );

    const failedServiceDatabase = createCalculationServiceSupabase({
        error: { message: "write unavailable" }
    });
    await assert.rejects(
        calculateWellnessDimensionScores({
            studentSupabase: createCalculationStudentSupabase().supabase,
            serviceSupabase: failedServiceDatabase.supabase,
            studentId,
            checkInId
        }),
        (error) => error.statusCode === 500
            && error.message === "Unable to store wellness dimension scores"
    );
});

test("listWellnessDimensionScores scopes, filters, orders, and paginates scores", async () => {
    const calls = { eq: [], order: [], range: null };
    const supabase = createListSupabase(
        { data: [baseScore], count: 3, error: null },
        calls
    );

    const result = await listWellnessDimensionScores(supabase, studentId, {
        limit: "2",
        offset: "1",
        check_in_id: checkInId,
        calculation_method: "rule_based"
    });

    assert.deepEqual(calls.eq, [
        ["student_id", studentId],
        ["check_in_id", checkInId],
        ["calculation_method", "rule_based"]
    ]);
    assert.deepEqual(calls.order, [
        ["calculated_at", { ascending: false }],
        ["id", { ascending: false }]
    ]);
    assert.deepEqual(calls.range, [1, 2]);
    assert.deepEqual(result, {
        wellnessDimensionScores: [baseScore],
        pagination: { limit: 2, offset: 1, total: 3, has_more: true }
    });
});

test("listWellnessDimensionScores returns an empty first page with default pagination", async () => {
    const calls = { eq: [], order: [], range: null };
    const supabase = createListSupabase({ data: null, count: null, error: null }, calls);

    const result = await listWellnessDimensionScores(supabase, studentId, {});

    assert.deepEqual(calls.eq, [["student_id", studentId]]);
    assert.deepEqual(calls.range, [0, 24]);
    assert.deepEqual(result, {
        wellnessDimensionScores: [],
        pagination: { limit: 25, offset: 0, total: 0, has_more: false }
    });
});

test("listWellnessDimensionScores rejects unsupported and malformed query parameters", async () => {
    await assert.rejects(
        listWellnessDimensionScores({}, studentId, { sort: "newest" }),
        (error) => error.statusCode === 400 && error.message.includes("sort")
    );
    await assert.rejects(
        listWellnessDimensionScores({}, studentId, { calculation_method: "manual" }),
        (error) => error.statusCode === 400 && error.message.includes("calculation_method")
    );
    await assert.rejects(
        listWellnessDimensionScores({}, studentId, { check_in_id: "not-a-uuid" }),
        (error) => error.statusCode === 400 && error.message.includes("UUID")
    );
    await assert.rejects(
        listWellnessDimensionScores({}, studentId, { limit: "101" }),
        (error) => error.statusCode === 400 && error.message.includes("limit")
    );
});

test("listWellnessDimensionScores reports database failures", async () => {
    const supabase = createListSupabase({ data: null, count: null, error: { message: "unavailable" } });

    await assert.rejects(
        listWellnessDimensionScores(supabase, studentId, {}),
        (error) => error.statusCode === 500
            && error.message === "Unable to retrieve wellness dimension scores"
    );
});

test("getWellnessDimensionScore validates and ownership-scopes the score lookup", async () => {
    const filters = [];
    const supabase = {
        from(table) {
            assert.equal(table, "wellness_dimension_scores");
            return {
                select(columns) {
                    assert.match(columns, /course_environment_score/);
                    return {
                        eq(field, value) {
                            filters.push([field, value]);
                            return this;
                        },
                        maybeSingle: async () => ({ data: baseScore, error: null })
                    };
                }
            };
        }
    };

    const result = await getWellnessDimensionScore(supabase, studentId, scoreId);

    assert.deepEqual(result, baseScore);
    assert.deepEqual(filters, [["id", scoreId], ["student_id", studentId]]);
    await assert.rejects(
        getWellnessDimensionScore({}, studentId, "not-a-uuid"),
        (error) => error.statusCode === 400 && error.message.includes("UUID")
    );
});

test("getWellnessDimensionScore reports missing records and database failures", async () => {
    function createLookupSupabase(response) {
        return {
            from: () => ({
                select: () => ({
                    eq() {
                        return this;
                    },
                    maybeSingle: async () => response
                })
            })
        };
    }

    await assert.rejects(
        getWellnessDimensionScore(
            createLookupSupabase({ data: null, error: null }),
            studentId,
            scoreId
        ),
        (error) => error.statusCode === 404
            && error.message === "Wellness dimension score not found"
    );
    await assert.rejects(
        getWellnessDimensionScore(
            createLookupSupabase({ data: null, error: { message: "unavailable" } }),
            studentId,
            scoreId
        ),
        (error) => error.statusCode === 500
            && error.message === "Unable to retrieve the wellness dimension score"
    );
});
