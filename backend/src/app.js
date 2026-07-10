const express = require("express");
const cors = require("cors");
const supabase = require("./config/supabaseClient");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
    res.send("Backend is running");
});

app.get("/api/health", (req, res) => {
    res.json({
        status: "ok",
        message: "Health route working"
    });
});

app.get("/api/students", async (req, res) => {
    try {
        const { data, error } = await supabase
            .from("students")
            .select("*");

        if (error) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }

        res.status(200).json({
            success: true,
            students: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Server error",
            error: error.message
        });
    }
});

module.exports = app;