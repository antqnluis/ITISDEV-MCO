const LOGISTICAL_LOAD_CONFIG = Object.freeze({
    // Prototype design choices only; these weights and thresholds are not clinically validated.
    weights: Object.freeze({
        studyTimeConcern: 0.30,
        commuteConcern: 0.20,
        employmentConcern: 0.20,
        caregivingConcern: 0.20,
        internetConcern: 0.10
    }),
    schoolDaysPerWeek: 5,
    thresholds: Object.freeze({
        studyHours: 15,
        commuteHours: 15,
        employmentHours: 20,
        caregivingHours: 15
    }),
    limits: Object.freeze({
        commuteMinutesPerDay: 1440,
        weeklyHours: 168
    }),
    internetConcernByCategory: Object.freeze({
        none: 0,
        occasional: 50,
        frequent: 100
    })
});

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isMissing(value) {
    return value === null || value === undefined;
}

function clampScore(value) {
    return Math.max(0, Math.min(value, 100));
}

function roundScore(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function validateOptionalNumber(value, fieldName, maximum, { integer = false } = {}) {
    if (isMissing(value)) {
        return null;
    }

    const isValidNumber = typeof value === "number" && Number.isFinite(value);
    if (!isValidNumber || (integer && !Number.isInteger(value)) || value < 0 || value > maximum) {
        const numberType = integer ? "an integer" : "a finite number";
        throw new RangeError(`${fieldName} must be ${numberType} between 0 and ${maximum} or null`);
    }

    return value;
}

function validateOptionalWeeklyHours(value, fieldName = "hours") {
    return validateOptionalNumber(
        value,
        fieldName,
        LOGISTICAL_LOAD_CONFIG.limits.weeklyHours
    );
}

function validateOptionalCommuteMinutes(value, fieldName = "commuteMinutesPerDay") {
    return validateOptionalNumber(
        value,
        fieldName,
        LOGISTICAL_LOAD_CONFIG.limits.commuteMinutesPerDay,
        { integer: true }
    );
}

function calculateStudyTimeConcern(hours) {
    const availableHours = validateOptionalWeeklyHours(hours);
    if (availableHours === null) {
        return null;
    }

    const concernRatio = (LOGISTICAL_LOAD_CONFIG.thresholds.studyHours - availableHours)
        / LOGISTICAL_LOAD_CONFIG.thresholds.studyHours;
    return clampScore(Math.max(0, Math.min(concernRatio, 1)) * 100);
}

function calculateCommuteConcern(commuteMinutesPerDay) {
    const commuteMinutes = validateOptionalCommuteMinutes(commuteMinutesPerDay);
    if (commuteMinutes === null) {
        return null;
    }

    const commuteHoursPerWeek = (
        commuteMinutes * LOGISTICAL_LOAD_CONFIG.schoolDaysPerWeek
    ) / 60;
    return clampScore(Math.min(
        commuteHoursPerWeek / LOGISTICAL_LOAD_CONFIG.thresholds.commuteHours,
        1
    ) * 100);
}

function calculateEmploymentConcern(hours) {
    const workHours = validateOptionalWeeklyHours(hours);
    if (workHours === null) {
        return null;
    }

    return clampScore(Math.min(
        workHours / LOGISTICAL_LOAD_CONFIG.thresholds.employmentHours,
        1
    ) * 100);
}

function calculateCaregivingConcern(hours) {
    const caregivingHours = validateOptionalWeeklyHours(hours);
    if (caregivingHours === null) {
        return null;
    }

    return clampScore(Math.min(
        caregivingHours / LOGISTICAL_LOAD_CONFIG.thresholds.caregivingHours,
        1
    ) * 100);
}

function calculateInternetConcern(category) {
    if (isMissing(category)) {
        return null;
    }

    if (
        typeof category !== "string"
        || !Object.prototype.hasOwnProperty.call(
            LOGISTICAL_LOAD_CONFIG.internetConcernByCategory,
            category
        )
    ) {
        throw new RangeError("internetProblems must be none, occasional, frequent, or null");
    }

    return LOGISTICAL_LOAD_CONFIG.internetConcernByCategory[category];
}

function calculateLogisticalLoadScore(input) {
    if (!isPlainObject(input)) {
        throw new TypeError("input must be an object");
    }

    const weeklyStudyHours = validateOptionalWeeklyHours(
        input.weeklyAvailableStudyHours,
        "weeklyAvailableStudyHours"
    );
    const profileStudyHours = validateOptionalWeeklyHours(
        input.profileAvailableStudyHours,
        "profileAvailableStudyHours"
    );
    const commuteMinutes = validateOptionalCommuteMinutes(
        input.commuteMinutesPerDay,
        "commuteMinutesPerDay"
    );
    const workHours = validateOptionalWeeklyHours(
        input.workHoursPerWeek,
        "workHoursPerWeek"
    );
    const caregivingHours = validateOptionalWeeklyHours(
        input.caregivingHoursPerWeek,
        "caregivingHoursPerWeek"
    );
    const availableStudyHoursUsed = weeklyStudyHours ?? profileStudyHours;

    const components = {
        studyTimeConcern: calculateStudyTimeConcern(availableStudyHoursUsed),
        commuteConcern: calculateCommuteConcern(commuteMinutes),
        employmentConcern: calculateEmploymentConcern(workHours),
        caregivingConcern: calculateCaregivingConcern(caregivingHours),
        internetConcern: calculateInternetConcern(input.internetProblems)
    };

    let weightedTotal = 0;
    let availableWeight = 0;
    for (const [component, weight] of Object.entries(LOGISTICAL_LOAD_CONFIG.weights)) {
        const concern = components[component];
        if (concern === null) {
            continue;
        }

        weightedTotal += concern * weight;
        availableWeight += weight;
    }

    if (availableWeight === 0) {
        return { score: null };
    }

    const commuteHoursPerWeek = commuteMinutes === null
        ? null
        : (commuteMinutes * LOGISTICAL_LOAD_CONFIG.schoolDaysPerWeek) / 60;

    return {
        score: roundScore(clampScore(weightedTotal / availableWeight)),
        components,
        derivedValues: {
            availableStudyHoursUsed,
            commuteHoursPerWeek
        }
    };
}

module.exports = {
    calculateStudyTimeConcern,
    calculateCommuteConcern,
    calculateEmploymentConcern,
    calculateCaregivingConcern,
    calculateInternetConcern,
    calculateLogisticalLoadScore
};
