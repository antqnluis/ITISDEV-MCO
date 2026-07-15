const assert = require("node:assert/strict");
const test = require("node:test");

const {
    calculateStudyTimeConcern,
    calculateCommuteConcern,
    calculateEmploymentConcern,
    calculateCaregivingConcern,
    calculateInternetConcern,
    calculateLogisticalLoadScore
} = require("../src/calculators/logisticalLoadCalculator");

function input(overrides = {}) {
    return {
        weeklyAvailableStudyHours: 15,
        profileAvailableStudyHours: 15,
        commuteMinutesPerDay: 0,
        workHoursPerWeek: 0,
        caregivingHoursPerWeek: 0,
        internetProblems: null,
        ...overrides
    };
}

test("study-time concern maps 0 through 15 available hours", () => {
    assert.deepEqual(
        [0, 3, 6, 9, 12, 15].map(calculateStudyTimeConcern),
        [100, 80, 60, 40, 20, 0]
    );
    assert.equal(calculateStudyTimeConcern(168), 0);
    assert.equal(calculateStudyTimeConcern(null), null);
});

test("commute concern derives five school days and caps at 100", () => {
    assert.equal(calculateCommuteConcern(0), 0);
    assert.equal(calculateCommuteConcern(180), 100);
    assert.equal(calculateCommuteConcern(1440), 100);

    const result = calculateLogisticalLoadScore(input({ commuteMinutesPerDay: 180 }));
    assert.equal(result.derivedValues.commuteHoursPerWeek, 15);
});

test("employment concern maps zero and 20 hours and caps large valid values", () => {
    assert.equal(calculateEmploymentConcern(0), 0);
    assert.equal(calculateEmploymentConcern(20), 100);
    assert.equal(calculateEmploymentConcern(168), 100);
    assert.equal(calculateEmploymentConcern(null), null);
});

test("caregiving concern maps zero and 15 hours and caps large valid values", () => {
    assert.equal(calculateCaregivingConcern(0), 0);
    assert.equal(calculateCaregivingConcern(15), 100);
    assert.equal(calculateCaregivingConcern(168), 100);
    assert.equal(calculateCaregivingConcern(undefined), null);
});

test("internet concern maps supported categories and preserves missing values", () => {
    assert.equal(calculateInternetConcern("none"), 0);
    assert.equal(calculateInternetConcern("occasional"), 50);
    assert.equal(calculateInternetConcern("frequent"), 100);
    assert.equal(calculateInternetConcern(null), null);
    assert.equal(calculateInternetConcern(undefined), null);
    assert.throws(() => calculateInternetConcern("constant"), RangeError);
});

test("weekly study hours override the profile while preserving zero", () => {
    const weeklyValue = calculateLogisticalLoadScore(input({
        weeklyAvailableStudyHours: 12,
        profileAvailableStudyHours: 0
    }));
    assert.equal(weeklyValue.derivedValues.availableStudyHoursUsed, 12);
    assert.equal(weeklyValue.components.studyTimeConcern, 20);

    const weeklyZero = calculateLogisticalLoadScore(input({
        weeklyAvailableStudyHours: 0,
        profileAvailableStudyHours: 15
    }));
    assert.equal(weeklyZero.derivedValues.availableStudyHoursUsed, 0);
    assert.equal(weeklyZero.components.studyTimeConcern, 100);
});

test("missing weekly study hours fall back to profile hours", () => {
    for (const missingWeeklyValue of [null, undefined]) {
        const result = calculateLogisticalLoadScore(input({
            weeklyAvailableStudyHours: missingWeeklyValue,
            profileAvailableStudyHours: 9
        }));
        assert.equal(result.derivedValues.availableStudyHoursUsed, 9);
        assert.equal(result.components.studyTimeConcern, 40);
    }
});

test("missing indicators are excluded and their weights are redistributed", () => {
    const result = calculateLogisticalLoadScore({
        weeklyAvailableStudyHours: null,
        profileAvailableStudyHours: null,
        commuteMinutesPerDay: 180,
        workHoursPerWeek: 0,
        caregivingHoursPerWeek: null,
        internetProblems: null
    });

    assert.equal(result.score, 50);
    assert.deepEqual(result.components, {
        studyTimeConcern: null,
        commuteConcern: 100,
        employmentConcern: 0,
        caregivingConcern: null,
        internetConcern: null
    });
    assert.deepEqual(result.derivedValues, {
        availableStudyHoursUsed: null,
        commuteHoursPerWeek: 15
    });
});

test("no usable indicators return only a null score", () => {
    assert.deepEqual(calculateLogisticalLoadScore({}), { score: null });
    assert.deepEqual(calculateLogisticalLoadScore({
        weeklyAvailableStudyHours: null,
        profileAvailableStudyHours: null,
        commuteMinutesPerDay: null,
        workHoursPerWeek: null,
        caregivingHoursPerWeek: null,
        internetProblems: null
    }), { score: null });
});

test("negative, malformed, and above-schema values are rejected", () => {
    for (const calculator of [
        calculateStudyTimeConcern,
        calculateEmploymentConcern,
        calculateCaregivingConcern
    ]) {
        assert.throws(() => calculator(-1), RangeError);
        assert.throws(() => calculator(169), RangeError);
        assert.throws(() => calculator("5"), RangeError);
        assert.throws(() => calculator(Number.POSITIVE_INFINITY), RangeError);
    }

    assert.throws(() => calculateCommuteConcern(-1), RangeError);
    assert.throws(() => calculateCommuteConcern(1441), RangeError);
    assert.throws(() => calculateCommuteConcern(30.5), RangeError);
    assert.throws(() => calculateLogisticalLoadScore(null), TypeError);
});

test("all-zero concern inputs produce zero and preserve derived zero values", () => {
    assert.deepEqual(calculateLogisticalLoadScore(input()), {
        score: 0,
        components: {
            studyTimeConcern: 0,
            commuteConcern: 0,
            employmentConcern: 0,
            caregivingConcern: 0,
            internetConcern: null
        },
        derivedValues: {
            availableStudyHoursUsed: 15,
            commuteHoursPerWeek: 0
        }
    });
});

test("final scores are capped and rounded to two decimal places", () => {
    const maximumConcern = calculateLogisticalLoadScore(input({
        weeklyAvailableStudyHours: 0,
        commuteMinutesPerDay: 180,
        workHoursPerWeek: 20,
        caregivingHoursPerWeek: 15,
        internetProblems: "frequent"
    }));
    assert.equal(maximumConcern.score, 100);

    const rounded = calculateLogisticalLoadScore(input({
        weeklyAvailableStudyHours: 12,
        commuteMinutesPerDay: 60,
        workHoursPerWeek: 7,
        caregivingHoursPerWeek: 4,
        internetProblems: null
    }));
    assert.equal(rounded.score, 27.78);
    assert.equal(rounded.score, Number(rounded.score.toFixed(2)));

    for (const result of [maximumConcern, rounded, calculateLogisticalLoadScore(input())]) {
        assert.ok(result.score >= 0 && result.score <= 100);
        for (const concern of Object.values(result.components)) {
            if (concern !== null) {
                assert.ok(concern >= 0 && concern <= 100);
            }
        }
    }
});
