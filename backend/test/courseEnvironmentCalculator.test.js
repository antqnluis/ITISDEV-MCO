const assert = require("node:assert/strict");
const test = require("node:test");

const {
    normalizeConcernScale,
    calculateSingleCourseEnvironmentScore,
    calculateCourseEnvironmentScore
} = require("../src/calculators/courseEnvironmentCalculator");

function course(overrides = {}) {
    return {
        courseCode: "ITISDEV",
        courseName: "Business Applications Development",
        workloadDifficulty: 1,
        unclearInstructionLevel: 1,
        gradingConcernLevel: 1,
        professorApproachabilityConcern: 1,
        groupmateIssueLevel: 1,
        ...overrides
    };
}

test("concern normalization maps the 1-5 scale and preserves missing values", () => {
    assert.equal(normalizeConcernScale(1), 0);
    assert.equal(normalizeConcernScale(3), 50);
    assert.equal(normalizeConcernScale(5), 100);
    assert.equal(normalizeConcernScale(null), null);
    assert.equal(normalizeConcernScale(undefined), null);
});

test("all minimum-concern responses produce zero", () => {
    assert.deepEqual(calculateSingleCourseEnvironmentScore(course()), {
        score: 0,
        seriousPeerConcern: false,
        components: {
            workloadDifficultyConcern: 0,
            unclearInstructionConcern: 0,
            gradingConcern: 0,
            approachabilityConcern: 0,
            groupmateIssueConcern: 0
        }
    });
});

test("all midpoint responses produce 50", () => {
    assert.deepEqual(calculateSingleCourseEnvironmentScore(course({
        workloadDifficulty: 3,
        unclearInstructionLevel: 3,
        gradingConcernLevel: 3,
        professorApproachabilityConcern: 3,
        groupmateIssueLevel: 3
    })), {
        score: 50,
        seriousPeerConcern: false,
        components: {
            workloadDifficultyConcern: 50,
            unclearInstructionConcern: 50,
            gradingConcern: 50,
            approachabilityConcern: 50,
            groupmateIssueConcern: 50
        }
    });
});

test("all maximum-concern responses produce 100 and set the peer flag", () => {
    assert.deepEqual(calculateSingleCourseEnvironmentScore(course({
        workloadDifficulty: 5,
        unclearInstructionLevel: 5,
        gradingConcernLevel: 5,
        professorApproachabilityConcern: 5,
        groupmateIssueLevel: 5
    })), {
        score: 100,
        seriousPeerConcern: true,
        components: {
            workloadDifficultyConcern: 100,
            unclearInstructionConcern: 100,
            gradingConcern: 100,
            approachabilityConcern: 100,
            groupmateIssueConcern: 100
        }
    });
});

test("mixed responses use the configured original weights", () => {
    const result = calculateSingleCourseEnvironmentScore(course({
        workloadDifficulty: 5,
        unclearInstructionLevel: 4,
        gradingConcernLevel: 3,
        professorApproachabilityConcern: 2,
        groupmateIssueLevel: 1
    }));

    assert.equal(result.score, 51.25);
    assert.deepEqual(result.components, {
        workloadDifficultyConcern: 100,
        unclearInstructionConcern: 75,
        gradingConcern: 50,
        approachabilityConcern: 25,
        groupmateIssueConcern: 0
    });
});

test("a missing component is excluded and its weight is redistributed", () => {
    const result = calculateSingleCourseEnvironmentScore(course({
        workloadDifficulty: 5,
        unclearInstructionLevel: 3,
        gradingConcernLevel: null,
        professorApproachabilityConcern: 1,
        groupmateIssueLevel: 3
    }));

    assert.equal(result.score, 55.88);
    assert.deepEqual(result.components, {
        workloadDifficultyConcern: 100,
        unclearInstructionConcern: 50,
        gradingConcern: null,
        approachabilityConcern: 0,
        groupmateIssueConcern: 50
    });
});

test("genuine zero concern remains available during weight redistribution", () => {
    assert.deepEqual(calculateSingleCourseEnvironmentScore(course({
        unclearInstructionLevel: null,
        gradingConcernLevel: null,
        professorApproachabilityConcern: null,
        groupmateIssueLevel: null
    })), {
        score: 0,
        seriousPeerConcern: false,
        components: {
            workloadDifficultyConcern: 0,
            unclearInstructionConcern: null,
            gradingConcern: null,
            approachabilityConcern: null,
            groupmateIssueConcern: null
        }
    });
});

