-- ============================================================
-- STUDENT WELLNESS PERSONAL INFORMATICS APPLICATION
-- Initial Supabase Database Schema
--
-- WARNING:
-- This script deletes all existing data from the seven listed
-- public tables before recreating them.
--
-- It does NOT delete auth.users or Supabase system tables.
-- ============================================================

begin;


-- ============================================================
-- 1. REMOVE EXISTING PROJECT TABLES
-- Child tables are deleted before parent tables.
-- ============================================================

drop table if exists public.ai_results cascade;
drop table if exists public.course_environment_logs cascade;
drop table if exists public.calendar_events cascade;
drop table if exists public.academic_records cascade;
drop table if exists public.weekly_check_ins cascade;
drop table if exists public.student_profiles cascade;
drop table if exists public.students cascade;

drop function if exists public.set_updated_at() cascade;


-- ============================================================
-- 2. ENABLE UUID SUPPORT
-- ============================================================

create extension if not exists pgcrypto
with schema extensions;


-- ============================================================
-- 3. STUDENTS
--
-- Extends Supabase auth.users.
-- Authentication credentials remain inside auth.users.
-- ============================================================

create table public.students (
    id uuid primary key
        references auth.users(id)
        on delete cascade,

    student_number text not null,

    consent_given boolean not null default false,
    consented_at timestamptz,
    privacy_notice_version text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint students_student_number_unique
        unique (student_number),

    constraint students_student_number_not_blank
        check (
            char_length(btrim(student_number)) between 4 and 30
        ),

    constraint students_consent_information_valid
        check (
            consent_given = false
            or (
                consented_at is not null
                and privacy_notice_version is not null
                and char_length(btrim(privacy_notice_version)) > 0
            )
        )
);


-- ============================================================
-- 4. STUDENT PROFILES
--
-- Stores the student's baseline context, responsibilities,
-- and logistical situation.
--
-- One student can have only one profile.
-- ============================================================

create table public.student_profiles (
    id uuid primary key default gen_random_uuid(),

    student_id uuid not null unique
        references public.students(id)
        on delete cascade,

    college text not null,
    program text not null,
    year_level smallint not null,

    commute_minutes_per_day smallint not null default 0,
    available_study_hours_per_week numeric(5,2) not null default 0,

    has_caregiving_responsibility boolean not null default false,
    caregiving_hours_per_week numeric(5,2) not null default 0,

    is_employed boolean not null default false,
    work_hours_per_week numeric(5,2) not null default 0,

    has_ojt boolean not null default false,
    ojt_hours_per_week numeric(5,2) not null default 0,

    is_athlete boolean not null default false,
    athlete_hours_per_week numeric(5,2) not null default 0,

    has_organization_responsibility boolean not null default false,
    organization_role text,
    organization_hours_per_week numeric(5,2) not null default 0,

    additional_context text,
    onboarding_completed_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint student_profiles_college_not_blank
        check (
            char_length(btrim(college)) > 0
        ),

    constraint student_profiles_program_not_blank
        check (
            char_length(btrim(program)) > 0
        ),

    constraint student_profiles_year_level_valid
        check (
            year_level between 1 and 6
        ),

    constraint student_profiles_commute_valid
        check (
            commute_minutes_per_day between 0 and 1440
        ),

    constraint student_profiles_study_hours_valid
        check (
            available_study_hours_per_week between 0 and 168
        ),

    constraint student_profiles_caregiving_hours_valid
        check (
            caregiving_hours_per_week between 0 and 168
        ),

    constraint student_profiles_work_hours_valid
        check (
            work_hours_per_week between 0 and 168
        ),

    constraint student_profiles_ojt_hours_valid
        check (
            ojt_hours_per_week between 0 and 168
        ),

    constraint student_profiles_athlete_hours_valid
        check (
            athlete_hours_per_week between 0 and 168
        ),

    constraint student_profiles_organization_hours_valid
        check (
            organization_hours_per_week between 0 and 168
        ),

    constraint student_profiles_organization_role_valid
        check (
            organization_role is null
            or has_organization_responsibility = true
        ),

    constraint student_profiles_organization_role_length
        check (
            organization_role is null
            or char_length(organization_role) <= 200
        ),

    constraint student_profiles_context_length
        check (
            additional_context is null
            or char_length(additional_context) <= 2000
        )
);


