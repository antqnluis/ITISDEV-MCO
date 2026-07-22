const express = require("express");
const courseController = require("../controllers/courseController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireConsent } = require("../middleware/consentMiddleware");

const router = express.Router();

router.use(requireAuth);
router.use(requireConsent);
router.post("/", courseController.create);
router.get("/", courseController.list);
router.get("/:id", courseController.get);
router.patch("/:id", courseController.update);
router.delete("/:id", courseController.remove);

module.exports = router;
