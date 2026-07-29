const { createHash } = require("node:crypto");

const MANILA_TIME_ZONE = "Asia/Manila";
const MANILA_OFFSET = "+08:00";

const APPLICATION_TABLES = Object.freeze([
    "students",
    "student_profiles",
    "weekly_check_ins",
    "courses",
    "academic_records",
    "calendar_events",
    "course_environment_logs",
    "wellness_dimension_scores",
    "ai_results"
]);

function requireEnvironmentValue(environment, name) {
    const value = environment[name];
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${name} is required to seed the demo student`);
    }

    return value.trim();
}

function validateStudentName(value, name) {
    if (value.length > 100) {
        throw new Error(`${name} must contain between 1 and 100 characters`);
    }

    return value;
}

function validateSeedEnvironment(environment = process.env) {
    const config = {
        supabaseUrl: requireEnvironmentValue(environment, "SUPABASE_URL"),
        serviceRoleKey: requireEnvironmentValue(environment, "SUPABASE_SERVICE_ROLE_KEY"),
        email: requireEnvironmentValue(environment, "SEED_USER_EMAIL").toLowerCase(),
        password: requireEnvironmentValue(environment, "SEED_USER_PASSWORD"),
        studentNumber: requireEnvironmentValue(environment, "SEED_STUDENT_NUMBER"),
        firstName: validateStudentName(
            requireEnvironmentValue(environment, "SEED_FIRST_NAME"),
            "SEED_FIRST_NAME"
        ),
        lastName: validateStudentName(
            requireEnvironmentValue(environment, "SEED_LAST_NAME"),
            "SEED_LAST_NAME"
        )
    };

    if (!/^https?:\/\/[^\s]+$/i.test(config.supabaseUrl)) {
        throw new Error("SUPABASE_URL must be a valid HTTP or HTTPS URL");
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(config.email)) {
        throw new Error("SEED_USER_EMAIL must be a valid email address");
    }
    if (config.password.length < 6) {
        throw new Error("SEED_USER_PASSWORD must contain at least 6 characters");
    }
    if (config.studentNumber.length < 4 || config.studentNumber.length > 30) {
        throw new Error("SEED_STUDENT_NUMBER must contain between 4 and 30 characters");
    }

    return config;
}

function deterministicUuid(studentId, recordKey) {
    const bytes = createHash("sha256")
        .update(`${studentId}:${recordKey}`, "utf8")
        .digest()
        .subarray(0, 16);

    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;

    const hex = bytes.toString("hex");
    return [
        hex.slice(0, 8),
        hex.slice(8, 12),
        hex.slice(12, 16),
        hex.slice(16, 20),
        hex.slice(20)
    ].join("-");
}

function buildScenarioIds(studentId) {
    const many = (prefix, count) => Object.freeze(
        Array.from({ length: count }, (_, index) => (
            deterministicUuid(studentId, `${prefix}:${index + 1}`)
        ))
    );

    return Object.freeze({
        profile: deterministicUuid(studentId, "profile"),
        checkIns: many("check-in", 3),
        courses: Object.freeze({
            ITISDEV: deterministicUuid(studentId, "course:ITISDEV"),
            DBADMN: deterministicUuid(studentId, "course:DBADMN"),
            WEBAPDE: deterministicUuid(studentId, "course:WEBAPDE"),
            PROFSWD: deterministicUuid(studentId, "course:PROFSWD")
        }),
        academicRecords: many("academic-record", 8),
        calendarEvents: many("calendar-event", 12),
        courseEnvironmentLogs: many("course-environment-log", 3),
        dimensionScores: many("dimension-score", 3),
        aiResults: many("ai-result", 3)
    });
}

function toManilaCalendarDate(now) {
    const formatter = new Intl.DateTimeFormat("en-US", {
        timeZone: MANILA_TIME_ZONE,
        year: "numeric",
        month: "2-digit",
        day: "2-digit"
    });
    const parts = Object.fromEntries(
        formatter.formatToParts(now)
            .filter((part) => part.type !== "literal")
            .map((part) => [part.type, Number(part.value)])
    );

    return new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
}

function addDays(date, numberOfDays) {
    const result = new Date(date.getTime());
    result.setUTCDate(result.getUTCDate() + numberOfDays);
    return result;
}

function toDateString(date) {
    return date.toISOString().slice(0, 10);
}

function getManilaWeekAnchor(now = new Date()) {
    if (!(now instanceof Date) || Number.isNaN(now.getTime())) {
        throw new TypeError("now must be a valid Date");
    }

    const localDate = toManilaCalendarDate(now);
    const dayOfWeek = localDate.getUTCDay() || 7;
    return addDays(localDate, 1 - dayOfWeek);
}

function timestampAt(anchor, dayOffset, localTime) {
    const date = toDateString(addDays(anchor, dayOffset));
    return new Date(`${date}T${localTime}${MANILA_OFFSET}`).toISOString();
}

function completedEvent({ id, studentId, eventType, title, description, location, startsAt, endsAt }) {
    return {
        id,
        student_id: studentId,
        academic_record_id: null,
        source: "mock",
        event_type: eventType,
        title,
        description,
        location,
        starts_at: startsAt,
        ends_at: endsAt,
        all_day: false,
        status: "completed",
        completed_at: endsAt
    };
}

function scheduledEvent({
    id,
    studentId,
    academicRecordId = null,
    eventType,
    title,
    description,
    location,
    startsAt,
    endsAt,
    allDay = false
}) {
    return {
        id,
        student_id: studentId,
        academic_record_id: academicRecordId,
        source: "mock",
        event_type: eventType,
        title,
        description,
        location,
        starts_at: startsAt,
        ends_at: endsAt,
        all_day: allDay,
        status: "scheduled",
        completed_at: null
    };
}

function buildDemoStudentScenario({
    studentId,
    studentNumber,
    firstName,
    lastName,
    now = new Date()
}) {
    if (typeof studentId !== "string" || studentId.trim().length === 0) {
        throw new Error("studentId is required");
    }
    if (typeof studentNumber !== "string" || studentNumber.trim().length === 0) {
        throw new Error("studentNumber is required");
    }
    if (typeof firstName !== "string" || firstName.trim().length === 0) {
        throw new Error("firstName is required");
    }
    if (typeof lastName !== "string" || lastName.trim().length === 0) {
        throw new Error("lastName is required");
    }

    const ids = buildScenarioIds(studentId);
    const anchor = getManilaWeekAnchor(now);
    const weekStarts = [-14, -7, 0].map((offset) => toDateString(addDays(anchor, offset)));
    const seededAt = timestampAt(anchor, 0, "07:00:00");

    const students = [{
        id: studentId,
        student_number: studentNumber,
        first_name: firstName.trim(),
        last_name: lastName.trim(),
        consent_given: true,
        consented_at: timestampAt(anchor, -20, "18:30:00"),
        privacy_notice_version: "v1.0"
    }];

    const studentProfiles = [{
        id: ids.profile,
        student_id: studentId,
        college: "College of Computer Studies",
        program: "BS Information Technology",
        year_level: 3,
        current_academic_term: 1,
        wellness_goals: ["Managing Stress", "Managing Workload", "Time Management", "Better Sleep"],
        commute_minutes_per_day: 90,
        available_study_hours_per_week: 10,
        has_caregiving_responsibility: true,
        caregiving_hours_per_week: 10,
        is_employed: true,
        work_hours_per_week: 16,
        has_ojt: false,
        ojt_hours_per_week: 0,
        is_athlete: false,
        athlete_hours_per_week: 0,
        has_organization_responsibility: true,
        organization_role: "Communications Committee Head",
        organization_hours_per_week: 10,
        additional_context: "Midterm requirements overlap with four part-time evening shifts, a student organization campaign, a long daily commute, and regular care for a younger sibling. The student is trying to protect study time but has recently been sleeping less and falling behind on selected requirements.",
        onboarding_completed_at: timestampAt(anchor, -20, "18:45:00")
    }];

    const weeklyCheckIns = [
        {
            id: ids.checkIns[0],
            student_id: studentId,
            week_start: weekStarts[0],
            stress_level: 3,
            mood_level: 4,
            sleep_quality: 3,
            motivation_level: 4,
            burnout_level: 2,
            energy_level: 4,
            available_study_hours: 13,
            reflection: "Midterm requirements are beginning to accumulate, but my weekly plan is still manageable alongside work, commuting, family responsibilities, and organization preparation.",
            submitted_at: timestampAt(anchor, -14, "20:00:00")
        },
        {
            id: ids.checkIns[1],
            student_id: studentId,
            week_start: weekStarts[1],
            stress_level: 4,
            mood_level: 3,
            sleep_quality: 3,
            motivation_level: 3,
            burnout_level: 3,
            energy_level: 3,
            available_study_hours: 9,
            reflection: "I submitted one sprint late and missed a database exercise after two evening shifts. Preparing the organization campaign and helping my sibling with school also reduced my review time.",
            submitted_at: timestampAt(anchor, -7, "21:15:00")
        },
        {
            id: ids.checkIns[2],
            student_id: studentId,
            week_start: weekStarts[2],
            stress_level: 5,
            mood_level: 2,
            sleep_quality: 2,
            motivation_level: 3,
            burnout_level: 5,
            energy_level: 2,
            available_study_hours: 6,
            reflection: "This is my heaviest midterm week. Two requirements slipped while I balanced evening shifts, the commute, family care, and our organization campaign. I am still attending classes, but I need help prioritizing deadlines and protecting sleep.",
            submitted_at: timestampAt(anchor, 0, "07:00:00")
        }
    ];

    const courses = [
        { id: ids.courses.ITISDEV, student_id: studentId, code: "ITISDEV", name: "IT Systems Development" },
        { id: ids.courses.DBADMN, student_id: studentId, code: "DBADMN", name: "Database Administration" },
        { id: ids.courses.WEBAPDE, student_id: studentId, code: "WEBAPDE", name: "Web Application Development" },
        { id: ids.courses.PROFSWD, student_id: studentId, code: "PROFSWD", name: "Professional Software Development" }
    ];

    const academicRecords = [
        {
            id: ids.academicRecords[0],
            student_id: studentId,
            source: "mock",
            course_id: ids.courses.ITISDEV,
            record_type: "grade_snapshot",
            title: "Pre-midterm standing",
            due_at: null,
            submitted_at: null,
            submission_status: "not_applicable",
            score: 88,
            max_score: 100,
            recorded_at: timestampAt(anchor, -14, "09:00:00")
        },
        {
            id: ids.academicRecords[1],
            student_id: studentId,
            source: "mock",
            course_id: ids.courses.ITISDEV,
            record_type: "grade_snapshot",
            title: "Current midterm standing",
            due_at: null,
            submitted_at: null,
            submission_status: "not_applicable",
            score: 62,
            max_score: 100,
            recorded_at: timestampAt(anchor, -1, "18:00:00")
        },
        {
            id: ids.academicRecords[2],
            student_id: studentId,
            source: "mock",
            course_id: ids.courses.ITISDEV,
            record_type: "assignment",
            title: "Sprint 2 implementation",
            due_at: timestampAt(anchor, -10, "23:59:00"),
            submitted_at: timestampAt(anchor, -9, "01:20:00"),
            submission_status: "late",
            score: 82,
            max_score: 100,
            recorded_at: timestampAt(anchor, -8, "10:00:00")
        },
        {
            id: ids.academicRecords[3],
            student_id: studentId,
            source: "mock",
            course_id: ids.courses.DBADMN,
            record_type: "assignment",
            title: "Index optimization exercise",
            due_at: timestampAt(anchor, -6, "23:59:00"),
            submitted_at: null,
            submission_status: "missed",
            score: null,
            max_score: null,
            recorded_at: timestampAt(anchor, -5, "08:00:00")
        },
        {
            id: ids.academicRecords[4],
            student_id: studentId,
            source: "mock",
            course_id: ids.courses.WEBAPDE,
            record_type: "assessment",
            title: "Midterm practical examination",
            due_at: timestampAt(anchor, 2, "13:00:00"),
            submitted_at: null,
            submission_status: "upcoming",
            score: null,
            max_score: null,
            recorded_at: seededAt
        },
        {
            id: ids.academicRecords[5],
            student_id: studentId,
            source: "mock",
            course_id: ids.courses.ITISDEV,
            record_type: "assignment",
            title: "Midterm integration milestone",
            due_at: timestampAt(anchor, -2, "17:00:00"),
            submitted_at: null,
            submission_status: "missed",
            score: null,
            max_score: null,
            recorded_at: timestampAt(anchor, -1, "09:00:00")
        },
        {
            id: ids.academicRecords[6],
            student_id: studentId,
            source: "mock",
            course_id: ids.courses.PROFSWD,
            record_type: "assessment",
            title: "Architecture quiz",
            due_at: timestampAt(anchor, -12, "10:00:00"),
            submitted_at: timestampAt(anchor, -12, "09:48:00"),
            submission_status: "on_time",
            score: 43,
            max_score: 50,
            recorded_at: timestampAt(anchor, -11, "12:00:00")
        },
        {
            id: ids.academicRecords[7],
            student_id: studentId,
            source: "mock",
            course_id: ids.courses.DBADMN,
            record_type: "engagement_snapshot",
            title: "Midterm attendance and participation",
            due_at: null,
            submitted_at: null,
            submission_status: "not_applicable",
            score: 72,
            max_score: 100,
            recorded_at: timestampAt(anchor, -1, "17:30:00")
        }
    ];

    const calendarEvents = [
        completedEvent({
            id: ids.calendarEvents[0], studentId, eventType: "class",
            title: "Database Administration lecture", description: "Midterm review on indexing and query plans.",
            location: "Gokongwei Hall 302", startsAt: timestampAt(anchor, -1, "09:15:00"), endsAt: timestampAt(anchor, -1, "10:45:00")
        }),
        scheduledEvent({
            id: ids.calendarEvents[1], studentId, eventType: "assignment_deadline",
            title: "ITISDEV recovery submission deadline", description: "Submit the missed integration milestone after confirming the recovery arrangement with the instructor.",
            location: "Online submission portal", startsAt: timestampAt(anchor, 4, "17:00:00"), endsAt: timestampAt(anchor, 4, "17:30:00")
        }),
        scheduledEvent({
            id: ids.calendarEvents[2], studentId, academicRecordId: ids.academicRecords[4], eventType: "exam",
            title: "WEBAPDE practical midterm", description: "Timed individual practical examination.",
            location: "Computer Laboratory 4", startsAt: timestampAt(anchor, 2, "13:00:00"), endsAt: timestampAt(anchor, 2, "15:00:00")
        }),
        scheduledEvent({
            id: ids.calendarEvents[3], studentId, eventType: "study_block",
            title: "Focused midterm review", description: "Practice database queries and review web application exercises.",
            location: "Learning Commons", startsAt: timestampAt(anchor, 1, "19:00:00"), endsAt: timestampAt(anchor, 1, "21:00:00")
        }),
        scheduledEvent({
            id: ids.calendarEvents[4], studentId, eventType: "rest_block",
            title: "Protected recovery time", description: "Dinner, screen break, and early sleep before the practical exam.",
            location: "Home", startsAt: timestampAt(anchor, 1, "21:00:00"), endsAt: timestampAt(anchor, 1, "22:30:00")
        }),
        scheduledEvent({
            id: ids.calendarEvents[5], studentId, eventType: "work",
            title: "Part-time customer support shift", description: "Handle the morning support queue and document unresolved requests.",
            location: "Remote", startsAt: timestampAt(anchor, 5, "08:00:00"), endsAt: timestampAt(anchor, 5, "12:00:00")
        }),
        scheduledEvent({
            id: ids.calendarEvents[6], studentId, eventType: "organization",
            title: "Student organization campaign launch", description: "Coordinate publication materials and brief the communications volunteers.",
            location: "Multipurpose Hall", startsAt: timestampAt(anchor, 3, "18:00:00"), endsAt: timestampAt(anchor, 3, "21:00:00")
        }),
        scheduledEvent({
            id: ids.calendarEvents[7], studentId, eventType: "organization",
            title: "Campaign publication work session", description: "Finalize captions, graphics, and the volunteer posting schedule.",
            location: "Student Media Office", startsAt: timestampAt(anchor, 1, "16:00:00"), endsAt: timestampAt(anchor, 1, "18:30:00")
        }),
        scheduledEvent({
            id: ids.calendarEvents[8], studentId, eventType: "caregiving",
            title: "Family medical appointment", description: "Accompany a family member and manage transportation.",
            location: "Community Health Center", startsAt: timestampAt(anchor, 4, "08:00:00"), endsAt: timestampAt(anchor, 4, "10:00:00")
        }),
        scheduledEvent({
            id: ids.calendarEvents[9], studentId, eventType: "work",
            title: "Part-time evening shift", description: "Customer support shift after classes and the commute home.",
            location: "Remote", startsAt: timestampAt(anchor, 0, "18:00:00"), endsAt: timestampAt(anchor, 0, "22:00:00")
        }),
        scheduledEvent({
            id: ids.calendarEvents[10], studentId, eventType: "personal",
            title: "Family birthday", description: "Reserved family commitment during midterm weekend.",
            location: "Home", startsAt: timestampAt(anchor, 6, "00:00:00"), endsAt: timestampAt(anchor, 6, "23:59:00"), allDay: true
        }),
        {
            ...scheduledEvent({
                id: ids.calendarEvents[11], studentId, eventType: "other",
                title: "Optional career webinar", description: "Webinar cancelled to protect midterm study time.",
                location: "Online", startsAt: timestampAt(anchor, 2, "18:00:00"), endsAt: timestampAt(anchor, 2, "19:00:00")
            }),
            status: "cancelled"
        }
    ];

    const courseEnvironmentLogs = [
        {
            id: ids.courseEnvironmentLogs[0], student_id: studentId, check_in_id: ids.checkIns[2],
            course_id: ids.courses.ITISDEV, week_start: weekStarts[2],
            workload_difficulty: 5, unclear_instruction_level: 4, grading_concern_level: 4,
            professor_approachability_concern: 4, groupmate_issue_level: 4,
            concern_notes: "The midterm scope is large and two group members have limited availability, leaving most integration and documentation work to be finished alongside the recovery submission."
        },
        {
            id: ids.courseEnvironmentLogs[1], student_id: studentId, check_in_id: ids.checkIns[2],
            course_id: ids.courses.WEBAPDE, week_start: weekStarts[2],
            workload_difficulty: 5, unclear_instruction_level: 4, grading_concern_level: 3,
            professor_approachability_concern: 3, groupmate_issue_level: 3,
            concern_notes: "The practical exam coverage is broad and some deployment instructions need clarification before exam day."
        },
        {
            id: ids.courseEnvironmentLogs[2], student_id: studentId, check_in_id: ids.checkIns[1],
            course_id: ids.courses.DBADMN, week_start: weekStarts[1],
            workload_difficulty: 4, unclear_instruction_level: 2, grading_concern_level: 5,
            professor_approachability_concern: 2, groupmate_issue_level: 1,
            concern_notes: "Missing the optimization exercise significantly affected the current grade, although the lesson materials are clear."
        }
    ];

    const wellnessDimensionScores = [
        {
            id: ids.dimensionScores[0], student_id: studentId, check_in_id: ids.checkIns[0],
            academic_engagement_score: 35, personal_wellbeing_score: 36.25,
            logistical_load_score: 50, role_load_score: 76.36, course_environment_score: 30,
            calculation_method: "rule_based", calculation_version: "1.0",
            calculated_at: timestampAt(anchor, -14, "20:00:00")
        },
        {
            id: ids.dimensionScores[1], student_id: studentId, check_in_id: ids.checkIns[1],
            academic_engagement_score: 50, personal_wellbeing_score: 56.25,
            logistical_load_score: 58, role_load_score: 76.36, course_environment_score: 55,
            calculation_method: "rule_based", calculation_version: "1.0",
            calculated_at: timestampAt(anchor, -7, "21:15:00")
        },
        {
            id: ids.dimensionScores[2], student_id: studentId, check_in_id: ids.checkIns[2],
            academic_engagement_score: 54, personal_wellbeing_score: 82.5,
            logistical_load_score: 63.7, role_load_score: 76.36, course_environment_score: 74.38,
            calculation_method: "rule_based", calculation_version: "1.0",
            calculated_at: timestampAt(anchor, 0, "07:00:00")
        }
    ];

    const aiResults = [
        {
            id: ids.aiResults[0], student_id: studentId, check_in_id: ids.checkIns[0],
            dimension_scores_id: ids.dimensionScores[0],
            swi_score: 46, risk_category: "moderate", stress_severity_level: "moderate",
            primary_stress_context: "role_load",
            reflection_keywords: ["requirements", "work", "commute", "manageable"],
            weekly_summary: "The student is managing early midterm pressure, while employment, commuting, organization work, and family care are already reducing schedule flexibility.",
            recommendations: [
                { "priority": "medium", "action": "Reserve two protected study blocks before requirements become urgent." },
                { "priority": "medium", "action": "Share one campaign-preparation task with another committee member." }
            ],
            analysis_method: "rag_assisted", analysis_version: "1.0", generated_at: timestampAt(anchor, -14, "20:05:00")
        },
        {
            id: ids.aiResults[1], student_id: studentId, check_in_id: ids.checkIns[1],
            dimension_scores_id: ids.dimensionScores[1],
            swi_score: 59, risk_category: "moderate", stress_severity_level: "moderate",
            primary_stress_context: "role_load",
            reflection_keywords: ["late", "missed", "work", "campaign", "family"],
            weekly_summary: "A late submission and a missed exercise show that the combined academic and role load is beginning to affect study time and recovery.",
            recommendations: [
                { "priority": "medium", "action": "Contact the database instructor about recovery options for the missed exercise." },
                { "priority": "medium", "action": "Swap one evening work shift before the busiest midterm days." }
            ],
            analysis_method: "rag_assisted", analysis_version: "1.0", generated_at: timestampAt(anchor, -7, "21:20:00")
        },
        {
            id: ids.aiResults[2], student_id: studentId, check_in_id: ids.checkIns[2],
            dimension_scores_id: ids.dimensionScores[2],
            swi_score: 70.19, risk_category: "high", stress_severity_level: "severe",
            primary_stress_context: "personal_wellbeing",
            reflection_keywords: ["heaviest", "missed", "shifts", "commute", "family", "campaign", "sleep"],
            weekly_summary: "Severe midterm stress is being driven by missed academic work, poor sleep, limited study time, employment, commuting, family care, and organization responsibilities.",
            recommendations: [
                { "priority": "high", "action": "Use the protected study and recovery blocks and decline optional commitments this week." },
                { "priority": "high", "action": "Ask instructors about recovery options and realistic sequencing for the missed requirements." },
                { "priority": "high", "action": "Delegate campaign publishing tasks and request one work-shift adjustment." }
            ],
            analysis_method: "rag_assisted", analysis_version: "1.0", generated_at: timestampAt(anchor, 0, "07:05:00")
        }
    ];

    return {
        anchorDate: toDateString(anchor),
        tables: {
            students,
            student_profiles: studentProfiles,
            weekly_check_ins: weeklyCheckIns,
            courses,
            academic_records: academicRecords,
            calendar_events: calendarEvents,
            course_environment_logs: courseEnvironmentLogs,
            wellness_dimension_scores: wellnessDimensionScores,
            ai_results: aiResults
        }
    };
}

async function findAuthUserByEmail(supabase, email) {
    const perPage = 200;

    for (let page = 1; page <= 1000; page += 1) {
        const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
        if (error) {
            throw new Error(`Unable to list Supabase Auth users: ${error.message}`);
        }

        const users = data?.users || [];
        const match = users.find((user) => user.email?.toLowerCase() === email);
        if (match) {
            return match;
        }
        if (users.length < perPage) {
            return null;
        }
    }

    throw new Error("Unable to find the seed Auth user after scanning 1000 pages");
}

async function ensureAuthUser(supabase, config) {
    const existingUser = await findAuthUserByEmail(supabase, config.email);
    const attributes = {
        email: config.email,
        password: config.password,
        email_confirm: true,
        user_metadata: {
            demo_seed: true,
            persona: "severe_working_student_commuter_org_caregiver"
        }
    };

    if (existingUser) {
        if (existingUser.user_metadata?.demo_seed !== true) {
            throw new Error(
                `Refusing to overwrite the non-demo Auth user registered as ${config.email}`
            );
        }

        const { data, error } = await supabase.auth.admin.updateUserById(existingUser.id, attributes);
        if (error) {
            throw new Error(`Unable to update the seed Auth user: ${error.message}`);
        }
        return { user: data.user, created: false };
    }

    const { data, error } = await supabase.auth.admin.createUser(attributes);
    if (error) {
        throw new Error(`Unable to create the seed Auth user: ${error.message}`);
    }
    return { user: data.user, created: true };
}

async function deletePublicStudent(supabase, studentId) {
    const { error } = await supabase
        .from("students")
        .delete()
        .eq("id", studentId);

    if (error) {
        throw new Error(`Unable to replace the seed student's existing dataset: ${error.message}`);
    }
}

