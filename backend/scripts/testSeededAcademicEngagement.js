const path = require("node:path");

const { createClient } = require("@supabase/supabase-js");
const {
    calculateAcademicEngagementScore
} = require("../src/calculators/academicEngagementCalculator");

const MANILA_TIME_ZONE = "Asia/Manila";

function requireEnvironmentValue(environment, name) {
    const value = environment[name];
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${name} is required to test the seeded academic engagement data`);
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

function getManilaDate(now = new Date()) {
    if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
        throw new TypeError("now must be a valid Date");
    }

    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: MANILA_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
    const parts = Object.fromEntries(
        formatter.formatToParts(now)
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, part.value])
    );

    return `${parts.year}-${parts.month}-${parts.day}`;
}

function selectLatestAcademicWorkload(courseLogs) {
    if (!Array.isArray(courseLogs) || courseLogs.length === 0) {
        return { weekStart: null, academicWorkload: null };
    }

    const latestWeek = courseLogs[0].week_start;
    const currentRatings = courseLogs
        .filter((log) => log.week_start === latestWeek)
        .map((log) => log.workload_difficulty)
        .filter((rating) => Number.isInteger(rating) && rating >= 1 && rating <= 5);

    return {
        weekStart: latestWeek,
        academicWorkload: currentRatings.length > 0 ? Math.max(...currentRatings) : null
    };
}

async function loadSeededStudentData(supabase, studentNumber) {
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

    const { data: academicRecords, error: academicError } = await supabase
        .from("academic_records")
        .select([
            "id",
            "record_type",
            "course_code",
            "due_at",
            "submitted_at",
            "submission_status",
            "grade_percentage",
            "recorded_at"
        ].join(", "))
        .eq("student_id", student.id);

    if (academicError) {
        throw new Error(`Unable to retrieve seeded academic records: ${academicError.message}`);
    }
    if (!academicRecords || academicRecords.length === 0) {
        throw new Error("The seeded student does not have any academic records to analyze");
    }

    const { data: courseLogs, error: courseLogError } = await supabase
        .from("course_environment_logs")
        .select("week_start, workload_difficulty")
        .eq("student_id", student.id)
        .order("week_start", { ascending: false });

    if (courseLogError) {
        throw new Error(`Unable to retrieve seeded course-environment logs: ${courseLogError.message}`);
    }

    return {
        student,
        academicRecords,
        courseLogs: courseLogs || []
    };
}

async function runSeededAcademicEngagement({
    supabase,
    studentNumber,
    now = new Date()
}) {
    if (!supabase || typeof supabase.from !== "function") {
        throw new Error("A Supabase service-role client is required");
    }

    const data = await loadSeededStudentData(supabase, studentNumber);
    const workload = selectLatestAcademicWorkload(data.courseLogs);
    const analysisDate = getManilaDate(now);
    const result = calculateAcademicEngagementScore({
        academicRecords: data.academicRecords,
        academicWorkload: workload.academicWorkload,
        analysisDate
    });

    return {
        student: data.student,
        analysisDate,
        workloadWeekStart: workload.weekStart,
        academicWorkload: workload.academicWorkload,
        result
    };
}

function printAcademicEngagementResult(analysis, logger = console) {
    logger.log(`Final academic engagement score: ${analysis.result.score}`);
    logger.log(`Student number: ${analysis.student.student_number}`);
    logger.log(`Analysis date (Asia/Manila): ${analysis.analysisDate}`);
    logger.log(`Workload week: ${analysis.workloadWeekStart ?? "unavailable"}`);
    logger.log(`Academic workload: ${analysis.academicWorkload ?? "unavailable"}`);
    logger.log("Components:");
    logger.log(JSON.stringify(analysis.result.components, null, 2));
    logger.log("Counts:");
    logger.log(JSON.stringify(analysis.result.counts, null, 2));
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
    const analysis = await runSeededAcademicEngagement({
        supabase,
        studentNumber: config.studentNumber
    });

    printAcademicEngagementResult(analysis);
}

if (require.main === module) {
    main().catch((error) => {
        console.error(`Seeded academic engagement test failed: ${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = {
    getManilaDate,
    loadSeededStudentData,
    printAcademicEngagementResult,
    runSeededAcademicEngagement,
    selectLatestAcademicWorkload,
    validateTestEnvironment
};
