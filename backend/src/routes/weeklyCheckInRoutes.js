const express = require("express");
const weeklyCheckInController = require("../controllers/weeklyCheckInController");
const wellnessDimensionScoreController = require("../controllers/wellnessDimensionScoreController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);
router.post("/", weeklyCheckInController.create);
router.post("/:id/calculate-dimensions", wellnessDimensionScoreController.calculate);
router.get("/", weeklyCheckInController.list);
router.get("/:id", weeklyCheckInController.get);
router.patch("/:id", weeklyCheckInController.update);
router.delete("/:id", weeklyCheckInController.remove);

module.exports = router;
