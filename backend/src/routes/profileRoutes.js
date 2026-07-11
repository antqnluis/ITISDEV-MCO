const express = require("express");
const profileController = require("../controllers/profileController");
const { requireAuth } = require("../middleware/authMiddleware");

const router = express.Router();

router.use(requireAuth);
router.post("/", profileController.create);
router.get("/", profileController.get);
router.patch("/", profileController.update);

module.exports = router;
