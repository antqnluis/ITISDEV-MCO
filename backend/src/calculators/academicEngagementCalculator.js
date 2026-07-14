const ACADEMIC_ENGAGEMENT_CONFIG = Object.freeze({
    // Prototype design choices only; these weights and thresholds are not clinically validated.
    weights: Object.freeze({
        academicWorkloadConcern: 0.25,
        missedRequirementConcern: 0.30,
        lateRequirementConcern: 0.20,
        deadlinePressureConcern: 0.15,
        gradeDeclineConcern: 0.10
    }),
    workloadScale: Object.freeze({ minimum: 1, maximum: 5 }),
    deadlineWindowDays: 7,
    deadlineCountCap: 5,
    gradeDropCap: 20
});

const REQUIREMENT_TYPES = new Set(["assignment", "assessment"]);
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const ISO_TIMESTAMP_PATTERN = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2}(?:\.\d{1,9})?)?(?:Z|[+-]\d{2}:\d{2})$/;
const MILLISECONDS_PER_DAY = 24 * 60 * 60 * 1000;

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function clampScore(value) {
    return Math.max(0, Math.min(value, 100));
}

function roundScore(value) {
    return Math.round((value + Number.EPSILON) * 100) / 100;
}

function hasValidCalendarDate(value) {
    const [year, month, day] = value.slice(0, 10).split("-").map(Number);
    const date = new Date(0);
    date.setUTCHours(0, 0, 0, 0);
    date.setUTCFullYear(year, month - 1, day);

    return date.getUTCFullYear() === year
        && date.getUTCMonth() === month - 1
        && date.getUTCDate() === day;
}

function parseAnalysisDate(value) {
    if (typeof value !== "string") {
        throw new TypeError("analysisDate must be a valid ISO date or timestamp");
    }

    let timestamp;
    if (ISO_DATE_PATTERN.test(value) && hasValidCalendarDate(value)) {
        timestamp = Date.parse(`${value}T00:00:00.000Z`);
    } else if (ISO_TIMESTAMP_PATTERN.test(value) && hasValidCalendarDate(value)) {
        timestamp = Date.parse(value);
    } else {
        throw new TypeError("analysisDate must be a valid ISO date or timestamp");
    }

    if (!Number.isFinite(timestamp)) {
        throw new RangeError("analysisDate must be a valid ISO date or timestamp");
    }

    return timestamp;
}

function parseRecordTimestamp(value) {
    if (
        typeof value !== "string"
        || (!ISO_DATE_PATTERN.test(value) && !ISO_TIMESTAMP_PATTERN.test(value))
        || !hasValidCalendarDate(value)
    ) {
        return null;
    }

    const timestamp = ISO_DATE_PATTERN.test(value)
        ? Date.parse(`${value}T00:00:00.000Z`)
        : Date.parse(value);
    return Number.isFinite(timestamp) ? timestamp : null;
}

function getUniqueRecords(records) {
    if (!Array.isArray(records)) {
        throw new TypeError("academicRecords must be an array");
    }

    const seenIds = new Set();
    const uniqueRecords = [];

    for (let index = 0; index < records.length; index += 1) {
        const record = records[index];
        if (!isPlainObject(record)) {
            continue;
        }

        if (record.id !== null && record.id !== undefined) {
            if (seenIds.has(record.id)) {
                continue;
            }
            seenIds.add(record.id);
        }

        uniqueRecords.push({ record, index });
    }

    return uniqueRecords;
}

function getRequirementSummary(uniqueRecords) {
    const requirements = uniqueRecords.filter(({ record }) => (
        REQUIREMENT_TYPES.has(record.record_type)
    ));

    return {
        totalRequirements: requirements.length,
        missedRequirements: requirements.filter(({ record }) => (
            record.submission_status === "missed"
        )).length,
        lateRequirements: requirements.filter(({ record }) => (
            record.submission_status === "late"
        )).length
    };
}

function calculateRequirementRatio(count, total) {
    if (total === 0) {
        return 0;
    }

    return clampScore((count / total) * 100);
}

function getUpcomingDeadlineCount(uniqueRecords, analysisTimestamp) {
    const deadlineWindowEnd = analysisTimestamp
        + (ACADEMIC_ENGAGEMENT_CONFIG.deadlineWindowDays * MILLISECONDS_PER_DAY);

    return uniqueRecords.filter(({ record }) => {
        if (
            !REQUIREMENT_TYPES.has(record.record_type)
            || record.submission_status !== "upcoming"
        ) {
            return false;
        }

        const dueTimestamp = parseRecordTimestamp(record.due_at);
        return dueTimestamp !== null
            && dueTimestamp >= analysisTimestamp
            && dueTimestamp <= deadlineWindowEnd;
    }).length;
}

