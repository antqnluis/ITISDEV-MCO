const consentService = require("../services/consentService");

async function accept(req, res) {
    try {
        const student = await consentService.acceptConsent(req.supabase, req.user.id, req.body);
        return res.status(200).json({ success: true, student });
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Server error"
        });
    }
}

module.exports = {
    accept
};
