const ACADEMIC_RECORD_SELECT = [
    "id",
    "student_id",
    "source",
    "external_record_id",
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

const SOURCES = new Set(["canvas", "mock", "manual"]);
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
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

function normalizeRequiredText(value, fieldName) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw createServiceError(`${fieldName} must be a non-empty string`);
    }

    return value.trim();
}

function normalizeOptionalText(value, fieldName) {
    if (value === null || value === undefined) {
        return null;
    }

    return normalizeRequiredText(value, fieldName);
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

function normalizeNumber(value, fieldName, { minimum = 0, required = false } = {}) {
    if ((value === undefined || value === null) && !required) {
        return null;
    }

    if (typeof value !== "number" || !Number.isFinite(value) || value < minimum) {
        throw createServiceError(`${fieldName} must be a number greater than or equal to ${minimum}`);
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

function normalizeImportRecord(payload) {
    if (!isPlainObject(payload)) {
        throw createServiceError("Academic record must be a JSON object");
    }

    const allowedFields = new Set([
        "student_id",
        "source",
        "external_record_id",
        "course_code",
        "course_name",
        "record_type",
        "title",
        "due_at",
        "submitted_at",
        "submission_status",
        "score",
        "max_score",
        "recorded_at"
    ]);

    for (const field of Object.keys(payload)) {
        if (!allowedFields.has(field)) {
            throw createServiceError(`${field} is not an importable academic-record field`);
        }
    }

    const score = normalizeNumber(payload.score, "score");
    const maxScore = normalizeNumber(payload.max_score, "max_score", { minimum: Number.EPSILON });
    if ((score === null) !== (maxScore === null)) {
        throw createServiceError("score and max_score must either both be supplied or both be null");
    }

    return {
        student_id: normalizeUuid(payload.student_id, "student_id"),
        source: payload.source === undefined ? "mock" : normalizeEnum(payload.source, "source", SOURCES),
        external_record_id: normalizeOptionalText(payload.external_record_id, "external_record_id"),
        course_code: normalizeRequiredText(payload.course_code, "course_code"),
        course_name: normalizeRequiredText(payload.course_name, "course_name"),
        record_type: normalizeEnum(payload.record_type, "record_type", RECORD_TYPES),
        title: normalizeRequiredText(payload.title, "title"),
        due_at: normalizeTimestamp(payload.due_at, "due_at"),
        submitted_at: normalizeTimestamp(payload.submitted_at, "submitted_at"),
        submission_status: payload.submission_status === undefined
            ? "not_applicable"
            : normalizeEnum(payload.submission_status, "submission_status", SUBMISSION_STATUSES),
        score,
        max_score: maxScore,
        recorded_at: normalizeTimestamp(payload.recorded_at, "recorded_at")
    };
}

function toDatabaseRecord(record) {
    const { recorded_at: recordedAt, ...databaseRecord } = record;
    return recordedAt ? { ...databaseRecord, recorded_at: recordedAt } : databaseRecord;
}

function getServiceSupabase() {
    return require("../config/supabaseClient").serviceSupabase;
}

async function findImportedRecord(serviceClient, record) {
    const { data, error } = await serviceClient
        .from("academic_records")
        .select("id")
        .eq("student_id", record.student_id)
        .eq("source", record.source)
        .eq("external_record_id", record.external_record_id)
        .maybeSingle();

    if (error) {
        throw createServiceError("Unable to look up the academic record for import", 500);
    }

    return data;
}

async function updateImportedRecord(serviceClient, id, databaseRecord) {
    const { data, error } = await serviceClient
        .from("academic_records")
        .update(databaseRecord)
        .eq("id", id)
        .select(ACADEMIC_RECORD_SELECT)
        .single();

    if (error) {
        throw createServiceError("Unable to update the imported academic record", 500);
    }

    return data;
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

    const total = count || 0;
    return {
        records: data || [],
        pagination: {
            limit: options.limit,
            offset: options.offset,
            total,
            has_more: options.offset + (data || []).length < total
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

async function importAcademicRecord(payload, serviceClient = getServiceSupabase()) {
    if (!serviceClient) {
        throw createServiceError(
            "SUPABASE_SERVICE_ROLE_KEY is required to import academic records",
            503
        );
    }

    const record = normalizeImportRecord(payload);
    const databaseRecord = toDatabaseRecord(record);
    if (record.external_record_id) {
        const existing = await findImportedRecord(serviceClient, record);
        if (existing) {
            return updateImportedRecord(serviceClient, existing.id, databaseRecord);
        }
    }

    const { data, error } = await serviceClient
        .from("academic_records")
        .insert(databaseRecord)
        .select(ACADEMIC_RECORD_SELECT)
        .single();

    if (error && error.code === "23505" && record.external_record_id) {
        const existing = await findImportedRecord(serviceClient, record);
        if (existing) {
            return updateImportedRecord(serviceClient, existing.id, databaseRecord);
        }
    }

    if (error) {
        throw createServiceError("Unable to import the academic record", 500);
    }
    return data;
}

module.exports = {
    listAcademicRecords,
    getAcademicRecord,
    importAcademicRecord
};
