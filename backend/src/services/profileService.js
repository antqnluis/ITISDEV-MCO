const PROFILE_FIELDS = new Set([
    "college",
    "program",
    "year_level",
    "current_academic_term",
    "wellness_goals",
    "commute_minutes_per_day",
    "available_study_hours_per_week",
    "has_caregiving_responsibility",
    "caregiving_hours_per_week",
    "is_employed",
    "work_hours_per_week",
    "has_ojt",
    "ojt_hours_per_week",
    "is_athlete",
    "athlete_hours_per_week",
    "has_organization_responsibility",
    "organization_role",
    "organization_hours_per_week",
    "additional_context"
]);

const HOURS_FIELDS = new Set([
    "available_study_hours_per_week",
    "caregiving_hours_per_week",
    "work_hours_per_week",
    "ojt_hours_per_week",
    "athlete_hours_per_week",
    "organization_hours_per_week"
]);

const BOOLEAN_FIELDS = new Set([
    "has_caregiving_responsibility",
    "is_employed",
    "has_ojt",
    "is_athlete",
    "has_organization_responsibility"
]);

const PROFILE_SELECT = [
    "id",
    "student_id",
    "college",
    "program",
    "year_level",
    "current_academic_term",
    "wellness_goals",
    "commute_minutes_per_day",
    "available_study_hours_per_week",
    "has_caregiving_responsibility",
    "caregiving_hours_per_week",
    "is_employed",
    "work_hours_per_week",
    "has_ojt",
    "ojt_hours_per_week",
    "is_athlete",
    "athlete_hours_per_week",
    "has_organization_responsibility",
    "organization_role",
    "organization_hours_per_week",
    "additional_context",
    "onboarding_completed_at",
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

function normalizeRequiredText(value, fieldName) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw createServiceError(`${fieldName} must be a non-empty string`);
    }

    return value.trim();
}

function normalizeOptionalText(value, fieldName, maxLength) {
    if (value === null) {
        return null;
    }

    if (typeof value !== "string") {
        throw createServiceError(`${fieldName} must be a string or null`);
    }

    const normalized = value.trim();

    if (normalized.length > maxLength) {
        throw createServiceError(`${fieldName} must be at most ${maxLength} characters`);
    }

    return normalized || null;
}

function normalizeProfileInput(payload, { isCreate = false } = {}) {
    if (!isPlainObject(payload)) {
        throw createServiceError("Request body must be a JSON object");
    }

    const keys = Object.keys(payload);

    if (!isCreate && keys.length === 0) {
        throw createServiceError("At least one profile field is required");
    }

    for (const key of keys) {
        if (!PROFILE_FIELDS.has(key)) {
            throw createServiceError(`${key} is not an editable profile field`);
        }
    }

    if (isCreate) {
        for (const field of ["college", "program", "year_level", "current_academic_term"]) {
            if (!hasOwn(payload, field)) {
                throw createServiceError(`${field} is required`);
            }
        }
    }

    const normalized = {};

    for (const [field, value] of Object.entries(payload)) {
        if (field === "college" || field === "program") {
            normalized[field] = normalizeRequiredText(value, field);
            continue;
        }

        if (field === "year_level") {
            if (!Number.isInteger(value) || value < 1 || value > 6) {
                throw createServiceError("year_level must be an integer between 1 and 6");
            }
            normalized[field] = value;
            continue;
        }

        if (field === "current_academic_term") {
            if (!Number.isInteger(value) || value < 1 || value > 3) {
                throw createServiceError("current_academic_term must be an integer between 1 and 3");
            }
            normalized[field] = value;
            continue;
        }

        if (field === "wellness_goals") {
            if (!Array.isArray(value) || value.length > 10) {
                throw createServiceError("wellness_goals must be an array with at most 10 items");
            }

            normalized[field] = value.map((goal) => {
                if (typeof goal !== "string" || goal.trim().length === 0) {
                    throw createServiceError("wellness_goals must contain only non-empty strings");
                }
                return goal.trim();
            });
            continue;
        }

        if (field === "commute_minutes_per_day") {
            if (!Number.isInteger(value) || value < 0 || value > 1440) {
                throw createServiceError("commute_minutes_per_day must be an integer between 0 and 1440");
            }
            normalized[field] = value;
            continue;
        }

        if (HOURS_FIELDS.has(field)) {
            if (typeof value !== "number" || !Number.isFinite(value) || value < 0 || value > 168) {
                throw createServiceError(`${field} must be a number between 0 and 168`);
            }
            normalized[field] = value;
            continue;
        }

        if (BOOLEAN_FIELDS.has(field)) {
            if (typeof value !== "boolean") {
                throw createServiceError(`${field} must be a boolean`);
            }
            normalized[field] = value;
            continue;
        }

        if (field === "organization_role") {
            normalized[field] = normalizeOptionalText(value, field, 200);
            continue;
        }

        if (field === "additional_context") {
            normalized[field] = normalizeOptionalText(value, field, 2000);
        }
    }

    if (isCreate && !hasOwn(payload, "wellness_goals")) {
        normalized.wellness_goals = [];
    }

    return normalized;
}

function assertOrganizationRoleIsValid(profile) {
    if (profile.organization_role && !profile.has_organization_responsibility) {
        throw createServiceError(
            "organization_role requires has_organization_responsibility to be true"
        );
    }
}

async function getProfile(supabase, studentId) {
    const { data, error } = await supabase
        .from("student_profiles")
        .select(PROFILE_SELECT)
        .eq("student_id", studentId)
        .maybeSingle();

    if (error) {
        throw createServiceError("Unable to retrieve the student profile", 500);
    }

    if (!data) {
        throw createServiceError("Student profile not found", 404);
    }

    return data;
}

async function createProfile(supabase, studentId, payload) {
    const profile = normalizeProfileInput(payload, { isCreate: true });
    assertOrganizationRoleIsValid({
        has_organization_responsibility: false,
        ...profile
    });

    const { data, error } = await supabase
        .from("student_profiles")
        .insert({
            ...profile,
            student_id: studentId,
            onboarding_completed_at: new Date().toISOString()
        })
        .select(PROFILE_SELECT)
        .single();

    if (error) {
        if (error.code === "23505") {
            throw createServiceError("A student profile already exists", 409);
        }

        throw createServiceError("Unable to create the student profile", 500);
    }

    return data;
}

async function updateProfile(supabase, studentId, payload) {
    const profile = normalizeProfileInput(payload);
    const currentProfile = await getProfile(supabase, studentId);
    assertOrganizationRoleIsValid({
        ...currentProfile,
        ...profile
    });

    const { data, error } = await supabase
        .from("student_profiles")
        .update(profile)
        .eq("student_id", studentId)
        .select(PROFILE_SELECT)
        .maybeSingle();

    if (error) {
        throw createServiceError("Unable to update the student profile", 500);
    }

    if (!data) {
        throw createServiceError("Student profile not found", 404);
    }

    return data;
}

async function deleteProfile(supabase, studentId) {
    const { data, error } = await supabase
        .from("student_profiles")
        .delete()
        .eq("student_id", studentId)
        .select("id")
        .maybeSingle();

    if (error) {
        throw createServiceError("Unable to delete the student profile", 500);
    }

    if (!data) {
        throw createServiceError("Student profile not found", 404);
    }
}

module.exports = {
    createProfile,
    getProfile,
    updateProfile,
    deleteProfile
};
