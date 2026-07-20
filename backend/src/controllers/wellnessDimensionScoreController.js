const wellnessDimensionScoreService = require("../services/wellnessDimensionScoreService");
const { serviceSupabase } = require("../config/supabaseClient");

function sendError(res, error) {
    return res.status(error.statusCode || 500).json({
        success: false,
        message: error.statusCode ? error.message : "Server error"
    });
}

async function list(req, res) {
    try {
        const result = await wellnessDimensionScoreService.listWellnessDimensionScores(
            req.supabase,
            req.user.id,
            req.query
        );
        return res.status(200).json({ success: true, ...result });
    } catch (error) {
        return sendError(res, error);
    }
}

async function get(req, res) {
    try {
        const wellnessDimensionScore = await wellnessDimensionScoreService.getWellnessDimensionScore(
            req.supabase,
            req.user.id,
            req.params.id
        );
        return res.status(200).json({ success: true, wellnessDimensionScore });
    } catch (error) {
        return sendError(res, error);
    }
}

async function calculate(req, res) {
    try {
        const wellnessDimensionScore = await wellnessDimensionScoreService.calculateWellnessDimensionScores({
            studentSupabase: req.supabase,
            serviceSupabase,
            studentId: req.user.id,
            checkInId: req.params.id
        });
        return res.status(200).json({ success: true, wellnessDimensionScore });
    } catch (error) {
        return sendError(res, error);
    }
}

module.exports = {
    calculate,
    list,
    get
};
