const express = require("express");
const weeklyCheckInController = require("../controllers/weeklyCheckInController");
const wellnessDimensionScoreController = require("../controllers/wellnessDimensionScoreController");
const wellnessController = require("../controllers/wellnessController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireConsent } = require("../middleware/consentMiddleware");

const router = express.Router();

router.use(requireAuth);
router.use(requireConsent);
router.post("/", weeklyCheckInController.create);
router.post("/:id/calculate-dimensions", wellnessDimensionScoreController.calculate);
router.post("/:id/analyze", wellnessController.analyzeWeeklyCheckIn);
router.get("/:id/analysis", wellnessController.getWeeklyAnalysis);
router.get("/", weeklyCheckInController.list);
router.get("/current", weeklyCheckInController.current);
router.get("/:id", weeklyCheckInController.get);
router.patch("/:id", weeklyCheckInController.update);
router.delete("/:id", weeklyCheckInController.remove);

module.exports = router;
