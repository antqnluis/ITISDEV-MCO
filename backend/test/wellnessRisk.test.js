const test = require("node:test");
const assert = require("node:assert/strict");
const { selectPrimaryStressContext } = require("../src/utils/wellnessRisk");

test("the highest concern score determines the primary stress context", () => {
    const result = selectPrimaryStressContext([
        { name: "academic_engagement", score: 20 },
        { name: "personal_wellbeing", score: 80 },
        { name: "logistical_load", score: 30 },
        { name: "role_load", score: 40 },
        { name: "course_environment", score: 50 },
    ]);

    assert.equal(result.primaryContext, "personal_wellbeing");
    assert.equal(result.orderedDimensions[0].score, 80);
});

test("broadly high concern across every dimension produces mixed context", () => {
    const result = selectPrimaryStressContext([
        { name: "academic_engagement", score: 91 },
        { name: "personal_wellbeing", score: 92 },
        { name: "logistical_load", score: 82 },
        { name: "role_load", score: 94 },
        { name: "course_environment", score: 81 },
    ]);

    assert.equal(result.primaryContext, "mixed");
});

test("zero remains low concern and 100 remains high concern", () => {
    const result = selectPrimaryStressContext([
        { name: "academic_engagement", score: 0 },
        { name: "personal_wellbeing", score: 100 },
        { name: "logistical_load", score: 25 },
        { name: "role_load", score: 50 },
        { name: "course_environment", score: 75 },
    ]);

    assert.equal(result.primaryContext, "personal_wellbeing");
    assert.deepEqual(
        result.orderedDimensions.map(({ score }) => score),
        [100, 75, 50, 25, 0],
    );
});
