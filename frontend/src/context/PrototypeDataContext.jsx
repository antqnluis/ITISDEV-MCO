import { useMemo, useState } from "react";
import { demoData } from "../data/demoData";
import { PrototypeDataContext } from "./usePrototypeData";

function createId(prefix) {
    const suffix = typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    return `${prefix}-${suffix}`;
}

function upsertById(setter, item) {
    setter((items) => {
        const exists = items.some((current) => current.id === item.id);
        return exists
            ? items.map((current) => current.id === item.id ? item : current)
            : [...items, item];
    });
}

export function PrototypeDataProvider({ children }) {
    const [student, setStudent] = useState(demoData.student);
    const [profile, setProfile] = useState(demoData.profile);
    const [checkIns, setCheckIns] = useState(demoData.checkIns);
    const [dimensionScores] = useState(demoData.dimensionScores);
    const [courses, setCourses] = useState(demoData.courses || []);
    const [academicRecords, setAcademicRecords] = useState(demoData.academicRecords);
    const [calendarEvents, setCalendarEvents] = useState(demoData.calendarEvents);
    const [courseLogs, setCourseLogs] = useState(demoData.courseLogs);

    const value = useMemo(() => ({
        student,
        profile,
        checkIns,
        dimensionScores,
        courses,
        academicRecords,
        calendarEvents,
        courseLogs,
        saveEvent(event) {
            const nextEvent = {
                ...event,
                id: event.id || createId("event"),
                source: event.source || "manual",
                completed_at: event.status === "completed" ? (event.completed_at || new Date().toISOString()) : null,
            };
            upsertById(setCalendarEvents, nextEvent);
            return nextEvent;
        },
        deleteEvent(id) {
            setCalendarEvents((events) => events.filter((event) => event.id !== id));
        },
        saveCheckIn(checkIn, logs = []) {
            const nextCheckIn = {
                ...checkIn,
                id: checkIn.id || createId("check-in"),
                submitted_at: checkIn.submitted_at || new Date().toISOString(),
            };
            upsertById(setCheckIns, nextCheckIn);
            setCourseLogs((items) => [
                ...items.filter((item) => item.check_in_id !== nextCheckIn.id),
                ...logs.map((log) => ({ ...log, id: log.id || createId("course-log"), check_in_id: nextCheckIn.id, week_start: nextCheckIn.week_start })),
            ]);
            return nextCheckIn;
        },
        saveAcademicRecord(record) {
            const nextRecord = {
                ...record,
                id: record.id || createId("record"),
                source: record.source || "manual",
                recorded_at: record.recorded_at || new Date().toISOString(),
                grade_percentage: record.score !== null && record.max_score
                    ? Math.round((Number(record.score) / Number(record.max_score)) * 10000) / 100
                    : null,
            };
            upsertById(setAcademicRecords, nextRecord);
            return nextRecord;
        },
        saveCourse(course) {
            const nextCourse = {
                ...course,
                id: course.id || createId("course"),
                code: course.code.trim().toUpperCase(),
                name: course.name.trim(),
            };
            upsertById(setCourses, nextCourse);
            return nextCourse;
        },
        deleteAcademicRecord(id) {
            setAcademicRecords((records) => records.filter((record) => record.id !== id));
            setCalendarEvents((events) => events.filter((event) => event.academic_record_id !== id));
        },
        updateSettings(nextStudent, nextProfile) {
            setStudent(nextStudent);
            setProfile(nextProfile);
        },
        // This mirrors the data an eventual export endpoint will provide.
        exportWellnessSummary() {
            return {
                generated_at: new Date().toISOString(),
                student: {
                    first_name: student.first_name,
                    last_name: student.last_name,
                    student_number: student.student_number,
                    email: student.email,
                },
                profile: { ...profile, wellness_goals: [...profile.wellness_goals] },
                check_ins: checkIns.map((checkIn) => ({ ...checkIn })),
                dimension_scores: dimensionScores.map((score) => ({ ...score })),
                course_logs: courseLogs.map((log) => ({ ...log })),
            };
        },
    }), [student, profile, checkIns, dimensionScores, courses, academicRecords, calendarEvents, courseLogs]);

    return <PrototypeDataContext.Provider value={value}>{children}</PrototypeDataContext.Provider>;
}
