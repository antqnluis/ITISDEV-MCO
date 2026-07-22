const assert = require("node:assert/strict");
const test = require("node:test");

const { buildDemoStudentScenario } = require("../src/seeds/demoStudentSeed");
const {
    getManilaDate,
    printAcademicEngagementResult,
    runSeededAcademicEngagement,
    selectLatestAcademicWorkload,
    validateTestEnvironment
} = require("../scripts/testSeededAcademicEngagement");

const studentId = "11111111-1111-4111-8111-111111111111";
const studentNumber = "20260001";
const fixedNow = new Date("2026-07-14T08:00:00.000Z");

function withGeneratedGrades(records) {
    return records.map((record) => ({
        ...record,
        grade_percentage: record.score !== null && record.max_score !== null
            ? Math.round((record.score / record.max_score) * 10000) / 100
            : null
    }));
}

function createSupabaseMock({
    student = { id: studentId, student_number: studentNumber },
    academicRecords = [],
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

                if (table === "academic_records") {
                    return {
                        select(columns) {
                            calls.push(["academic-select", columns]);
                            return {
                                async eq(field, value) {
                                    calls.push(["academic-eq", field, value]);
                                    return {
                                        data: academicRecords,
                                        error: errors.academicRecords || null
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
                        return {
                            eq(field, value) {
                                calls.push(["course-log-eq", field, value]);
                                return {
                                    async order(column, options) {
                                        calls.push(["course-log-order", column, options]);
                                        return {
                                            data: courseLogs,
                                            error: errors.courseLogs || null
                                        };
                                    }
                                };
                            }
                        };
                    }
                };
            }
        }
    };
}

test("validateTestEnvironment requires service credentials without exposing them", () => {
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
    assert.throws(() => validateTestEnvironment({
        SUPABASE_URL: "https://example.supabase.co",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        SEED_STUDENT_NUMBER: "123"
    }), /between 4 and 30/);
});

test("Manila date and latest-week workload selection are deterministic", () => {
    assert.equal(getManilaDate(fixedNow), "2026-07-14");
    assert.deepEqual(selectLatestAcademicWorkload([
        { week_start: "2026-07-13", workload_difficulty: 3 },
        { week_start: "2026-07-13", workload_difficulty: 5 },
        { week_start: "2026-07-06", workload_difficulty: 4 }
    ]), {
        weekStart: "2026-07-13",
        academicWorkload: 5
    });
    assert.deepEqual(selectLatestAcademicWorkload([]), {
        weekStart: null,
        academicWorkload: null
    });
    assert.deepEqual(selectLatestAcademicWorkload([
        { week_start: "2026-07-13", workload_difficulty: null }
    ]), {
        weekStart: "2026-07-13",
        academicWorkload: null
    });
});

test("runSeededAcademicEngagement calculates the final value from seeded database rows", async () => {
    const scenario = buildDemoStudentScenario({ studentId, studentNumber, now: fixedNow });
    const coursesById = new Map(scenario.tables.courses.map((course) => [course.id, course]));
    const { calls, supabase } = createSupabaseMock({
        academicRecords: withGeneratedGrades(scenario.tables.academic_records).map((record) => ({
            ...record,
            course: coursesById.get(record.course_id)
        })),
        courseLogs: scenario.tables.course_environment_logs
            .slice()
            .sort((left, right) => right.week_start.localeCompare(left.week_start))
    });

    const analysis = await runSeededAcademicEngagement({
        supabase,
        studentNumber,
        now: fixedNow
    });

    assert.equal(analysis.result.score, 43);
    assert.equal(analysis.analysisDate, "2026-07-14");
    assert.equal(analysis.workloadWeekStart, "2026-07-13");
    assert.equal(analysis.academicWorkload, 5);
    assert.deepEqual(analysis.result.components, {
        academicWorkloadConcern: 100,
        missedRequirementConcern: 20,
        lateRequirementConcern: 20,
        deadlinePressureConcern: 40,
        gradeDeclineConcern: 20
    });
    assert.deepEqual(analysis.result.counts, {
        totalRequirements: 5,
        missedRequirements: 1,
        lateRequirements: 1,
        upcomingDeadlines: 2,
        coursesWithGradeComparison: 2
    });
    assert.ok(calls.some((call) => call[0] === "student-eq" && call[2] === studentNumber));
    assert.ok(calls.some((call) => call[0] === "academic-eq" && call[2] === studentId));
});

test("printAcademicEngagementResult prints the final value before its breakdown", () => {
    const output = [];
    const logger = { log: (value) => output.push(value) };
    const analysis = {
        student: { student_number: studentNumber },
        analysisDate: "2026-07-14",
        workloadWeekStart: "2026-07-13",
        academicWorkload: 5,
        result: {
            score: 43,
            components: { academicWorkloadConcern: 100 },
            counts: { totalRequirements: 5 }
        }
    };

    printAcademicEngagementResult(analysis, logger);

    assert.equal(output[0], "Final academic engagement score: 43");
    assert.ok(output.includes("Components:"));
    assert.ok(output.includes("Counts:"));
    assert.ok(output.join("\n").includes("academicWorkloadConcern"));
});

test("runSeededAcademicEngagement reports missing students and academic data", async () => {
    const missingStudent = createSupabaseMock({ student: null });
    await assert.rejects(
        runSeededAcademicEngagement({
            supabase: missingStudent.supabase,
            studentNumber,
            now: fixedNow
        }),
        /No seeded student was found/
    );

    const noRecords = createSupabaseMock({ academicRecords: [] });
    await assert.rejects(
        runSeededAcademicEngagement({
            supabase: noRecords.supabase,
            studentNumber,
            now: fixedNow
        }),
        /does not have any academic records/
    );
});
