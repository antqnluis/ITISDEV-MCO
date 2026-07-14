const PERSONAL_WELLBEING_CONFIG = Object.freeze({
    // Prototype design choices only; these weights are not clinically validated.
    weights: Object.freeze({
        stressConcern: 0.25,
        burnoutConcern: 0.20,
        sleepConcern: 0.20,
        motivationConcern: 0.15,
        moodConcern: 0.10,
        energyConcern: 0.10
    }),
    scale: Object.freeze({ minimum: 1, maximum: 5 })
});

const INPUT_FIELDS = Object.freeze([
    Object.freeze({ field: "stressLevel", component: "stressConcern", direction: "negative" }),
    Object.freeze({ field: "burnoutLevel", component: "burnoutConcern", direction: "negative" }),
    Object.freeze({ field: "sleepQuality", component: "sleepConcern", direction: "positive" }),
    Object.freeze({ field: "motivationLevel", component: "motivationConcern", direction: "positive" }),
    Object.freeze({ field: "moodLevel", component: "moodConcern", direction: "positive" }),
    Object.freeze({ field: "energyLevel", component: "energyConcern", direction: "positive" })
]);

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clampScore(value) {
    return Math.max(0, Math.min(value, 100));
}

function roundScore(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function validateScaleValue(value, fieldName = "value") {
    const { minimum, maximum } = PERSONAL_WELLBEING_CONFIG.scale;
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
        throw new RangeError(`${fieldName} must be an integer between ${minimum} and ${maximum}`);
    }

    return value;
}

function normalizeNegativeScale(value) {
    const rating = validateScaleValue(value);
    const { minimum, maximum } = PERSONAL_WELLBEING_CONFIG.scale;
    return clampScore(((rating - minimum) / (maximum - minimum)) * 100);
}

function normalizePositiveScale(value) {
    const rating = validateScaleValue(value);
    const { minimum, maximum } = PERSONAL_WELLBEING_CONFIG.scale;
    return clampScore(((maximum - rating) / (maximum - minimum)) * 100);
}

function calculatePersonalWellbeingScore(input) {
    if (!isPlainObject(input)) {
        throw new TypeError("input must be an object");
    }

    const components = {};
    for (const { field, component, direction } of INPUT_FIELDS) {
        const rating = validateScaleValue(input[field], field);
        components[component] = direction === "negative"
            ? normalizeNegativeScale(rating)
            : normalizePositiveScale(rating);
    }

    const weightedScore = Object.entries(PERSONAL_WELLBEING_CONFIG.weights)
        .reduce((total, [component, weight]) => total + (components[component] * weight), 0);

    return {
        score: roundScore(clampScore(weightedScore)),
        components
    };
}

module.exports = {
    normalizeNegativeScale,
    normalizePositiveScale,
    calculatePersonalWellbeingScore
};
