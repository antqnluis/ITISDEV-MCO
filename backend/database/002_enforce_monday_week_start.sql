begin;

do $$
begin
    if exists (
        select 1
        from public.weekly_check_ins
        where extract(isodow from week_start) <> 1
    ) then
        raise exception 'weekly_check_ins contains non-Monday week_start values';
    end if;

    if exists (
        select 1
        from public.course_environment_logs
        where extract(isodow from week_start) <> 1
    ) then
        raise exception 'course_environment_logs contains non-Monday week_start values';
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname = 'weekly_check_ins_week_start_monday'
          and conrelid = 'public.weekly_check_ins'::regclass
    ) then
        alter table public.weekly_check_ins
            add constraint weekly_check_ins_week_start_monday
            check (extract(isodow from week_start) = 1);
    end if;

    if not exists (
        select 1
        from pg_constraint
        where conname = 'course_environment_week_start_monday'
          and conrelid = 'public.course_environment_logs'::regclass
    ) then
        alter table public.course_environment_logs
            add constraint course_environment_week_start_monday
            check (extract(isodow from week_start) = 1);
    end if;
end
$$;

commit;
