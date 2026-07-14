const assert = require("node:assert/strict");
const test = require("node:test");

const {
    calculateTotalRoleHours,
    calculateRoleHoursConcern,
    calculateRoleWorkloadConcern,
    calculateCeilingExceedanceConcern,
    calculateActiveRoleConcern,
    calculateRoleLoadScore
} = require("../src/calculators/roleLoadCalculator");

function input(overrides = {}) {
    return {
        hasCaregivingResponsibility: false,
        caregivingHoursPerWeek: 0,
        isAthlete: false,
        athleteHoursPerWeek: 0,
        hasOrganizationResponsibility: false,
        organizationHoursPerWeek: 0,
        roleWorkload: null,
        roleHoursCeiling: null,
        ...overrides
    };
}

test("total role hours include only active caregiving, athletics, and organization roles", () => {
    assert.equal(calculateTotalRoleHours(input()), 0);
    assert.equal(calculateTotalRoleHours(input({
        isAthlete: true,
        athleteHoursPerWeek: 12
    })), 12);
    assert.equal(calculateTotalRoleHours(input({
        hasCaregivingResponsibility: true,
        caregivingHoursPerWeek: 5,
        isAthlete: true,
        athleteHoursPerWeek: 10,
        hasOrganizationResponsibility: true,
        organizationHoursPerWeek: 15
    })), 30);
});

test("inactive stored hours are validated but excluded from the total", () => {
    const roles = input({
        caregivingHoursPerWeek: 168,
        isAthlete: true,
        athleteHoursPerWeek: 7.5,
        organizationHoursPerWeek: 40
    });

    assert.equal(calculateTotalRoleHours(roles), 7.5);
    assert.equal(calculateRoleLoadScore(roles).derivedValues.totalRoleHours, 7.5);
});

test("active roles may have zero hours and still count as active", () => {
    const result = calculateRoleLoadScore(input({ isAthlete: true }));

    assert.equal(result.derivedValues.totalRoleHours, 0);
    assert.equal(result.derivedValues.activeRoleCount, 1);
    assert.equal(result.components.roleHoursConcern, 0);
    assert.ok(Math.abs(result.components.activeRoleConcern - (100 / 3)) < 1e-12);
});

test("role-hours concern maps zero through the 25-hour threshold and caps above it", () => {
    assert.deepEqual(
        [0, 5, 10, 15, 20, 25].map(calculateRoleHoursConcern),
        [0, 20, 40, 60, 80, 100]
    );
    assert.equal(calculateRoleHoursConcern(26), 100);
    assert.equal(calculateRoleHoursConcern(504), 100);
});

test("all active roles can contribute their schema maximum of 168 hours", () => {
    const maximumRoles = input({
        hasCaregivingResponsibility: true,
        caregivingHoursPerWeek: 168,
        isAthlete: true,
        athleteHoursPerWeek: 168,
        hasOrganizationResponsibility: true,
        organizationHoursPerWeek: 168
    });

    const result = calculateRoleLoadScore(maximumRoles);
    assert.equal(result.derivedValues.totalRoleHours, 504);
    assert.equal(result.components.roleHoursConcern, 100);
    assert.ok(result.score >= 0 && result.score <= 100);
});

test("role-workload ratings map from one through five and preserve missing values", () => {
    assert.deepEqual(
        [1, 2, 3, 4, 5].map(calculateRoleWorkloadConcern),
        [0, 25, 50, 75, 100]
    );
    assert.equal(calculateRoleWorkloadConcern(null), null);
    assert.equal(calculateRoleWorkloadConcern(undefined), null);
});

test("role-workload ratings reject non-integers and values outside one through five", () => {
    for (const invalidValue of [0, 6, 2.5, "3", Number.NaN, Number.POSITIVE_INFINITY]) {
        assert.throws(() => calculateRoleWorkloadConcern(invalidValue), RangeError);
    }

    assert.throws(
        () => calculateRoleLoadScore(input({ roleWorkload: 4.5 })),
        RangeError
    );
});

test("ceiling concern is zero below or at the ceiling and scales to the 50-percent cap", () => {
    assert.equal(calculateCeilingExceedanceConcern(90, 100), 0);
    assert.equal(calculateCeilingExceedanceConcern(100, 100), 0);
    assert.equal(calculateCeilingExceedanceConcern(110, 100), 20);
    assert.equal(calculateCeilingExceedanceConcern(120, 100), 40);
    assert.equal(calculateCeilingExceedanceConcern(150, 100), 100);
    assert.equal(calculateCeilingExceedanceConcern(200, 100), 100);
});

test("missing and invalid ceilings make the ceiling component unavailable", () => {
    const invalidCeilings = [
        null,
        undefined,
        0,
        -1,
        "25",
        Number.NaN,
        Number.POSITIVE_INFINITY,
        Number.NEGATIVE_INFINITY
    ];

    for (const ceiling of invalidCeilings) {
        assert.equal(calculateCeilingExceedanceConcern(20, ceiling), null);

        const result = calculateRoleLoadScore(input({ roleHoursCeiling: ceiling }));
        assert.equal(result.components.ceilingExceedanceConcern, null);
        assert.equal(result.derivedValues.excessHours, null);
        assert.equal(result.derivedValues.excessRatio, null);
    }
});

