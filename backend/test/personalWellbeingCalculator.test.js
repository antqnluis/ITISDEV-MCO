const assert = require("node:assert/strict");
const test = require("node:test");

const {
    normalizeNegativeScale,
    normalizePositiveScale,
    calculatePersonalWellbeingScore
} = require("../src/calculators/personalWellbeingCalculator");

const inputFields = [
    "stressLevel",
    "burnoutLevel",
    "sleepQuality",
    "motivationLevel",
    "moodLevel",
    "energyLevel"
];

function ratings(value) {
    return Object.fromEntries(inputFields.map((field) => [field, value]));
}

test("negative scale maps higher ratings to greater concern", () => {
    assert.deepEqual(
        [1, 3, 5].map(normalizeNegativeScale),
        [0, 50, 100]
    );
});

test("positive scale inverts higher ratings into lower concern", () => {
    assert.deepEqual(
        [1, 3, 5].map(normalizePositiveScale),
        [100, 50, 0]
    );
});

test("all minimum inputs preserve the normalized components and produce 55", () => {
    assert.deepEqual(calculatePersonalWellbeingScore(ratings(1)), {
        score: 55,
        components: {
            stressConcern: 0,
            burnoutConcern: 0,
            sleepConcern: 100,
            motivationConcern: 100,
            moodConcern: 100,
            energyConcern: 100
        }
    });
});

test("all midpoint inputs produce a concern score of 50", () => {
    assert.deepEqual(calculatePersonalWellbeingScore(ratings(3)), {
        score: 50,
        components: {
            stressConcern: 50,
            burnoutConcern: 50,
            sleepConcern: 50,
            motivationConcern: 50,
            moodConcern: 50,
            energyConcern: 50
        }
    });
});

test("all maximum inputs preserve the normalized components and produce 45", () => {
    assert.deepEqual(calculatePersonalWellbeingScore(ratings(5)), {
        score: 45,
        components: {
            stressConcern: 100,
            burnoutConcern: 100,
            sleepConcern: 0,
            motivationConcern: 0,
            moodConcern: 0,
            energyConcern: 0
        }
    });
});

test("mixed student responses use the configured component weights", () => {
    assert.deepEqual(calculatePersonalWellbeingScore({
        stressLevel: 4,
        burnoutLevel: 5,
        sleepQuality: 2,
        motivationLevel: 4,
        moodLevel: 3,
        energyLevel: 1
    }), {
        score: 72.5,
        components: {
            stressConcern: 75,
            burnoutConcern: 100,
            sleepConcern: 75,
            motivationConcern: 25,
            moodConcern: 50,
            energyConcern: 100
        }
    });
});

test("normalizers reject values below 1 and above 5", () => {
    for (const normalizer of [normalizeNegativeScale, normalizePositiveScale]) {
        assert.throws(() => normalizer(0), RangeError);
        assert.throws(() => normalizer(6), RangeError);
    }
});

test("the main calculation rejects missing values", () => {
    const completeInput = ratings(3);
    for (const field of inputFields) {
        const incompleteInput = { ...completeInput };
        delete incompleteInput[field];
        assert.throws(
            () => calculatePersonalWellbeingScore(incompleteInput),
            (error) => error instanceof RangeError && error.message.includes(field)
        );
    }
});

test("the main calculation rejects null, non-numeric, decimal, and out-of-range values", () => {
    for (const invalidValue of [null, "3", 2.5, Number.NaN, 0, 6]) {
        assert.throws(
            () => calculatePersonalWellbeingScore({
                ...ratings(3),
                stressLevel: invalidValue
            }),
            (error) => error instanceof RangeError && error.message.includes("stressLevel")
        );
    }

    for (const invalidInput of [null, [], "ratings", 3]) {
        assert.throws(
            () => calculatePersonalWellbeingScore(invalidInput),
            TypeError
        );
    }
});

test("every valid response combination remains bounded and rounded to two decimals", () => {
    for (let stressLevel = 1; stressLevel <= 5; stressLevel += 1) {
        for (let burnoutLevel = 1; burnoutLevel <= 5; burnoutLevel += 1) {
            for (let sleepQuality = 1; sleepQuality <= 5; sleepQuality += 1) {
                for (let motivationLevel = 1; motivationLevel <= 5; motivationLevel += 1) {
                    for (let moodLevel = 1; moodLevel <= 5; moodLevel += 1) {
                        for (let energyLevel = 1; energyLevel <= 5; energyLevel += 1) {
                            const { score } = calculatePersonalWellbeingScore({
                                stressLevel,
                                burnoutLevel,
                                sleepQuality,
                                motivationLevel,
                                moodLevel,
                                energyLevel
                            });

                            assert.ok(score >= 0 && score <= 100);
                            assert.equal(score, Number(score.toFixed(2)));
                        }
                    }
                }
            }
        }
    }
});
