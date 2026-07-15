const assert = require("node:assert/strict");
const test = require("node:test");

const { buildDemoStudentScenario } = require("../src/seeds/demoStudentSeed");
const {
    mapProfileToRoleLoadInput,
    printRoleLoadResult,
    runSeededRoleLoad,
    validateTestEnvironment
} = require("../scripts/testSeededRoleLoad");

const studentId = "11111111-1111-4111-8111-111111111111";
const studentNumber = "20260001";
const fixedNow = new Date("2026-07-14T08:00:00.000Z");

function createSupabaseMock({
    student = { id: studentId, student_number: studentNumber },
    profile = null,
    errors = {}
} = {}) {
    const calls = [];

    return {
        calls,
        supabase: {
            from(table) {
                calls.push(["from", table]);
                const isStudent = table === "students";
                assert.ok(isStudent || table === "student_profiles");

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
        SUPABASE_URL: "not-a-url",
        SUPABASE_SERVICE_ROLE_KEY: "service-role-key",
        SEED_STUDENT_NUMBER: studentNumber
    }), /SUPABASE_URL must be a valid/);
});

test("profile role fields map to calculator input", () => {
    const profile = {
        has_caregiving_responsibility: true,
        caregiving_hours_per_week: 5,
        is_athlete: false,
        athlete_hours_per_week: 12,
        has_organization_responsibility: true,
        organization_hours_per_week: 8
    };

    assert.deepEqual(mapProfileToRoleLoadInput(profile), {
        hasCaregivingResponsibility: true,
        caregivingHoursPerWeek: 5,
        isAthlete: false,
        athleteHoursPerWeek: 12,
        hasOrganizationResponsibility: true,
        organizationHoursPerWeek: 8,
        roleWorkload: null,
        roleHoursCeiling: null
    });
    assert.throws(() => mapProfileToRoleLoadInput(null), TypeError);
    assert.throws(() => mapProfileToRoleLoadInput([]), TypeError);
});

test("runSeededRoleLoad calculates the seeded profile and queries only role data", async () => {
    const scenario = buildDemoStudentScenario({ studentId, studentNumber, now: fixedNow });
    const profile = scenario.tables.student_profiles[0];
    const { calls, supabase } = createSupabaseMock({ profile });

    const analysis = await runSeededRoleLoad({ supabase, studentNumber });

    assert.equal(analysis.result.score, 100);
    assert.deepEqual(analysis.calculationInput, {
        hasCaregivingResponsibility: true,
        caregivingHoursPerWeek: 5,
        isAthlete: true,
        athleteHoursPerWeek: 12,
        hasOrganizationResponsibility: true,
        organizationHoursPerWeek: 8,
        roleWorkload: null,
        roleHoursCeiling: null
    });
    assert.deepEqual(analysis.result.components, {
        roleHoursConcern: 100,
        roleWorkloadConcern: null,
        ceilingExceedanceConcern: null,
        activeRoleConcern: 100
    });
    assert.deepEqual(analysis.result.derivedValues, {
        totalRoleHours: 25,
        activeRoleCount: 3,
        excessHours: null,
        excessRatio: null
    });

    const profileSelect = calls.find((call) => call[0] === "student_profiles-select");
    assert.match(profileSelect[1], /has_caregiving_responsibility/);
    assert.match(profileSelect[1], /is_athlete/);
    assert.match(profileSelect[1], /has_organization_responsibility/);
});

test("printRoleLoadResult prints the final value before its breakdown", () => {
    const output = [];
    const analysis = {
        student: { student_number: studentNumber },
        calculationInput: { hasCaregivingResponsibility: true },
        result: {
            score: 100,
            components: { roleHoursConcern: 100 },
            derivedValues: { totalRoleHours: 25 }
        }
    };

    printRoleLoadResult(analysis, { log: (value) => output.push(value) });

    assert.equal(output[0], "Final role load concern score: 100");
    assert.ok(output.includes("Calculation input:"));
    assert.ok(output.includes("Components:"));
    assert.ok(output.includes("Derived values:"));
});

test("runSeededRoleLoad reports missing records and Supabase failures", async () => {
    await assert.rejects(
        runSeededRoleLoad({ supabase: null, studentNumber }),
        /service-role client is required/
    );

    const missingStudent = createSupabaseMock({ student: null });
    await assert.rejects(
        runSeededRoleLoad({ supabase: missingStudent.supabase, studentNumber }),
        /No seeded student was found/
    );

    const missingProfile = createSupabaseMock({ profile: null });
    await assert.rejects(
        runSeededRoleLoad({ supabase: missingProfile.supabase, studentNumber }),
        /does not have a profile/
    );

    const profileFailure = createSupabaseMock({
        errors: { student_profiles: { message: "profile query failed" } }
    });
    await assert.rejects(
        runSeededRoleLoad({ supabase: profileFailure.supabase, studentNumber }),
        /Unable to retrieve the seeded student profile: profile query failed/
    );
});