-- ============================================================
-- 5. WEEKLY CHECK-INS
--
-- Wellness indicators use a 1-5 scale.
--
-- Stress and burnout:
-- 1 = very low
-- 5 = very high
--
-- Mood, sleep, motivation, and energy:
-- 1 = very poor
-- 5 = very good
--
-- One student can have only one check-in for each week_start.
-- ============================================================

create table public.weekly_check_ins (
    id uuid primary key default gen_random_uuid(),

    student_id uuid not null
        references public.students(id)
        on delete cascade,

    week_start date not null,

    stress_level smallint not null,
    mood_level smallint not null,
    sleep_quality smallint not null,
    motivation_level smallint not null,
    burnout_level smallint not null,
    energy_level smallint not null,

    available_study_hours numeric(5,2),
    reflection text,

    submitted_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint weekly_check_ins_student_week_unique
        unique (student_id, week_start),

    -- Supports composite foreign keys so that child records
    -- cannot reference a check-in owned by another student.
    constraint weekly_check_ins_id_student_unique
        unique (id, student_id),

    constraint weekly_check_ins_stress_valid
        check (
            stress_level between 1 and 5
        ),

    constraint weekly_check_ins_mood_valid
        check (
            mood_level between 1 and 5
        ),

    constraint weekly_check_ins_sleep_valid
        check (
            sleep_quality between 1 and 5
        ),

    constraint weekly_check_ins_motivation_valid
        check (
            motivation_level between 1 and 5
        ),

    constraint weekly_check_ins_burnout_valid
        check (
            burnout_level between 1 and 5
        ),

    constraint weekly_check_ins_energy_valid
        check (
            energy_level between 1 and 5
        ),

    constraint weekly_check_ins_study_hours_valid
        check (
            available_study_hours is null
            or available_study_hours between 0 and 168
        ),

    constraint weekly_check_ins_reflection_length
        check (
            reflection is null
            or char_length(reflection) <= 4000
        )
);


-- ============================================================
-- 6. ACADEMIC RECORDS
--
-- Stores manually entered or mock academic data.
--
-- Manual records are entered by the student through the
-- application.
--
-- Mock records are inserted for testing, demonstrations,
-- and seeded MVP data.
--
-- Each row represents an assignment, assessment, grade
-- snapshot, or engagement snapshot.
-- ============================================================

create table public.academic_records (
    id uuid primary key default gen_random_uuid(),

    student_id uuid not null
        references public.students(id)
        on delete cascade,

    source text not null default 'manual',

    course_code text not null,
    course_name text not null,

    record_type text not null,
    title text not null,

    due_at timestamptz,
    submitted_at timestamptz,

    submission_status text not null default 'not_applicable',

    score numeric(8,2),
    max_score numeric(8,2),

    grade_percentage numeric(6,2)
        generated always as (
            case
                when score is not null
                    and max_score is not null
                    and max_score > 0
                then round((score / max_score) * 100, 2)
                else null
            end
        ) stored,

    recorded_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    -- Supports composite foreign keys so a linked calendar event
    -- cannot reference an academic record owned by another student.
    constraint academic_records_id_student_unique
        unique (id, student_id),

    constraint academic_records_source_valid
        check (
            source in (
                'manual',
                'mock'
            )
        ),

    constraint academic_records_type_valid
        check (
            record_type in (
                'assignment',
                'assessment',
                'grade_snapshot',
                'engagement_snapshot'
            )
        ),

    constraint academic_records_status_valid
        check (
            submission_status in (
                'upcoming',
                'on_time',
                'late',
                'missed',
                'not_applicable'
            )
        ),

    constraint academic_records_course_code_not_blank
        check (
            char_length(btrim(course_code)) > 0
        ),

    constraint academic_records_course_name_not_blank
        check (
            char_length(btrim(course_name)) > 0
        ),

    constraint academic_records_title_not_blank
        check (
            char_length(btrim(title)) > 0
        ),

    constraint academic_records_score_valid
        check (
            score is null
            or score >= 0
        ),

    constraint academic_records_max_score_valid
        check (
            max_score is null
            or max_score > 0
        ),

    constraint academic_records_score_pair_valid
        check (
            (
                score is null
                and max_score is null
            )
            or
            (
                score is not null
                and max_score is not null
            )
        )
);


