const express = require("express");
const authController = require("../controllers/authController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireConsent } = require("../middleware/consentMiddleware");

const router = express.Router();

router.post("/register", authController.register);
router.post("/login", authController.login);
router.get("/me", requireAuth, authController.me);
router.patch("/me", requireAuth, requireConsent, authController.updateMe);
router.post("/logout", requireAuth, authController.logout);

module.exports = router;
