import { useState } from "react";
import AcademicRecordForm from "../components/academic-records/AcademicRecordForm";
import CourseForm from "../components/academic-records/CourseForm";
import CourseSection from "../components/academic-records/CourseSection";
import AppShell from "../components/layout/AppShell";
import AppIcon from "../components/ui/AppIcon";
import DashboardPageHeader from "../components/ui/DashboardPageHeader";
import Modal from "../components/ui/Modal";
import { usePrototypeData } from "../context/usePrototypeData";

function AcademicRecords() {
    const { courses, academicRecords, saveCourse, saveAcademicRecord } = usePrototypeData();
    const [courseModalOpen, setCourseModalOpen] = useState(false);
    const [recordCourse, setRecordCourse] = useState(null);

    function saveNewCourse(course) {
        saveCourse(course);
        setCourseModalOpen(false);
    }

    function saveNewRecord(record) {
        saveAcademicRecord(record);
        setRecordCourse(null);
    }

    const recordsForCourse = (course) => academicRecords
        .filter((record) => record.course_id === course.id || (!record.course_id && record.course_code === course.code))
        .sort((a, b) => new Date(a.due_at) - new Date(b.due_at));

    const addCourseButton = (
        <button type="button" onClick={() => setCourseModalOpen(true)} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#3f7854] px-4 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(37,89,58,0.2)] transition hover:bg-[#356c49] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4b8360]">
            <AppIcon name="plus" className="size-[18px]" /> Add Course
        </button>
    );

    return (
        <AppShell>
            <DashboardPageHeader
                eyebrow="Academic context"
                title="Academic Records"
                description="Organize course requirements, deadlines, submission status, grades, and estimated workload in one place."
                actions={courses.length ? addCourseButton : null}
            />

            {courses.length === 0 ? (
                <section className="rounded-[20px] border border-dashed border-[#bdd0c1] bg-white px-6 py-14 text-center shadow-[0_5px_20px_rgba(22,51,40,0.035)] sm:px-10">
                    <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#eaf3eb] text-[#437d56]"><AppIcon name="records" className="size-7" /></span>
                    <h2 className="mt-5 font-serif text-2xl font-semibold text-[#173e30]">Start tracking your academic activities.</h2>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#718078]">Adding courses and academic records helps AnimoLog understand workload patterns and provide more meaningful wellness insights.</p>
                    <button type="button" onClick={() => setCourseModalOpen(true)} className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-[#3f7854] px-4 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(37,89,58,0.2)] transition hover:bg-[#356c49] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4b8360]">
                        <AppIcon name="plus" className="size-[18px]" /> Add First Course
                    </button>
                </section>
            ) : (
                <div className="space-y-6">
                    {courses.map((course) => <CourseSection key={course.id} course={course} records={recordsForCourse(course)} onAddRecord={setRecordCourse} />)}
                </div>
            )}

            <Modal open={courseModalOpen} onClose={() => setCourseModalOpen(false)} title="Add course" description="Start with the course details used to organize your academic records." size="max-w-lg">
                <CourseForm onSave={saveNewCourse} onCancel={() => setCourseModalOpen(false)} />
            </Modal>

            <Modal open={Boolean(recordCourse)} onClose={() => setRecordCourse(null)} title="Add academic record" description="Add an objective course requirement, deadline, grade, or workload estimate." size="max-w-2xl">
                {recordCourse && <AcademicRecordForm course={recordCourse} onSave={saveNewRecord} onCancel={() => setRecordCourse(null)} />}
            </Modal>
        </AppShell>
    );
}

export default AcademicRecords;