-- ============================================================
-- 7. CALENDAR EVENTS
--
-- Stores manually entered or mock academic, personal,
-- logistical, and role-related commitments.
--
-- Manual events are entered by the student through the
-- application.
--
-- Mock events are inserted for testing, demonstrations,
-- and seeded MVP data.
--
-- Calendar events may optionally reference an academic record.
--
-- For the MVP, recurring commitments should be stored as one
-- row per occurrence rather than using recurrence rules.
-- ============================================================

create table public.calendar_events (
    id uuid primary key default gen_random_uuid(),

    student_id uuid not null
        references public.students(id)
        on delete cascade,

    academic_record_id uuid,

    source text not null default 'manual',

    event_type text not null,

    title text not null,
    description text,
    location text,

    starts_at timestamptz not null,
    ends_at timestamptz,

    all_day boolean not null default false,

    status text not null default 'scheduled',
    completed_at timestamptz,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint calendar_events_academic_record_student_fk
        foreign key (academic_record_id, student_id)
        references public.academic_records(id, student_id)
        on delete cascade,

    constraint calendar_events_source_valid
        check (
            source in (
                'manual',
                'mock'
            )
        ),

    constraint calendar_events_type_valid
        check (
            event_type in (
                'class',
                'assignment_deadline',
                'exam',
                'study_block',
                'rest_block',
                'ojt',
                'organization',
                'athletics',
                'caregiving',
                'work',
                'personal',
                'other'
            )
        ),

    constraint calendar_events_status_valid
        check (
            status in (
                'scheduled',
                'completed',
                'cancelled'
            )
        ),

    constraint calendar_events_title_not_blank
        check (
            char_length(btrim(title)) between 1 and 300
        ),

    constraint calendar_events_description_length
        check (
            description is null
            or char_length(description) <= 4000
        ),

    constraint calendar_events_location_length
        check (
            location is null
            or char_length(location) <= 500
        ),

    constraint calendar_events_time_valid
        check (
            ends_at is null
            or ends_at >= starts_at
        ),

    constraint calendar_events_completion_valid
        check (
            (
                status = 'completed'
                and completed_at is not null
            )
            or
            (
                status <> 'completed'
                and completed_at is null
            )
        )
);


-- ============================================================
-- 8. COURSE ENVIRONMENT LOGS
--
-- Stores student-reported concerns for individual courses.
--
-- All rating fields use the same direction:
-- 1 = little or no concern
-- 5 = severe concern
--
-- A log can optionally be connected to a weekly check-in.
-- ============================================================

create table public.course_environment_logs (
    id uuid primary key default gen_random_uuid(),

    student_id uuid not null
        references public.students(id)
        on delete cascade,

    check_in_id uuid,

    course_code text not null,
    course_name text not null,
    week_start date not null,

    workload_difficulty smallint,
    unclear_instruction_level smallint,
    grading_concern_level smallint,
    professor_approachability_concern smallint,
    groupmate_issue_level smallint,

    concern_notes text,

    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint course_environment_check_in_student_fk
        foreign key (check_in_id, student_id)
        references public.weekly_check_ins(id, student_id)
        on delete cascade,

    constraint course_environment_student_course_week_unique
        unique (
            student_id,
            course_code,
            week_start
        ),

    constraint course_environment_course_code_not_blank
        check (
            char_length(btrim(course_code)) > 0
        ),

    constraint course_environment_course_name_not_blank
        check (
            char_length(btrim(course_name)) > 0
        ),

    constraint course_environment_workload_valid
        check (
            workload_difficulty is null
            or workload_difficulty between 1 and 5
        ),

    constraint course_environment_instruction_valid
        check (
            unclear_instruction_level is null
            or unclear_instruction_level between 1 and 5
        ),

    constraint course_environment_grading_valid
        check (
            grading_concern_level is null
            or grading_concern_level between 1 and 5
        ),

    constraint course_environment_approachability_valid
        check (
            professor_approachability_concern is null
            or professor_approachability_concern between 1 and 5
        ),

    constraint course_environment_groupmate_valid
        check (
            groupmate_issue_level is null
            or groupmate_issue_level between 1 and 5
        ),

    constraint course_environment_has_content
        check (
            workload_difficulty is not null
            or unclear_instruction_level is not null
            or grading_concern_level is not null
            or professor_approachability_concern is not null
            or groupmate_issue_level is not null
            or nullif(btrim(concern_notes), '') is not null
        ),

    constraint course_environment_notes_length
        check (
            concern_notes is null
            or char_length(concern_notes) <= 4000
        )
);


