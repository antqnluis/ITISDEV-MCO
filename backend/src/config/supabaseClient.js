const { createClient } = require("@supabase/supabase-js");

const supabaseUrl = process.env.SUPABASE_URL?.trim();
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY?.trim();
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("SUPABASE_URL and SUPABASE_ANON_KEY are required");
}

const clientOptions = {
    auth: {
        autoRefreshToken: false,
        persistSession: false,
        detectSessionInUrl: false
    }
};

const publicSupabase = createClient(supabaseUrl, supabaseAnonKey, clientOptions);

// Keep this client server-only. It bypasses RLS and must never handle
// student-initiated reads or writes.
const serviceSupabase = supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, clientOptions)
    : null;

function createAuthenticatedSupabaseClient(accessToken) {
    if (!accessToken) {
        throw new Error("An access token is required for an authenticated Supabase client");
    }

    return createClient(supabaseUrl, supabaseAnonKey, {
        ...clientOptions,
        global: {
            headers: {
                Authorization: `Bearer ${accessToken}`
            }
        }
    });
}

async function signOutSession(accessToken) {
    const response = await fetch(`${supabaseUrl}/auth/v1/logout`, {
        method: "POST",
        headers: {
            apikey: supabaseAnonKey,
            Authorization: `Bearer ${accessToken}`
        }
    });

    if (!response.ok) {
        throw new Error("Supabase could not sign out the current session");
    }
}

module.exports = {
    publicSupabase,
    serviceSupabase,
    createAuthenticatedSupabaseClient,
    signOutSession
};
