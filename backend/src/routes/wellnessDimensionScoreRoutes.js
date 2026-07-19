const express = require("express");
const wellnessDimensionScoreController = require("../controllers/wellnessDimensionScoreController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);
router.get("/", wellnessDimensionScoreController.list);
router.get("/:id", wellnessDimensionScoreController.get);

module.exports = router;
