# Application Data Dictionary

This document describes the PostgreSQL/Supabase tables used by the Student
Wellness Personal Informatics application. It is derived from the database
schema files and cross-checked against the tables and fields queried by the
backend services.

## Scope and conventions

- The application owns **10 tables** in the `public` schema.
- Supabase owns `auth.users`. The application references that table but does
  not store credentials in its own tables.
- `PK` means primary key, `FK` means foreign key, and `UQ` means unique
  constraint.
- `timestamptz` means PostgreSQL `timestamp with time zone`.
- Unless stated otherwise, UUID primary keys default to `gen_random_uuid()`.
- `created_at` and `updated_at` default to `now()`. On the nine
  student-transaction tables, an update trigger refreshes `updated_at`.
- All student-owned tables use row-level security (RLS) based on the
  authenticated Supabase user's ID.

## Table inventory

| Table | Purpose | Row granularity |
| --- | --- | --- |
| `students` | Application identity, name, student number, and privacy consent | One row per Supabase Auth user |
| `student_profiles` | Baseline academic, logistical, and role context | At most one row per student |
| `weekly_check_ins` | Weekly self-reported wellness indicators | At most one row per student per Monday |
| `courses` | Student-specific course catalog | One row per course code per student |
| `academic_records` | Assignments, assessments, grades, and engagement snapshots | One academic item or snapshot |
| `calendar_events` | Academic, personal, logistical, and role commitments | One event occurrence |
| `course_environment_logs` | Weekly student-reported concerns about a course | At most one row per student, course, and week |
| `wellness_dimension_scores` | Five calculated wellness concern scores | One score set per weekly check-in |
| `ai_results` | AI-assisted weekly wellness analysis | One analysis per weekly check-in |
| `wellness_knowledge_base` | Embedded wellness and campus-support reference material | One retrievable knowledge resource |

## Relationship summary

| Parent | Child | Cardinality and rule |
| --- | --- | --- |
| `auth.users` | `students` | One-to-zero-or-one; the same UUID is used in both tables |
| `students` | `student_profiles` | One-to-zero-or-one |
| `students` | All other student-owned tables | One-to-many |
| `students` | `courses` | One-to-many; course code is unique within a student |
| `courses` | `academic_records` | One-to-many; the course and record must belong to the same student |
| `courses` | `course_environment_logs` | One-to-many; the course and log must belong to the same student |
| `weekly_check_ins` | `course_environment_logs` | One-to-many and optional from the log side |
| `weekly_check_ins` | `wellness_dimension_scores` | One-to-zero-or-one |
| `weekly_check_ins` | `ai_results` | One-to-zero-or-one |
| `wellness_dimension_scores` | `ai_results` | One-to-zero-or-one; student and check-in must also match |
| `academic_records` | `calendar_events` | One-to-many and optional from the event side |

`wellness_knowledge_base` is shared reference data and is not owned by an
individual student.

## `public.students`

Extends `auth.users` with application identity and consent information.
Deleting the Supabase Auth user cascades to this row and, through it, the
student-owned dataset.

| Column | Type | Required | Default / key | Description and rules |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | Yes | PK, FK → `auth.users.id` | Supabase Auth user ID; no generated default |
| `student_number` | `text` | Yes | UQ | Institutional student number; trimmed length must be 4–30 characters |
| `first_name` | `text` | Yes | — | Student's first name; trimmed length must be 1–100 characters |
| `last_name` | `text` | Yes | — | Student's last name; trimmed length must be 1–100 characters |
| `consent_given` | `boolean` | Yes | `false` | Whether the current privacy notice was accepted |
| `consented_at` | `timestamptz` | No | `NULL` | Time consent was recorded |
| `privacy_notice_version` | `text` | No | `NULL` | Accepted privacy-notice version |
| `created_at` | `timestamptz` | Yes | `now()` | Row creation time |
| `updated_at` | `timestamptz` | Yes | `now()` | Last update time; maintained by trigger |

Cross-field rule: when `consent_given = true`, `consented_at` and a nonblank
`privacy_notice_version` are required.

## `public.student_profiles`

Stores the student's baseline academic context, goals, recurring
responsibilities, and available time.

