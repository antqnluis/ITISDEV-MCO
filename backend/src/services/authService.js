const {
    publicSupabase,
    createAuthenticatedSupabaseClient,
    signOutSession
} = require("../config/supabaseClient");

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

async function registerStudent({ email, password, student_number } = {}) {
    const normalizedEmail = getRequiredString(email, "email").toLowerCase();
    const normalizedPassword = getRequiredString(password, "password");
    const normalizedStudentNumber = getRequiredString(student_number, "student_number");

    if (normalizedStudentNumber.length < 4 || normalizedStudentNumber.length > 30) {
        throw createServiceError("student_number must be between 4 and 30 characters", 400);
    }

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

    const session = toSession(
        authData.session,
        "Registration requires Supabase email confirmation to be disabled."
    );
    const studentSupabase = createAuthenticatedSupabaseClient(session.access_token);

    const { data: student, error: studentError } = await studentSupabase
        .from("students")
        .insert({
            id: authData.user.id,
            student_number: normalizedStudentNumber
        })
        .select("id, student_number, consent_given, consented_at, privacy_notice_version, created_at, updated_at")
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
        student
    };
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
        .select("id, student_number, consent_given, consented_at, privacy_notice_version, created_at, updated_at")
        .eq("id", userId)
        .maybeSingle();

    if (error) {
        throw createServiceError("Unable to retrieve the current student", 500);
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
    logoutStudent
};
