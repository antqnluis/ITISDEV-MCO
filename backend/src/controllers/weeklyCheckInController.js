const weeklyCheckInService = require("../services/weeklyCheckInService");

function sendError(res, error) {
    return res.status(error.statusCode || 500).json({
        success: false,
        message: error.statusCode ? error.message : "Server error"
    });
}

async function create(req, res) {
    try {
        const checkIn = await weeklyCheckInService.createCheckIn(req.supabase, req.user.id, req.body);
        return res.status(201).json({ success: true, checkIn });
    } catch (error) {
        return sendError(res, error);
    }
}

async function list(req, res) {
    try {
        const checkIns = await weeklyCheckInService.listCheckIns(req.supabase, req.user.id);
        return res.status(200).json({ success: true, checkIns });
    } catch (error) {
        return sendError(res, error);
    }
}

async function current(req, res) {
    try {
        const result = await weeklyCheckInService.getCurrentCheckIn(req.supabase, req.user.id);
        return res.status(200).json({
            success: true,
            weekStart: result.weekStart,
            completed: result.checkIn !== null,
            checkIn: result.checkIn
        });
    } catch (error) {
        return sendError(res, error);
    }
}

async function get(req, res) {
    try {
        const checkIn = await weeklyCheckInService.getCheckIn(req.supabase, req.user.id, req.params.id);
        return res.status(200).json({ success: true, checkIn });
    } catch (error) {
        return sendError(res, error);
    }
}

async function update(req, res) {
    try {
        const checkIn = await weeklyCheckInService.updateCheckIn(req.supabase, req.user.id, req.params.id, req.body);
        return res.status(200).json({ success: true, checkIn });
    } catch (error) {
        return sendError(res, error);
    }
}

async function remove(req, res) {
    try {
        await weeklyCheckInService.deleteCheckIn(req.supabase, req.user.id, req.params.id);
        return res.status(204).send();
    } catch (error) {
        return sendError(res, error);
    }
}

module.exports = {
    create,
    list,
    current,
    get,
    update,
    remove
};