| Column | Type | Required | Default / key | Description and rules |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | Yes | PK, generated | Profile ID |
| `student_id` | `uuid` | Yes | UQ, FK → `students.id` | Profile owner; deletion of the student cascades |
| `college` | `text` | Yes | — | College name; trimmed value cannot be blank |
| `program` | `text` | Yes | — | Academic program; trimmed value cannot be blank |
| `year_level` | `smallint` | Yes | — | Current year level, 1–6 |
| `current_academic_term` | `smallint` | Yes | — | Current DLSU term, 1–3 |
| `wellness_goals` | `text[]` | Yes | `'{}'` | Up to 10 selected wellness goals |
| `commute_minutes_per_day` | `smallint` | Yes | `0` | Daily commute duration, 0–1,440 minutes |
| `available_study_hours_per_week` | `numeric(5,2)` | Yes | `0` | Baseline study availability, 0–168 hours |
| `has_caregiving_responsibility` | `boolean` | Yes | `false` | Whether the student has caregiving duties |
| `caregiving_hours_per_week` | `numeric(5,2)` | Yes | `0` | Caregiving load, 0–168 hours |
| `is_employed` | `boolean` | Yes | `false` | Whether the student is employed |
| `work_hours_per_week` | `numeric(5,2)` | Yes | `0` | Employment load, 0–168 hours |
| `has_ojt` | `boolean` | Yes | `false` | Whether the student has on-the-job training |
| `ojt_hours_per_week` | `numeric(5,2)` | Yes | `0` | OJT load, 0–168 hours |
| `is_athlete` | `boolean` | Yes | `false` | Whether the student is an athlete |
| `athlete_hours_per_week` | `numeric(5,2)` | Yes | `0` | Athletics load, 0–168 hours |
| `has_organization_responsibility` | `boolean` | Yes | `false` | Whether the student has an organization responsibility |
| `organization_role` | `text` | No | `NULL` | Role title, maximum 200 characters; may be set only when organization responsibility is true |
| `organization_hours_per_week` | `numeric(5,2)` | Yes | `0` | Organization load, 0–168 hours |
| `additional_context` | `text` | No | `NULL` | Optional background supplied by the student, maximum 2,000 characters |
| `onboarding_completed_at` | `timestamptz` | No | `NULL` | Time onboarding was completed |
| `created_at` | `timestamptz` | Yes | `now()` | Row creation time |
| `updated_at` | `timestamptz` | Yes | `now()` | Last update time; maintained by trigger |

The schema limits each hours field independently; it does not require an hours
field to be zero when its related boolean is false.

## `public.weekly_check_ins`

Stores weekly wellness self-reports. Stress and burnout run from 1 (very low)
to 5 (very high). Mood, sleep, motivation, and energy run from 1 (very poor)
to 5 (very good).

| Column | Type | Required | Default / key | Description and rules |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | Yes | PK, generated | Check-in ID |
| `student_id` | `uuid` | Yes | FK → `students.id` | Check-in owner; deletion of the student cascades |
| `week_start` | `date` | Yes | UQ with `student_id` | Week represented by the check-in; must be a Monday |
| `stress_level` | `smallint` | Yes | — | Self-reported stress, 1–5 |
| `mood_level` | `smallint` | Yes | — | Self-reported mood, 1–5 |
| `sleep_quality` | `smallint` | Yes | — | Self-reported sleep quality, 1–5 |
| `motivation_level` | `smallint` | Yes | — | Self-reported motivation, 1–5 |
| `burnout_level` | `smallint` | Yes | — | Self-reported burnout, 1–5 |
| `energy_level` | `smallint` | Yes | — | Self-reported energy, 1–5 |
| `available_study_hours` | `numeric(5,2)` | No | `NULL` | Study hours available for this week, 0–168 |
| `reflection` | `text` | No | `NULL` | Optional weekly reflection, maximum 4,000 characters |
| `submitted_at` | `timestamptz` | Yes | `now()` | Time the check-in was submitted |
| `created_at` | `timestamptz` | Yes | `now()` | Row creation time |
| `updated_at` | `timestamptz` | Yes | `now()` | Last update time; maintained by trigger |

Additional uniqueness: `(id, student_id)` is unique so child-table composite
foreign keys cannot cross student ownership boundaries.

## `public.courses`

Normalizes course identity and display metadata shared by academic records and
course-environment logs.

| Column | Type | Required | Default / key | Description and rules |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | Yes | PK, generated | Course ID |
| `student_id` | `uuid` | Yes | FK → `students.id` | Course owner; deletion of the student cascades |
| `code` | `text` | Yes | UQ with `student_id` | Trimmed uppercase course code, 1–30 characters |
| `name` | `text` | Yes | — | Trimmed course name, 1–150 characters |
| `created_at` | `timestamptz` | Yes | `now()` | Row creation time |
| `updated_at` | `timestamptz` | Yes | `now()` | Last update time; maintained by trigger |

