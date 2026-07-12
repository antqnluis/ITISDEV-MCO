const express = require("express");
const consentController = require("../controllers/consentController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.patch("/", requireAuth, consentController.accept);

module.exports = router;
