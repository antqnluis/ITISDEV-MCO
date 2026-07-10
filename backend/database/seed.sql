-- Clear existing sample data first
-- Delete child tables before parent tables because of foreign key relationships

delete from wellness_reports;
delete from wellness_checkins;
delete from student_profiles;
delete from students;

-- Insert sample students

insert into students (
  id,
  student_number,
  full_name,
  college,
  program,
  year_level
)
values
(
  '11111111-1111-1111-1111-111111111111',
  '12345678',
  'Sample CCS Student',
  'CCS',
  'Information Systems',
  4
),
(
  '22222222-2222-2222-2222-222222222222',
  '23456789',
  'Sample CLA Student',
  'CLA',
  'Communication Arts',
  4
),
(
  '33333333-3333-3333-3333-333333333333',
  '34567890',
  'Sample Engineering Student',
  'GCOE',
  'Computer Engineering',
  3
);

-- Insert sample student profiles

insert into student_profiles (
  student_id,
  role_context,
  is_athlete,
  is_org_officer,
  has_ojt,
  has_caregiving_duties,
  commute_hours
)
values
(
  '11111111-1111-1111-1111-111111111111',
  '4th year CCS student, athlete, and organization officer with heavy academic and leadership responsibilities.',
  true,
  true,
  false,
  false,
  1.50
),
(
  '22222222-2222-2222-2222-222222222222',
  '4th year CLA student preparing for OJT while helping with responsibilities at home.',
  false,
  false,
  true,
  true,
  2.00
),
(
  '33333333-3333-3333-3333-333333333333',
  '3rd year engineering student with high laboratory workload and long commute.',
  false,
  false,
  false,
  false,
  2.50
);

-- Insert sample wellness check-ins

insert into wellness_checkins (
  id,
  student_id,
  stress_level,
  sleep_quality,
  motivation_level,
  academic_workload,
  role_load,
  logistical_load,
  course_environment_load,
  notes
)
values
(
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  '11111111-1111-1111-1111-111111111111',
  4,
  2,
  3,
  5,
  5,
  3,
  4,
  'Multiple deadlines, training sessions, org meetings, and difficult groupmates this week.'
),
(
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  '22222222-2222-2222-2222-222222222222',
  5,
  2,
  2,
  4,
  3,
  5,
  4,
  'Preparing for OJT while handling household responsibilities and struggling with course workload.'
),
(
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  '33333333-3333-3333-3333-333333333333',
  3,
  3,
  3,
  4,
  2,
  4,
  3,
  'Heavy laboratory requirements and long commute are affecting available study time.'
);

-- Insert sample wellness reports
-- These are manually written for now.
-- Later, your backend can generate these automatically.

insert into wellness_reports (
  student_id,
  checkin_id,
  student_wellness_index,
  stress_severity_level,
  primary_stress_context,
  summary,
  recommendations
)
values
(
  '11111111-1111-1111-1111-111111111111',
  'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
  76,
  'High',
  'Role Load',
  'The student appears to be experiencing high strain due to overlapping academic, athletic, and organization responsibilities.',
  array[
    'Review upcoming deadlines and separate urgent tasks from flexible tasks.',
    'Identify which organization or training responsibilities can be delegated or rescheduled.',
    'Consider seeking academic or advising support if the workload remains unmanageable.'
  ]
),
(
  '22222222-2222-2222-2222-222222222222',
  'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
  82,
  'High',
  'Logistical Load',
  'The student appears to be experiencing high strain from OJT preparation, household responsibilities, and limited available study time.',
  array[
    'Create a weekly schedule separating OJT preparation, household responsibilities, and academic deadlines.',
    'Prioritize tasks with fixed deadlines first.',
    'Consider reaching out to an advisor or support office if stress continues to increase.'
  ]
),
(
  '33333333-3333-3333-3333-333333333333',
  'cccccccc-cccc-cccc-cccc-cccccccccccc',
  58,
  'Moderate',
  'Academic Engagement',
  'The student appears to be experiencing moderate academic strain due to laboratory workload and commute-related time pressure.',
  array[
    'Break laboratory requirements into smaller work sessions.',
    'Use commute or waiting time for light review tasks when possible.',
    'Monitor whether sleep quality or motivation decreases in the next check-in.'
  ]
);