Additional uniqueness: `(id, student_id)` supports ownership-safe composite
foreign keys. A referenced course cannot be deleted until its academic records
and course-environment logs are handled.

## `public.academic_records`

Stores manually entered or seeded academic items. One row represents an
assignment, assessment, grade snapshot, or engagement snapshot.

| Column | Type | Required | Default / key | Description and rules |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | Yes | PK, generated | Academic-record ID |
| `student_id` | `uuid` | Yes | FK → `students.id` | Record owner; deletion of the student cascades |
| `source` | `text` | Yes | `'manual'` | Origin: `manual` or `mock` |
| `course_id` | `uuid` | Yes | Composite FK | Course ID; `(course_id, student_id)` must match `courses(id, student_id)` |
| `record_type` | `text` | Yes | — | `assignment`, `assessment`, `grade_snapshot`, or `engagement_snapshot` |
| `title` | `text` | Yes | — | Nonblank record title |
| `due_at` | `timestamptz` | No | `NULL` | Due date and time, when applicable |
| `submitted_at` | `timestamptz` | No | `NULL` | Actual submission time, when applicable |
| `submission_status` | `text` | Yes | `'not_applicable'` | `upcoming`, `on_time`, `late`, `missed`, or `not_applicable` |
| `score` | `numeric(8,2)` | No | `NULL` | Earned score; must be at least 0 |
| `max_score` | `numeric(8,2)` | No | `NULL` | Maximum possible score; must be greater than 0 |
| `grade_percentage` | `numeric(6,2)` | Generated | Stored expression | `round((score / max_score) * 100, 2)` when a score pair exists |
| `recorded_at` | `timestamptz` | Yes | `now()` | Effective time of the record or snapshot |
| `created_at` | `timestamptz` | Yes | `now()` | Row creation time |
| `updated_at` | `timestamptz` | Yes | `now()` | Last update time; maintained by trigger |

Cross-field rules:

- `score` and `max_score` must either both be present or both be `NULL`.
- The database does not require `score <= max_score`.
- `(id, student_id)` is unique for ownership-safe references from calendar
  events.
- Authenticated students can write only `manual` records; `mock` records are
  written by the trusted service role.

## `public.calendar_events`

Stores academic, personal, logistical, and role-related commitments. Recurring
commitments are represented as one row per occurrence.

| Column | Type | Required | Default / key | Description and rules |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | Yes | PK, generated | Event ID |
| `student_id` | `uuid` | Yes | FK → `students.id` | Event owner; deletion of the student cascades |
| `academic_record_id` | `uuid` | No | Composite FK | Optional academic record; it must belong to the same student |
| `source` | `text` | Yes | `'manual'` | Origin: `manual` or `mock` |
| `event_type` | `text` | Yes | — | Event category; see allowed values below |
| `title` | `text` | Yes | — | Trimmed length must be 1–300 characters |
| `description` | `text` | No | `NULL` | Optional description, maximum 4,000 characters |
| `location` | `text` | No | `NULL` | Optional event location, maximum 500 characters |
| `starts_at` | `timestamptz` | Yes | — | Start date and time |
| `ends_at` | `timestamptz` | No | `NULL` | Optional end date and time; cannot precede `starts_at` |
| `all_day` | `boolean` | Yes | `false` | Whether the event is presented as an all-day event |
| `status` | `text` | Yes | `'scheduled'` | `scheduled`, `completed`, or `cancelled` |
| `completed_at` | `timestamptz` | No | `NULL` | Completion time; required only when status is `completed` |
| `created_at` | `timestamptz` | Yes | `now()` | Row creation time |
| `updated_at` | `timestamptz` | Yes | `now()` | Last update time; maintained by trigger |

Allowed `event_type` values are `class`, `assignment_deadline`, `exam`,
`study_block`, `rest_block`, `ojt`, `organization`, `athletics`, `caregiving`,
`work`, `personal`, and `other`.

When an academic record is deleted, its linked events are deleted by the
foreign-key cascade. The current calendar API creates, lists, edits, and
deletes only `manual` events even though the table can also contain seeded
`mock` events.

## `public.course_environment_logs`

