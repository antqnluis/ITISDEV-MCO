const express = require("express");
const courseEnvironmentLogController = require("../controllers/courseEnvironmentLogController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);
router.post("/", courseEnvironmentLogController.create);
router.get("/", courseEnvironmentLogController.list);
router.get("/:id", courseEnvironmentLogController.get);
router.patch("/:id", courseEnvironmentLogController.update);
router.delete("/:id", courseEnvironmentLogController.remove);

module.exports = router;
