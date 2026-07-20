const express = require("express");
const academicRecordController = require("../controllers/academicRecordController");
const { requireAuth } = require("../middleware/authMiddleware");
const { requireConsent } = require("../middleware/consentMiddleware");

const router = express.Router();

router.use(requireAuth);
router.use(requireConsent);
router.post("/", academicRecordController.create);
router.get("/", academicRecordController.list);
router.get("/:id", academicRecordController.get);
router.patch("/:id", academicRecordController.update);
router.delete("/:id", academicRecordController.remove);

module.exports = router;
