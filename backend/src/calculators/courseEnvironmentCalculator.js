const COURSE_ENVIRONMENT_CONFIG = Object.freeze({
    // Prototype design choices only; these weights and thresholds are not clinically validated.
    // This is a private student-facing concern indicator, not an official evaluation of any
    // professor, course, university employee, or grading practice.
    weights: Object.freeze({
        workloadDifficultyConcern: 0.25,
        unclearInstructionConcern: 0.20,
        gradingConcern: 0.15,
        approachabilityConcern: 0.15,
        groupmateIssueConcern: 0.25
    }),
    scale: Object.freeze({ minimum: 1, maximum: 5 }),
    seriousPeerConcernLevel: 5,
    fields: Object.freeze([
        Object.freeze({ input: "workloadDifficulty", component: "workloadDifficultyConcern" }),
        Object.freeze({ input: "unclearInstructionLevel", component: "unclearInstructionConcern" }),
        Object.freeze({ input: "gradingConcernLevel", component: "gradingConcern" }),
        Object.freeze({ input: "professorApproachabilityConcern", component: "approachabilityConcern" }),
        Object.freeze({ input: "groupmateIssueLevel", component: "groupmateIssueConcern" })
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

function normalizeConcernScale(value, fieldName = "value") {
    if (isMissing(value)) {
        return null;
    }

    const { minimum, maximum } = COURSE_ENVIRONMENT_CONFIG.scale;
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
        throw new RangeError(
            `${fieldName} must be an integer between ${minimum} and ${maximum} or null`
        );
    }

    return clampScore(((value - minimum) / (maximum - minimum)) * 100);
}

function calculateSingleCourseEnvironmentScore(input) {
    if (!isPlainObject(input)) {
        throw new TypeError("input must be an object");
    }

    const components = {};
    let weightedTotal = 0;
    let availableWeight = 0;

    for (const { input: inputField, component } of COURSE_ENVIRONMENT_CONFIG.fields) {
        const concern = normalizeConcernScale(input[inputField], inputField);
        components[component] = concern;

        if (concern === null) {
            continue;
        }

        const weight = COURSE_ENVIRONMENT_CONFIG.weights[component];
        weightedTotal += concern * weight;
        availableWeight += weight;
    }

    if (availableWeight === 0) {
        return { score: null };
    }

    return {
        score: roundScore(clampScore(weightedTotal / availableWeight)),
        seriousPeerConcern: input.groupmateIssueLevel
            === COURSE_ENVIRONMENT_CONFIG.seriousPeerConcernLevel,
        components
    };
}

function getUniqueCourseLogs(courseLogs) {
    if (!Array.isArray(courseLogs)) {
        throw new TypeError("courseLogs must be an array");
    }

    const seenIds = new Set();
    const uniqueLogs = [];

    for (let index = 0; index < courseLogs.length; index += 1) {
        const courseLog = courseLogs[index];
        if (!isPlainObject(courseLog)) {
            throw new TypeError(`courseLogs[${index}] must be an object`);
        }

        if (courseLog.id !== null && courseLog.id !== undefined) {
            if (seenIds.has(courseLog.id)) {
                continue;
            }
            seenIds.add(courseLog.id);
        }

        uniqueLogs.push(courseLog);
    }

    return uniqueLogs;
}

function assertSingleAnalysisWeek(courseLogs) {
    const weeks = new Set();
    for (const courseLog of courseLogs) {
        if (!isMissing(courseLog.weekStart)) {
            weeks.add(courseLog.weekStart);
        }
    }

    if (weeks.size > 1) {
        throw new RangeError("courseLogs must contain records from only one weekStart");
    }
}

function calculateCourseEnvironmentScore(courseLogs) {
    const uniqueLogs = getUniqueCourseLogs(courseLogs);
    assertSingleAnalysisWeek(uniqueLogs);

    const courseScores = [];
    const validCourseScores = [];
    let highestConcernCourse = null;
    let hasSeriousPeerConcern = false;

    for (const courseLog of uniqueLogs) {
        const result = calculateSingleCourseEnvironmentScore(courseLog);
        const seriousPeerConcern = result.seriousPeerConcern === true;
        const courseScore = {
            courseCode: courseLog.courseCode,
            courseName: courseLog.courseName,
            score: result.score,
            seriousPeerConcern
        };

        courseScores.push(courseScore);
        hasSeriousPeerConcern ||= seriousPeerConcern;

        if (result.score === null) {
            continue;
        }

        validCourseScores.push(result.score);
        if (highestConcernCourse === null || result.score > highestConcernCourse.score) {
            highestConcernCourse = {
                courseCode: courseLog.courseCode,
                courseName: courseLog.courseName,
                score: result.score
            };
        }
    }

    const score = validCourseScores.length === 0
        ? null
        : roundScore(clampScore(
            validCourseScores.reduce((total, courseScore) => total + courseScore, 0)
                / validCourseScores.length
        ));

    return {
        score,
        courseScores,
        highestConcernCourse,
        hasSeriousPeerConcern
    };
}

module.exports = {
    normalizeConcernScale,
    calculateSingleCourseEnvironmentScore,
    calculateCourseEnvironmentScore
};