-- ============================================================
-- 9. AI RESULTS
--
-- Stores one generated analysis for each weekly check-in.
--
-- The five dimension scores represent risk or concern:
-- 0   = low concern
-- 100 = high concern
-- ============================================================

create table public.ai_results (
    id uuid primary key default gen_random_uuid(),

    student_id uuid not null
        references public.students(id)
        on delete cascade,

    check_in_id uuid not null,

    swi_score numeric(5,2) not null,
    risk_category text not null,

    stress_severity_level text not null,
    primary_stress_context text not null,

    academic_engagement_score numeric(5,2),
    personal_wellbeing_score numeric(5,2),
    logistical_load_score numeric(5,2),
    role_load_score numeric(5,2),
    course_environment_score numeric(5,2),

    reflection_keywords text[] not null default '{}',

    weekly_summary text not null,
    recommendations jsonb not null default '[]'::jsonb,

    analysis_method text not null default 'rule_based',
    analysis_version text not null default '1.0',

    generated_at timestamptz not null default now(),
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint ai_results_check_in_student_fk
        foreign key (check_in_id, student_id)
        references public.weekly_check_ins(id, student_id)
        on delete cascade,

    constraint ai_results_check_in_unique
        unique (check_in_id),

    constraint ai_results_swi_valid
        check (
            swi_score between 0 and 100
        ),

    constraint ai_results_risk_category_valid
        check (
            risk_category in (
                'low',
                'moderate',
                'high'
            )
        ),

    constraint ai_results_risk_matches_swi
        check (
            (
                swi_score >= 0
                and swi_score < 40
                and risk_category = 'low'
            )
            or
            (
                swi_score >= 40
                and swi_score < 70
                and risk_category = 'moderate'
            )
            or
            (
                swi_score >= 70
                and swi_score <= 100
                and risk_category = 'high'
            )
        ),

    constraint ai_results_severity_valid
        check (
            stress_severity_level in (
                'low_normal',
                'moderate',
                'severe',
                'critical'
            )
        ),

    constraint ai_results_context_valid
        check (
            primary_stress_context in (
                'academic_engagement',
                'personal_wellbeing',
                'logistical_load',
                'role_load',
                'course_environment',
                'mixed'
            )
        ),

    constraint ai_results_academic_score_valid
        check (
            academic_engagement_score is null
            or academic_engagement_score between 0 and 100
        ),

    constraint ai_results_wellbeing_score_valid
        check (
            personal_wellbeing_score is null
            or personal_wellbeing_score between 0 and 100
        ),

    constraint ai_results_logistical_score_valid
        check (
            logistical_load_score is null
            or logistical_load_score between 0 and 100
        ),

    constraint ai_results_role_score_valid
        check (
            role_load_score is null
            or role_load_score between 0 and 100
        ),

    constraint ai_results_course_environment_score_valid
        check (
            course_environment_score is null
            or course_environment_score between 0 and 100
        ),

    constraint ai_results_recommendations_array
        check (
            jsonb_typeof(recommendations) = 'array'
        ),

    constraint ai_results_summary_not_blank
        check (
            char_length(btrim(weekly_summary)) between 1 and 4000
        ),

    constraint ai_results_method_valid
        check (
            analysis_method in (
                'rule_based',
                'machine_learning',
                'llm_assisted',
                'hybrid'
            )
        ),

    constraint ai_results_version_not_blank
        check (
            char_length(btrim(analysis_version)) > 0
        )
);


-- ============================================================
-- 10. INDEXES
--
-- Improves common dashboard and backend queries.
-- ============================================================

