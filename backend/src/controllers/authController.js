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

async function me(req, res) {
    try {
        const student = await authService.getCurrentStudent(req.supabase, req.user.id);

        res.status(200).json({
            success: true,
            user: {
                id: req.user.id,
                email: req.user.email,
                created_at: req.user.created_at
            },
            student
        });
    } catch (error) {
        res.status(error.statusCode || 500).json({
            success: false,
            message: error.statusCode ? error.message : "Server error"
        });
    }
}

async function logout(req, res) {
    try {
        await authService.logoutStudent(req.accessToken);
        res.status(204).send();
    } catch (error) {
        res.status(500).json({
            success: false,
            message: "Unable to sign out"
        });
    }
}

module.exports = {
    register,
    login,
    me,
    logout
};
