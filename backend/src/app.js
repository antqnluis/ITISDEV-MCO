const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const profileRoutes = require("./routes/profileRoutes");

const app = express();

app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/profile", profileRoutes);

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
