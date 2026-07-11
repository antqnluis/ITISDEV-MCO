const {
    publicSupabase,
    createAuthenticatedSupabaseClient
} = require("../config/supabaseClient");

function getBearerToken(authorizationHeader) {
    if (typeof authorizationHeader !== "string") {
        return null;
    }

    const [scheme, token] = authorizationHeader.trim().split(/\s+/, 2);

    if (scheme?.toLowerCase() !== "bearer" || !token) {
        return null;
    }

    return token;
}

async function requireAuth(req, res, next) {
    const accessToken = getBearerToken(req.get("authorization"));

    if (!accessToken) {
        return res.status(401).json({
            success: false,
            message: "A bearer access token is required"
        });
    }

    let data;
    let error;

    try {
        ({ data, error } = await publicSupabase.auth.getUser(accessToken));
    } catch (authError) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired access token"
        });
    }

    if (error || !data.user) {
        return res.status(401).json({
            success: false,
            message: "Invalid or expired access token"
        });
    }

    req.user = data.user;
    req.accessToken = accessToken;
    req.supabase = createAuthenticatedSupabaseClient(accessToken);

    return next();
}

module.exports = {
    getBearerToken,
    requireAuth
};
