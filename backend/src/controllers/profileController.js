const profileService = require("../services/profileService");

function sendError(res, error) {
    return res.status(error.statusCode || 500).json({
        success: false,
        message: error.statusCode ? error.message : "Server error"
    });
}

async function create(req, res) {
    try {
        const profile = await profileService.createProfile(req.supabase, req.user.id, req.body);
        return res.status(201).json({ success: true, profile });
    } catch (error) {
        return sendError(res, error);
    }
}

async function get(req, res) {
    try {
        const profile = await profileService.getProfile(req.supabase, req.user.id);
        return res.status(200).json({ success: true, profile });
    } catch (error) {
        return sendError(res, error);
    }
}

async function update(req, res) {
    try {
        const profile = await profileService.updateProfile(req.supabase, req.user.id, req.body);
        return res.status(200).json({ success: true, profile });
    } catch (error) {
        return sendError(res, error);
    }
}

async function remove(req, res) {
    try {
        await profileService.deleteProfile(req.supabase, req.user.id);
        return res.status(204).send();
    } catch (error) {
        return sendError(res, error);
    }
}

module.exports = {
    create,
    get,
    update,
    remove
};
