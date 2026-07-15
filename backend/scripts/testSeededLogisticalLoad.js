const path = require("node:path");

const { createClient } = require("@supabase/supabase-js");
const {
    calculateLogisticalLoadScore
} = require("../src/calculators/logisticalLoadCalculator");

function requireEnvironmentValue(environment, name) {
    const value = environment[name];
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${name} is required to test the seeded logistical load data`);
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

function mapDatabaseRowsToLogisticalInput(profile, checkIn = null) {
    if (!profile || typeof profile !== "object" || Array.isArray(profile)) {
        throw new TypeError("profile must be an object");
    }
    if (checkIn !== null && (typeof checkIn !== "object" || Array.isArray(checkIn))) {
        throw new TypeError("checkIn must be an object or null");
    }

    return {
        weeklyAvailableStudyHours: checkIn?.available_study_hours ?? null,
        profileAvailableStudyHours: profile.available_study_hours_per_week,
        commuteMinutesPerDay: profile.commute_minutes_per_day,
        workHoursPerWeek: profile.work_hours_per_week,
        caregivingHoursPerWeek: profile.caregiving_hours_per_week,
        internetProblems: null
    };
}

async function loadSeededLogisticalData(supabase, studentNumber) {
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
            "commute_minutes_per_day",
            "available_study_hours_per_week",
            "caregiving_hours_per_week",
            "work_hours_per_week"
        ].join(", "))
        .eq("student_id", student.id)
        .maybeSingle();

    if (profileError) {
        throw new Error(`Unable to retrieve the seeded student profile: ${profileError.message}`);
    }
    if (!profile) {
        throw new Error("The seeded student does not have a profile to analyze");
    }

    const { data: checkIns, error: checkInError } = await supabase
        .from("weekly_check_ins")
        .select("id, student_id, week_start, available_study_hours, submitted_at")
        .eq("student_id", student.id)
        .order("week_start", { ascending: false })
        .order("submitted_at", { ascending: false })
        .limit(1);

    if (checkInError) {
        throw new Error(`Unable to retrieve the seeded weekly check-in: ${checkInError.message}`);
    }

    return {
        student,
        profile,
        checkIn: checkIns?.[0] || null
    };
}

async function runSeededLogisticalLoad({ supabase, studentNumber }) {
    if (!supabase || typeof supabase.from !== "function") {
        throw new Error("A Supabase service-role client is required");
    }

    const data = await loadSeededLogisticalData(supabase, studentNumber);
    const calculationInput = mapDatabaseRowsToLogisticalInput(data.profile, data.checkIn);
    const result = calculateLogisticalLoadScore(calculationInput);

    return {
        ...data,
        calculationInput,
        result
    };
}

function printLogisticalLoadResult(analysis, logger = console) {
    logger.log(`Final logistical load concern score: ${analysis.result.score}`);
    logger.log(`Student number: ${analysis.student.student_number}`);
    logger.log(`Check-in week: ${analysis.checkIn?.week_start ?? "unavailable"}`);
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
    const analysis = await runSeededLogisticalLoad({
        supabase,
        studentNumber: config.studentNumber
    });

    printLogisticalLoadResult(analysis);
}

if (require.main === module) {
    main().catch((error) => {
        console.error(`Seeded logistical load test failed: ${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = {
    loadSeededLogisticalData,
    mapDatabaseRowsToLogisticalInput,
    printLogisticalLoadResult,
    runSeededLogisticalLoad,
    validateTestEnvironment
};