function getGradeDeclineSummary(uniqueRecords, analysisTimestamp) {
    const gradesByCourse = new Map();

    for (const { record, index } of uniqueRecords) {
        const recordedTimestamp = parseRecordTimestamp(record.recorded_at);
        const hasValidGrade = typeof record.grade_percentage === "number"
            && Number.isFinite(record.grade_percentage)
            && record.grade_percentage >= 0;
        const hasValidCourse = typeof record.course_code === "string"
            && record.course_code.trim().length > 0;

        if (
            !hasValidGrade
            || !hasValidCourse
            || recordedTimestamp === null
            || recordedTimestamp > analysisTimestamp
        ) {
            continue;
        }

        const courseCode = record.course_code;
        const courseGrades = gradesByCourse.get(courseCode) || [];
        courseGrades.push({
            grade: record.grade_percentage,
            recordedTimestamp,
            index
        });
        gradesByCourse.set(courseCode, courseGrades);
    }

    const courseConcerns = [];
    for (const courseGrades of gradesByCourse.values()) {
        if (courseGrades.length < 2) {
            continue;
        }

        courseGrades.sort((left, right) => (
            right.recordedTimestamp - left.recordedTimestamp
            || right.index - left.index
        ));

        const currentGrade = courseGrades[0].grade;
        const previousGrade = courseGrades[1].grade;
        const gradeDrop = Math.max(previousGrade - currentGrade, 0);
        const concern = Math.min(
            gradeDrop / ACADEMIC_ENGAGEMENT_CONFIG.gradeDropCap,
            1
        ) * 100;
        courseConcerns.push(clampScore(concern));
    }

    if (courseConcerns.length === 0) {
        return {
            concern: null,
            coursesWithGradeComparison: 0
        };
    }

    const totalConcern = courseConcerns.reduce((total, concern) => total + concern, 0);
    return {
        concern: clampScore(totalConcern / courseConcerns.length),
        coursesWithGradeComparison: courseConcerns.length
    };
}

function calculateAcademicWorkloadConcern(value) {
    if (value === null || value === undefined) {
        return null;
    }

    const { minimum, maximum } = ACADEMIC_ENGAGEMENT_CONFIG.workloadScale;
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
        throw new RangeError("academicWorkload must be an integer between 1 and 5 or null");
    }

    return clampScore(((value - minimum) / (maximum - minimum)) * 100);
}

function calculateMissedRequirementConcern(records) {
    const summary = getRequirementSummary(getUniqueRecords(records));
    return calculateRequirementRatio(summary.missedRequirements, summary.totalRequirements);
}

function calculateLateRequirementConcern(records) {
    const summary = getRequirementSummary(getUniqueRecords(records));
    return calculateRequirementRatio(summary.lateRequirements, summary.totalRequirements);
}

function calculateDeadlinePressureConcern(records, analysisDate) {
    const analysisTimestamp = parseAnalysisDate(analysisDate);
    const upcomingDeadlines = getUpcomingDeadlineCount(
        getUniqueRecords(records),
        analysisTimestamp
    );

    return clampScore(Math.min(
        upcomingDeadlines / ACADEMIC_ENGAGEMENT_CONFIG.deadlineCountCap,
        1
    ) * 100);
}

function calculateGradeDeclineConcern(records, analysisDate) {
    const analysisTimestamp = parseAnalysisDate(analysisDate);
    return getGradeDeclineSummary(
        getUniqueRecords(records),
        analysisTimestamp
    ).concern;
}

function calculateAcademicEngagementScore(input) {
    if (!isPlainObject(input)) {
        throw new TypeError("input must be an object");
    }

    const analysisTimestamp = parseAnalysisDate(input.analysisDate);
    const uniqueRecords = getUniqueRecords(input.academicRecords);
    const requirements = getRequirementSummary(uniqueRecords);
    const upcomingDeadlines = getUpcomingDeadlineCount(uniqueRecords, analysisTimestamp);
    const gradeDecline = getGradeDeclineSummary(uniqueRecords, analysisTimestamp);

    const components = {
        academicWorkloadConcern: calculateAcademicWorkloadConcern(input.academicWorkload),
        missedRequirementConcern: calculateRequirementRatio(
            requirements.missedRequirements,
            requirements.totalRequirements
        ),
        lateRequirementConcern: calculateRequirementRatio(
            requirements.lateRequirements,
            requirements.totalRequirements
        ),
        deadlinePressureConcern: clampScore(Math.min(
            upcomingDeadlines / ACADEMIC_ENGAGEMENT_CONFIG.deadlineCountCap,
            1
        ) * 100),
        gradeDeclineConcern: gradeDecline.concern
    };

    let weightedTotal = 0;
    let availableWeight = 0;
    for (const [component, weight] of Object.entries(ACADEMIC_ENGAGEMENT_CONFIG.weights)) {
        const concern = components[component];
        if (concern === null || concern === undefined) {
            continue;
        }

        weightedTotal += concern * weight;
        availableWeight += weight;
    }

    const score = availableWeight === 0
        ? 0
        : roundScore(clampScore(weightedTotal / availableWeight));

    return {
        score,
        components,
        counts: {
            totalRequirements: requirements.totalRequirements,
            missedRequirements: requirements.missedRequirements,
            lateRequirements: requirements.lateRequirements,
            upcomingDeadlines,
            coursesWithGradeComparison: gradeDecline.coursesWithGradeComparison
        }
    };
}

module.exports = {
    calculateAcademicWorkloadConcern,
    calculateMissedRequirementConcern,
    calculateLateRequirementConcern,
    calculateDeadlinePressureConcern,
    calculateGradeDeclineConcern,
    calculateAcademicEngagementScore
};
