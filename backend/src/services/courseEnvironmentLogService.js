const { normalizeMondayDate } = require("../utils/weekDate");

const COURSE_ENVIRONMENT_LOG_FIELDS = new Set([
    "check_in_id",
    "course_code",
    "course_name",
    "week_start",
    "workload_difficulty",
    "unclear_instruction_level",
    "grading_concern_level",
    "professor_approachability_concern",
    "groupmate_issue_level",
    "concern_notes"
]);

const RATING_FIELDS = new Set([
    "workload_difficulty",
    "unclear_instruction_level",
    "grading_concern_level",
    "professor_approachability_concern",
    "groupmate_issue_level"
]);

const COURSE_ENVIRONMENT_LOG_SELECT = [
    "id",
    "student_id",
    "check_in_id",
    "course_code",
    "course_name",
    "week_start",
    "workload_difficulty",
    "unclear_instruction_level",
    "grading_concern_level",
    "professor_approachability_concern",
    "groupmate_issue_level",
    "concern_notes",
    "created_at",
    "updated_at"
].join(", ");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function createServiceError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function hasOwn(object, property) {
    return Object.prototype.hasOwnProperty.call(object, property);
}

function normalizeUuid(value, fieldName) {
    if (typeof value !== "string" || !UUID_PATTERN.test(value)) {
        throw createServiceError(`${fieldName} must be a valid UUID`);
    }

    return value;
}

function normalizeRequiredText(value, fieldName) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw createServiceError(`${fieldName} must be a non-empty string`);
    }

    return value.trim();
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

function normalizeLogInput(payload, { isCreate = false } = {}) {
    if (!isPlainObject(payload)) {
        throw createServiceError("Request body must be a JSON object");
    }

    const keys = Object.keys(payload);
    if (!isCreate && keys.length === 0) {
        throw createServiceError("At least one course-environment-log field is required");
    }

    for (const key of keys) {
        if (!COURSE_ENVIRONMENT_LOG_FIELDS.has(key)) {
            throw createServiceError(`${key} is not an editable course-environment-log field`);
        }
    }

    if (isCreate) {
        for (const field of ["course_code", "course_name", "week_start"]) {
            if (!hasOwn(payload, field)) {
                throw createServiceError(`${field} is required`);
            }
        }
    }

    const normalized = {};
    for (const [field, value] of Object.entries(payload)) {
        if (field === "course_code" || field === "course_name") {
            normalized[field] = normalizeRequiredText(value, field);
            continue;
        }

        if (field === "week_start") {
            normalized[field] = normalizeMondayDate(value);
            continue;
        }

        if (field === "check_in_id") {
            normalized[field] = value === null ? null : normalizeUuid(value, field);
            continue;
        }

        if (RATING_FIELDS.has(field)) {
            if (value !== null && (!Number.isInteger(value) || value < 1 || value > 5)) {
                throw createServiceError(`${field} must be an integer between 1 and 5 or null`);
            }
            normalized[field] = value;
            continue;
        }

        if (field === "concern_notes") {
            if (value === null) {
                normalized[field] = null;
                continue;
            }
            if (typeof value !== "string") {
                throw createServiceError("concern_notes must be a string or null");
            }

            const notes = value.trim();
            if (notes.length > 4000) {
                throw createServiceError("concern_notes must be at most 4000 characters");
            }
            normalized[field] = notes || null;
        }
    }

    return normalized;
}

function assertLogHasContent(log) {
    if (![...RATING_FIELDS].some((field) => log[field] !== null && log[field] !== undefined)
        && !log.concern_notes) {
        throw createServiceError("At least one concern rating or concern_notes is required");
    }
}

function normalizeListOptions(query = {}) {
    if (!isPlainObject(query)) {
        throw createServiceError("Query parameters must be an object");
    }

    const allowedFields = new Set(["limit", "offset", "week_start", "course_code", "check_in_id"]);
    for (const field of Object.keys(query)) {
        if (!allowedFields.has(field)) {
            throw createServiceError(`${field} is not a supported query parameter`);
        }
    }

    return {
        limit: normalizePaginationValue(query.limit, "limit", 25, 1, 100),
        offset: normalizePaginationValue(query.offset, "offset", 0, 0, 100000),
        weekStart: query.week_start === undefined ? null : normalizeMondayDate(query.week_start),
        courseCode: query.course_code === undefined
            ? null
            : normalizeRequiredText(query.course_code, "course_code"),
        checkInId: query.check_in_id === undefined
            ? null
            : normalizeUuid(query.check_in_id, "check_in_id")
    };
}

