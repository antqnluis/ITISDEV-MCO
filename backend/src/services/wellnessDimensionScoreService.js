const {
    calculateAcademicEngagementScore
} = require("../calculators/academicEngagementCalculator");
const {
    calculatePersonalWellbeingScore
} = require("../calculators/personalWellbeingCalculator");
const {
    calculateLogisticalLoadScore
} = require("../calculators/logisticalLoadCalculator");
const {
    calculateRoleLoadScore
} = require("../calculators/roleLoadCalculator");
const {
    calculateCourseEnvironmentScore
} = require("../calculators/courseEnvironmentCalculator");

const WELLNESS_DIMENSION_SCORE_SELECT = [
    "id",
    "student_id",
    "check_in_id",
    "academic_engagement_score",
    "personal_wellbeing_score",
    "logistical_load_score",
    "role_load_score",
    "course_environment_score",
    "calculation_method",
    "calculation_version",
    "calculated_at",
    "created_at",
    "updated_at"
].join(", ");

const CALCULATION_METHODS = new Set(["rule_based", "machine_learning", "hybrid"]);
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const CALCULATION_METHOD = "rule_based";
const CALCULATION_VERSION = "1.0";

const CHECK_IN_SELECT = [
    "id",
    "student_id",
    "week_start",
    "stress_level",
    "mood_level",
    "sleep_quality",
    "motivation_level",
    "burnout_level",
    "energy_level",
    "available_study_hours"
].join(", ");

const PROFILE_CALCULATION_SELECT = [
    "student_id",
    "commute_minutes_per_day",
    "available_study_hours_per_week",
    "has_caregiving_responsibility",
    "caregiving_hours_per_week",
    "work_hours_per_week",
    "is_athlete",
    "athlete_hours_per_week",
    "has_organization_responsibility",
    "organization_hours_per_week"
].join(", ");

const ACADEMIC_RECORD_CALCULATION_SELECT = [
    "id",
    "record_type",
    "course_id",
    "course:courses!academic_records_course_student_fk(code)",
    "due_at",
    "submitted_at",
    "submission_status",
    "grade_percentage",
    "recorded_at"
].join(", ");

const COURSE_LOG_CALCULATION_SELECT = [
    "id",
    "week_start",
    "course_id",
    "course:courses!course_environment_course_student_fk(code, name)",
    "workload_difficulty",
    "unclear_instruction_level",
    "grading_concern_level",
    "professor_approachability_concern",
    "groupmate_issue_level",
    "created_at"
].join(", ");

function createServiceError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeUuid(value, fieldName) {
    if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
        throw createServiceError(`${fieldName} must be a valid UUID`);
    }

    return value;
}

function normalizePaginationValue(value, fieldName, defaultValue, minimum, maximum) {
    if (value === undefined) {
        return defaultValue;
    }

    if (typeof value !== "string" || !/^\d+$/.test(value)) {
        throw createServiceError(`${fieldName} must be an integer`);
    }

    const normalized = Number(value);
    if (!Number.isSafeInteger(normalized) || normalized < minimum || normalized > maximum) {
        throw createServiceError(`${fieldName} must be between ${minimum} and ${maximum}`);
    }

    return normalized;
}

function normalizeCalculationMethod(value) {
    if (typeof value !== "string" || !CALCULATION_METHODS.has(value)) {
        throw createServiceError("calculation_method is invalid");
    }

    return value;
}

function normalizeListOptions(query = {}) {
    if (!isPlainObject(query)) {
        throw createServiceError("Query parameters must be an object");
    }

    const allowedFields = new Set(["limit", "offset", "check_in_id", "calculation_method"]);
    for (const field of Object.keys(query)) {
        if (!allowedFields.has(field)) {
            throw createServiceError(`${field} is not a supported query parameter`);
        }
    }

    return {
        limit: normalizePaginationValue(query.limit, "limit", 25, 1, 100),
        offset: normalizePaginationValue(query.offset, "offset", 0, 0, 100000),
        checkInId: query.check_in_id === undefined
            ? null
            : normalizeUuid(query.check_in_id, "check_in_id"),
        calculationMethod: query.calculation_method === undefined
            ? null
            : normalizeCalculationMethod(query.calculation_method)
    };
}

