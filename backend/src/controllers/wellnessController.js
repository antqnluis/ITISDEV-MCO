const wellnessService = require("../services/wellnessService");

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function sendError(res, error) {
  if (!error.statusCode) {
    console.error("Wellness analysis failed:", error);
  }

  return res.status(error.statusCode || 500).json({
    success: false,
    message: error.statusCode ? error.message : "AI analysis failed"
  });
}

async function analyzeWeeklyCheckIn(req, res) {
  try {
    const student_id = req.user?.id;
    const check_in_id = req.params?.id;
    const dimension_scores_id = req.body?.dimension_scores_id;

    if (!student_id) {
      return res.status(401).json({
        success: false,
        message: "An authenticated student is required"
      });
    }

    if (!UUID_PATTERN.test(check_in_id || "")) {
      return res.status(400).json({
        success: false,
        message: "check_in_id must be a valid UUID"
      });
    }

    if (!dimension_scores_id) {
      return res.status(400).json({
        success: false,
        message: "dimension_scores_id is required"
      });
    }

    if (!UUID_PATTERN.test(dimension_scores_id)) {
      return res.status(400).json({
        success: false,
        message: "dimension_scores_id must be a valid UUID"
      });
    }

    const result = await wellnessService.runWellnessPipeline({
      student_id,
      check_in_id,
      dimension_scores_id
    });

    return res.status(200).json({ success: true, data: result });
  } catch (error) {
    return sendError(res, error);
  }
}

async function getWeeklyAnalysis(req, res) {
  try {
    const studentId = req.user?.id;
    const checkInId = req.params?.id;

    if (!studentId) {
      return res.status(401).json({
        success: false,
        message: "An authenticated student is required"
      });
    }

    if (!UUID_PATTERN.test(checkInId || "")) {
      return res.status(400).json({
        success: false,
        message: "check_in_id must be a valid UUID"
      });
    }

    const aiResult = await wellnessService.getAiResult(
      req.supabase,
      studentId,
      checkInId
    );

    return res.status(200).json({ success: true, aiResult });
  } catch (error) {
    return sendError(res, error);
  }
}

module.exports = {
  analyzeWeeklyCheckIn,
  getWeeklyAnalysis
};
