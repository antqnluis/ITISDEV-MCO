const {
    publicSupabase,
    serviceSupabase,
    createAuthenticatedSupabaseClient,
    signOutSession
} = require("../config/supabaseClient");

const STUDENT_SELECT = [
    "id",
    "student_number",
    "first_name",
    "last_name",
    "consent_given",
    "consented_at",
    "privacy_notice_version",
    "created_at",
    "updated_at"
].join(", ");

const EDITABLE_STUDENT_FIELDS = new Set([
    "first_name",
    "last_name"
]);

function createServiceError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function getRequiredString(value, fieldName) {
    if (typeof value !== "string" || value.trim().length === 0) {
        throw createServiceError(`${fieldName} is required`, 400);
    }

    return value.trim();
}

function getStudentName(value, fieldName) {
    const normalized = getRequiredString(value, fieldName);

    if (normalized.length > 100) {
        throw createServiceError(`${fieldName} must be at most 100 characters`, 400);
    }

    return normalized;
}

function isPlainObject(value) {
    return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeStudentUpdateInput(payload) {
    if (!isPlainObject(payload)) {
        throw createServiceError("Request body must be a JSON object");
    }

    const fields = Object.keys(payload);
    if (fields.length === 0) {
        throw createServiceError("At least one student field is required");
    }

    const student = {};
    for (const field of fields) {
        if (!EDITABLE_STUDENT_FIELDS.has(field)) {
            throw createServiceError(`${field} is not an editable student field`);
        }
        student[field] = getStudentName(payload[field], field);
    }

    return student;
}

function getAuthErrorStatus(error, fallbackStatus = 400) {
    const message = error.message ? error.message.toLowerCase() : "";

    if (error.code === "23505" || message.includes("duplicate") || message.includes("already")) {
        return 409;
    }

    return error.status || fallbackStatus;
}

function toSession(session, missingSessionMessage = "Supabase did not return an active session") {
    if (!session || !session.access_token || !session.refresh_token) {
        throw createServiceError(missingSessionMessage, 503);
    }

    return {
        access_token: session.access_token,
        refresh_token: session.refresh_token,
        expires_in: session.expires_in,
        expires_at: session.expires_at,
        token_type: session.token_type
    };
}

function toUser(user) {
    return {
        id: user.id,
        email: user.email,
        created_at: user.created_at
    };
}

function getRegistrationAdmin() {
    const admin = serviceSupabase?.auth?.admin;

    if (!admin || typeof admin.deleteUser !== "function") {
        throw createServiceError(
            "Registration requires SUPABASE_SERVICE_ROLE_KEY to be configured",
            503
        );
    }

    return admin;
}

async function removeIncompleteAuthUser(admin, userId) {
    try {
        const { error } = await admin.deleteUser(userId);
        if (error) {
            throw error;
        }
    } catch {
        throw createServiceError(
            "Registration failed and the incomplete account could not be removed",
            500
        );
    }
}

async function registerStudent({ email, password, student_number, first_name, last_name } = {}) {
    const normalizedEmail = getRequiredString(email, "email").toLowerCase();
    const normalizedPassword = getRequiredString(password, "password");
    const normalizedStudentNumber = getRequiredString(student_number, "student_number");
    const normalizedFirstName = getStudentName(first_name, "first_name");
    const normalizedLastName = getStudentName(last_name, "last_name");

    if (normalizedStudentNumber.length < 4 || normalizedStudentNumber.length > 30) {
        throw createServiceError("student_number must be between 4 and 30 characters", 400);
    }

    const registrationAdmin = getRegistrationAdmin();
    const { data: authData, error: authError } = await publicSupabase.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword
    });

    if (authError) {
        throw createServiceError(authError.message, getAuthErrorStatus(authError));
    }

    if (!authData.user || !authData.user.id) {
        throw createServiceError("User registration did not return an auth user", 400);
    }

    try {
        const session = toSession(
            authData.session,
            "Registration requires Supabase email confirmation to be disabled."
        );
        const studentSupabase = createAuthenticatedSupabaseClient(session.access_token);

        const { data: student, error: studentError } = await studentSupabase
            .from("students")
            .insert({
                id: authData.user.id,
                student_number: normalizedStudentNumber,
                first_name: normalizedFirstName,
                last_name: normalizedLastName
            })
            .select(STUDENT_SELECT)
            .single();

        if (studentError) {
            if (studentError.code === "23505") {
                throw createServiceError("student_number is already registered", 409);
            }

            throw createServiceError(
                "Registration could not create the student record",
                500
            );
        }

        return {
            user: toUser(authData.user),
            session,
            student: {
                ...student,
                onboarding_completed: false
            }
        };
    } catch (error) {
        await removeIncompleteAuthUser(registrationAdmin, authData.user.id);
        throw error;
    }
}

async function loginStudent({ email, password } = {}) {
    const normalizedEmail = getRequiredString(email, "email").toLowerCase();
    const normalizedPassword = getRequiredString(password, "password");

    const { data, error } = await publicSupabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword
    });

    if (error) {
        throw createServiceError("Invalid email or password", 401);
    }

    return {
        user: toUser(data.user),
        session: toSession(data.session)
    };
}

async function getCurrentStudent(supabase, userId) {
    const { data, error } = await supabase
        .from("students")
        .select(STUDENT_SELECT)
        .eq("id", userId)
        .maybeSingle();

    if (error) {
        throw createServiceError("Unable to retrieve the current student", 500);
    }

    if (!data) {
        throw createServiceError("Student record not found", 404);
    }

    const { data: profile, error: profileError } = await supabase
        .from("student_profiles")
        .select("onboarding_completed_at")
        .eq("student_id", userId)
        .maybeSingle();

    if (profileError) {
        throw createServiceError("Unable to retrieve the current student", 500);
    }

    return {
        ...data,
        onboarding_completed: Boolean(profile?.onboarding_completed_at)
    };
}

async function updateCurrentStudent(supabase, userId, payload) {
    const student = normalizeStudentUpdateInput(payload);
    const { data, error } = await supabase
        .from("students")
        .update(student)
        .eq("id", userId)
        .select(STUDENT_SELECT)
        .maybeSingle();

    if (error) {
        throw createServiceError("Unable to update the current student", 500);
    }

    if (!data) {
        throw createServiceError("Student record not found", 404);
    }

    return data;
}

async function logoutStudent(accessToken) {
    await signOutSession(accessToken);
}

module.exports = {
    registerStudent,
    loginStudent,
    getCurrentStudent,
    updateCurrentStudent,
    logoutStudent
};
