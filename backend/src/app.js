const express = require("express");
const cors = require("cors");

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// Test route
app.get("/", (req, res) => {
    res.status(200).send("Backend is running");
});

// Health check route
app.get("/api/health", (req, res) => {
    res.status(200).json({
        status: "ok",
        message: "Health route working"
    });
});

module.exports = app;