test("a valid ceiling preserves zero excess and zero ratio as available values", () => {
    const below = calculateRoleLoadScore(input({ roleHoursCeiling: 10 }));
    assert.equal(below.components.ceilingExceedanceConcern, 0);
    assert.equal(below.derivedValues.excessHours, 0);
    assert.equal(below.derivedValues.excessRatio, 0);

    const above = calculateRoleLoadScore(input({
        isAthlete: true,
        athleteHoursPerWeek: 12,
        roleHoursCeiling: 10
    }));
    assert.equal(above.derivedValues.excessHours, 2);
    assert.equal(above.derivedValues.excessRatio, 0.2);
    assert.equal(above.components.ceilingExceedanceConcern, 40);
});

test("active-role concern maps counts zero through three", () => {
    assert.equal(calculateActiveRoleConcern(0), 0);
    assert.ok(Math.abs(calculateActiveRoleConcern(1) - (100 / 3)) < 1e-12);
    assert.ok(Math.abs(calculateActiveRoleConcern(2) - (200 / 3)) < 1e-12);
    assert.equal(calculateActiveRoleConcern(3), 100);
});

test("active-role concern rejects malformed and out-of-range counts", () => {
    for (const invalidCount of [-1, 4, 1.5, "2", Number.NaN, Number.POSITIVE_INFINITY]) {
        assert.throws(() => calculateActiveRoleConcern(invalidCount), RangeError);
    }
});

test("available weights are redistributed when one optional component is missing", () => {
    const withoutWorkload = calculateRoleLoadScore(input({
        isAthlete: true,
        athleteHoursPerWeek: 10,
        roleHoursCeiling: 5
    }));
    assert.equal(withoutWorkload.score, 54.67);

    const withoutCeiling = calculateRoleLoadScore(input({
        isAthlete: true,
        athleteHoursPerWeek: 10,
        roleWorkload: 5
    }));
    assert.equal(withoutCeiling.score, 57.5);
});

test("available weights are redistributed when both optional components are missing", () => {
    const result = calculateRoleLoadScore(input({
        isAthlete: true,
        athleteHoursPerWeek: 10
    }));

    assert.equal(result.score, 38.18);
    assert.equal(result.components.roleWorkloadConcern, null);
    assert.equal(result.components.ceilingExceedanceConcern, null);
});

test("required role statuses must be strict booleans", () => {
    const statusFields = [
        "hasCaregivingResponsibility",
        "isAthlete",
        "hasOrganizationResponsibility"
    ];

    for (const field of statusFields) {
        for (const invalidValue of [undefined, null, 0, 1, "true"]) {
            assert.throws(
                () => calculateRoleLoadScore(input({ [field]: invalidValue })),
                (error) => error instanceof RangeError && error.message.includes(field)
            );
        }
    }
});

test("all required role hours are validated even when their roles are inactive", () => {
    const hourFields = [
        "caregivingHoursPerWeek",
        "athleteHoursPerWeek",
        "organizationHoursPerWeek"
    ];

    for (const field of hourFields) {
        for (const invalidValue of [undefined, null, -1, 169, "5", Number.NaN, Number.POSITIVE_INFINITY]) {
            assert.throws(
                () => calculateRoleLoadScore(input({ [field]: invalidValue })),
                (error) => error instanceof RangeError && error.message.includes(field)
            );
        }
    }
});

test("invalid top-level input uses TypeError and invalid helper totals use RangeError", () => {
    for (const invalidInput of [null, [], "roles", 3]) {
        assert.throws(() => calculateRoleLoadScore(invalidInput), TypeError);
        assert.throws(() => calculateTotalRoleHours(invalidInput), TypeError);
    }

    for (const invalidHours of [-1, 505, "20", Number.NaN, Number.POSITIVE_INFINITY]) {
        assert.throws(() => calculateRoleHoursConcern(invalidHours), RangeError);
        assert.throws(
            () => calculateCeilingExceedanceConcern(invalidHours, 20),
            RangeError
        );
    }
});

test("the main result returns all components and derived role values", () => {
    assert.deepEqual(calculateRoleLoadScore(input({
        hasCaregivingResponsibility: true,
        caregivingHoursPerWeek: 5,
        isAthlete: true,
        athleteHoursPerWeek: 10,
        hasOrganizationResponsibility: true,
        organizationHoursPerWeek: 15,
        roleWorkload: 3,
        roleHoursCeiling: 25
    })), {
        score: 75.5,
        components: {
            roleHoursConcern: 100,
            roleWorkloadConcern: 50,
            ceilingExceedanceConcern: 40,
            activeRoleConcern: 100
        },
        derivedValues: {
            totalRoleHours: 30,
            activeRoleCount: 3,
            excessHours: 5,
            excessRatio: 0.2
        }
    });
});

test("scores and components remain bounded and scores are rounded to two decimals", () => {
    const roleStates = [false, true];
    const workloadRatings = [null, 1, 3, 5];
    const ceilings = [null, 5, 25, 100];

    for (const caregiving of roleStates) {
        for (const athlete of roleStates) {
            for (const organization of roleStates) {
                for (const roleWorkload of workloadRatings) {
                    for (const roleHoursCeiling of ceilings) {
                        const result = calculateRoleLoadScore(input({
                            hasCaregivingResponsibility: caregiving,
                            caregivingHoursPerWeek: 11.25,
                            isAthlete: athlete,
                            athleteHoursPerWeek: 16.5,
                            hasOrganizationResponsibility: organization,
                            organizationHoursPerWeek: 7.75,
                            roleWorkload,
                            roleHoursCeiling
                        }));

                        assert.ok(result.score >= 0 && result.score <= 100);
                        assert.equal(result.score, Number(result.score.toFixed(2)));
                        for (const concern of Object.values(result.components)) {
                            if (concern !== null) {
                                assert.ok(concern >= 0 && concern <= 100);
                            }
                        }
                    }
                }
            }
        }
    }
});
