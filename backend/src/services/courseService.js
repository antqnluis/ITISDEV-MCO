const COURSE_SELECT = [
    "id",
    "student_id",
    "code",
    "name",
    "created_at",
    "updated_at"
].join(", ");

const EDITABLE_FIELDS = new Set(["code", "name"]);
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

function normalizeCode(value) {
    if (typeof value !== "string") {
        throw createServiceError("code must be a string");
    }

    const code = value.trim().toUpperCase();
    if (code.length < 1 || code.length > 30) {
        throw createServiceError("code must contain between 1 and 30 characters");
    }
    return code;
}

function normalizeName(value) {
    if (typeof value !== "string") {
        throw createServiceError("name must be a string");
    }

    const name = value.trim();
    if (name.length < 1 || name.length > 150) {
        throw createServiceError("name must contain between 1 and 150 characters");
    }
    return name;
}

function normalizeCourseInput(payload, { isCreate = false } = {}) {
    if (!isPlainObject(payload)) {
        throw createServiceError("Request body must be a JSON object");
    }

    const keys = Object.keys(payload);
    if (!isCreate && keys.length === 0) {
        throw createServiceError("At least one course field is required");
    }
    for (const field of keys) {
        if (!EDITABLE_FIELDS.has(field)) {
            throw createServiceError(`${field} is not an editable course field`);
        }
    }
    if (isCreate) {
        for (const field of EDITABLE_FIELDS) {
            if (!hasOwn(payload, field)) {
                throw createServiceError(`${field} is required`);
            }
        }
    }

    const course = {};
    if (hasOwn(payload, "code")) {
        course.code = normalizeCode(payload.code);
    }
    if (hasOwn(payload, "name")) {
        course.name = normalizeName(payload.name);
    }
    return course;
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
    for (const field of Object.keys(query)) {
        if (field !== "limit" && field !== "offset") {
            throw createServiceError(`${field} is not a supported query parameter`);
        }
    }
    return {
        limit: normalizePaginationValue(query.limit, "limit", 25, 1, 100),
        offset: normalizePaginationValue(query.offset, "offset", 0, 0, 100000)
    };
}

function throwDatabaseError(error, operation) {
    if (error?.code === "23505") {
        throw createServiceError("A course with this code already exists", 409);
    }
    if (operation === "delete" && error?.code === "23503") {
        throw createServiceError("Course cannot be deleted while it has linked records or logs", 409);
    }
    throw createServiceError(`Unable to ${operation} the course`, 500);
}

async function createCourse(supabase, studentId, payload) {
    const course = normalizeCourseInput(payload, { isCreate: true });
    const { data, error } = await supabase
        .from("courses")
        .insert({ ...course, student_id: studentId })
        .select(COURSE_SELECT)
        .single();

    if (error) {
        throwDatabaseError(error, "create");
    }
    return data;
}

async function listCourses(supabase, studentId, query) {
    const options = normalizeListOptions(query);
    const { data, error, count } = await supabase
        .from("courses")
        .select(COURSE_SELECT, { count: "exact" })
        .eq("student_id", studentId)
        .order("code", { ascending: true })
        .order("id", { ascending: true })
        .range(options.offset, options.offset + options.limit - 1);

    if (error) {
        throw createServiceError("Unable to retrieve courses", 500);
    }

    const courses = data || [];
    const total = count || 0;
    return {
        courses,
        pagination: {
            limit: options.limit,
            offset: options.offset,
            total,
            has_more: options.offset + courses.length < total
        }
    };
}

async function getCourse(supabase, studentId, courseId) {
    const normalizedCourseId = normalizeUuid(courseId, "Course id");
    const { data, error } = await supabase
        .from("courses")
        .select(COURSE_SELECT)
        .eq("id", normalizedCourseId)
        .eq("student_id", studentId)
        .maybeSingle();

    if (error) {
        throw createServiceError("Unable to retrieve the course", 500);
    }
    if (!data) {
        throw createServiceError("Course not found", 404);
    }
    return data;
}

async function updateCourse(supabase, studentId, courseId, payload) {
    const changes = normalizeCourseInput(payload);
    const currentCourse = await getCourse(supabase, studentId, courseId);
    const { data, error } = await supabase
        .from("courses")
        .update(changes)
        .eq("id", currentCourse.id)
        .eq("student_id", studentId)
        .select(COURSE_SELECT)
        .maybeSingle();

    if (error) {
        throwDatabaseError(error, "update");
    }
    if (!data) {
        throw createServiceError("Course not found", 404);
    }
    return data;
}

async function deleteCourse(supabase, studentId, courseId) {
    const currentCourse = await getCourse(supabase, studentId, courseId);
    const { data, error } = await supabase
        .from("courses")
        .delete()
        .eq("id", currentCourse.id)
        .eq("student_id", studentId)
        .select("id")
        .maybeSingle();

    if (error) {
        throwDatabaseError(error, "delete");
    }
    if (!data) {
        throw createServiceError("Course not found", 404);
    }
}

module.exports = {
    createCourse,
    listCourses,
    getCourse,
    updateCourse,
    deleteCourse
};
