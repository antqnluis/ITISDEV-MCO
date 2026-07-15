const path = require("node:path");

const { createClient } = require("@supabase/supabase-js");
const {
    calculatePersonalWellbeingScore
} = require("../src/calculators/personalWellbeingCalculator");

function requireEnvironmentValue(environment, name) {
    const value = environment[name];
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${name} is required to test the seeded personal wellbeing data`);
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

function mapCheckInToPersonalWellbeingInput(checkIn) {
    if (!checkIn || typeof checkIn !== "object" || Array.isArray(checkIn)) {
        throw new TypeError("checkIn must be an object");
    }

    return {
        stressLevel: checkIn.stress_level,
        burnoutLevel: checkIn.burnout_level,
        sleepQuality: checkIn.sleep_quality,
        motivationLevel: checkIn.motivation_level,
        moodLevel: checkIn.mood_level,
        energyLevel: checkIn.energy_level
    };
}

async function loadLatestSeededCheckIn(supabase, studentNumber) {
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

    const { data: checkIns, error: checkInError } = await supabase
        .from("weekly_check_ins")
        .select([
            "id",
            "student_id",
            "week_start",
            "stress_level",
            "burnout_level",
            "sleep_quality",
            "motivation_level",
            "mood_level",
            "energy_level",
            "submitted_at"
        ].join(", "))
        .eq("student_id", student.id)
        .order("week_start", { ascending: false })
        .order("submitted_at", { ascending: false })
        .limit(1);

    if (checkInError) {
        throw new Error(`Unable to retrieve the seeded weekly check-in: ${checkInError.message}`);
    }
    if (!checkIns || checkIns.length === 0) {
        throw new Error("The seeded student does not have a weekly check-in to analyze");
    }

    return { student, checkIn: checkIns[0] };
}

async function runSeededPersonalWellbeing({ supabase, studentNumber }) {
    if (!supabase || typeof supabase.from !== "function") {
        throw new Error("A Supabase service-role client is required");
    }

    const data = await loadLatestSeededCheckIn(supabase, studentNumber);
    const ratings = mapCheckInToPersonalWellbeingInput(data.checkIn);
    const result = calculatePersonalWellbeingScore(ratings);

    return {
        student: data.student,
        checkIn: data.checkIn,
        ratings,
        result
    };
}

function printPersonalWellbeingResult(analysis, logger = console) {
    logger.log(`Final personal wellbeing concern score: ${analysis.result.score}`);
    logger.log(`Student number: ${analysis.student.student_number}`);
    logger.log(`Check-in week: ${analysis.checkIn.week_start}`);
    logger.log("Ratings:");
    logger.log(JSON.stringify(analysis.ratings, null, 2));
    logger.log("Components:");
    logger.log(JSON.stringify(analysis.result.components, null, 2));
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
    const analysis = await runSeededPersonalWellbeing({
        supabase,
        studentNumber: config.studentNumber
    });

    printPersonalWellbeingResult(analysis);
}

if (require.main === module) {
    main().catch((error) => {
        console.error(`Seeded personal wellbeing test failed: ${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = {
    loadLatestSeededCheckIn,
    mapCheckInToPersonalWellbeingInput,
    printPersonalWellbeingResult,
    runSeededPersonalWellbeing,
    validateTestEnvironment
};
