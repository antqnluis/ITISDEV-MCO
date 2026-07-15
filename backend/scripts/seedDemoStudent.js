const path = require("node:path");

require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

const { createClient } = require("@supabase/supabase-js");
const {
    runDemoStudentSeed,
    validateSeedEnvironment
} = require("../src/seeds/demoStudentSeed");

async function main() {
    const config = validateSeedEnvironment(process.env);
    const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    });

    const result = await runDemoStudentSeed({ supabase, config });
    const authAction = result.authUserCreated ? "created" : "updated";

    console.log(`Demo student seeded successfully (Auth user ${authAction}).`);
    console.log(`Email: ${result.email}`);
    console.log(`Student number: ${result.studentNumber}`);
    console.log(`Student ID: ${result.studentId}`);
    console.log(`Midterm week anchor (Asia/Manila): ${result.anchorDate}`);
    for (const [table, count] of Object.entries(result.counts)) {
        console.log(`${table}: ${count}`);
    }
}

main().catch((error) => {
    console.error(`Demo seed failed: ${error.message}`);
    process.exitCode = 1;
});
