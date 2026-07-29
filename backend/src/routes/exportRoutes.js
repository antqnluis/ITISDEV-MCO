const express = require("express");
const wellnessSummaryExportController = require("../controllers/wellnessSummaryExportController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireConsent } = require("../middleware/consentMiddleware");

const router = express.Router();

router.use(requireAuth);
router.use(requireConsent);
router.get("/wellness-summary", wellnessSummaryExportController.get);

module.exports = router;
