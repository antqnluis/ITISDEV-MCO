const express = require("express");
const academicRecordController = require("../controllers/academicRecordController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);
router.get("/", academicRecordController.list);
router.get("/:id", academicRecordController.get);

module.exports = router;
