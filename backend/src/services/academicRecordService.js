const ACADEMIC_RECORD_SELECT = [
    "id",
    "student_id",
    "source",
    "course_code",
    "course_name",
    "record_type",
    "title",
    "due_at",
    "submitted_at",
    "submission_status",
    "score",
    "max_score",
    "grade_percentage",
    "recorded_at",
    "created_at",
    "updated_at"
].join(", ");

const SOURCES = new Set(["manual", "mock"]);
const RECORD_TYPES = new Set([
    "assignment",
    "assessment",
    "grade_snapshot",
    "engagement_snapshot"
]);
const SUBMISSION_STATUSES = new Set([
    "upcoming",
    "on_time",
    "late",
    "missed",
    "not_applicable"
]);
const EDITABLE_FIELDS = new Set([
    "course_code",
    "course_name",
    "record_type",
    "title",
    "due_at",
    "submitted_at",
    "submission_status",
    "score",
    "max_score"
]);
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

function normalizeTimestamp(value, fieldName) {
    if (value === null || value === undefined) {
        return null;
    }

    if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
        throw createServiceError(`${fieldName} must be a valid ISO date-time string or null`);
    }

    return new Date(value).toISOString();
}

function normalizeDateQuery(value, fieldName) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw createServiceError(`${fieldName} must be a valid date in YYYY-MM-DD format`);
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));
    if (
        date.getUTCFullYear() !== year
        || date.getUTCMonth() !== month - 1
        || date.getUTCDate() !== day
    ) {
        throw createServiceError(`${fieldName} must be a valid date in YYYY-MM-DD format`);
    }

    return value;
}

function normalizeEnum(value, fieldName, allowedValues) {
    if (typeof value !== "string" || !allowedValues.has(value)) {
        throw createServiceError(`${fieldName} is invalid`);
    }

    return value;
}

