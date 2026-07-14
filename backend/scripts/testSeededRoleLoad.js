const path = require("node:path");

const { createClient } = require("@supabase/supabase-js");
const {
    calculateRoleLoadScore
} = require("../src/calculators/roleLoadCalculator");

function requireEnvironmentValue(environment, name) {
    const value = environment[name];
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${name} is required to test the seeded role load data`);
    }

    return value.trim();
}

function validateTestEnvironment(environment = process.env) {
    const config = {
        supabaseUrl: requireEnvironmentValue(environment, "SUPABASE_URL"),
        serviceRoleKey: requireEnvironmentValue(environment, "SUPABASE_SERVICE_ROLE_KEY"),
        studentNumber: requireEnvironmentValue(environment, "SEED_STUDENT_NUMBER")
    };

    if (!/^https?:\/\/[^\s]+$/i.test(config.supabaseUrl)) {
        throw new Error("SUPABASE_URL must be a valid HTTP or HTTPS URL");
    }
    if (config.studentNumber.length < 4 || config.studentNumber.length > 30) {
        throw new Error("SEED_STUDENT_NUMBER must contain between 4 and 30 characters");
    }

    return config;
}

function mapProfileToRoleLoadInput(profile) {
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
        throw new TypeError("profile must be an object");
    }

    return {
        hasCaregivingResponsibility: profile.has_caregiving_responsibility,
        caregivingHoursPerWeek: profile.caregiving_hours_per_week,
        isAthlete: profile.is_athlete,
        athleteHoursPerWeek: profile.athlete_hours_per_week,
        hasOrganizationResponsibility: profile.has_organization_responsibility,
        organizationHoursPerWeek: profile.organization_hours_per_week,
        roleWorkload: null,
        roleHoursCeiling: null
    };
}

async function loadSeededRoleData(supabase, studentNumber) {
    const { data: student, error: studentError } = await supabase
        .from("students")
        .select("id, student_number")
        .eq("student_number", studentNumber)
        .maybeSingle();

    if (studentError) {
        throw new Error(`Unable to retrieve the seeded student: ${studentError.message}`);
    }
    if (!student) {
        throw new Error(`No seeded student was found with student number ${studentNumber}`);
    }

    const { data: profile, error: profileError } = await supabase
        .from("student_profiles")
        .select([
            "student_id",
            "has_caregiving_responsibility",
            "caregiving_hours_per_week",
            "is_athlete",
            "athlete_hours_per_week",
            "has_organization_responsibility",
            "organization_hours_per_week"
        ].join(", "))
        .eq("student_id", student.id)
        .maybeSingle();

    if (profileError) {
        throw new Error(`Unable to retrieve the seeded student profile: ${profileError.message}`);
    }
    if (!profile) {
        throw new Error("The seeded student does not have a profile to analyze");
    }

    return { student, profile };
}

async function runSeededRoleLoad({ supabase, studentNumber }) {
    if (!supabase || typeof supabase.from !== "function") {
        throw new Error("A Supabase service-role client is required");
    }

    const data = await loadSeededRoleData(supabase, studentNumber);
    const calculationInput = mapProfileToRoleLoadInput(data.profile);
    const result = calculateRoleLoadScore(calculationInput);

    return {
        ...data,
        calculationInput,
        result
    };
}

function printRoleLoadResult(analysis, logger = console) {
    logger.log(`Final role load concern score: ${analysis.result.score}`);
    logger.log(`Student number: ${analysis.student.student_number}`);
    logger.log("Calculation input:");
    logger.log(JSON.stringify(analysis.calculationInput, null, 2));
    logger.log("Components:");
    logger.log(JSON.stringify(analysis.result.components, null, 2));
    logger.log("Derived values:");
    logger.log(JSON.stringify(analysis.result.derivedValues, null, 2));
}

async function main() {
    require("dotenv").config({ path: path.join(__dirname, "..", ".env"), quiet: true });

    const config = validateTestEnvironment(process.env);
    const supabase = createClient(config.supabaseUrl, config.serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
            detectSessionInUrl: false
        }
    });
    const analysis = await runSeededRoleLoad({
        supabase,
        studentNumber: config.studentNumber
    });

    printRoleLoadResult(analysis);
}

if (require.main === module) {
    main().catch((error) => {
        console.error(`Seeded role load test failed: ${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = {
    loadSeededRoleData,
    mapProfileToRoleLoadInput,
    printRoleLoadResult,
    runSeededRoleLoad,
    validateTestEnvironment
};
