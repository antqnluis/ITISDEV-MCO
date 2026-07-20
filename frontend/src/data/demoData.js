const DAY_IN_MS = 24 * 60 * 60 * 1000;

function startOfWeek(date = new Date()) {
  const value = new Date(date);
  value.setHours(0, 0, 0, 0);
  const day = value.getDay() || 7;
  value.setDate(value.getDate() - day + 1);
  return value;
}

function addDays(date, days) {
  return new Date(date.getTime() + days * DAY_IN_MS);
}

function dateOnly(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function atTime(anchor, dayOffset, hours, minutes = 0) {
  const value = addDays(anchor, dayOffset);
  value.setHours(hours, minutes, 0, 0);
  return value.toISOString();
}

const anchor = startOfWeek();
const weekStarts = [-14, -7, 0].map((offset) => dateOnly(addDays(anchor, offset)));

export const demoData = {
  student: {
    id: "10000000-0000-4000-8000-000000000000",
    student_number: "12345678",
    first_name: "Pauline",
    last_name: "Reyes",
    email: "pauline.reyes@dlsu.edu.ph",
    consent_given: true,
    consented_at: atTime(anchor, -20, 18, 30),
    privacy_notice_version: "v1.0",
  },
  profile: {
    college: "College of Computer Studies",
    program: "BS Information Technology",
    year_level: 3,
    current_academic_term: 1,
    wellness_goals: ["Managing Stress", "Managing Workload", "Better Sleep"],
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
    additional_context: "Midterm season overlaps with varsity training, organization work, part-time shifts, OJT deliverables, commuting, and caregiving.",
  },
  checkIns: [
    {
      id: "check-in-1", week_start: weekStarts[0], stress_level: 3, mood_level: 4,
      sleep_quality: 3, motivation_level: 4, burnout_level: 2, energy_level: 4,
      available_study_hours: 14,
      reflection: "Midterm requirements are starting to accumulate, but my study plan is still manageable.",
      submitted_at: atTime(anchor, -14, 20),
    },
    {
      id: "check-in-2", week_start: weekStarts[1], stress_level: 4, mood_level: 3,
      sleep_quality: 2, motivation_level: 3, burnout_level: 4, energy_level: 3,
      available_study_hours: 10,
      reflection: "I submitted one sprint late after work and varsity practice ran long.",
      submitted_at: atTime(anchor, -7, 21, 15),
    },
    {
      id: "check-in-3", week_start: weekStarts[2], stress_level: 5, mood_level: 2,
      sleep_quality: 2, motivation_level: 3, burnout_level: 5, energy_level: 2,
      available_study_hours: 6,
      reflection: "This is the heaviest midterm week. I have exams and project deadlines alongside work, OJT, training, caregiving, and organization duties.",
      submitted_at: atTime(anchor, 0, 7),
    },
  ],
  dimensionScores: [
    { id: "score-1", check_in_id: "check-in-1", academic_engagement_score: 35, personal_wellbeing_score: 38, logistical_load_score: 58, role_load_score: 66, course_environment_score: 30, calculated_at: atTime(anchor, -14, 20, 5) },
    { id: "score-2", check_in_id: "check-in-2", academic_engagement_score: 82, personal_wellbeing_score: 70, logistical_load_score: 68, role_load_score: 76, course_environment_score: 72, calculated_at: atTime(anchor, -7, 21, 20) },
    { id: "score-3", check_in_id: "check-in-3", academic_engagement_score: 91, personal_wellbeing_score: 92, logistical_load_score: 82, role_load_score: 94, course_environment_score: 81, calculated_at: atTime(anchor, 0, 7, 5) },
  ],
  academicRecords: [
    { id: "record-1", source: "mock", course_code: "ITISDEV", course_name: "IT Systems Development", record_type: "grade_snapshot", title: "Current midterm standing", due_at: null, submitted_at: null, submission_status: "not_applicable", score: 74, max_score: 100, grade_percentage: 74, recorded_at: atTime(anchor, -1, 18) },
    { id: "record-2", source: "mock", course_code: "ITISDEV", course_name: "IT Systems Development", record_type: "assignment", title: "Sprint 2 implementation", due_at: atTime(anchor, -10, 23, 59), submitted_at: atTime(anchor, -9, 1, 20), submission_status: "late", score: 82, max_score: 100, grade_percentage: 82, recorded_at: atTime(anchor, -8, 10) },
    { id: "record-3", source: "mock", course_code: "DBADMN", course_name: "Database Administration", record_type: "assignment", title: "Index optimization exercise", due_at: atTime(anchor, -6, 23, 59), submitted_at: null, submission_status: "missed", score: 0, max_score: 20, grade_percentage: 0, recorded_at: atTime(anchor, -5, 8) },
    { id: "record-4", source: "mock", course_code: "WEBAPDE", course_name: "Web Application Development", record_type: "assessment", title: "Midterm practical examination", due_at: atTime(anchor, 2, 13), submitted_at: null, submission_status: "upcoming", score: null, max_score: null, grade_percentage: null, recorded_at: atTime(anchor, 0, 7) },
    { id: "record-5", source: "mock", course_code: "ITISDEV", course_name: "IT Systems Development", record_type: "assignment", title: "Midterm project demonstration", due_at: atTime(anchor, 4, 17), submitted_at: null, submission_status: "upcoming", score: null, max_score: null, grade_percentage: null, recorded_at: atTime(anchor, 0, 7) },
    { id: "record-6", source: "mock", course_code: "PROFSWD", course_name: "Professional Software Development", record_type: "assessment", title: "Architecture quiz", due_at: atTime(anchor, -12, 10), submitted_at: atTime(anchor, -12, 9, 48), submission_status: "on_time", score: 43, max_score: 50, grade_percentage: 86, recorded_at: atTime(anchor, -11, 12) },
    { id: "record-7", source: "mock", course_code: "DBADMN", course_name: "Database Administration", record_type: "engagement_snapshot", title: "Midterm attendance and participation", due_at: null, submitted_at: null, submission_status: "not_applicable", score: 72, max_score: 100, grade_percentage: 72, recorded_at: atTime(anchor, -1, 17, 30) },
  ],
  calendarEvents: [
    { id: "event-1", academic_record_id: null, source: "mock", event_type: "class", title: "Database Administration lecture", description: "Midterm review on indexing and query plans.", location: "Gokongwei Hall 302", starts_at: atTime(anchor, 0, 9, 15), ends_at: atTime(anchor, 0, 10, 45), all_day: false, status: "completed", completed_at: atTime(anchor, 0, 10, 45) },
    { id: "event-2", academic_record_id: "record-4", source: "mock", event_type: "exam", title: "WEBAPDE practical midterm", description: "Timed individual practical examination.", location: "Computer Laboratory 4", starts_at: atTime(anchor, 2, 13), ends_at: atTime(anchor, 2, 15), all_day: false, status: "scheduled", completed_at: null },
    { id: "event-3", academic_record_id: null, source: "mock", event_type: "study_block", title: "Focused midterm review", description: "Practice database queries and web application exercises.", location: "Learning Commons", starts_at: atTime(anchor, 1, 19), ends_at: atTime(anchor, 1, 21), all_day: false, status: "scheduled", completed_at: null },
    { id: "event-4", academic_record_id: null, source: "mock", event_type: "rest_block", title: "Protected recovery time", description: "Dinner, screen break, and early sleep.", location: "Home", starts_at: atTime(anchor, 1, 21), ends_at: atTime(anchor, 1, 22, 30), all_day: false, status: "scheduled", completed_at: null },
    { id: "event-5", academic_record_id: null, source: "mock", event_type: "ojt", title: "OJT sprint review", description: "Present completed tickets and receive mentor feedback.", location: "Partner company office", starts_at: atTime(anchor, 3, 8), ends_at: atTime(anchor, 3, 12), all_day: false, status: "scheduled", completed_at: null },
    { id: "event-6", academic_record_id: null, source: "mock", event_type: "organization", title: "Student organization assembly", description: "Facilitate the program and coordinate officers.", location: "Multipurpose Hall", starts_at: atTime(anchor, 3, 18), ends_at: atTime(anchor, 3, 21), all_day: false, status: "scheduled", completed_at: null },
    { id: "event-7", academic_record_id: null, source: "mock", event_type: "athletics", title: "Varsity team training", description: "Final conditioning session before competition.", location: "University Sports Complex", starts_at: atTime(anchor, 1, 16), ends_at: atTime(anchor, 1, 18, 30), all_day: false, status: "scheduled", completed_at: null },
    { id: "event-8", academic_record_id: "record-5", source: "mock", event_type: "assignment_deadline", title: "ITISDEV midterm project due", description: "Final code, documentation, and demonstration.", location: "Online submission portal", starts_at: atTime(anchor, 4, 17), ends_at: atTime(anchor, 4, 17, 30), all_day: false, status: "scheduled", completed_at: null },
    { id: "event-9", academic_record_id: null, source: "mock", event_type: "caregiving", title: "Family medical appointment", description: "Accompany a family member and manage transportation.", location: "Community Health Center", starts_at: atTime(anchor, 4, 8), ends_at: atTime(anchor, 4, 10), all_day: false, status: "scheduled", completed_at: null },
    { id: "event-10", academic_record_id: null, source: "mock", event_type: "work", title: "Part-time evening shift", description: "Customer support shift after classes.", location: "Remote", starts_at: atTime(anchor, 0, 18), ends_at: atTime(anchor, 0, 22), all_day: false, status: "scheduled", completed_at: null },
    { id: "event-11", academic_record_id: null, source: "mock", event_type: "personal", title: "Family birthday", description: "Reserved family commitment.", location: "Home", starts_at: atTime(anchor, 6, 0), ends_at: atTime(anchor, 6, 23, 59), all_day: true, status: "scheduled", completed_at: null },
  ],
  courseLogs: [
    { id: "course-log-1", check_in_id: "check-in-3", course_code: "ITISDEV", course_name: "IT Systems Development", week_start: weekStarts[2], workload_difficulty: 5, unclear_instruction_level: 3, grading_concern_level: 4, professor_approachability_concern: 2, groupmate_issue_level: 4, concern_notes: "The midterm scope is large and two group members have limited availability." },
    { id: "course-log-2", check_in_id: "check-in-3", course_code: "WEBAPDE", course_name: "Web Application Development", week_start: weekStarts[2], workload_difficulty: 5, unclear_instruction_level: 4, grading_concern_level: 3, professor_approachability_concern: 3, groupmate_issue_level: 1, concern_notes: "The practical exam coverage is broad and deployment instructions need clarification." },
  ],
};

export function getCurrentWeekStart() {
  return dateOnly(startOfWeek());
}

