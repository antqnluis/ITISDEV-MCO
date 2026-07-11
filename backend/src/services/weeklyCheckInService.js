const CHECK_IN_FIELDS = new Set([
    "week_start",
    "stress_level",
    "mood_level",
    "sleep_quality",
    "motivation_level",
    "burnout_level",
    "energy_level",
    "available_study_hours",
    "reflection"
]);

const RATING_FIELDS = new Set([
    "stress_level",
    "mood_level",
    "sleep_quality",
    "motivation_level",
    "burnout_level",
    "energy_level"
]);

const REQUIRED_CREATE_FIELDS = ["week_start", ...RATING_FIELDS];

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
    "available_study_hours",
    "reflection",
    "submitted_at",
    "created_at",
    "updated_at"
].join(", ");

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

function normalizeDate(value) {
    if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
        throw createServiceError("week_start must be a valid date in YYYY-MM-DD format");
    }

    const [year, month, day] = value.split("-").map(Number);
    const date = new Date(Date.UTC(year, month - 1, day));

    if (
        date.getUTCFullYear() !== year
        || date.getUTCMonth() !== month - 1
        || date.getUTCDate() !== day
    ) {
        throw createServiceError("week_start must be a valid date in YYYY-MM-DD format");
    }

    return value;
}

function normalizeCheckInInput(payload, { isCreate = false } = {}) {
    if (!isPlainObject(payload)) {
        throw createServiceError("Request body must be a JSON object");
    }

    const keys = Object.keys(payload);

    if (!isCreate && keys.length === 0) {
        throw createServiceError("At least one check-in field is required");
    }

    for (const key of keys) {
        if (!CHECK_IN_FIELDS.has(key)) {
            throw createServiceError(`${key} is not an editable check-in field`);
        }
    }

    if (isCreate) {
        for (const field of REQUIRED_CREATE_FIELDS) {
            if (!hasOwn(payload, field)) {
                throw createServiceError(`${field} is required`);
            }
        }
    }

    const normalized = {};

    for (const [field, value] of Object.entries(payload)) {
        if (field === "week_start") {
            normalized[field] = normalizeDate(value);
            continue;
        }

        if (RATING_FIELDS.has(field)) {
            if (!Number.isInteger(value) || value < 1 || value > 5) {
                throw createServiceError(`${field} must be an integer between 1 and 5`);
            }
            normalized[field] = value;
            continue;
        }

        if (field === "available_study_hours") {
            if (value !== null && (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 168)) {
                throw createServiceError("available_study_hours must be a number between 0 and 168 or null");
            }
            normalized[field] = value;
            continue;
        }

        if (field === "reflection") {
            if (value === null) {
                normalized[field] = null;
                continue;
            }

            if (typeof value !== "string") {
                throw createServiceError("reflection must be a string or null");
            }

            const reflection = value.trim();
            if (reflection.length > 4000) {
                throw createServiceError("reflection must be at most 4000 characters");
            }
            normalized[field] = reflection || null;
        }
    }

    return normalized;
}

function throwDatabaseError(error, operation) {
    if (error.code === "23505") {
        throw createServiceError("A weekly check-in already exists for this week", 409);
    }

    if (error.code === "23503" && operation === "delete") {
        throw createServiceError("This weekly check-in cannot be deleted because it has linked records", 409);
    }

    throw createServiceError(`Unable to ${operation} the weekly check-in`, 500);
}

async function createCheckIn(supabase, studentId, payload) {
    const checkIn = normalizeCheckInInput(payload, { isCreate: true });
    const { data, error } = await supabase
        .from("weekly_check_ins")
        .insert({ ...checkIn, student_id: studentId })
        .select(CHECK_IN_SELECT)
        .single();

    if (error) {
        throwDatabaseError(error, "create");
    }

    return data;
}

async function listCheckIns(supabase, studentId) {
    const { data, error } = await supabase
        .from("weekly_check_ins")
        .select(CHECK_IN_SELECT)
        .eq("student_id", studentId)
        .order("week_start", { ascending: false });

    if (error) {
        throw createServiceError("Unable to retrieve weekly check-ins", 500);
    }

    return data || [];
}

async function getCheckIn(supabase, studentId, checkInId) {
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

async function updateCheckIn(supabase, studentId, checkInId, payload) {
    const checkIn = normalizeCheckInInput(payload);
    const { data, error } = await supabase
        .from("weekly_check_ins")
        .update(checkIn)
        .eq("id", checkInId)
        .eq("student_id", studentId)
        .select(CHECK_IN_SELECT)
        .maybeSingle();

    if (error) {
        throwDatabaseError(error, "update");
    }

    if (!data) {
        throw createServiceError("Weekly check-in not found", 404);
    }

    return data;
}

async function deleteCheckIn(supabase, studentId, checkInId) {
    const { data, error } = await supabase
        .from("weekly_check_ins")
        .delete()
        .eq("id", checkInId)
        .eq("student_id", studentId)
        .select("id")
        .maybeSingle();

    if (error) {
        throwDatabaseError(error, "delete");
    }

    if (!data) {
        throw createServiceError("Weekly check-in not found", 404);
    }
}

module.exports = {
    createCheckIn,
    listCheckIns,
    getCheckIn,
    updateCheckIn,
    deleteCheckIn
};
