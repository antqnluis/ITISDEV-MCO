const assert = require("node:assert/strict");
const test = require("node:test");

const {
    calculateAcademicWorkloadConcern,
    calculateMissedRequirementConcern,
    calculateLateRequirementConcern,
    calculateDeadlinePressureConcern,
    calculateGradeDeclineConcern,
    calculateAcademicEngagementScore
} = require("../src/calculators/academicEngagementCalculator");

const analysisDate = "2026-07-14";
let nextRecordId = 1;

function requirement(overrides = {}) {
    return {
        id: `record-${nextRecordId++}`,
        record_type: "assignment",
        due_at: null,
        submitted_at: null,
        submission_status: "on_time",
        grade_percentage: null,
        recorded_at: "2026-07-10T00:00:00.000Z",
        course_code: "ITISDEV",
        ...overrides
    };
}

function grade(courseCode, gradePercentage, recordedAt, overrides = {}) {
    return requirement({
        record_type: "grade_snapshot",
        submission_status: "not_applicable",
        course_code: courseCode,
        grade_percentage: gradePercentage,
        recorded_at: recordedAt,
        ...overrides
    });
}

test("empty academic records produce available zero components and unavailable optional components", () => {
    assert.deepEqual(calculateAcademicEngagementScore({
        academicRecords: [],
        analysisDate,
        academicWorkload: null
    }), {
        score: 0,
        components: {
            academicWorkloadConcern: null,
            missedRequirementConcern: 0,
            lateRequirementConcern: 0,
            deadlinePressureConcern: 0,
            gradeDeclineConcern: null
        },
        counts: {
            totalRequirements: 0,
            missedRequirements: 0,
            lateRequirements: 0,
            upcomingDeadlines: 0,
            coursesWithGradeComparison: 0
        }
    });
});

test("academic workload maps the 1-5 scale and validates supplied values", () => {
    assert.deepEqual(
        [1, 2, 3, 4, 5].map(calculateAcademicWorkloadConcern),
        [0, 25, 50, 75, 100]
    );
    assert.equal(calculateAcademicWorkloadConcern(null), null);
    assert.equal(calculateAcademicWorkloadConcern(undefined), null);

    for (const invalidValue of [0, 6, 2.5, "3", Number.NaN]) {
        assert.throws(
            () => calculateAcademicWorkloadConcern(invalidValue),
            /academicWorkload/
        );
    }
});

test("missed and late concerns use only requirement records and remain mutually exclusive", () => {
    const noConcern = [
        requirement(),
        requirement({ record_type: "assessment" }),
        requirement({ record_type: "grade_snapshot", submission_status: "missed" })
    ];
    assert.equal(calculateMissedRequirementConcern(noConcern), 0);
    assert.equal(calculateLateRequirementConcern(noConcern), 0);

    const allMissed = [
        requirement({ submission_status: "missed" }),
        requirement({ record_type: "assessment", submission_status: "missed" })
    ];
    assert.equal(calculateMissedRequirementConcern(allMissed), 100);
    assert.equal(calculateLateRequirementConcern(allMissed), 0);

    const allLate = [
        requirement({ submission_status: "late" }),
        requirement({ record_type: "assessment", submission_status: "late" })
    ];
    assert.equal(calculateMissedRequirementConcern(allLate), 0);
    assert.equal(calculateLateRequirementConcern(allLate), 100);
});

test("upcoming deadline concern maps zero through five deadlines and caps larger counts", () => {
    for (let count = 0; count <= 5; count += 1) {
        const records = Array.from({ length: count }, (_, index) => requirement({
            id: `deadline-${index}`,
            submission_status: "upcoming",
            due_at: `2026-07-${String(14 + index).padStart(2, "0")}T00:00:00.000Z`
        }));
        assert.equal(calculateDeadlinePressureConcern(records, analysisDate), count * 20);
    }

    const sixDeadlines = Array.from({ length: 6 }, (_, index) => requirement({
        id: `capped-deadline-${index}`,
        submission_status: "upcoming",
        due_at: "2026-07-15T00:00:00.000Z"
    }));
    assert.equal(calculateDeadlinePressureConcern(sixDeadlines, analysisDate), 100);
});

