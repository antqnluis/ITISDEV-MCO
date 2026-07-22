const assert = require("node:assert/strict");
const test = require("node:test");

const { buildDemoStudentScenario } = require("../src/seeds/demoStudentSeed");
const {
    mapDatabaseRowToCourseEnvironmentInput,
    printCourseEnvironmentResult,
    runSeededCourseEnvironment,
    selectLatestCourseLogWeek,
    validateTestEnvironment
} = require("../scripts/testSeededCourseEnvironment");

const studentId = "11111111-1111-4111-8111-111111111111";
const studentNumber = "20260001";
const fixedNow = new Date("2026-07-14T08:00:00.000Z");

function createSupabaseMock({
    student = { id: studentId, student_number: studentNumber },
    courseLogs = [],
    errors = {}
} = {}) {
    const calls = [];

    return {
        calls,
        supabase: {
            from(table) {
                calls.push(["from", table]);

                if (table === "students") {
                    return {
                        select(columns) {
                            calls.push(["student-select", columns]);
                            return {
                                eq(field, value) {
                                    calls.push(["student-eq", field, value]);
                                    return {
                                        async maybeSingle() {
                                            return {
                                                data: student,
                                                error: errors.students || null
                                            };
                                        }
                                    };
                                }
                            };
                        }
                    };
                }

                assert.equal(table, "course_environment_logs");
                return {
                    select(columns) {
                        calls.push(["course-log-select", columns]);
                        return this;
                    },
                    eq(field, value) {
                        calls.push(["course-log-eq", field, value]);
                        return this;
                    },
                    order(column, options) {
                        calls.push(["course-log-order", column, options]);
                        if (column === "id") {
                            return Promise.resolve({
                                data: courseLogs,
                                error: errors.course_environment_logs || null
                            });
                        }
                        return this;
                    }
                };
            }
        }
    };
}

test("validateTestEnvironment requires server-only Supabase configuration", () => {
    assert.deepEqual(validateTestEnvironment({
        SUPABASE_URL: " https://example.supabase.co ",
        SUPABASE_SERVICE_ROLE_KEY: " service-role-key ",
        SEED_STUDENT_NUMBER: " 20260001 "
    }), {
        supabaseUrl: "https://example.supabase.co",
        serviceRoleKey: "service-role-key",
        studentNumber
    });

    assert.throws(() => validateTestEnvironment({}), /SUPABASE_URL is required/);
});

test("database course logs map every calculator input field", () => {
    assert.deepEqual(mapDatabaseRowToCourseEnvironmentInput({
        id: "log-id",
        week_start: "2026-07-13",
        course: {
            code: "ITISDEV",
            name: "IT Systems Development"
        },
        workload_difficulty: 5,
        unclear_instruction_level: 3,
        grading_concern_level: 4,
        professor_approachability_concern: 2,
        groupmate_issue_level: 4
    }), {
        id: "log-id",
        weekStart: "2026-07-13",
        courseCode: "ITISDEV",
        courseName: "IT Systems Development",
        workloadDifficulty: 5,
        unclearInstructionLevel: 3,
        gradingConcernLevel: 4,
        professorApproachabilityConcern: 2,
        groupmateIssueLevel: 4
    });

    assert.throws(() => mapDatabaseRowToCourseEnvironmentInput(null), TypeError);
});

test("latest-week selection excludes older logs and preserves record order", () => {
    const older = { id: "older", week_start: "2026-07-06" };
    const latestFirst = { id: "latest-first", week_start: "2026-07-13" };
    const latestSecond = { id: "latest-second", week_start: "2026-07-13" };

    assert.deepEqual(selectLatestCourseLogWeek([
        older,
        latestFirst,
        latestSecond
    ]), {
        weekStart: "2026-07-13",
        courseLogs: [latestFirst, latestSecond]
    });
    assert.deepEqual(selectLatestCourseLogWeek([]), {
        weekStart: null,
        courseLogs: []
    });
    assert.throws(() => selectLatestCourseLogWeek(null), TypeError);
});

test("runSeededCourseEnvironment calculates the latest active-database week", async () => {
    const scenario = buildDemoStudentScenario({ studentId, studentNumber, now: fixedNow });
    const coursesById = new Map(scenario.tables.courses.map((course) => [course.id, course]));
    const { calls, supabase } = createSupabaseMock({
        courseLogs: scenario.tables.course_environment_logs.map((log) => ({
            ...log,
            course: coursesById.get(log.course_id)
        }))
    });

    const analysis = await runSeededCourseEnvironment({ supabase, studentNumber });

    assert.equal(analysis.analysisWeekStart, "2026-07-13");
    assert.equal(analysis.calculationInput.length, 2);
    assert.deepEqual(
        analysis.calculationInput.map((courseLog) => courseLog.courseCode),
        ["ITISDEV", "WEBAPDE"]
    );
    assert.equal(analysis.result.score, 61.88);
    assert.deepEqual(analysis.result.courseScores.map(({ courseCode, score }) => ({
        courseCode,
        score
    })), [
        { courseCode: "ITISDEV", score: 68.75 },
        { courseCode: "WEBAPDE", score: 55 }
    ]);
    assert.deepEqual(analysis.result.highestConcernCourse, {
        courseCode: "ITISDEV",
        courseName: "IT Systems Development",
        score: 68.75
    });
    assert.equal(analysis.result.hasSeriousPeerConcern, false);
    assert.deepEqual(
        calls.filter((call) => call[0] === "course-log-order"),
        [
            ["course-log-order", "week_start", { ascending: false }],
            ["course-log-order", "created_at", { ascending: true }],
            ["course-log-order", "id", { ascending: true }]
        ]
    );
});

test("printCourseEnvironmentResult prints the score before its breakdown", () => {
    const output = [];
    const analysis = {
        student: { student_number: studentNumber },
        analysisWeekStart: "2026-07-13",
        calculationInput: [{ courseCode: "ITISDEV" }],
        result: {
            score: 61.88,
            courseScores: [{ courseCode: "ITISDEV", score: 68.75 }],
            highestConcernCourse: { courseCode: "ITISDEV", score: 68.75 },
            hasSeriousPeerConcern: false
        }
    };

    printCourseEnvironmentResult(analysis, { log: (value) => output.push(value) });

    assert.equal(output[0], "Final course environment concern score: 61.88");
    assert.ok(output.includes("Calculation input:"));
    assert.ok(output.includes("Course scores:"));
    assert.ok(output.includes("Highest-concern course:"));
    assert.ok(output.includes("Has serious peer concern: false"));
});

test("runSeededCourseEnvironment reports missing data and Supabase failures", async () => {
    await assert.rejects(
        runSeededCourseEnvironment({ supabase: null, studentNumber }),
        /service-role client is required/
    );

    const missingStudent = createSupabaseMock({ student: null });
    await assert.rejects(
        runSeededCourseEnvironment({ supabase: missingStudent.supabase, studentNumber }),
        /No seeded student was found/
    );

    const missingLogs = createSupabaseMock({ courseLogs: [] });
    await assert.rejects(
        runSeededCourseEnvironment({ supabase: missingLogs.supabase, studentNumber }),
        /does not have course-environment logs/
    );

    const queryFailure = createSupabaseMock({
        errors: { course_environment_logs: { message: "course log query failed" } }
    });
    await assert.rejects(
        runSeededCourseEnvironment({ supabase: queryFailure.supabase, studentNumber }),
        /Unable to retrieve seeded course-environment logs: course log query failed/
    );
});