async function loadCheckIn(supabase, studentId, checkInId) {
    const { data, error } = await supabase
        .from("weekly_check_ins")
        .select(CHECK_IN_SELECT)
        .eq("id", checkInId)
        .eq("student_id", studentId)
        .maybeSingle();

    if (error) {
        throw createServiceError("Unable to retrieve the weekly check-in", 500);
    }
    if (!data) {
        throw createServiceError("Weekly check-in not found", 404);
    }

    return data;
}

async function loadProfile(supabase, studentId) {
    const { data, error } = await supabase
        .from("student_profiles")
        .select(PROFILE_CALCULATION_SELECT)
        .eq("student_id", studentId)
        .maybeSingle();

    if (error) {
        throw createServiceError("Unable to retrieve the student profile", 500);
    }
    if (!data) {
        throw createServiceError(
            "A student profile is required before wellness dimensions can be calculated",
            409
        );
    }

    return data;
}

async function loadAcademicRecords(supabase, studentId) {
    const { data, error } = await supabase
        .from("academic_records")
        .select(ACADEMIC_RECORD_CALCULATION_SELECT)
        .eq("student_id", studentId);

    if (error) {
        throw createServiceError("Unable to retrieve academic records for calculation", 500);
    }

    return data || [];
}

async function loadCourseLogs(supabase, studentId, weekStart) {
    const { data, error } = await supabase
        .from("course_environment_logs")
        .select(COURSE_LOG_CALCULATION_SELECT)
        .eq("student_id", studentId)
        .eq("week_start", weekStart)
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });

    if (error) {
        throw createServiceError("Unable to retrieve course-environment logs for calculation", 500);
    }

    return data || [];
}

function mapCourseLogToCalculationInput(courseLog) {
    return {
        id: courseLog.id,
        weekStart: courseLog.week_start,
        courseCode: courseLog.course.code,
        courseName: courseLog.course.name,
        workloadDifficulty: courseLog.workload_difficulty,
        unclearInstructionLevel: courseLog.unclear_instruction_level,
        gradingConcernLevel: courseLog.grading_concern_level,
        professorApproachabilityConcern: courseLog.professor_approachability_concern,
        groupmateIssueLevel: courseLog.groupmate_issue_level
    };
}

function runDimensionCalculators({ checkIn, profile, academicRecords, courseLogs }) {
    const workloadRatings = courseLogs
        .map((courseLog) => courseLog.workload_difficulty)
        .filter((rating) => Number.isInteger(rating) && rating >= 1 && rating <= 5);
    const academicWorkload = workloadRatings.length > 0 ? Math.max(...workloadRatings) : null;

    try {
        return {
            academic_engagement_score: calculateAcademicEngagementScore({
                academicRecords: academicRecords.map((record) => ({
                    ...record,
                    course_code: record.course.code
                })),
                academicWorkload,
                analysisDate: checkIn.week_start
            }).score,
            personal_wellbeing_score: calculatePersonalWellbeingScore({
                stressLevel: checkIn.stress_level,
                burnoutLevel: checkIn.burnout_level,
                sleepQuality: checkIn.sleep_quality,
                motivationLevel: checkIn.motivation_level,
                moodLevel: checkIn.mood_level,
                energyLevel: checkIn.energy_level
            }).score,
            logistical_load_score: calculateLogisticalLoadScore({
                weeklyAvailableStudyHours: checkIn.available_study_hours,
                profileAvailableStudyHours: profile.available_study_hours_per_week,
                commuteMinutesPerDay: profile.commute_minutes_per_day,
                workHoursPerWeek: profile.work_hours_per_week,
                caregivingHoursPerWeek: profile.caregiving_hours_per_week,
                internetProblems: null
            }).score,
            role_load_score: calculateRoleLoadScore({
                hasCaregivingResponsibility: profile.has_caregiving_responsibility,
                caregivingHoursPerWeek: profile.caregiving_hours_per_week,
                isAthlete: profile.is_athlete,
                athleteHoursPerWeek: profile.athlete_hours_per_week,
                hasOrganizationResponsibility: profile.has_organization_responsibility,
                organizationHoursPerWeek: profile.organization_hours_per_week,
                roleWorkload: null,
                roleHoursCeiling: null
            }).score,
            course_environment_score: calculateCourseEnvironmentScore(
                courseLogs.map(mapCourseLogToCalculationInput)
            ).score
        };
    } catch (error) {
        throw createServiceError("Unable to calculate wellness dimension scores", 500);
    }
}

