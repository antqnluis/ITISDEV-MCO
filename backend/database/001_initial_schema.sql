create extension if not exists "pgcrypto";

create table if not exists students (
  id uuid primary key default gen_random_uuid(),
  student_number text unique,
  full_name text not null,
  college text,
  program text,
  year_level int,
  created_at timestamptz default now()
);

create table if not exists student_profiles (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  role_context text,
  is_athlete boolean default false,
  is_org_officer boolean default false,
  has_ojt boolean default false,
  has_caregiving_duties boolean default false,
  commute_hours numeric(4,2),
  created_at timestamptz default now()
);

create table if not exists wellness_checkins (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,

  stress_level int not null check (stress_level between 1 and 5),
  sleep_quality int not null check (sleep_quality between 1 and 5),
  motivation_level int not null check (motivation_level between 1 and 5),

  academic_workload int not null check (academic_workload between 1 and 5),
  role_load int not null check (role_load between 1 and 5),
  logistical_load int not null check (logistical_load between 1 and 5),
  course_environment_load int not null check (course_environment_load between 1 and 5),

  notes text,
  created_at timestamptz default now()
);

create table if not exists wellness_reports (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  checkin_id uuid not null references wellness_checkins(id) on delete cascade,

  student_wellness_index int check (student_wellness_index between 0 and 100),
  stress_severity_level text check (
    stress_severity_level in ('Low', 'Moderate', 'High')
  ),
  primary_stress_context text,
  summary text,
  recommendations text[],

  created_at timestamptz default now()
);

alter table students enable row level security;
alter table student_profiles enable row level security;
alter table wellness_checkins enable row level security;
alter table wellness_reports enable row level security;