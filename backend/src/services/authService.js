const supabase = require("../config/supabaseClient");

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

async function registerStudent({ email, password, student_number } = {}) {
    const normalizedEmail = getRequiredString(email, "email").toLowerCase();
    const normalizedPassword = getRequiredString(password, "password");
    const normalizedStudentNumber = getRequiredString(student_number, "student_number");

    if (normalizedStudentNumber.length < 4 || normalizedStudentNumber.length > 30) {
        throw createServiceError("student_number must be between 4 and 30 characters", 400);
    }

    const { data: authData, error: authError } = await supabase.auth.signUp({
        email: normalizedEmail,
        password: normalizedPassword
    });

    if (authError) {
        throw createServiceError(authError.message, getAuthErrorStatus(authError));
    }

    if (!authData.user || !authData.user.id) {
        throw createServiceError("User registration did not return an auth user", 400);
    }

    const { data: student, error: studentError } = await supabase
        .from("students")
        .insert({
            id: authData.user.id,
            student_number: normalizedStudentNumber
        })
        .select("id, student_number, consent_given, consented_at, privacy_notice_version, created_at, updated_at")
        .single();

    if (studentError) {
        throw createServiceError(
            `Registration created the auth account, but failed to link the student record: ${studentError.message}`,
            getAuthErrorStatus(studentError)
        );
    }

    return {
        user: {
            id: authData.user.id,
            email: authData.user.email,
            created_at: authData.user.created_at
        },
        session: authData.session,
        student
    };
}

async function loginStudent({ email, password } = {}) {
    const normalizedEmail = getRequiredString(email, "email").toLowerCase();
    const normalizedPassword = getRequiredString(password, "password");

    const { data, error } = await supabase.auth.signInWithPassword({
        email: normalizedEmail,
        password: normalizedPassword
    });

    if (error) {
        throw createServiceError(error.message, 401);
    }

    return {
        user: {
            id: data.user.id,
            email: data.user.email,
            created_at: data.user.created_at
        },
        access_token: data.session.access_token,
        refresh_token: data.session.refresh_token,
        expires_in: data.session.expires_in,
        expires_at: data.session.expires_at
    };
}

module.exports = {
    registerStudent,
    loginStudent
};
