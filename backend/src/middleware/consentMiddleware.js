const { PRIVACY_NOTICE_VERSION } = require("../services/consentService");

async function requireConsent(req, res, next) {
    let data;
    let error;

    try {
        ({ data, error } = await req.supabase
            .from("students")
            .select("id, consent_given, privacy_notice_version")
            .eq("id", req.user.id)
            .maybeSingle());
    } catch (consentError) {
        return res.status(500).json({
            success: false,
            message: "Unable to verify privacy consent"
        });
    }

    if (error) {
        return res.status(500).json({
            success: false,
            message: "Unable to verify privacy consent"
        });
    }

    if (!data) {
        return res.status(404).json({
            success: false,
            message: "Student record not found"
        });
    }

    if (!data.consent_given || data.privacy_notice_version !== PRIVACY_NOTICE_VERSION) {
        return res.status(403).json({
            success: false,
            message: "Current privacy consent is required"
        });
    }

    return next();
}

module.exports = {
    requireConsent
};
