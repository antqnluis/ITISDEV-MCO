const express = require("express");
const calendarEventController = require("../controllers/calendarEventController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireConsent } = require("../middleware/consentMiddleware");

const router = express.Router();

router.use(requireAuth);
router.use(requireConsent);
router.post("/", calendarEventController.create);
router.get("/", calendarEventController.list);
router.get("/:id", calendarEventController.get);
router.patch("/:id", calendarEventController.update);
router.delete("/:id", calendarEventController.remove);

module.exports = router;
