const wellnessSummaryExportService = require("../services/wellnessSummaryExportService");

function sendError(res, error) {
    return res.status(error.statusCode || 500).json({
        success: false,
        message: error.statusCode ? error.message : "Server error"
    });
}

async function get(req, res) {
    res.set("Cache-Control", "no-store");

    try {
        const wellnessSummary = await wellnessSummaryExportService.getWellnessSummary(
            req.supabase,
            req.user
        );
        return res.status(200).json({ success: true, wellnessSummary });
    } catch (error) {
        return sendError(res, error);
    }
}

module.exports = {
    get
};
