const assert = require("node:assert/strict");
const test = require("node:test");

const {
    APPLICATION_TABLES,
    buildDemoStudentScenario,
    getManilaWeekAnchor,
    runDemoStudentSeed,
    validateSeedEnvironment
} = require("../src/seeds/demoStudentSeed");

const studentId = "11111111-1111-4111-8111-111111111111";
const fixedNow = new Date("2026-07-14T08:00:00.000Z");
const config = {
    email: "demo.student@example.com",
    password: "demo-password",
    studentNumber: "20260001",
    firstName: "Andrea",
    lastName: "Santos"
};

test("validateSeedEnvironment requires safe seed credentials and normalizes identifiers", () => {
    const validated = validateSeedEnvironment({
        SUPABASE_URL: " https://example.supabase.co ",
        SUPABASE_SERVICE_ROLE_KEY: " service-key ",
        SEED_USER_EMAIL: " Demo.Student@Example.com ",
        SEED_USER_PASSWORD: "demo-password",
        SEED_STUDENT_NUMBER: " 20260001 ",
        SEED_FIRST_NAME: " Andrea ",
        SEED_LAST_NAME: " Santos "
    });

    assert.deepEqual(validated, {
        supabaseUrl: "https://example.supabase.co",
        serviceRoleKey: "service-key",
        email: "demo.student@example.com",
        password: "demo-password",
        studentNumber: "20260001",
        firstName: "Andrea",
        lastName: "Santos"
    });

    assert.throws(
        () => validateSeedEnvironment({}),
        /SUPABASE_URL is required/
    );
    assert.throws(
        () => validateSeedEnvironment({
            SUPABASE_URL: "https://example.supabase.co",
            SUPABASE_SERVICE_ROLE_KEY: "service-key",
            SEED_USER_EMAIL: "not-an-email",
            SEED_USER_PASSWORD: "demo-password",
            SEED_STUDENT_NUMBER: "20260001",
            SEED_FIRST_NAME: "Andrea",
            SEED_LAST_NAME: "Santos"
        }),
        /valid email/
    );
    assert.throws(
        () => validateSeedEnvironment({
            SUPABASE_URL: "https://example.supabase.co",
            SUPABASE_SERVICE_ROLE_KEY: "service-key",
            SEED_USER_EMAIL: "demo.student@example.com",
            SEED_USER_PASSWORD: "demo-password",
            SEED_STUDENT_NUMBER: "20260001",
            SEED_FIRST_NAME: "A".repeat(101),
            SEED_LAST_NAME: "Santos"
        }),
        /SEED_FIRST_NAME must contain between 1 and 100 characters/
    );
});

test("getManilaWeekAnchor returns Monday for Manila-local dates", () => {
    assert.equal(getManilaWeekAnchor(fixedNow).toISOString(), "2026-07-13T00:00:00.000Z");
    assert.equal(
        getManilaWeekAnchor(new Date("2026-07-12T17:00:00.000Z")).toISOString(),
        "2026-07-13T00:00:00.000Z"
    );
});