test("all missing components return only a null score", () => {
    assert.deepEqual(calculateSingleCourseEnvironmentScore(course({
        workloadDifficulty: null,
        unclearInstructionLevel: null,
        gradingConcernLevel: null,
        professorApproachabilityConcern: null,
        groupmateIssueLevel: null
    })), { score: null });
});

test("one course produces a weekly result and highest-concern course", () => {
    assert.deepEqual(calculateCourseEnvironmentScore([course({
        id: "log-1",
        weekStart: "2026-07-13",
        workloadDifficulty: 3,
        unclearInstructionLevel: 3,
        gradingConcernLevel: 3,
        professorApproachabilityConcern: 3,
        groupmateIssueLevel: 3
    })]), {
        score: 50,
        courseScores: [{
            courseCode: "ITISDEV",
            courseName: "Business Applications Development",
            score: 50,
            seriousPeerConcern: false
        }],
        highestConcernCourse: {
            courseCode: "ITISDEV",
            courseName: "Business Applications Development",
            score: 50
        },
        hasSeriousPeerConcern: false
    });
});

test("multiple courses average individual scores and select the highest concern", () => {
    const result = calculateCourseEnvironmentScore([
        course({
            id: "low",
            weekStart: "2026-07-13",
            courseCode: "LOW",
            courseName: "Low Concern Course"
        }),
        course({
            id: "high",
            weekStart: "2026-07-13",
            courseCode: "HIGH",
            courseName: "High Concern Course",
            workloadDifficulty: 5,
            unclearInstructionLevel: 5,
            gradingConcernLevel: 5,
            professorApproachabilityConcern: 5,
            groupmateIssueLevel: 5
        })
    ]);

    assert.equal(result.score, 50);
    assert.deepEqual(result.courseScores.map(({ courseCode, score }) => ({ courseCode, score })), [
        { courseCode: "LOW", score: 0 },
        { courseCode: "HIGH", score: 100 }
    ]);
    assert.deepEqual(result.highestConcernCourse, {
        courseCode: "HIGH",
        courseName: "High Concern Course",
        score: 100
    });
    assert.equal(result.hasSeriousPeerConcern, true);
});

test("weekly aggregation averages rounded valid course scores and rounds again", () => {
    const result = calculateCourseEnvironmentScore([
        course({
            courseCode: "ROUND",
            workloadDifficulty: 5,
            unclearInstructionLevel: 3,
            gradingConcernLevel: null,
            professorApproachabilityConcern: null,
            groupmateIssueLevel: null
        }),
        course({ courseCode: "ZERO" })
    ]);

    assert.equal(result.courseScores[0].score, 77.78);
    assert.equal(result.score, 38.89);
    assert.equal(result.score, Number(result.score.toFixed(2)));
});

test("highest-course ties preserve the first retained input record", () => {
    const result = calculateCourseEnvironmentScore([
        course({ courseCode: "FIRST", courseName: "First Course", workloadDifficulty: 3 }),
        course({ courseCode: "SECOND", courseName: "Second Course", workloadDifficulty: 3 })
    ]);

    assert.deepEqual(result.highestConcernCourse, {
        courseCode: "FIRST",
        courseName: "First Course",
        score: 12.5
    });
});

test("all-unavailable courses remain visible but do not affect valid aggregation", () => {
    const missingCourse = course({
        courseCode: "EMPTY",
        courseName: "No Ratings",
        workloadDifficulty: null,
        unclearInstructionLevel: null,
        gradingConcernLevel: null,
        professorApproachabilityConcern: null,
        groupmateIssueLevel: null
    });
    const validCourse = course({ courseCode: "VALID", courseName: "Valid Ratings" });
    const result = calculateCourseEnvironmentScore([missingCourse, validCourse]);

    assert.deepEqual(result.courseScores[0], {
        courseCode: "EMPTY",
        courseName: "No Ratings",
        score: null,
        seriousPeerConcern: false
    });
    assert.equal(result.score, 0);
    assert.deepEqual(result.highestConcernCourse, {
        courseCode: "VALID",
        courseName: "Valid Ratings",
        score: 0
    });
});

test("empty and entirely unavailable course arrays return a null weekly score", () => {
    assert.deepEqual(calculateCourseEnvironmentScore([]), {
        score: null,
        courseScores: [],
        highestConcernCourse: null,
        hasSeriousPeerConcern: false
    });

    const unavailable = course({
        workloadDifficulty: null,
        unclearInstructionLevel: null,
        gradingConcernLevel: null,
        professorApproachabilityConcern: null,
        groupmateIssueLevel: null
    });
    const result = calculateCourseEnvironmentScore([unavailable]);
    assert.equal(result.score, null);
    assert.equal(result.highestConcernCourse, null);
    assert.equal(result.courseScores[0].score, null);
});

