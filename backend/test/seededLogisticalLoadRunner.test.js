const assert = require("node:assert/strict");
const test = require("node:test");

const { buildDemoStudentScenario } = require("../src/seeds/demoStudentSeed");
const {
    mapDatabaseRowsToLogisticalInput,
    printLogisticalLoadResult,
    runSeededLogisticalLoad,
    validateTestEnvironment
} = require("../scripts/testSeededLogisticalLoad");

const studentId = "11111111-1111-4111-8111-111111111111";
const studentNumber = "20260001";
const fixedNow = new Date("2026-07-14T08:00:00.000Z");

function createSupabaseMock({
    student = { id: studentId, student_number: studentNumber },
    profile = null,
    checkIns = [],
    errors = {}
} = {}) {
    const calls = [];

    return {
        calls,
        supabase: {
            from(table) {
                calls.push(["from", table]);

                if (table === "students" || table === "student_profiles") {
                    const isStudent = table === "students";
                    return {
                        select(columns) {
                            calls.push([`${table}-select`, columns]);
                            return {
                                eq(field, value) {
                                    calls.push([`${table}-eq`, field, value]);
                                    return {
                                        async maybeSingle() {
                                            return {
                                                data: isStudent ? student : profile,
                                                error: errors[table] || null
                                            };
                                        }
                                    };
                                }
                            };
                        }
                    };
                }

                assert.equal(table, "weekly_check_ins");
                return {
                    select(columns) {
                        calls.push(["check-in-select", columns]);
                        return this;
                    },
                    eq(field, value) {
                        calls.push(["check-in-eq", field, value]);
                        return this;
                    },
                    order(column, options) {
                        calls.push(["check-in-order", column, options]);
                        return this;
                    },
                    async limit(value) {
                        calls.push(["check-in-limit", value]);
                        return {
                            data: checkIns,
                            error: errors.weekly_check_ins || null
                        };
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

test("database rows map to calculator input with weekly study-hour priority", () => {
    const profile = {
        available_study_hours_per_week: 8,
        commute_minutes_per_day: 90,
        work_hours_per_week: 20,
        caregiving_hours_per_week: 5
    };

    assert.deepEqual(mapDatabaseRowsToLogisticalInput(profile, {
        available_study_hours: 0
    }), {
        weeklyAvailableStudyHours: 0,
        profileAvailableStudyHours: 8,
        commuteMinutesPerDay: 90,
        workHoursPerWeek: 20,
        caregivingHoursPerWeek: 5,
        internetProblems: null
    });
    assert.equal(
        mapDatabaseRowsToLogisticalInput(profile, null).weeklyAvailableStudyHours,
        null
    );
    assert.throws(() => mapDatabaseRowsToLogisticalInput(null), TypeError);
});

test("runSeededLogisticalLoad calculates the seeded database scenario as 60.74", async () => {
    const scenario = buildDemoStudentScenario({ studentId, studentNumber, now: fixedNow });
    const profile = scenario.tables.student_profiles[0];
    const latestCheckIn = scenario.tables.weekly_check_ins.at(-1);
    const { calls, supabase } = createSupabaseMock({
        profile,
        checkIns: [latestCheckIn]
    });

    const analysis = await runSeededLogisticalLoad({ supabase, studentNumber });

    assert.equal(analysis.result.score, 60.74);
    assert.equal(analysis.checkIn.week_start, "2026-07-13");
    assert.deepEqual(analysis.calculationInput, {
        weeklyAvailableStudyHours: 6,
        profileAvailableStudyHours: 8,
        commuteMinutesPerDay: 90,
        workHoursPerWeek: 20,
        caregivingHoursPerWeek: 5,
        internetProblems: null
    });
    assert.deepEqual(analysis.result.components, {
        studyTimeConcern: 60,
        commuteConcern: 50,
        employmentConcern: 100,
        caregivingConcern: 33.33333333333333,
        internetConcern: null
    });
    assert.deepEqual(analysis.result.derivedValues, {
        availableStudyHoursUsed: 6,
        commuteHoursPerWeek: 7.5
    });
    assert.deepEqual(
        calls.filter((call) => call[0] === "check-in-order"),
        [
            ["check-in-order", "week_start", { ascending: false }],
            ["check-in-order", "submitted_at", { ascending: false }]
        ]
    );
});

test("missing weekly check-ins allow the calculator to fall back to profile study hours", async () => {
    const scenario = buildDemoStudentScenario({ studentId, studentNumber, now: fixedNow });
    const { supabase } = createSupabaseMock({
        profile: scenario.tables.student_profiles[0],
        checkIns: []
    });

    const analysis = await runSeededLogisticalLoad({ supabase, studentNumber });

    assert.equal(analysis.checkIn, null);
    assert.equal(analysis.calculationInput.weeklyAvailableStudyHours, null);
    assert.equal(analysis.result.derivedValues.availableStudyHoursUsed, 8);
});

test("printLogisticalLoadResult prints the final value before its breakdown", () => {
    const output = [];
    const analysis = {
        student: { student_number: studentNumber },
        checkIn: { week_start: "2026-07-13" },
        calculationInput: { weeklyAvailableStudyHours: 6 },
        result: {
            score: 60.74,
            components: { studyTimeConcern: 60 },
            derivedValues: { availableStudyHoursUsed: 6 }
        }
    };

    printLogisticalLoadResult(analysis, { log: (value) => output.push(value) });

    assert.equal(output[0], "Final logistical load concern score: 60.74");
    assert.ok(output.includes("Calculation input:"));
    assert.ok(output.includes("Components:"));
    assert.ok(output.includes("Derived values:"));
});

test("runSeededLogisticalLoad reports missing records and Supabase failures", async () => {
    const missingStudent = createSupabaseMock({ student: null });
    await assert.rejects(
        runSeededLogisticalLoad({ supabase: missingStudent.supabase, studentNumber }),
        /No seeded student was found/
    );

    const missingProfile = createSupabaseMock({ profile: null });
    await assert.rejects(
        runSeededLogisticalLoad({ supabase: missingProfile.supabase, studentNumber }),
        /does not have a profile/
    );

    const profileFailure = createSupabaseMock({
        errors: { student_profiles: { message: "profile query failed" } }
    });
    await assert.rejects(
        runSeededLogisticalLoad({ supabase: profileFailure.supabase, studentNumber }),
        /Unable to retrieve the seeded student profile: profile query failed/
    );
});
