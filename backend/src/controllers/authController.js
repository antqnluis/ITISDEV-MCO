const authService = require("../services/authService");

async function register(req, res) {
    try {
        const result = await authService.registerStudent(req.body);

        res.status(201).json({
            success: true,
            message: "Registration successful",
            user: result.user,
            session: result.session,
            student: result.student
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Server error"
        });
    }
}

async function login(req, res) {
    try {
        const result = await authService.loginStudent(req.body);

        res.status(200).json({
            success: true,
            message: "Login successful",
            user: result.user,
            session: result.session
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Server error"
        });
    }
}

module.exports = {
    register,
    login
};