test("serious peer concern is set only for groupmate level five", () => {
    assert.equal(calculateSingleCourseEnvironmentScore(course({
        groupmateIssueLevel: 5
    })).seriousPeerConcern, true);
    assert.equal(calculateSingleCourseEnvironmentScore(course({
        groupmateIssueLevel: 4
    })).seriousPeerConcern, false);

    const weekly = calculateCourseEnvironmentScore([
        course({ courseCode: "ONE", groupmateIssueLevel: 4 }),
        course({ courseCode: "TWO", groupmateIssueLevel: 5 })
    ]);
    assert.equal(weekly.hasSeriousPeerConcern, true);
});

test("duplicate non-null IDs keep the first record while id-less records remain distinct", () => {
    const first = course({ id: "duplicate", courseCode: "FIRST" });
    const ignored = course({
        id: "duplicate",
        courseCode: "IGNORED",
        workloadDifficulty: 5,
        unclearInstructionLevel: 5,
        gradingConcernLevel: 5,
        professorApproachabilityConcern: 5,
        groupmateIssueLevel: 5
    });
    const deduplicated = calculateCourseEnvironmentScore([first, ignored]);

    assert.equal(deduplicated.score, 0);
    assert.equal(deduplicated.courseScores.length, 1);
    assert.equal(deduplicated.courseScores[0].courseCode, "FIRST");
    assert.equal(deduplicated.hasSeriousPeerConcern, false);

    const idless = calculateCourseEnvironmentScore([
        course({ courseCode: "IDLESS-LOW" }),
        course({
            courseCode: "IDLESS-HIGH",
            workloadDifficulty: 5,
            unclearInstructionLevel: 5,
            gradingConcernLevel: 5,
            professorApproachabilityConcern: 5,
            groupmateIssueLevel: 5
        })
    ]);
    assert.equal(idless.courseScores.length, 2);
    assert.equal(idless.score, 50);
});

test("mixed non-null weekStart values are rejected", () => {
    assert.throws(() => calculateCourseEnvironmentScore([
        course({ weekStart: "2026-07-06" }),
        course({ weekStart: "2026-07-13" })
    ]), (error) => error instanceof RangeError && error.message.includes("weekStart"));

    assert.doesNotThrow(() => calculateCourseEnvironmentScore([
        course({ weekStart: "2026-07-13" }),
        course({ weekStart: null }),
        course()
    ]));
});

test("invalid scale values and malformed inputs are rejected", () => {
    for (const invalidValue of [0, 6, 2.5, "3", true, Number.NaN, Number.POSITIVE_INFINITY]) {
        assert.throws(() => normalizeConcernScale(invalidValue), RangeError);
    }

    const ratingFields = [
        "workloadDifficulty",
        "unclearInstructionLevel",
        "gradingConcernLevel",
        "professorApproachabilityConcern",
        "groupmateIssueLevel"
    ];
    for (const field of ratingFields) {
        assert.throws(
            () => calculateSingleCourseEnvironmentScore(course({ [field]: 3.5 })),
            (error) => error instanceof RangeError && error.message.includes(field)
        );
    }

    for (const invalidInput of [null, [], "course", 3]) {
        assert.throws(() => calculateSingleCourseEnvironmentScore(invalidInput), TypeError);
    }
    for (const invalidLogs of [null, {}, "courses", 3]) {
        assert.throws(() => calculateCourseEnvironmentScore(invalidLogs), TypeError);
    }
    assert.throws(() => calculateCourseEnvironmentScore([course(), null]), TypeError);
});

test("every valid response combination remains bounded and rounded to two decimals", () => {
    const values = [null, 1, 2, 3, 4, 5];

    for (const workloadDifficulty of values) {
        for (const unclearInstructionLevel of values) {
            for (const gradingConcernLevel of values) {
                for (const professorApproachabilityConcern of values) {
                    for (const groupmateIssueLevel of values) {
                        const result = calculateSingleCourseEnvironmentScore(course({
                            workloadDifficulty,
                            unclearInstructionLevel,
                            gradingConcernLevel,
                            professorApproachabilityConcern,
                            groupmateIssueLevel
                        }));

                        if (result.score === null) {
                            assert.deepEqual(result, { score: null });
                            continue;
                        }

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