create index student_profiles_student_index
    on public.student_profiles (
        student_id
    );

create index weekly_check_ins_student_date_index
    on public.weekly_check_ins (
        student_id,
        week_start desc
    );

create index academic_records_student_due_index
    on public.academic_records (
        student_id,
        due_at
    );

create index academic_records_student_course_index
    on public.academic_records (
        student_id,
        course_code
    );

create index academic_records_student_status_index
    on public.academic_records (
        student_id,
        submission_status
    );

create index calendar_events_student_start_index
    on public.calendar_events (
        student_id,
        starts_at
    );

create index calendar_events_student_type_start_index
    on public.calendar_events (
        student_id,
        event_type,
        starts_at
    );

create index calendar_events_student_status_index
    on public.calendar_events (
        student_id,
        status
    );

create index calendar_events_academic_record_index
    on public.calendar_events (
        academic_record_id
    );

create index course_environment_student_week_index
    on public.course_environment_logs (
        student_id,
        week_start desc
    );

create index course_environment_check_in_index
    on public.course_environment_logs (
        check_in_id
    );

create index ai_results_student_generated_index
    on public.ai_results (
        student_id,
        generated_at desc
    );


-- ============================================================
-- 11. AUTOMATIC UPDATED_AT FUNCTION
--
-- Sets updated_at to the current timestamp whenever a record
-- is updated.
-- ============================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
    new.updated_at = now();
    return new;
end;
$$;


-- ============================================================
-- 12. UPDATED_AT TRIGGERS
-- ============================================================

create trigger students_set_updated_at
before update on public.students
for each row
execute function public.set_updated_at();

create trigger student_profiles_set_updated_at
before update on public.student_profiles
for each row
execute function public.set_updated_at();

create trigger weekly_check_ins_set_updated_at
before update on public.weekly_check_ins
for each row
execute function public.set_updated_at();

create trigger academic_records_set_updated_at
before update on public.academic_records
for each row
execute function public.set_updated_at();

create trigger calendar_events_set_updated_at
before update on public.calendar_events
for each row
execute function public.set_updated_at();

create trigger course_environment_logs_set_updated_at
before update on public.course_environment_logs
for each row
execute function public.set_updated_at();

create trigger ai_results_set_updated_at
before update on public.ai_results
for each row
execute function public.set_updated_at();


-- ============================================================
-- 13. ENABLE ROW-LEVEL SECURITY
-- ============================================================

alter table public.students
enable row level security;

alter table public.student_profiles
enable row level security;

alter table public.weekly_check_ins
enable row level security;

alter table public.academic_records
enable row level security;

alter table public.calendar_events
enable row level security;

alter table public.course_environment_logs
enable row level security;

alter table public.ai_results
enable row level security;


-- ============================================================
-- 14. STUDENT RLS POLICIES
--
-- An authenticated student can create, view, and update their
-- own public student record.
--
-- Account deletion should be handled through the backend and
-- Supabase Auth rather than directly from the frontend.
-- ============================================================

create policy "Students can view their own student record"
on public.students
for select
to authenticated
using (
    (select auth.uid()) = id
);

create policy "Students can create their own student record"
on public.students
for insert
to authenticated
with check (
    (select auth.uid()) = id
);

create policy "Students can update their own student record"
on public.students
for update
to authenticated
using (
    (select auth.uid()) = id
)
with check (
    (select auth.uid()) = id
);


-- ============================================================
-- 15. STUDENT PROFILE RLS POLICIES
-- ============================================================

create policy "Students can view their own profile"
on public.student_profiles
for select
to authenticated
using (
    (select auth.uid()) = student_id
);

create policy "Students can create their own profile"
on public.student_profiles
for insert
to authenticated
with check (
    (select auth.uid()) = student_id
);

create policy "Students can update their own profile"
on public.student_profiles
for update
to authenticated
using (
    (select auth.uid()) = student_id
)
with check (
    (select auth.uid()) = student_id
);

create policy "Students can delete their own profile"
on public.student_profiles
for delete
to authenticated
using (
    (select auth.uid()) = student_id
);


-- ============================================================
-- 16. WEEKLY CHECK-IN RLS POLICIES
-- ============================================================

