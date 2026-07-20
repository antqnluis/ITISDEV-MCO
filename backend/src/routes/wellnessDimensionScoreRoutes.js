const express = require("express");
const wellnessDimensionScoreController = require("../controllers/wellnessDimensionScoreController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireConsent } = require("../middleware/consentMiddleware");

const router = express.Router();

router.use(requireAuth);
router.use(requireConsent);
router.get("/", wellnessDimensionScoreController.list);
router.get("/:id", wellnessDimensionScoreController.get);

module.exports = router;