function normalizeNumber(value, fieldName, minimum = 0) {
    if (value === null) {
        return null;
    }

    if (typeof value !== "number" || !Number.isFinite(value) || value < minimum) {
        throw createServiceError(`${fieldName} must be a number greater than or equal to ${minimum} or null`);
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

function assertScorePair(record) {
    const hasScore = record.score !== null && record.score !== undefined;
    const hasMaxScore = record.max_score !== null && record.max_score !== undefined;
    if (hasScore !== hasMaxScore) {
        throw createServiceError("score and max_score must either both be supplied or both be null");
    }
}

function normalizeRecordInput(payload, { isCreate = false, allowRecordedAt = false } = {}) {
    if (!isPlainObject(payload)) {
        throw createServiceError("Request body must be a JSON object");
    }

    const allowedFields = new Set(EDITABLE_FIELDS);
    if (allowRecordedAt) {
        allowedFields.add("recorded_at");
    }

    const keys = Object.keys(payload);
    if (!isCreate && keys.length === 0) {
        throw createServiceError("At least one academic-record field is required");
    }

    for (const field of keys) {
        if (!allowedFields.has(field)) {
            throw createServiceError(`${field} is not an editable academic-record field`);
        }
    }

    if (isCreate) {
        for (const field of ["course_code", "course_name", "record_type", "title"]) {
            if (!hasOwn(payload, field)) {
                throw createServiceError(`${field} is required`);
            }
        }
    }

    const record = {};
    for (const [field, value] of Object.entries(payload)) {
        if (field === "course_code" || field === "course_name" || field === "title") {
            record[field] = normalizeRequiredText(value, field);
            continue;
        }
        if (field === "record_type") {
            record[field] = normalizeEnum(value, field, RECORD_TYPES);
            continue;
        }
        if (field === "due_at" || field === "submitted_at" || field === "recorded_at") {
            record[field] = normalizeTimestamp(value, field);
            continue;
        }
        if (field === "submission_status") {
            record[field] = normalizeEnum(value, field, SUBMISSION_STATUSES);
            continue;
        }
        if (field === "score") {
            record[field] = normalizeNumber(value, field, 0);
            continue;
        }
        if (field === "max_score") {
            record[field] = normalizeNumber(value, field, Number.EPSILON);
        }
    }

    return record;
}

function normalizeListOptions(query = {}) {
    if (!isPlainObject(query)) {
        throw createServiceError("Query parameters must be an object");
    }

    const allowedFields = new Set([
        "limit",
        "offset",
        "source",
        "record_type",
        "course_code",
        "due_from",
        "due_to"
    ]);
    for (const field of Object.keys(query)) {
        if (!allowedFields.has(field)) {
            throw createServiceError(`${field} is not a supported query parameter`);
        }
    }

    const dueFrom = query.due_from === undefined ? null : normalizeDateQuery(query.due_from, "due_from");
    const dueTo = query.due_to === undefined ? null : normalizeDateQuery(query.due_to, "due_to");
    if (dueFrom && dueTo && dueFrom > dueTo) {
        throw createServiceError("due_from must be on or before due_to");
    }

    return {
        limit: normalizePaginationValue(query.limit, "limit", 25, 1, 100),
        offset: normalizePaginationValue(query.offset, "offset", 0, 0, 100000),
        source: query.source === undefined ? null : normalizeEnum(query.source, "source", SOURCES),
        recordType: query.record_type === undefined
            ? null
            : normalizeEnum(query.record_type, "record_type", RECORD_TYPES),
        courseCode: query.course_code === undefined
            ? null
            : normalizeRequiredText(query.course_code, "course_code"),
        dueFrom,
        dueTo
    };
}

function throwDatabaseError(error, operation) {
    throw createServiceError(`Unable to ${operation} the academic record`, 500);
}

async function listAcademicRecords(supabase, studentId, query) {
    const options = normalizeListOptions(query);
    let request = supabase
        .from("academic_records")
        .select(ACADEMIC_RECORD_SELECT, { count: "exact" })
        .eq("student_id", studentId);

    if (options.source) {
        request = request.eq("source", options.source);
    }
    if (options.recordType) {
        request = request.eq("record_type", options.recordType);
    }
    if (options.courseCode) {
        request = request.eq("course_code", options.courseCode);
    }
    if (options.dueFrom) {
        request = request.gte("due_at", `${options.dueFrom}T00:00:00.000Z`);
    }
    if (options.dueTo) {
        request = request.lte("due_at", `${options.dueTo}T23:59:59.999Z`);
    }

    const { data, error, count } = await request
        .order("due_at", { ascending: true, nullsFirst: false })
        .order("id", { ascending: true })
        .range(options.offset, options.offset + options.limit - 1);

    if (error) {
        throw createServiceError("Unable to retrieve academic records", 500);
    }

    const records = data || [];
    const total = count || 0;
    return {
        records,
        pagination: {
            limit: options.limit,
            offset: options.offset,
            total,
            has_more: options.offset + records.length < total
        }
    };
}

async function getAcademicRecord(supabase, studentId, recordId) {
    const normalizedRecordId = normalizeUuid(recordId, "Academic record id");
    const { data, error } = await supabase
        .from("academic_records")
        .select(ACADEMIC_RECORD_SELECT)
        .eq("id", normalizedRecordId)
        .eq("student_id", studentId)
        .maybeSingle();

    if (error) {
        throw createServiceError("Unable to retrieve the academic record", 500);
    }
    if (!data) {
        throw createServiceError("Academic record not found", 404);
    }

    return data;
}

async function getEditableManualAcademicRecord(supabase, studentId, recordId) {
    const record = await getAcademicRecord(supabase, studentId, recordId);
    if (record.source !== "manual") {
        throw createServiceError("Mock academic records cannot be modified", 403);
    }
    return record;
}

async function createAcademicRecord(supabase, studentId, payload) {
    const record = normalizeRecordInput(payload, { isCreate: true });
    assertScorePair(record);

    const { data, error } = await supabase
        .from("academic_records")
        .insert({ ...record, student_id: studentId, source: "manual" })
        .select(ACADEMIC_RECORD_SELECT)
        .single();

    if (error) {
        throwDatabaseError(error, "create");
    }

    return data;
}

async function updateAcademicRecord(supabase, studentId, recordId, payload) {
    const changes = normalizeRecordInput(payload);
    const currentRecord = await getEditableManualAcademicRecord(supabase, studentId, recordId);
    assertScorePair({ ...currentRecord, ...changes });

    const { data, error } = await supabase
        .from("academic_records")
        .update(changes)
        .eq("id", currentRecord.id)
        .eq("student_id", studentId)
        .eq("source", "manual")
        .select(ACADEMIC_RECORD_SELECT)
        .maybeSingle();

    if (error) {
        throwDatabaseError(error, "update");
    }
    if (!data) {
        throw createServiceError("Academic record not found", 404);
    }

    return data;
}

async function deleteAcademicRecord(supabase, studentId, recordId) {
    const currentRecord = await getEditableManualAcademicRecord(supabase, studentId, recordId);
    const { data, error } = await supabase
        .from("academic_records")
        .delete()
        .eq("id", currentRecord.id)
        .eq("student_id", studentId)
        .eq("source", "manual")
        .select("id")
        .maybeSingle();

    if (error) {
        throwDatabaseError(error, "delete");
    }
    if (!data) {
        throw createServiceError("Academic record not found", 404);
    }
}

function getServiceSupabase() {
    return require("../config/supabaseClient").serviceSupabase;
}

async function createMockAcademicRecord(payload, serviceClient = getServiceSupabase()) {
    if (!serviceClient) {
        throw createServiceError(
            "SUPABASE_SERVICE_ROLE_KEY is required to create mock academic records",
            503
        );
    }
    if (!isPlainObject(payload)) {
        throw createServiceError("Academic record must be a JSON object");
    }

    const { student_id: studentId, ...recordPayload } = payload;
    const record = normalizeRecordInput(recordPayload, { isCreate: true, allowRecordedAt: true });
    assertScorePair(record);

    const { data, error } = await serviceClient
        .from("academic_records")
        .insert({ ...record, student_id: normalizeUuid(studentId, "student_id"), source: "mock" })
        .select(ACADEMIC_RECORD_SELECT)
        .single();

    if (error) {
        throwDatabaseError(error, "create mock");
    }

    return data;
}

module.exports = {
    createAcademicRecord,
    listAcademicRecords,
    getAcademicRecord,
    updateAcademicRecord,
    deleteAcademicRecord,
    createMockAcademicRecord
};