create policy "Students can view their own check-ins"
on public.weekly_check_ins
for select
to authenticated
using (
    (select auth.uid()) = student_id
);

create policy "Students can create their own check-ins"
on public.weekly_check_ins
for insert
to authenticated
with check (
    (select auth.uid()) = student_id
);

create policy "Students can update their own check-ins"
on public.weekly_check_ins
for update
to authenticated
using (
    (select auth.uid()) = student_id
)
with check (
    (select auth.uid()) = student_id
);

create policy "Students can delete their own check-ins"
on public.weekly_check_ins
for delete
to authenticated
using (
    (select auth.uid()) = student_id
);


-- ============================================================
-- 17. ACADEMIC RECORD RLS POLICIES
--
-- Students can create, view, update, and delete academic
-- records belonging to their own authenticated account.
-- ============================================================

create policy "Students can view their own academic records"
on public.academic_records
for select
to authenticated
using (
    (select auth.uid()) = student_id
);

create policy "Students can create their own academic records"
on public.academic_records
for insert
to authenticated
with check (
    (select auth.uid()) = student_id
    and source = 'manual'
);

create policy "Students can update their own academic records"
on public.academic_records
for update
to authenticated
using (
    (select auth.uid()) = student_id
    and source = 'manual'
)
with check (
    (select auth.uid()) = student_id
    and source = 'manual'
);

create policy "Students can delete their own academic records"
on public.academic_records
for delete
to authenticated
using (
    (select auth.uid()) = student_id
    and source = 'manual'
);


-- ============================================================
-- 18. CALENDAR EVENT RLS POLICIES
-- ============================================================

create policy "Students can view their own calendar events"
on public.calendar_events
for select
to authenticated
using (
    (select auth.uid()) = student_id
);

create policy "Students can create their own calendar events"
on public.calendar_events
for insert
to authenticated
with check (
    (select auth.uid()) = student_id
);

create policy "Students can update their own calendar events"
on public.calendar_events
for update
to authenticated
using (
    (select auth.uid()) = student_id
)
with check (
    (select auth.uid()) = student_id
);

create policy "Students can delete their own calendar events"
on public.calendar_events
for delete
to authenticated
using (
    (select auth.uid()) = student_id
);


-- ============================================================
-- 19. COURSE ENVIRONMENT RLS POLICIES
-- ============================================================

create policy "Students can view their own course logs"
on public.course_environment_logs
for select
to authenticated
using (
    (select auth.uid()) = student_id
);

create policy "Students can create their own course logs"
on public.course_environment_logs
for insert
to authenticated
with check (
    (select auth.uid()) = student_id
);

create policy "Students can update their own course logs"
on public.course_environment_logs
for update
to authenticated
using (
    (select auth.uid()) = student_id
)
with check (
    (select auth.uid()) = student_id
);

create policy "Students can delete their own course logs"
on public.course_environment_logs
for delete
to authenticated
using (
    (select auth.uid()) = student_id
);


-- ============================================================
-- 20. AI RESULT RLS POLICY
--
-- Students can read their own AI-generated results.
--
-- AI results can only be written by the trusted backend using
-- the Supabase service role.
-- ============================================================

create policy "Students can view their own AI results"
on public.ai_results
for select
to authenticated
using (
    (select auth.uid()) = student_id
);


-- ============================================================
-- 21. DATABASE PERMISSIONS
-- ============================================================

grant usage on schema public
to authenticated;

grant select, insert, update
on public.students
to authenticated;

grant select, insert, update, delete
on public.student_profiles
to authenticated;

grant select, insert, update, delete
on public.weekly_check_ins
to authenticated;

grant select, insert, update, delete
on public.academic_records
to authenticated;

grant select, insert, update, delete
on public.calendar_events
to authenticated;

grant select, insert, update, delete
on public.course_environment_logs
to authenticated;

grant select
on public.ai_results
to authenticated;


-- The backend service role can manage all application records.

grant all
on public.students,
   public.student_profiles,
   public.weekly_check_ins,
   public.academic_records,
   public.calendar_events,
   public.course_environment_logs,
   public.ai_results
to service_role;


commit;
