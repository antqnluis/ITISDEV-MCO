const assert = require("node:assert/strict");
const test = require("node:test");

const { buildDemoStudentScenario } = require("../src/seeds/demoStudentSeed");
const {
    mapCheckInToPersonalWellbeingInput,
    printPersonalWellbeingResult,
    runSeededPersonalWellbeing,
    validateTestEnvironment
} = require("../scripts/testSeededPersonalWellbeing");

const studentId = "11111111-1111-4111-8111-111111111111";
const studentNumber = "20260001";
const fixedNow = new Date("2026-07-14T08:00:00.000Z");

function createSupabaseMock({
    student = { id: studentId, student_number: studentNumber },
    checkIns = [],
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

                assert.equal(table, "weekly_check_ins");
                const query = {
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
                            error: errors.checkIns || null
                        };
                    }
                };

                return query;
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
    assert.throws(() => validateTestEnvironment({
        SUPABASE_URL: "invalid-url",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        SEED_STUDENT_NUMBER: studentNumber
    }), /valid HTTP or HTTPS URL/);
});

test("mapCheckInToPersonalWellbeingInput maps every database rating", () => {
    assert.deepEqual(mapCheckInToPersonalWellbeingInput({
        stress_level: 5,
        burnout_level: 4,
        sleep_quality: 2,
        motivation_level: 3,
        mood_level: 2,
        energy_level: 1
    }), {
        stressLevel: 5,
        burnoutLevel: 4,
        sleepQuality: 2,
        motivationLevel: 3,
        moodLevel: 2,
        energyLevel: 1
    });

    assert.throws(() => mapCheckInToPersonalWellbeingInput(null), TypeError);
});

test("runSeededPersonalWellbeing calculates the latest seeded check-in as 82.5", async () => {
    const scenario = buildDemoStudentScenario({ studentId, studentNumber, now: fixedNow });
    const latestCheckIn = scenario.tables.weekly_check_ins.at(-1);
    const { calls, supabase } = createSupabaseMock({ checkIns: [latestCheckIn] });

    const analysis = await runSeededPersonalWellbeing({ supabase, studentNumber });

    assert.equal(analysis.result.score, 82.5);
    assert.equal(analysis.checkIn.week_start, "2026-07-13");
    assert.deepEqual(analysis.ratings, {
        stressLevel: 5,
        burnoutLevel: 5,
        sleepQuality: 2,
        motivationLevel: 3,
        moodLevel: 2,
        energyLevel: 2
    });
    assert.deepEqual(analysis.result.components, {
        stressConcern: 100,
        burnoutConcern: 100,
        sleepConcern: 75,
        motivationConcern: 50,
        moodConcern: 75,
        energyConcern: 75
    });
    assert.deepEqual(
        calls.filter((call) => call[0] === "check-in-order"),
        [
            ["check-in-order", "week_start", { ascending: false }],
            ["check-in-order", "submitted_at", { ascending: false }]
        ]
    );
    assert.ok(calls.some((call) => call[0] === "check-in-limit" && call[1] === 1));
});

test("printPersonalWellbeingResult prints the final value before details", () => {
    const output = [];
    const logger = { log: (value) => output.push(value) };
    const analysis = {
        student: { student_number: studentNumber },
        checkIn: { week_start: "2026-07-13" },
        ratings: { stressLevel: 5 },
        result: {
            score: 82.5,
            components: { stressConcern: 100 }
        }
    };

    printPersonalWellbeingResult(analysis, logger);

    assert.equal(output[0], "Final personal wellbeing concern score: 82.5");
    assert.ok(output.includes("Ratings:"));
    assert.ok(output.includes("Components:"));
    assert.ok(output.join("\n").includes("stressConcern"));
});

test("runSeededPersonalWellbeing reports missing students and check-ins", async () => {
    const missingStudent = createSupabaseMock({ student: null });
    await assert.rejects(
        runSeededPersonalWellbeing({
            supabase: missingStudent.supabase,
            studentNumber
        }),
        /No seeded student was found/
    );

    const noCheckIns = createSupabaseMock({ checkIns: [] });
    await assert.rejects(
        runSeededPersonalWellbeing({
            supabase: noCheckIns.supabase,
            studentNumber
        }),
        /does not have a weekly check-in/
    );
});

test("runSeededPersonalWellbeing reports Supabase read failures", async () => {
    const studentFailure = createSupabaseMock({
        errors: { students: { message: "student query failed" } }
    });
    await assert.rejects(
        runSeededPersonalWellbeing({
            supabase: studentFailure.supabase,
            studentNumber
        }),
        /Unable to retrieve the seeded student: student query failed/
    );

    const checkInFailure = createSupabaseMock({
        errors: { checkIns: { message: "check-in query failed" } }
    });
    await assert.rejects(
        runSeededPersonalWellbeing({
            supabase: checkInFailure.supabase,
            studentNumber
        }),
        /Unable to retrieve the seeded weekly check-in: check-in query failed/
    );
});
