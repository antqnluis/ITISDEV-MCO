const MANILA_TIME_ZONE = "Asia/Manila";
const MANILA_OFFSET = "+08:00";

const IDS = Object.freeze({
    profile: "10000000-0000-4000-8000-000000000001",
    checkIns: Object.freeze([
        "20000000-0000-4000-8000-000000000001",
        "20000000-0000-4000-8000-000000000002",
        "20000000-0000-4000-8000-000000000003"
    ]),
    academicRecords: Object.freeze([
        "30000000-0000-4000-8000-000000000001",
        "30000000-0000-4000-8000-000000000002",
        "30000000-0000-4000-8000-000000000003",
        "30000000-0000-4000-8000-000000000004",
        "30000000-0000-4000-8000-000000000005",
        "30000000-0000-4000-8000-000000000006",
        "30000000-0000-4000-8000-000000000007",
        "30000000-0000-4000-8000-000000000008"
    ]),
    calendarEvents: Object.freeze(Array.from({ length: 12 }, (_, index) => (
        `40000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`
    ))),
    courseEnvironmentLogs: Object.freeze([
        "50000000-0000-4000-8000-000000000001",
        "50000000-0000-4000-8000-000000000002",
        "50000000-0000-4000-8000-000000000003"
    ]),
    aiResults: Object.freeze([
        "60000000-0000-4000-8000-000000000001",
        "60000000-0000-4000-8000-000000000002",
        "60000000-0000-4000-8000-000000000003"
    ])
});

const APPLICATION_TABLES = Object.freeze([
    "students",
    "student_profiles",
    "weekly_check_ins",
    "academic_records",
    "calendar_events",
    "course_environment_logs",
    "ai_results"
]);

function requireEnvironmentValue(environment, name) {
    const value = environment[name];
    if (typeof value !== "string" || value.trim().length === 0) {
        throw new Error(`${name} is required to seed the demo student`);
    }

    return value.trim();
}

