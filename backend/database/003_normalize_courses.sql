begin;

create table public.courses (
    id uuid primary key default gen_random_uuid(),
    student_id uuid not null
        references public.students(id)
        on delete cascade,
    code text not null,
    name text not null,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now(),

    constraint courses_id_student_unique
        unique (id, student_id),
    constraint courses_student_code_unique
        unique (student_id, code),
    constraint courses_code_valid
        check (
            code = upper(btrim(code))
            and char_length(code) between 1 and 30
        ),
    constraint courses_name_valid
        check (
            name = btrim(name)
            and char_length(name) between 1 and 150
        )
);

do $$
begin
    if exists (
        with existing_courses as (
            select student_id, upper(btrim(course_code)) as code, btrim(course_name) as name
            from public.academic_records
            union all
            select student_id, upper(btrim(course_code)) as code, btrim(course_name) as name
            from public.course_environment_logs
        )
        select 1
        from existing_courses
        group by student_id, code
        having count(distinct name) > 1
    ) then
        raise exception 'Conflicting course names exist for the same student and normalized course code';
    end if;
end
$$;

insert into public.courses (student_id, code, name)
select student_id, code, min(name)
from (
    select student_id, upper(btrim(course_code)) as code, btrim(course_name) as name
    from public.academic_records
    union all
    select student_id, upper(btrim(course_code)) as code, btrim(course_name) as name
    from public.course_environment_logs
) existing_courses
group by student_id, code;

alter table public.academic_records
    add column course_id uuid;

alter table public.course_environment_logs
    add column course_id uuid;

update public.academic_records academic_record
set course_id = course.id
from public.courses course
where course.student_id = academic_record.student_id
  and course.code = upper(btrim(academic_record.course_code));

update public.course_environment_logs course_log
set course_id = course.id
from public.courses course
where course.student_id = course_log.student_id
  and course.code = upper(btrim(course_log.course_code));

alter table public.academic_records
    alter column course_id set not null,
    add constraint academic_records_course_student_fk
        foreign key (course_id, student_id)
        references public.courses(id, student_id)
        on delete no action;

alter table public.course_environment_logs
    alter column course_id set not null,
    add constraint course_environment_course_student_fk
        foreign key (course_id, student_id)
        references public.courses(id, student_id)
        on delete no action;

alter table public.course_environment_logs
    drop constraint if exists course_environment_student_course_week_unique,
    add constraint course_environment_student_course_week_unique
        unique (student_id, course_id, week_start);

drop index if exists public.academic_records_student_course_index;

create index courses_student_code_index
    on public.courses (student_id, code);

create index academic_records_student_course_index
    on public.academic_records (student_id, course_id);

create index course_environment_student_course_index
    on public.course_environment_logs (student_id, course_id);

alter table public.academic_records
    drop column course_code,
    drop column course_name;

alter table public.course_environment_logs
    drop column course_code,
    drop column course_name;

create trigger courses_set_updated_at
before update on public.courses
for each row
execute function public.set_updated_at();

alter table public.courses
enable row level security;

create policy "Students can view their own courses"
on public.courses
for select
to authenticated
using ((select auth.uid()) = student_id);

create policy "Students can create their own courses"
on public.courses
for insert
to authenticated
with check ((select auth.uid()) = student_id);

create policy "Students can update their own courses"
on public.courses
for update
to authenticated
using ((select auth.uid()) = student_id)
with check ((select auth.uid()) = student_id);

create policy "Students can delete their own courses"
on public.courses
for delete
to authenticated
using ((select auth.uid()) = student_id);

grant select, insert, update, delete
on table public.courses
to authenticated;

grant all
on table public.courses
to service_role;

commit;