test("deadline window is inclusive and ignores null, invalid, past, and irrelevant records", () => {
    const records = [
        requirement({ id: "window-start", submission_status: "upcoming", due_at: "2026-07-14T00:00:00.000Z" }),
        requirement({ id: "window-end", submission_status: "upcoming", due_at: "2026-07-21T00:00:00.000Z" }),
        requirement({ id: "before", submission_status: "upcoming", due_at: "2026-07-13T23:59:59.999Z" }),
        requirement({ id: "after", submission_status: "upcoming", due_at: "2026-07-21T00:00:00.001Z" }),
        requirement({ id: "null", submission_status: "upcoming", due_at: null }),
        requirement({ id: "invalid", submission_status: "upcoming", due_at: "not-a-date" }),
        requirement({ id: "invalid-calendar", submission_status: "upcoming", due_at: "2026-02-30T00:00:00.000Z" }),
        requirement({ id: "wrong-status", submission_status: "late", due_at: "2026-07-15T00:00:00.000Z" }),
        requirement({ id: "wrong-type", record_type: "grade_snapshot", submission_status: "upcoming", due_at: "2026-07-15T00:00:00.000Z" })
    ];

    assert.equal(calculateDeadlinePressureConcern(records, analysisDate), 40);
});

test("grade decline handles improvements and 5-, 10-, and 20-point drops", () => {
    const cases = [
        { current: 95, expected: 0 },
        { current: 85, expected: 25 },
        { current: 80, expected: 50 },
        { current: 70, expected: 100 },
        { current: 60, expected: 100 }
    ];

    for (const { current, expected } of cases) {
        const records = [
            grade("ITISDEV", 90, "2026-07-01T00:00:00.000Z"),
            grade("ITISDEV", current, "2026-07-10T00:00:00.000Z")
        ];
        assert.equal(calculateGradeDeclineConcern(records, analysisDate), expected);
    }
});

test("grade decline averages comparisons across courses", () => {
    const records = [
        grade("COURSE-A", 90, "2026-07-01T00:00:00.000Z"),
        grade("COURSE-A", 80, "2026-07-10T00:00:00.000Z"),
        grade("COURSE-B", 70, "2026-07-01T00:00:00.000Z"),
        grade("COURSE-B", 75, "2026-07-10T00:00:00.000Z")
    ];

    assert.equal(calculateGradeDeclineConcern(records, analysisDate), 25);
    assert.equal(calculateAcademicEngagementScore({
        academicRecords: records,
        analysisDate,
        academicWorkload: null
    }).counts.coursesWithGradeComparison, 2);
});

test("grade decline ignores future, null, and malformed grade history", () => {
    const records = [
        grade("ITISDEV", 90, "2026-07-01T00:00:00.000Z"),
        grade("ITISDEV", 85, "2026-07-10T00:00:00.000Z"),
        grade("ITISDEV", 40, "2026-07-15T00:00:00.000Z"),
        grade("COURSE-B", null, "2026-07-01T00:00:00.000Z"),
        grade("COURSE-B", 50, "invalid-date"),
        grade("COURSE-C", 90, "2026-02-30T00:00:00.000Z"),
        grade("COURSE-C", 50, "2026-07-10T00:00:00.000Z"),
        grade(" ", 50, "2026-07-10T00:00:00.000Z")
    ];

    assert.equal(calculateGradeDeclineConcern(records, analysisDate), 25);
    assert.equal(calculateGradeDeclineConcern([
        grade("ITISDEV", 90, "2026-07-01T00:00:00.000Z")
    ], analysisDate), null);
});

test("equal grade timestamps use the later input record as the current grade", () => {
    const records = [
        grade("ITISDEV", 90, "2026-07-10T00:00:00.000Z"),
        grade("ITISDEV", 80, "2026-07-10T00:00:00.000Z")
    ];

    assert.equal(calculateGradeDeclineConcern(records, analysisDate), 50);
});

