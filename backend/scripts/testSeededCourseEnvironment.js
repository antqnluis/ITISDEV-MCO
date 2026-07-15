const path = require("node:path");

const { createClient } = require("@supabase/supabase-js");
const {
    calculateCourseEnvironmentScore
} = require("../src/calculators/courseEnvironmentCalculator");

function requireEnvironmentValue(environment, name) {
    const value = environment[name];
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${name} is required to test the seeded course environment data`);
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

function mapDatabaseRowToCourseEnvironmentInput(courseLog) {
    if (!courseLog || typeof courseLog !== "object" || Array.isArray(courseLog)) {
        throw new TypeError("courseLog must be an object");
    }

    return {
        id: courseLog.id,
        weekStart: courseLog.week_start,
        courseCode: courseLog.course_code,
        courseName: courseLog.course_name,
        workloadDifficulty: courseLog.workload_difficulty,
        unclearInstructionLevel: courseLog.unclear_instruction_level,
        gradingConcernLevel: courseLog.grading_concern_level,
        professorApproachabilityConcern: courseLog.professor_approachability_concern,
        groupmateIssueLevel: courseLog.groupmate_issue_level
    };
}

function selectLatestCourseLogWeek(courseLogs) {
    if (!Array.isArray(courseLogs)) {
        throw new TypeError("courseLogs must be an array");
    }
    if (courseLogs.length === 0) {
        return { weekStart: null, courseLogs: [] };
    }

    const weekStart = courseLogs.reduce((latestWeek, courseLog) => {
        if (!courseLog || typeof courseLog.week_start !== "string") {
            throw new TypeError("every course log must include week_start");
        }

        return courseLog.week_start > latestWeek ? courseLog.week_start : latestWeek;
    }, courseLogs[0].week_start);

    return {
        weekStart,
        courseLogs: courseLogs.filter((courseLog) => courseLog.week_start === weekStart)
    };
}

async function loadSeededCourseEnvironmentData(supabase, studentNumber) {
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

    const { data: courseLogs, error: courseLogError } = await supabase
        .from("course_environment_logs")
        .select([
            "id",
            "student_id",
            "course_code",
            "course_name",
            "week_start",
            "workload_difficulty",
            "unclear_instruction_level",
            "grading_concern_level",
            "professor_approachability_concern",
            "groupmate_issue_level",
            "created_at"
        ].join(", "))
        .eq("student_id", student.id)
        .order("week_start", { ascending: false })
        .order("created_at", { ascending: true })
        .order("id", { ascending: true });

    if (courseLogError) {
        throw new Error(`Unable to retrieve seeded course-environment logs: ${courseLogError.message}`);
    }
    if (!courseLogs || courseLogs.length === 0) {
        throw new Error("The seeded student does not have course-environment logs to analyze");
    }

    return { student, courseLogs };
}

async function runSeededCourseEnvironment({ supabase, studentNumber }) {
    if (!supabase || typeof supabase.from !== "function") {
        throw new Error("A Supabase service-role client is required");
    }

    const data = await loadSeededCourseEnvironmentData(supabase, studentNumber);
    const latestWeek = selectLatestCourseLogWeek(data.courseLogs);
    const calculationInput = latestWeek.courseLogs.map(
        mapDatabaseRowToCourseEnvironmentInput
    );
    const result = calculateCourseEnvironmentScore(calculationInput);

    return {
        student: data.student,
        analysisWeekStart: latestWeek.weekStart,
        calculationInput,
        result
    };
}

function printCourseEnvironmentResult(analysis, logger = console) {
    logger.log(`Final course environment concern score: ${analysis.result.score}`);
    logger.log(`Student number: ${analysis.student.student_number}`);
    logger.log(`Analysis week: ${analysis.analysisWeekStart}`);
    logger.log("Calculation input:");
    logger.log(JSON.stringify(analysis.calculationInput, null, 2));
    logger.log("Course scores:");
    logger.log(JSON.stringify(analysis.result.courseScores, null, 2));
    logger.log("Highest-concern course:");
    logger.log(JSON.stringify(analysis.result.highestConcernCourse, null, 2));
    logger.log(`Has serious peer concern: ${analysis.result.hasSeriousPeerConcern}`);
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
    const analysis = await runSeededCourseEnvironment({
        supabase,
        studentNumber: config.studentNumber
    });

    printCourseEnvironmentResult(analysis);
}

if (require.main === module) {
    main().catch((error) => {
        console.error(`Seeded course environment test failed: ${error.message}`);
        process.exitCode = 1;
    });
}

module.exports = {
    loadSeededCourseEnvironmentData,
    mapDatabaseRowToCourseEnvironmentInput,
    printCourseEnvironmentResult,
    runSeededCourseEnvironment,
    selectLatestCourseLogWeek,
    validateTestEnvironment
};
