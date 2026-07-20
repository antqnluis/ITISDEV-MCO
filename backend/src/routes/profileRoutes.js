const express = require("express");
const profileController = require("../controllers/profileController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireConsent } = require("../middleware/consentMiddleware");

const router = express.Router();

router.use(requireAuth);
router.use(requireConsent);
router.post("/", profileController.create);
router.get("/", profileController.get);
router.patch("/", profileController.update);
router.delete("/", profileController.remove);

module.exports = router;