test("buildDemoStudentScenario covers every table, data field, enum, and relationship", () => {
    const scenario = buildDemoStudentScenario({
        studentId,
        studentNumber: config.studentNumber,
        firstName: config.firstName,
        lastName: config.lastName,
        now: fixedNow
    });

    assert.equal(scenario.anchorDate, "2026-07-13");
    assert.deepEqual(Object.keys(scenario.tables), APPLICATION_TABLES);
    assert.deepEqual(
        Object.fromEntries(Object.entries(scenario.tables).map(([table, rows]) => [table, rows.length])),
        {
            students: 1,
            student_profiles: 1,
            weekly_check_ins: 3,
            courses: 4,
            academic_records: 8,
            calendar_events: 12,
            course_environment_logs: 3,
            wellness_dimension_scores: 3,
            ai_results: 3
        }
    );

    const student = scenario.tables.students[0];
    assert.equal(student.first_name, "Andrea");
    assert.equal(student.last_name, "Santos");

    const profile = scenario.tables.student_profiles[0];
    assert.equal(profile.has_caregiving_responsibility, true);
    assert.equal(profile.is_employed, true);
    assert.equal(profile.has_ojt, false);
    assert.equal(profile.is_athlete, false);
    assert.equal(profile.has_organization_responsibility, true);
    assert.equal(profile.organization_role, "Communications Committee Head");
    assert.equal(profile.current_academic_term, 1);
    assert.deepEqual(
        profile.wellness_goals,
        ["Managing Stress", "Managing Workload", "Time Management", "Better Sleep"]
    );
    assert.match(profile.additional_context, /midterm/i);

    const recordTypes = new Set(scenario.tables.academic_records.map((record) => record.record_type));
    assert.deepEqual(recordTypes, new Set([
        "assignment",
        "assessment",
        "grade_snapshot",
        "engagement_snapshot"
    ]));
    const submissionStatuses = new Set(
        scenario.tables.academic_records.map((record) => record.submission_status)
    );
    assert.deepEqual(submissionStatuses, new Set([
        "upcoming",
        "on_time",
        "late",
        "missed",
        "not_applicable"
    ]));
    assert.ok(scenario.tables.academic_records.every((record) => record.source === "mock"));

    const eventTypes = new Set(scenario.tables.calendar_events.map((event) => event.event_type));
    assert.deepEqual(eventTypes, new Set([
        "class",
        "assignment_deadline",
        "exam",
        "study_block",
        "rest_block",
        "organization",
        "caregiving",
        "work",
        "personal",
        "other"
    ]));
    assert.deepEqual(
        new Set(scenario.tables.calendar_events.map((event) => event.status)),
        new Set(["scheduled", "completed", "cancelled"])
    );
    assert.ok(scenario.tables.calendar_events.some((event) => event.all_day));

    const checkInIds = new Set(scenario.tables.weekly_check_ins.map((checkIn) => checkIn.id));
    const courseIds = new Set(scenario.tables.courses.map((course) => course.id));
    const academicRecordIds = new Set(
        scenario.tables.academic_records.map((record) => record.id)
    );
    assert.ok(scenario.tables.academic_records.every((record) => courseIds.has(record.course_id)));
    for (const log of scenario.tables.course_environment_logs) {
        assert.ok(checkInIds.has(log.check_in_id));
        assert.ok(courseIds.has(log.course_id));
        for (const rating of [
            "workload_difficulty",
            "unclear_instruction_level",
            "grading_concern_level",
            "professor_approachability_concern",
            "groupmate_issue_level"
        ]) {
            assert.ok(log[rating] >= 1 && log[rating] <= 5);
        }
        assert.ok(log.concern_notes.length > 0);
    }
    for (const event of scenario.tables.calendar_events) {
        assert.equal(event.student_id, studentId);
        assert.ok(event.description.length > 0);
        assert.ok(event.location.length > 0);
        if (event.academic_record_id) {
            assert.ok(academicRecordIds.has(event.academic_record_id));
        }
        assert.equal(event.status === "completed", event.completed_at !== null);
    }
    const dimensionScoresById = new Map();
    for (const scores of scenario.tables.wellness_dimension_scores) {
        assert.ok(checkInIds.has(scores.check_in_id));
        assert.equal(scores.calculation_method, "rule_based");
        for (const field of [
            "academic_engagement_score",
            "personal_wellbeing_score",
            "logistical_load_score",
            "role_load_score",
            "course_environment_score"
        ]) {
            assert.ok(scores[field] >= 0 && scores[field] <= 100);
        }
        dimensionScoresById.set(scores.id, scores);
    }
    for (const result of scenario.tables.ai_results) {
        assert.ok(checkInIds.has(result.check_in_id));
        assert.ok(result.reflection_keywords.length > 0);
        assert.ok(result.recommendations.length > 0);
        assert.equal(result.analysis_method, "rag_assisted");
        const scores = dimensionScoresById.get(result.dimension_scores_id);
        assert.ok(scores);
        assert.equal(scores.student_id, result.student_id);
        assert.equal(scores.check_in_id, result.check_in_id);
        const expectedRisk = result.swi_score < 40
            ? "low"
            : result.swi_score < 70 ? "moderate" : "high";
        assert.equal(result.risk_category, expectedRisk);
    }

    const latestScores = scenario.tables.wellness_dimension_scores.at(-1);
    const latestResult = scenario.tables.ai_results.at(-1);
    const latestScoreAverage = [
        latestScores.academic_engagement_score,
        latestScores.personal_wellbeing_score,
        latestScores.logistical_load_score,
        latestScores.role_load_score,
        latestScores.course_environment_score
    ].reduce((total, score) => total + score, 0) / 5;

    assert.equal(Math.round(latestScoreAverage * 100) / 100, 70.19);
    assert.equal(latestResult.swi_score, 70.19);
    assert.equal(latestResult.risk_category, "high");
    assert.equal(latestResult.stress_severity_level, "severe");
    assert.equal(latestResult.primary_stress_context, "personal_wellbeing");
    assert.ok(scenario.tables.ai_results.every(
        (result) => result.stress_severity_level !== "critical"
    ));
    assert.doesNotMatch(
        JSON.stringify({
            checkIn: scenario.tables.weekly_check_ins.at(-1),
            result: latestResult
        }),
        /\bcritical\b|immediate danger/i
    );
});

test("scenario IDs are stable per student and disjoint between students", () => {
    const build = (id) => buildDemoStudentScenario({
        studentId: id,
        studentNumber: config.studentNumber,
        firstName: config.firstName,
        lastName: config.lastName,
        now: fixedNow
    });
    const first = build(studentId);
    const repeated = build(studentId);
    const second = build("22222222-2222-4222-8222-222222222222");
    const collectIds = (scenario) => Object.values(scenario.tables)
        .flatMap((rows) => rows.map((row) => row.id));

    assert.deepEqual(collectIds(first), collectIds(repeated));
    const firstIds = new Set(collectIds(first));
    assert.ok(collectIds(second).every((id) => !firstIds.has(id)));
});

