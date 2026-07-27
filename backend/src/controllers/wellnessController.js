import * as wellnessService from '../services/wellnessService.js';

export const analyzeWeeklyCheckIn = async (req, res) => {
  try {
    const { student_id, check_in_id, dimension_scores_id } = req.body;

    // Reject immediately if IDs are missing
    if (!student_id || !check_in_id || !dimension_scores_id) {
      return res.status(400).json({ 
        success: false, 
        error: "Bad Request: Missing student_id, check_in_id, or dimension_scores_id." 
      });
    }

    // Pass IDs down to the mock engine
    const result = await wellnessService.runMockWellnessPipeline({
      student_id,
      check_in_id,
      dimension_scores_id
    });

    // Send successful response to your front-end
    return res.status(200).json({ success: true, data: result });

  } catch (error) {
    console.error(" Controller Error:", error);
    return res.status(500).json({ success: false, error: error.message });
  }
};
