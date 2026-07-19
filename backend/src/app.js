const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");
const consentRoutes = require("./routes/consentRoutes");
const weeklyCheckInRoutes = require("./routes/weeklyCheckInRoutes");
const academicRecordRoutes = require("./routes/academicRecordRoutes");
const courseEnvironmentLogRoutes = require("./routes/courseEnvironmentLogRoutes");
const calendarEventRoutes = require("./routes/calendarEventRoutes");
const wellnessDimensionScoreRoutes = require("./routes/wellnessDimensionScoreRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/consent", consentRoutes);
app.use("/api/profile", profileRoutes);
app.use("/api/check-ins", weeklyCheckInRoutes);
app.use("/api/academic-records", academicRecordRoutes);
app.use("/api/course-environment-logs", courseEnvironmentLogRoutes);
app.use("/api/calendar-events", calendarEventRoutes);
app.use("/api/wellness-dimension-scores", wellnessDimensionScoreRoutes);

app.get("/", (req, res) => {
    res.send("Backend is running");
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Health route working"
    });
});

module.exports = app;