Stores weekly concerns about an individual course. All rating fields use
1 for little or no concern and 5 for severe concern.

| Column | Type | Required | Default / key | Description and rules |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | Yes | PK, generated | Course-environment log ID |
| `student_id` | `uuid` | Yes | FK → `students.id` | Log owner; deletion of the student cascades |
| `check_in_id` | `uuid` | No | Composite FK | Optional weekly check-in; it must belong to the same student |
| `course_id` | `uuid` | Yes | Composite FK | Course ID; it must belong to the same student |
| `week_start` | `date` | Yes | UQ with student/course | Week represented by the log; must be a Monday |
| `workload_difficulty` | `smallint` | No | `NULL` | Workload concern rating, 1–5 |
| `unclear_instruction_level` | `smallint` | No | `NULL` | Instruction-clarity concern rating, 1–5 |
| `grading_concern_level` | `smallint` | No | `NULL` | Grading concern rating, 1–5 |
| `professor_approachability_concern` | `smallint` | No | `NULL` | Professor-approachability concern rating, 1–5 |
| `groupmate_issue_level` | `smallint` | No | `NULL` | Groupmate concern rating, 1–5 |
| `concern_notes` | `text` | No | `NULL` | Optional notes, maximum 4,000 characters |
| `created_at` | `timestamptz` | Yes | `now()` | Row creation time |
| `updated_at` | `timestamptz` | Yes | `now()` | Last update time; maintained by trigger |

At least one rating or a nonblank `concern_notes` value must be present.
`(student_id, course_id, week_start)` is unique. Deleting a linked check-in
deletes the log; a referenced course is protected from deletion.

## `public.wellness_dimension_scores`

Stores the five structured concern scores calculated by the trusted backend.
Every score runs from 0 (low concern) to 100 (high concern).

| Column | Type | Required | Default / key | Description and rules |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | Yes | PK, generated | Dimension-score set ID |
| `student_id` | `uuid` | Yes | FK → `students.id` | Score owner; deletion of the student cascades |
| `check_in_id` | `uuid` | Yes | UQ, composite FK | Weekly check-in; it must belong to the same student |
| `academic_engagement_score` | `numeric(5,2)` | Yes | — | Academic-engagement concern, 0–100 |
| `personal_wellbeing_score` | `numeric(5,2)` | Yes | — | Personal-wellbeing concern, 0–100 |
| `logistical_load_score` | `numeric(5,2)` | Yes | — | Logistical-load concern, 0–100 |
| `role_load_score` | `numeric(5,2)` | Yes | — | External-role-load concern, 0–100 |
| `course_environment_score` | `numeric(5,2)` | Yes | — | Course-environment concern, 0–100 |
| `calculation_method` | `text` | Yes | `'rule_based'` | `rule_based`, `machine_learning`, or `hybrid` |
| `calculation_version` | `text` | Yes | `'1.0'` | Nonblank calculator version |
| `calculated_at` | `timestamptz` | Yes | `now()` | Effective calculation time |
| `created_at` | `timestamptz` | Yes | `now()` | Row creation time |
| `updated_at` | `timestamptz` | Yes | `now()` | Last update time; maintained by trigger |

`(id, student_id, check_in_id)` is unique so `ai_results` can verify all three
ownership/reference values together. Authenticated students can read their own
scores but only the trusted service role can write them.

## `public.ai_results`

Stores the final AI-assisted interpretation of a weekly check-in and its
structured dimension scores.

| Column | Type | Required | Default / key | Description and rules |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | Yes | PK, generated | AI-result ID |
| `student_id` | `uuid` | Yes | FK → `students.id` | Result owner; deletion of the student cascades |
| `check_in_id` | `uuid` | Yes | UQ, composite FK | Analyzed weekly check-in; it must belong to the same student |
| `dimension_scores_id` | `uuid` | Yes | UQ, composite FK | Input dimension-score set; ID, student, and check-in must all match |
| `swi_score` | `numeric(5,2)` | Yes | — | Student Wellness Index concern score, 0–100 |
| `risk_category` | `text` | Yes | — | `low`, `moderate`, or `high` |
| `stress_severity_level` | `text` | Yes | — | `low_normal`, `moderate`, `severe`, or `critical` |
| `primary_stress_context` | `text` | Yes | — | Dominant concern dimension; see allowed values below |
| `reflection_keywords` | `text[]` | Yes | `'{}'` | Keywords extracted from the student's reflection |
| `weekly_summary` | `text` | Yes | — | Nonblank generated summary, 1–4,000 trimmed characters |
| `recommendations` | `jsonb` | Yes | `'[]'` | JSON array of generated recommendations |
| `analysis_method` | `text` | Yes | `'rag_assisted'` | `llm_assisted`, `rag_assisted`, or `hybrid` |
| `analysis_version` | `text` | Yes | `'1.0'` | Nonblank analysis/prompt version |
| `generated_at` | `timestamptz` | Yes | `now()` | Effective AI-generation time |
| `created_at` | `timestamptz` | Yes | `now()` | Row creation time |
| `updated_at` | `timestamptz` | Yes | `now()` | Last update time; maintained by trigger |