function validateSeedEnvironment(environment = process.env) {
    const config = {
        supabaseUrl: requireEnvironmentValue(environment, "SUPABASE_URL"),
        serviceRoleKey: requireEnvironmentValue(environment, "SUPABASE_SERVICE_ROLE_KEY"),
        email: requireEnvironmentValue(environment, "SEED_USER_EMAIL").toLowerCase(),
        password: requireEnvironmentValue(environment, "SEED_USER_PASSWORD"),
        studentNumber: requireEnvironmentValue(environment, "SEED_STUDENT_NUMBER")
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

function buildDemoStudentScenario({ studentId, studentNumber, now = new Date() }) {
    if (typeof studentId !== "string" || studentId.trim().length === 0) {
        throw new Error("studentId is required");
    }
    if (typeof studentNumber !== "string" || studentNumber.trim().length === 0) {
        throw new Error("studentNumber is required");
    }

    const anchor = getManilaWeekAnchor(now);
    const weekStarts = [-14, -7, 0].map((offset) => toDateString(addDays(anchor, offset)));
    const seededAt = timestampAt(anchor, 0, "07:00:00");

    const students = [{
        id: studentId,
        student_number: studentNumber,
        consent_given: true,
        consented_at: timestampAt(anchor, -20, "18:30:00"),
        privacy_notice_version: "v1.0"
    }];

    const studentProfiles = [{
        id: IDS.profile,
        student_id: studentId,
        college: "College of Computer Studies",
        program: "BS Information Technology",
        year_level: 3,
        commute_minutes_per_day: 90,
        available_study_hours_per_week: 8,
        has_caregiving_responsibility: true,
        caregiving_hours_per_week: 5,
        is_employed: true,
        work_hours_per_week: 20,
        has_ojt: true,
        ojt_hours_per_week: 8,
        is_athlete: true,
        athlete_hours_per_week: 12,
        has_organization_responsibility: true,
        organization_role: "Vice President",
        organization_hours_per_week: 8,
        additional_context: "Midterm season overlaps with varsity training, an organization event, part-time work, OJT deliverables, commuting, and caregiving. The student is prioritizing urgent requirements but has less time for sleep and focused study.",
        onboarding_completed_at: timestampAt(anchor, -20, "18:45:00")
    }];

    const weeklyCheckIns = [
        {
            id: IDS.checkIns[0],
            student_id: studentId,
            week_start: weekStarts[0],
            stress_level: 3,
            mood_level: 4,
            sleep_quality: 3,
            motivation_level: 4,
            burnout_level: 2,
            energy_level: 4,
            available_study_hours: 14,
            reflection: "Midterm requirements are starting to accumulate, but my study plan is still manageable alongside training, work, OJT, and organization preparation.",
            submitted_at: timestampAt(anchor, -14, "20:00:00")
        },
        {
            id: IDS.checkIns[1],
            student_id: studentId,
            week_start: weekStarts[1],
            stress_level: 4,
            mood_level: 3,
            sleep_quality: 2,
            motivation_level: 3,
            burnout_level: 4,
            energy_level: 3,
            available_study_hours: 10,
            reflection: "I submitted one sprint late and missed a database exercise after work and varsity practice ran long. The organization midterm event also needs VP approval.",
            submitted_at: timestampAt(anchor, -7, "21:15:00")
        },
        {
            id: IDS.checkIns[2],
            student_id: studentId,
            week_start: weekStarts[2],
            stress_level: 5,
            mood_level: 2,
            sleep_quality: 2,
            motivation_level: 3,
            burnout_level: 5,
            energy_level: 2,
            available_study_hours: 6,
            reflection: "This is the heaviest midterm week. I have exams and project deadlines while working evening shifts, attending OJT, training for competition, caring for a family member, and leading the organization as vice president.",
            submitted_at: timestampAt(anchor, 0, "07:00:00")
        }
    ];

    const academicRecords = [
        {
            id: IDS.academicRecords[0],
            student_id: studentId,
            source: "mock",
            course_code: "ITISDEV",
            course_name: "IT Systems Development",
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
            id: IDS.academicRecords[1],
            student_id: studentId,
            source: "mock",
            course_code: "ITISDEV",
            course_name: "IT Systems Development",
            record_type: "grade_snapshot",
            title: "Current midterm standing",
            due_at: null,
            submitted_at: null,
            submission_status: "not_applicable",
            score: 74,
            max_score: 100,
            recorded_at: timestampAt(anchor, -1, "18:00:00")
        },
        {
            id: IDS.academicRecords[2],
            student_id: studentId,
            source: "mock",
            course_code: "ITISDEV",
            course_name: "IT Systems Development",
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
            id: IDS.academicRecords[3],
            student_id: studentId,
            source: "mock",
            course_code: "DBADMN",
            course_name: "Database Administration",
            record_type: "assignment",
            title: "Index optimization exercise",
            due_at: timestampAt(anchor, -6, "23:59:00"),
            submitted_at: null,
            submission_status: "missed",
            score: 0,
            max_score: 20,
            recorded_at: timestampAt(anchor, -5, "08:00:00")
        },
        {
            id: IDS.academicRecords[4],
            student_id: studentId,
            source: "mock",
            course_code: "WEBAPDE",
            course_name: "Web Application Development",
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
            id: IDS.academicRecords[5],
            student_id: studentId,
            source: "mock",
            course_code: "ITISDEV",
            course_name: "IT Systems Development",
            record_type: "assignment",
            title: "Midterm project demonstration",
            due_at: timestampAt(anchor, 4, "17:00:00"),
            submitted_at: null,
            submission_status: "upcoming",
            score: null,
            max_score: null,
            recorded_at: seededAt
        },
        {
            id: IDS.academicRecords[6],
            student_id: studentId,
            source: "mock",
            course_code: "PROFSWD",
            course_name: "Professional Software Development",
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
            id: IDS.academicRecords[7],
            student_id: studentId,
            source: "mock",
            course_code: "DBADMN",
            course_name: "Database Administration",
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
            id: IDS.calendarEvents[0], studentId, eventType: "class",
            title: "Database Administration lecture", description: "Midterm review on indexing and query plans.",
            location: "Gokongwei Hall 302", startsAt: timestampAt(anchor, -1, "09:15:00"), endsAt: timestampAt(anchor, -1, "10:45:00")
        }),
        scheduledEvent({
            id: IDS.calendarEvents[1], studentId, academicRecordId: IDS.academicRecords[5], eventType: "assignment_deadline",
            title: "ITISDEV midterm project due", description: "Final code, documentation, and project demonstration.",
            location: "Online submission portal", startsAt: timestampAt(anchor, 4, "17:00:00"), endsAt: timestampAt(anchor, 4, "17:30:00")
        }),
        scheduledEvent({
            id: IDS.calendarEvents[2], studentId, academicRecordId: IDS.academicRecords[4], eventType: "exam",
            title: "WEBAPDE practical midterm", description: "Timed individual practical examination.",
            location: "Computer Laboratory 4", startsAt: timestampAt(anchor, 2, "13:00:00"), endsAt: timestampAt(anchor, 2, "15:00:00")
        }),
        scheduledEvent({
            id: IDS.calendarEvents[3], studentId, eventType: "study_block",
            title: "Focused midterm review", description: "Practice database queries and review web application exercises.",
            location: "Learning Commons", startsAt: timestampAt(anchor, 1, "19:00:00"), endsAt: timestampAt(anchor, 1, "21:00:00")
        }),
        scheduledEvent({
            id: IDS.calendarEvents[4], studentId, eventType: "rest_block",
            title: "Protected recovery time", description: "Dinner, screen break, and early sleep before the practical exam.",
            location: "Home", startsAt: timestampAt(anchor, 1, "21:00:00"), endsAt: timestampAt(anchor, 1, "22:30:00")
        }),
        scheduledEvent({
            id: IDS.calendarEvents[5], studentId, eventType: "ojt",
            title: "OJT sprint review", description: "Present completed tickets and receive mentor feedback.",
            location: "Partner company office", startsAt: timestampAt(anchor, 3, "08:00:00"), endsAt: timestampAt(anchor, 3, "12:00:00")
        }),
        scheduledEvent({
            id: IDS.calendarEvents[6], studentId, eventType: "organization",
            title: "Student organization midterm assembly", description: "Facilitate the program and coordinate officers as vice president.",
            location: "Multipurpose Hall", startsAt: timestampAt(anchor, 3, "18:00:00"), endsAt: timestampAt(anchor, 3, "21:00:00")
        }),
        scheduledEvent({
            id: IDS.calendarEvents[7], studentId, eventType: "athletics",
            title: "Varsity team training", description: "Final conditioning session before the weekend competition.",
            location: "University Sports Complex", startsAt: timestampAt(anchor, 1, "16:00:00"), endsAt: timestampAt(anchor, 1, "18:30:00")
        }),
        scheduledEvent({
            id: IDS.calendarEvents[8], studentId, eventType: "caregiving",
            title: "Family medical appointment", description: "Accompany a family member and manage transportation.",
            location: "Community Health Center", startsAt: timestampAt(anchor, 4, "08:00:00"), endsAt: timestampAt(anchor, 4, "10:00:00")
        }),
        scheduledEvent({
            id: IDS.calendarEvents[9], studentId, eventType: "work",
            title: "Part-time evening shift", description: "Customer support shift after classes.",
            location: "Remote", startsAt: timestampAt(anchor, 0, "18:00:00"), endsAt: timestampAt(anchor, 0, "22:00:00")
        }),
        scheduledEvent({
            id: IDS.calendarEvents[10], studentId, eventType: "personal",
            title: "Family birthday", description: "Reserved family commitment during midterm weekend.",
            location: "Home", startsAt: timestampAt(anchor, 6, "00:00:00"), endsAt: timestampAt(anchor, 6, "23:59:00"), allDay: true
        }),
        {
            ...scheduledEvent({
                id: IDS.calendarEvents[11], studentId, eventType: "other",
                title: "Optional career webinar", description: "Webinar cancelled to protect midterm study time.",
                location: "Online", startsAt: timestampAt(anchor, 2, "18:00:00"), endsAt: timestampAt(anchor, 2, "19:00:00")
            }),
            status: "cancelled"
        }
    ];

    const courseEnvironmentLogs = [
        {
            id: IDS.courseEnvironmentLogs[0], student_id: studentId, check_in_id: IDS.checkIns[2],
            course_code: "ITISDEV", course_name: "IT Systems Development", week_start: weekStarts[2],
            workload_difficulty: 5, unclear_instruction_level: 3, grading_concern_level: 4,
            professor_approachability_concern: 2, groupmate_issue_level: 4,
            concern_notes: "The midterm scope is large and two group members have limited availability, leaving more integration and documentation work for me."
        },
        {
            id: IDS.courseEnvironmentLogs[1], student_id: studentId, check_in_id: IDS.checkIns[2],
            course_code: "WEBAPDE", course_name: "Web Application Development", week_start: weekStarts[2],
            workload_difficulty: 5, unclear_instruction_level: 4, grading_concern_level: 3,
            professor_approachability_concern: 3, groupmate_issue_level: 1,
            concern_notes: "The practical exam coverage is broad and some deployment instructions need clarification before exam day."
        },
        {
            id: IDS.courseEnvironmentLogs[2], student_id: studentId, check_in_id: IDS.checkIns[1],
            course_code: "DBADMN", course_name: "Database Administration", week_start: weekStarts[1],
            workload_difficulty: 4, unclear_instruction_level: 2, grading_concern_level: 5,
            professor_approachability_concern: 2, groupmate_issue_level: 1,
            concern_notes: "Missing the optimization exercise significantly affected the current grade, although the lesson materials are clear."
        }
    ];

    const aiResults = [
        {
            id: IDS.aiResults[0], student_id: studentId, check_in_id: IDS.checkIns[0],
            swi_score: 48, risk_category: "moderate", stress_severity_level: "moderate",
            primary_stress_context: "role_load", academic_engagement_score: 35, personal_wellbeing_score: 38,
            logistical_load_score: 58, role_load_score: 66, course_environment_score: 30,
            reflection_keywords: ["requirements", "training", "work", "manageable"],
            weekly_summary: "The student is managing early midterm pressure, but overlapping employment, athletics, OJT, organization, and caregiving roles are reducing schedule flexibility.",
            recommendations: [
                { "priority": "medium", "action": "Reserve two protected study blocks before requirements become urgent." },
                { "priority": "medium", "action": "Delegate one organization preparation task to another officer." }
            ],
            analysis_method: "rule_based", analysis_version: "1.0", generated_at: timestampAt(anchor, -14, "20:05:00")
        },
        {
            id: IDS.aiResults[1], student_id: studentId, check_in_id: IDS.checkIns[1],
            swi_score: 73, risk_category: "high", stress_severity_level: "severe",
            primary_stress_context: "academic_engagement", academic_engagement_score: 82, personal_wellbeing_score: 70,
            logistical_load_score: 68, role_load_score: 76, course_environment_score: 72,
            reflection_keywords: ["late", "missed", "practice", "approval"],
            weekly_summary: "A late submission and a missed exercise indicate that the combined midterm and role load is beginning to affect academic engagement and recovery.",
            recommendations: [
                { "priority": "high", "action": "Contact the database instructor about recovery options for the missed exercise." },
                { "priority": "high", "action": "Reduce or swap one work or training commitment this week." }
            ],
            analysis_method: "rule_based", analysis_version: "1.0", generated_at: timestampAt(anchor, -7, "21:20:00")
        },
        {
            id: IDS.aiResults[2], student_id: studentId, check_in_id: IDS.checkIns[2],
            swi_score: 89, risk_category: "high", stress_severity_level: "critical",
            primary_stress_context: "mixed", academic_engagement_score: 91, personal_wellbeing_score: 92,
            logistical_load_score: 82, role_load_score: 94, course_environment_score: 81,
            reflection_keywords: ["heaviest", "exams", "deadlines", "working", "training", "caregiving", "vice president"],
            weekly_summary: "Critical midterm stress is driven by urgent academic requirements, very limited study time, poor sleep, and simultaneous work, OJT, athletics, caregiving, and leadership commitments.",
            recommendations: [
                { "priority": "urgent", "action": "Use the protected study and recovery blocks and avoid adding optional commitments." },
                { "priority": "urgent", "action": "Ask instructors and teammates for deadline or workload support before the upcoming exams." },
                { "priority": "high", "action": "Delegate assembly logistics to organization officers and discuss a work-shift adjustment." }
            ],
            analysis_method: "rule_based", analysis_version: "1.0", generated_at: timestampAt(anchor, 0, "07:05:00")
        }
    ];

    return {
        anchorDate: toDateString(anchor),
        tables: {
            students,
            student_profiles: studentProfiles,
            weekly_check_ins: weeklyCheckIns,
            academic_records: academicRecords,
            calendar_events: calendarEvents,
            course_environment_logs: courseEnvironmentLogs,
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
        user_metadata: { demo_seed: true, persona: "midterm_working_student_athlete_org_vp" }
    };

    if (existingUser) {
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
    const scenario = buildDemoStudentScenario({
        studentId,
        studentNumber: config.studentNumber,
        now
    });

    await deletePublicStudent(supabase, studentId);

    try {
        await insertScenario(supabase, scenario);
        const counts = await verifyScenario(supabase, studentId, scenario);
        return {
            authUserCreated: authResult.created,
            studentId,
            email: config.email,
            studentNumber: config.studentNumber,
            anchorDate: scenario.anchorDate,
            counts
        };
    } catch (error) {
        try {
            await deletePublicStudent(supabase, studentId);
        } catch (cleanupError) {
            error.message += ` Cleanup also failed: ${cleanupError.message}`;
        }
        throw error;
    }
}

module.exports = {
    APPLICATION_TABLES,
    IDS,
    buildDemoStudentScenario,
    getManilaWeekAnchor,
    runDemoStudentSeed,
    validateSeedEnvironment
};