async function assertCheckInBelongsToStudent(supabase, studentId, checkInId) {
    const { data, error } = await supabase
        .from("weekly_check_ins")
        .select("id")
        .eq("id", checkInId)
        .eq("student_id", studentId)
        .maybeSingle();

    if (error) {
        throw createServiceError("Unable to verify the weekly check-in", 500);
    }
    if (!data) {
        throw createServiceError("Weekly check-in not found", 404);
    }
}

function throwDatabaseError(error, operation) {
    if (error.code === "23505") {
        throw createServiceError("A course-environment log already exists for this course and week", 409);
    }

    throw createServiceError(`Unable to ${operation} the course-environment log`, 500);
}

async function createCourseEnvironmentLog(supabase, studentId, payload) {
    const log = normalizeLogInput(payload, { isCreate: true });
    assertLogHasContent(log);
    if (log.check_in_id) {
        await assertCheckInBelongsToStudent(supabase, studentId, log.check_in_id);
    }

    const { data, error } = await supabase
        .from("course_environment_logs")
        .insert({ ...log, student_id: studentId })
        .select(COURSE_ENVIRONMENT_LOG_SELECT)
        .single();

    if (error) {
        throwDatabaseError(error, "create");
    }

    return data;
}

async function listCourseEnvironmentLogs(supabase, studentId, query) {
    const options = normalizeListOptions(query);
    let request = supabase
        .from("course_environment_logs")
        .select(COURSE_ENVIRONMENT_LOG_SELECT, { count: "exact" })
        .eq("student_id", studentId);

    if (options.weekStart) {
        request = request.eq("week_start", options.weekStart);
    }
    if (options.courseCode) {
        request = request.eq("course_code", options.courseCode);
    }
    if (options.checkInId) {
        request = request.eq("check_in_id", options.checkInId);
    }

    const { data, error, count } = await request
        .order("week_start", { ascending: false })
        .order("course_code", { ascending: true })
        .order("id", { ascending: true })
        .range(options.offset, options.offset + options.limit - 1);

    if (error) {
        throw createServiceError("Unable to retrieve course-environment logs", 500);
    }

    const logs = data || [];
    const total = count || 0;
    return {
        logs,
        pagination: {
            limit: options.limit,
            offset: options.offset,
            total,
            has_more: options.offset + logs.length < total
        }
    };
}

async function getCourseEnvironmentLog(supabase, studentId, logId) {
    const normalizedLogId = normalizeUuid(logId, "Course-environment log id");
    const { data, error } = await supabase
        .from("course_environment_logs")
        .select(COURSE_ENVIRONMENT_LOG_SELECT)
        .eq("id", normalizedLogId)
        .eq("student_id", studentId)
        .maybeSingle();

    if (error) {
        throw createServiceError("Unable to retrieve the course-environment log", 500);
    }
    if (!data) {
        throw createServiceError("Course-environment log not found", 404);
    }

    return data;
}

async function updateCourseEnvironmentLog(supabase, studentId, logId, payload) {
    const log = normalizeLogInput(payload);
    const currentLog = await getCourseEnvironmentLog(supabase, studentId, logId);
    const updatedLog = { ...currentLog, ...log };
    assertLogHasContent(updatedLog);
    if (hasOwn(log, "check_in_id") && log.check_in_id) {
        await assertCheckInBelongsToStudent(supabase, studentId, log.check_in_id);
    }

    const { data, error } = await supabase
        .from("course_environment_logs")
        .update(log)
        .eq("id", currentLog.id)
        .eq("student_id", studentId)
        .select(COURSE_ENVIRONMENT_LOG_SELECT)
        .maybeSingle();

    if (error) {
        throwDatabaseError(error, "update");
    }
    if (!data) {
        throw createServiceError("Course-environment log not found", 404);
    }

    return data;
}

async function deleteCourseEnvironmentLog(supabase, studentId, logId) {
    const normalizedLogId = normalizeUuid(logId, "Course-environment log id");
    const { data, error } = await supabase
        .from("course_environment_logs")
        .delete()
        .eq("id", normalizedLogId)
        .eq("student_id", studentId)
        .select("id")
        .maybeSingle();

    if (error) {
        throwDatabaseError(error, "delete");
    }
    if (!data) {
        throw createServiceError("Course-environment log not found", 404);
    }
}

module.exports = {
    createCourseEnvironmentLog,
    listCourseEnvironmentLogs,
    getCourseEnvironmentLog,
    updateCourseEnvironmentLog,
    deleteCourseEnvironmentLog
};