function createSuccessfulSupabaseMock(existingUser = {
    id: studentId,
    email: config.email,
    user_metadata: { demo_seed: true }
}) {
    const calls = {
        createUser: [],
        updateUser: [],
        deleteUser: [],
        deletes: [],
        inserts: [],
        verifies: []
    };
    const insertedCounts = new Map();
    const authUser = existingUser || { id: studentId, email: config.email };

    const supabase = {
        auth: {
            admin: {
                async listUsers() {
                    return { data: { users: existingUser ? [existingUser] : [] }, error: null };
                },
                async updateUserById(id, attributes) {
                    calls.updateUser.push([id, attributes]);
                    return { data: { user: { ...authUser, ...attributes, id } }, error: null };
                },
                async createUser(attributes) {
                    calls.createUser.push(attributes);
                    return { data: { user: { ...authUser, email: attributes.email } }, error: null };
                },
                async deleteUser(id) {
                    calls.deleteUser.push(id);
                    return { data: {}, error: null };
                }
            }
        },
        from(table) {
            return {
                delete() {
                    return {
                        async eq(field, value) {
                            calls.deletes.push([table, field, value]);
                            insertedCounts.clear();
                            return { error: null };
                        }
                    };
                },
                async insert(rows) {
                    calls.inserts.push([table, rows]);
                    insertedCounts.set(table, rows.length);
                    return { error: null };
                },
                select(columns, options) {
                    assert.equal(columns, "id");
                    assert.deepEqual(options, { count: "exact", head: true });
                    return {
                        async eq(field, value) {
                            calls.verifies.push([table, field, value]);
                            return { count: insertedCounts.get(table) || 0, error: null };
                        }
                    };
                }
            };
        }
    };

    return { calls, supabase };
}

test("runDemoStudentSeed updates an existing Auth user and replaces all public rows", async () => {
    const { calls, supabase } = createSuccessfulSupabaseMock();
    const result = await runDemoStudentSeed({ supabase, config, now: fixedNow });

    assert.equal(result.authUserCreated, false);
    assert.equal(result.studentId, studentId);
    assert.equal(result.firstName, config.firstName);
    assert.equal(result.lastName, config.lastName);
    assert.deepEqual(Object.keys(result.counts), APPLICATION_TABLES);
    assert.equal(calls.createUser.length, 0);
    assert.equal(calls.updateUser.length, 1);
    assert.equal(calls.updateUser[0][1].password, config.password);
    assert.equal(calls.updateUser[0][1].email_confirm, true);
    assert.deepEqual(calls.deletes, [["students", "id", studentId]]);
    assert.deepEqual(calls.inserts.map(([table]) => table), APPLICATION_TABLES);
    assert.equal(calls.verifies.length, APPLICATION_TABLES.length);
});

test("runDemoStudentSeed creates a missing Auth user", async () => {
    const { calls, supabase } = createSuccessfulSupabaseMock(null);
    const result = await runDemoStudentSeed({ supabase, config, now: fixedNow });

    assert.equal(result.authUserCreated, true);
    assert.equal(calls.createUser.length, 1);
    assert.equal(calls.updateUser.length, 0);
    assert.equal(calls.deleteUser.length, 0);
    assert.deepEqual(calls.createUser[0].user_metadata, {
        demo_seed: true,
        persona: "severe_working_student_commuter_org_caregiver"
    });
});

test("runDemoStudentSeed refuses to overwrite a non-demo Auth user", async () => {
    const { calls, supabase } = createSuccessfulSupabaseMock({
        id: studentId,
        email: config.email,
        user_metadata: { account_type: "student" }
    });

    await assert.rejects(
        runDemoStudentSeed({ supabase, config, now: fixedNow }),
        /Refusing to overwrite the non-demo Auth user/
    );
    assert.equal(calls.updateUser.length, 0);
    assert.equal(calls.deletes.length, 0);
});

test("runDemoStudentSeed removes a partial public dataset after an insert failure", async () => {
    const { calls, supabase } = createSuccessfulSupabaseMock();
    const originalFrom = supabase.from.bind(supabase);
    supabase.from = (table) => {
        const query = originalFrom(table);
        if (table === "academic_records") {
            query.insert = async () => ({ error: { message: "simulated failure" } });
        }
        return query;
    };

    await assert.rejects(
        runDemoStudentSeed({ supabase, config, now: fixedNow }),
        /Unable to seed academic_records: simulated failure/
    );
    assert.equal(calls.deletes.length, 2);
    assert.deepEqual(calls.inserts.map(([table]) => table), [
        "students",
        "student_profiles",
        "weekly_check_ins",
        "courses"
    ]);
    assert.equal(calls.deleteUser.length, 0);
});

test("runDemoStudentSeed removes a newly created Auth user after an insert failure", async () => {
    const { calls, supabase } = createSuccessfulSupabaseMock(null);
    const originalFrom = supabase.from.bind(supabase);
    supabase.from = (table) => {
        const query = originalFrom(table);
        if (table === "academic_records") {
            query.insert = async () => ({ error: { message: "simulated failure" } });
        }
        return query;
    };

    await assert.rejects(
        runDemoStudentSeed({ supabase, config, now: fixedNow }),
        /Unable to seed academic_records: simulated failure/
    );
    assert.deepEqual(calls.deleteUser, [studentId]);
});
