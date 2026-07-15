const ROLE_LOAD_CONFIG = Object.freeze({
    // Prototype design choices only; these weights and thresholds are not clinically validated.
    weights: Object.freeze({
        roleHoursConcern: 0.40,
        roleWorkloadConcern: 0.25,
        ceilingExceedanceConcern: 0.20,
        activeRoleConcern: 0.15
    }),
    roleHoursConcernThreshold: 25,
    ceilingExceedanceRatioCap: 0.50,
    maximumActiveRoles: 3,
    roleHoursLimits: Object.freeze({ minimum: 0, maximum: 168 }),
    workloadScale: Object.freeze({ minimum: 1, maximum: 5 }),
    roleFields: Object.freeze([
        Object.freeze({ activeField: "hasCaregivingResponsibility", hoursField: "caregivingHoursPerWeek" }),
        Object.freeze({ activeField: "isAthlete", hoursField: "athleteHoursPerWeek" }),
        Object.freeze({ activeField: "hasOrganizationResponsibility", hoursField: "organizationHoursPerWeek" })
    ])
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

function validateRoleHours(value, fieldName = "roleHours") {
    const { minimum, maximum } = ROLE_LOAD_CONFIG.roleHoursLimits;
    if (
        typeof value !== "number"
        || !Number.isFinite(value)
        || value < minimum
        || value > maximum
    ) {
        throw new RangeError(
            `${fieldName} must be a finite number between ${minimum} and ${maximum}`
        );
    }

    return value;
}

function validateTotalRoleHours(value) {
    const maximumTotal = ROLE_LOAD_CONFIG.roleHoursLimits.maximum
        * ROLE_LOAD_CONFIG.maximumActiveRoles;
    if (
        typeof value !== "number"
        || !Number.isFinite(value)
        || value < ROLE_LOAD_CONFIG.roleHoursLimits.minimum
        || value > maximumTotal
    ) {
        throw new RangeError(
            `totalRoleHours must be a finite number between 0 and ${maximumTotal}`
        );
    }

    return value;
}

function validateRoleInput(input) {
    if (!isPlainObject(input)) {
        throw new TypeError("input must be an object");
    }

    for (const { activeField, hoursField } of ROLE_LOAD_CONFIG.roleFields) {
        if (typeof input[activeField] !== "boolean") {
            throw new RangeError(`${activeField} must be a boolean`);
        }
        validateRoleHours(input[hoursField], hoursField);
    }

    return input;
}

function calculateTotalRoleHours(input) {
    const roles = validateRoleInput(input);

    return ROLE_LOAD_CONFIG.roleFields.reduce(
        (total, { activeField, hoursField }) => (
            roles[activeField] ? total + roles[hoursField] : total
        ),
        0
    );
}

function calculateRoleHoursConcern(totalRoleHours) {
    const hours = validateTotalRoleHours(totalRoleHours);
    return clampScore(Math.min(
        hours / ROLE_LOAD_CONFIG.roleHoursConcernThreshold,
        1
    ) * 100);
}

function calculateRoleWorkloadConcern(value) {
    if (isMissing(value)) {
        return null;
    }

    const { minimum, maximum } = ROLE_LOAD_CONFIG.workloadScale;
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
        throw new RangeError(
            `roleWorkload must be an integer between ${minimum} and ${maximum} or null`
        );
    }

    return clampScore(((value - minimum) / (maximum - minimum)) * 100);
}

function isValidCeiling(value) {
    return typeof value === "number" && Number.isFinite(value) && value > 0;
}

function calculateCeilingExceedanceConcern(totalRoleHours, roleHoursCeiling) {
    const hours = validateTotalRoleHours(totalRoleHours);
    if (!isValidCeiling(roleHoursCeiling)) {
        return null;
    }

    const excessHours = Math.max(hours - roleHoursCeiling, 0);
    const excessRatio = excessHours / roleHoursCeiling;
    return clampScore(Math.min(
        excessRatio / ROLE_LOAD_CONFIG.ceilingExceedanceRatioCap,
        1
    ) * 100);
}

function calculateActiveRoleConcern(activeRoleCount) {
    if (
        !Number.isInteger(activeRoleCount)
        || activeRoleCount < 0
        || activeRoleCount > ROLE_LOAD_CONFIG.maximumActiveRoles
    ) {
        throw new RangeError(
            `activeRoleCount must be an integer between 0 and ${ROLE_LOAD_CONFIG.maximumActiveRoles}`
        );
    }

    return clampScore(
        (activeRoleCount / ROLE_LOAD_CONFIG.maximumActiveRoles) * 100
    );
}

function calculateRoleLoadScore(input) {
    const roles = validateRoleInput(input);
    const totalRoleHours = calculateTotalRoleHours(roles);
    const activeRoleCount = ROLE_LOAD_CONFIG.roleFields.reduce(
        (count, { activeField }) => count + (roles[activeField] ? 1 : 0),
        0
    );
    const hasValidCeiling = isValidCeiling(roles.roleHoursCeiling);
    const excessHours = hasValidCeiling
        ? Math.max(totalRoleHours - roles.roleHoursCeiling, 0)
        : null;
    const excessRatio = hasValidCeiling
        ? excessHours / roles.roleHoursCeiling
        : null;

    const components = {
        roleHoursConcern: calculateRoleHoursConcern(totalRoleHours),
        roleWorkloadConcern: calculateRoleWorkloadConcern(roles.roleWorkload),
        ceilingExceedanceConcern: calculateCeilingExceedanceConcern(
            totalRoleHours,
            roles.roleHoursCeiling
        ),
        activeRoleConcern: calculateActiveRoleConcern(activeRoleCount)
    };

    let weightedTotal = 0;
    let availableWeight = 0;
    for (const [component, weight] of Object.entries(ROLE_LOAD_CONFIG.weights)) {
        const concern = components[component];
        if (concern === null) {
            continue;
        }

        weightedTotal += concern * weight;
        availableWeight += weight;
    }

    return {
        score: roundScore(clampScore(weightedTotal / availableWeight)),
        components,
        derivedValues: {
            totalRoleHours,
            activeRoleCount,
            excessHours,
            excessRatio
        }
    };
}

module.exports = {
    calculateTotalRoleHours,
    calculateRoleHoursConcern,
    calculateRoleWorkloadConcern,
    calculateCeilingExceedanceConcern,
    calculateActiveRoleConcern,
    calculateRoleLoadScore
};
