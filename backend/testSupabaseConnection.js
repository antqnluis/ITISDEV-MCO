require("dotenv").config();

const dns = require("node:dns").promises;

async function testConnection() {
    const supabaseUrl = process.env.SUPABASE_URL?.trim();
    const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

    if (!supabaseUrl) {
        throw new Error("SUPABASE_URL is missing");
    }

    if (!supabaseKey) {
        throw new Error("SUPABASE_SERVICE_ROLE_KEY is missing");
    }

    const hostname = new URL(supabaseUrl).hostname;

    console.log("Node version:", process.version);
    console.log("Supabase URL:", JSON.stringify(supabaseUrl));
    console.log("Hostname:", hostname);

    const addresses = await dns.lookup(hostname, {
        all: true
    });

    console.log("Resolved addresses:", addresses);

    const response = await fetch(`${supabaseUrl}/auth/v1/settings`, {
        headers: {
            apikey: supabaseKey,
            Authorization: `Bearer ${supabaseKey}`
        }
    });

    console.log("HTTP status:", response.status);
    console.log("Response:", await response.text());
}

testConnection().catch((error) => {
    console.error("Connection test failed:");
    console.error(error);
    process.exitCode = 1;
});