Allowed `primary_stress_context` values are `academic_engagement`,
`personal_wellbeing`, `logistical_load`, `role_load`, `course_environment`,
and `mixed`.

The database requires `risk_category` to agree with `swi_score`:

| SWI range | Required risk category |
| --- | --- |
| `0 <= swi_score < 40` | `low` |
| `40 <= swi_score < 70` | `moderate` |
| `70 <= swi_score <= 100` | `high` |

Deleting the referenced check-in or dimension-score set cascades to the AI
result. Authenticated students can read their own results but only the trusted
service role can write them.

## `public.wellness_knowledge_base`

Stores reference material used by retrieval-augmented wellness analysis.
Unlike the other public tables, it is shared content and has no `student_id`.

| Column | Type | Required | Default / key | Description and rules |
| --- | --- | --- | --- | --- |
| `id` | `uuid` | Yes | PK, generated | Knowledge-resource ID |
| `category` | `text` | Yes | — | Wellness dimension/category used for filtering |
| `title` | `text` | Yes | — | Resource title |
| `content` | `text` | Yes | — | Nonblank reference content supplied to the analysis layer |
| `embedding` | `vector(1536)` | No | `NULL` | OpenAI-compatible semantic embedding |
| `created_at` | `timestamptz` | Yes | `now()` | Resource creation time |

Authenticated users may read the shared resources. Modifications are reserved
for the service role. The schema requires the `pgvector` `vector` type.

## Platform-owned table dependency: `auth.users`

Supabase Auth owns this table. The application uses the Auth API to create and
authenticate users and stores the returned `auth.users.id` as `students.id`.
Email addresses, password hashes, sessions, and provider metadata remain under
Supabase Auth management and are intentionally not duplicated in the public
application tables.

## Related database objects

### `public.match_wellness_resources`

A stable SQL RPC used by the AI analysis route for semantic retrieval.

| Input | Type | Purpose |
| --- | --- | --- |
| `query_embedding` | `vector(1536)` | Embedding of the student's reflection |
| `match_threshold` | `float` | Minimum cosine similarity |
| `match_count` | `int` | Maximum resources returned |

It returns `id`, `category`, `title`, `content`, and computed `similarity`,
ordered by vector distance.

### `public.set_updated_at`

A trigger function that sets `updated_at = now()` before updates to the nine
student-transaction tables. The knowledge-base table does not have an
`updated_at` column or this trigger.

## Access-control summary

| Table group | Authenticated-student access | Trusted service-role access |
| --- | --- | --- |
| `students` | Read, create, and update own row | Full |
| `student_profiles`, `weekly_check_ins`, `courses`, `course_environment_logs` | CRUD own rows | Full |
| `academic_records` | Read own rows; create/update/delete own `manual` rows | Full, including `mock` rows |
| `calendar_events` | RLS permits CRUD on own rows; API mutation/list operations are limited to `manual` rows | Full |
| `wellness_dimension_scores`, `ai_results` | Read own rows | Full |
| `wellness_knowledge_base` | Read shared rows | Full |

## Schema sources

- `backend/database/intial_sql_stament.sql`: consolidated definition of the
  nine student-transaction tables, constraints, indexes, triggers, RLS, and
  grants.
- `backend/database/002_enforce_monday_week_start.sql`: migration enforcing
  Monday week boundaries.
- `backend/database/003_normalize_courses.sql`: migration introducing and
  backfilling the normalized `courses` table.
- `backend/database/004_RAG-schemas.sql`: knowledge-base table and semantic
  matching RPC.
- `backend/database/RLS_query.sql`: knowledge-base RLS policies.
- `backend/src/services/` and `backend/src/routes/AI_analysis.js`: current
  application reads and writes used to validate table coverage.