async function insertScenario(supabase, scenario) {
    for (const table of APPLICATION_TABLES) {
        const rows = scenario.tables[table];
        const { error } = await supabase.from(table).insert(rows);
        if (error) {
            throw new Error(`Unable to seed ${table}: ${error.message}`);
        }
    }
}

async function verifyScenario(supabase, studentId, scenario) {
    const counts = {};

    for (const table of APPLICATION_TABLES) {
        const ownershipField = table === "students" ? "id" : "student_id";
        const { count, error } = await supabase
            .from(table)
            .select("id", { count: "exact", head: true })
            .eq(ownershipField, studentId);

        if (error) {
            throw new Error(`Unable to verify ${table}: ${error.message}`);
        }

        const expected = scenario.tables[table].length;
        if (count !== expected) {
            throw new Error(`Seed verification failed for ${table}: expected ${expected}, found ${count ?? 0}`);
        }
        counts[table] = count;
    }

    return counts;
}

async function runDemoStudentSeed({ supabase, config, now = new Date() }) {
    if (!supabase?.auth?.admin || typeof supabase.from !== "function") {
        throw new Error("A Supabase service-role client is required");
    }

    const authResult = await ensureAuthUser(supabase, config);
    if (!authResult.user?.id) {
        throw new Error("Supabase Auth did not return a user ID");
    }

    const studentId = authResult.user.id;
    try {
        const scenario = buildDemoStudentScenario({
            studentId,
            studentNumber: config.studentNumber,
            firstName: config.firstName,
            lastName: config.lastName,
            now
        });

        await deletePublicStudent(supabase, studentId);
        await insertScenario(supabase, scenario);
        const counts = await verifyScenario(supabase, studentId, scenario);
        return {
            authUserCreated: authResult.created,
            studentId,
            email: config.email,
            studentNumber: config.studentNumber,
            firstName: config.firstName,
            lastName: config.lastName,
            anchorDate: scenario.anchorDate,
            counts
        };
    } catch (error) {
        const cleanupErrors = [];

        try {
            await deletePublicStudent(supabase, studentId);
        } catch (cleanupError) {
            cleanupErrors.push(cleanupError.message);
        }

        if (authResult.created) {
            const { error: authCleanupError } = await supabase.auth.admin.deleteUser(studentId);
            if (authCleanupError) {
                cleanupErrors.push(
                    `Unable to remove the newly created seed Auth user: ${authCleanupError.message}`
                );
            }
        }

        if (cleanupErrors.length > 0) {
            error.message += ` Cleanup also failed: ${cleanupErrors.join("; ")}`;
        }
        throw error;
    }
}

module.exports = {
    APPLICATION_TABLES,
    buildDemoStudentScenario,
    getManilaWeekAnchor,
    runDemoStudentSeed,
    validateSeedEnvironment
};