test("duplicate ids are counted once while id-less records remain distinct", () => {
    const duplicate = requirement({ id: "duplicate", submission_status: "missed" });
    const idlessA = requirement({ id: undefined, submission_status: "late" });
    const idlessB = { ...idlessA };
    const result = calculateAcademicEngagementScore({
        academicRecords: [duplicate, { ...duplicate }, idlessA, idlessB],
        analysisDate,
        academicWorkload: null
    });

    assert.deepEqual(result.counts, {
        totalRequirements: 3,
        missedRequirements: 1,
        lateRequirements: 2,
        upcomingDeadlines: 0,
        coursesWithGradeComparison: 0
    });
    assert.equal(result.components.missedRequirementConcern, (1 / 3) * 100);
    assert.equal(result.components.lateRequirementConcern, (2 / 3) * 100);
});

test("main calculation returns all components and applies full original weights", () => {
    const records = [
        requirement({
            id: "older-grade",
            submission_status: "missed",
            grade_percentage: 90,
            recorded_at: "2026-07-01T00:00:00.000Z"
        }),
        requirement({
            id: "newer-grade",
            record_type: "assessment",
            submission_status: "late",
            grade_percentage: 80,
            recorded_at: "2026-07-10T00:00:00.000Z"
        })
    ];

    const result = calculateAcademicEngagementScore({
        academicRecords: records,
        analysisDate,
        academicWorkload: 3
    });

    assert.equal(result.score, 42.5);
    assert.deepEqual(result.components, {
        academicWorkloadConcern: 50,
        missedRequirementConcern: 50,
        lateRequirementConcern: 50,
        deadlinePressureConcern: 0,
        gradeDeclineConcern: 50
    });
});

test("missing workload and grade history redistribute their original weights", () => {
    const result = calculateAcademicEngagementScore({
        academicRecords: [requirement({ submission_status: "missed" })],
        analysisDate,
        academicWorkload: null
    });

    assert.equal(result.score, 46.15);
    assert.equal(result.components.academicWorkloadConcern, null);
    assert.equal(result.components.gradeDeclineConcern, null);

    const workloadOnly = calculateAcademicEngagementScore({
        academicRecords: [],
        analysisDate,
        academicWorkload: 5
    });
    assert.equal(workloadOnly.score, 27.78);
});

test("analysis date and top-level input validation reject malformed values", () => {
    for (const invalidDate of [
        undefined,
        null,
        "",
        "2026-02-30",
        "2026-02-30T00:00:00.000Z",
        "July 14, 2026",
        "2026-07-14T00:00:00"
    ]) {
        assert.throws(
            () => calculateAcademicEngagementScore({
                academicRecords: [],
                analysisDate: invalidDate,
                academicWorkload: null
            }),
            /analysisDate/
        );
    }

    assert.throws(() => calculateAcademicEngagementScore(null), /input/);
    assert.throws(() => calculateAcademicEngagementScore({
        academicRecords: null,
        analysisDate,
        academicWorkload: null
    }), /academicRecords/);
});

test("final scores remain within 0-100", () => {
    const highConcernRecords = Array.from({ length: 8 }, (_, index) => requirement({
        id: `high-${index}`,
        submission_status: index < 5 ? "upcoming" : "missed",
        due_at: "2026-07-15T00:00:00.000Z"
    }));
    highConcernRecords.push(
        grade("ITISDEV", 200, "2026-07-01T00:00:00.000Z"),
        grade("ITISDEV", 0, "2026-07-10T00:00:00.000Z")
    );

    const result = calculateAcademicEngagementScore({
        academicRecords: highConcernRecords,
        analysisDate,
        academicWorkload: 5
    });

    assert.ok(result.score >= 0);
    assert.ok(result.score <= 100);
    for (const concern of Object.values(result.components)) {
        if (concern !== null) {
            assert.ok(concern >= 0);
            assert.ok(concern <= 100);
        }
    }
});
