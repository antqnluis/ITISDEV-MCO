const courseService = require("../services/courseService");

function sendError(res, error) {
    return res.status(error.statusCode || 500).json({
        success: false,
        message: error.statusCode ? error.message : "Server error"
    });
}

async function create(req, res) {
    try {
        const course = await courseService.createCourse(req.supabase, req.user.id, req.body);
        return res.status(201).json({ success: true, course });
    } catch (error) {
        return sendError(res, error);
    }
}

async function list(req, res) {
    try {
        const result = await courseService.listCourses(req.supabase, req.user.id, req.query);
        return res.status(200).json({ success: true, ...result });
    } catch (error) {
        return sendError(res, error);
    }
}

async function get(req, res) {
    try {
        const course = await courseService.getCourse(req.supabase, req.user.id, req.params.id);
        return res.status(200).json({ success: true, course });
    } catch (error) {
        return sendError(res, error);
    }
}

async function update(req, res) {
    try {
        const course = await courseService.updateCourse(
            req.supabase,
            req.user.id,
            req.params.id,
            req.body
        );
        return res.status(200).json({ success: true, course });
    } catch (error) {
        return sendError(res, error);
    }
}

async function remove(req, res) {
    try {
        await courseService.deleteCourse(req.supabase, req.user.id, req.params.id);
        return res.status(204).send();
    } catch (error) {
        return sendError(res, error);
    }
}

module.exports = { create, list, get, update, remove };
