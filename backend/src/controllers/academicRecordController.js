const academicRecordService = require("../services/academicRecordService");

function sendError(res, error) {
    return res.status(error.statusCode || 500).json({
        success: false,
        message: error.statusCode ? error.message : "Server error"
    });
}

async function list(req, res) {
    try {
        const result = await academicRecordService.listAcademicRecords(
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
        const academicRecord = await academicRecordService.getAcademicRecord(
            req.supabase,
            req.user.id,
            req.params.id
        );
        return res.status(200).json({ success: true, academicRecord });
    } catch (error) {
        return sendError(res, error);
    }
}

module.exports = {
    list,
    get
};