function assertAllDimensionScoresAreAvailable(scores) {
    const unavailableDimensions = Object.entries(scores)
        .filter(([, score]) => score === null || score === undefined)
        .map(([dimension]) => dimension);

    if (unavailableDimensions.length > 0) {
        throw createServiceError(
            `Cannot calculate unavailable wellness dimensions: ${unavailableDimensions.join(", ")}`,
            409
        );
    }

    const hasInvalidScore = Object.values(scores)
        .some((score) => typeof score !== "number" || !Number.isFinite(score) || score < 0 || score > 100);
    if (hasInvalidScore) {
        throw createServiceError("Unable to calculate valid wellness dimension scores", 500);
    }
}

async function calculateWellnessDimensionScores({
    studentSupabase,
    serviceSupabase,
    studentId,
    checkInId,
    now = new Date()
}) {
    const normalizedCheckInId = normalizeUuid(checkInId, "Weekly check-in id");
    if (!studentSupabase || typeof studentSupabase.from !== "function") {
        throw createServiceError("An authenticated database client is required", 500);
    }
    if (!serviceSupabase || typeof serviceSupabase.from !== "function") {
        throw createServiceError("Wellness dimension calculation is not configured", 503);
    }
    if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
        throw createServiceError("Unable to determine the calculation time", 500);
    }

    const checkIn = await loadCheckIn(studentSupabase, studentId, normalizedCheckInId);
    const [profile, academicRecords, courseLogs] = await Promise.all([
        loadProfile(studentSupabase, studentId),
        loadAcademicRecords(studentSupabase, studentId),
        loadCourseLogs(studentSupabase, studentId, checkIn.week_start)
    ]);
    const scores = runDimensionCalculators({ checkIn, profile, academicRecords, courseLogs });
    assertAllDimensionScoresAreAvailable(scores);

    const values = {
        student_id: studentId,
        check_in_id: normalizedCheckInId,
        ...scores,
        calculation_method: CALCULATION_METHOD,
        calculation_version: CALCULATION_VERSION,
        calculated_at: now.toISOString()
    };
    const { data, error } = await serviceSupabase
        .from("wellness_dimension_scores")
        .upsert(values, { onConflict: "check_in_id" })
        .select(WELLNESS_DIMENSION_SCORE_SELECT)
        .single();

    if (error || !data) {
        throw createServiceError("Unable to store wellness dimension scores", 500);
    }

    return data;
}

async function listWellnessDimensionScores(supabase, studentId, query) {
    const options = normalizeListOptions(query);
    let request = supabase
        .from("wellness_dimension_scores")
        .select(WELLNESS_DIMENSION_SCORE_SELECT, { count: "exact" })
        .eq("student_id", studentId);

    if (options.checkInId) {
        request = request.eq("check_in_id", options.checkInId);
    }
    if (options.calculationMethod) {
        request = request.eq("calculation_method", options.calculationMethod);
    }

    const { data, error, count } = await request
        .order("calculated_at", { ascending: false })
        .order("id", { ascending: false })
        .range(options.offset, options.offset + options.limit - 1);

    if (error) {
        throw createServiceError("Unable to retrieve wellness dimension scores", 500);
    }

    const wellnessDimensionScores = data || [];
    const total = count || 0;
    return {
        wellnessDimensionScores,
        pagination: {
            limit: options.limit,
            offset: options.offset,
            total,
            has_more: options.offset + wellnessDimensionScores.length < total
        }
    };
}

async function getWellnessDimensionScore(supabase, studentId, scoreId) {
    const normalizedScoreId = normalizeUuid(scoreId, "Wellness dimension score id");
    const { data, error } = await supabase
        .from("wellness_dimension_scores")
        .select(WELLNESS_DIMENSION_SCORE_SELECT)
        .eq("id", normalizedScoreId)
        .eq("student_id", studentId)
        .maybeSingle();

    if (error) {
        throw createServiceError("Unable to retrieve the wellness dimension score", 500);
    }
    if (!data) {
        throw createServiceError("Wellness dimension score not found", 404);
    }

    return data;
}

module.exports = {
    calculateWellnessDimensionScores,
    listWellnessDimensionScores,
    getWellnessDimensionScore
};
