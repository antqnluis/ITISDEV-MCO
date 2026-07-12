const PRIVACY_NOTICE_VERSION = "v1.0";
const STUDENT_SELECT = [
    "id",
    "student_number",
    "consent_given",
    "consented_at",
    "privacy_notice_version",
    "created_at",
    "updated_at"
].join(", ");

function createServiceError(message, statusCode = 400) {
    const error = new Error(message);
    error.statusCode = statusCode;
    return error;
}

function validateConsentPayload(payload) {
    if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
        throw createServiceError('Request body must be { "consent": true }');
    }

    const keys = Object.keys(payload);

    if (keys.length !== 1 || keys[0] !== "consent" || payload.consent !== true) {
        throw createServiceError('Request body must be { "consent": true }');
    }
}

async function acceptConsent(supabase, studentId, payload) {
    validateConsentPayload(payload);

    const consentedAt = new Date().toISOString();
    const { data, error } = await supabase
        .from("students")
        .update({
            consent_given: true,
            consented_at: consentedAt,
            privacy_notice_version: PRIVACY_NOTICE_VERSION
        })
        .eq("id", studentId)
        .select(STUDENT_SELECT)
        .maybeSingle();

    if (error) {
        throw createServiceError("Unable to record consent", 500);
    }

    if (!data) {
        throw createServiceError("Student record not found", 404);
    }

    return data;
}

module.exports = {
    PRIVACY_NOTICE_VERSION,
    acceptConsent
};
