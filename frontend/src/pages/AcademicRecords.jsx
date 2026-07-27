import { useEffect, useState } from "react";
import AcademicRecordForm from "../components/academic-records/AcademicRecordForm";
import CourseForm from "../components/academic-records/CourseForm";
import CourseSection from "../components/academic-records/CourseSection";
import AppShell from "../components/layout/AppShell";
import AppIcon from "../components/ui/AppIcon";
import Button from "../components/ui/Button";
import DashboardPageHeader from "../components/ui/DashboardPageHeader";
import Modal from "../components/ui/Modal";
import { useAuth } from "../context/useAuth";
import {
    createAcademicRecord,
    deleteAcademicRecord,
    listAllAcademicRecords,
    updateAcademicRecord,
} from "../services/academicRecordApi";
import { createCourse, listAllCourses } from "../services/courseApi";

function sortCourses(courses) {
    return [...courses].sort((left, right) => (
        left.code.localeCompare(right.code) || left.id.localeCompare(right.id)
    ));
}

function sortRecords(records) {
    return [...records].sort((left, right) => {
        if (!left.due_at && !right.due_at) return left.id.localeCompare(right.id);
        if (!left.due_at) return 1;
        if (!right.due_at) return -1;
        return new Date(left.due_at) - new Date(right.due_at)
            || left.id.localeCompare(right.id);
    });
}

function AcademicRecords() {
    const { authenticatedRequest } = useAuth();
    const [courses, setCourses] = useState([]);
    const [academicRecords, setAcademicRecords] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [loadError, setLoadError] = useState("");
    const [loadAttempt, setLoadAttempt] = useState(0);
    const [courseModalOpen, setCourseModalOpen] = useState(false);
    const [courseSubmitting, setCourseSubmitting] = useState(false);
    const [courseSubmissionError, setCourseSubmissionError] = useState("");
    const [recordCourse, setRecordCourse] = useState(null);
    const [recordSubmitting, setRecordSubmitting] = useState(false);
    const [recordSubmissionError, setRecordSubmissionError] = useState("");
    const [editingRecord, setEditingRecord] = useState(null);
    const [editSubmitting, setEditSubmitting] = useState(false);
    const [editSubmissionError, setEditSubmissionError] = useState("");
    const [deletingRecord, setDeletingRecord] = useState(null);
    const [deleteSubmitting, setDeleteSubmitting] = useState(false);
    const [deleteSubmissionError, setDeleteSubmissionError] = useState("");

    useEffect(() => {
        let cancelled = false;

        async function loadAcademicData() {
            setIsLoading(true);
            setLoadError("");

            try {
                const [loadedCourses, loadedRecords] = await Promise.all([
                    listAllCourses(authenticatedRequest),
                    listAllAcademicRecords(authenticatedRequest),
                ]);
                if (!cancelled) {
                    setCourses(sortCourses(loadedCourses));
                    setAcademicRecords(sortRecords(loadedRecords));
                }
            } catch (error) {
                if (!cancelled) {
                    setLoadError(error.message || "Unable to load academic records.");
                }
            } finally {
                if (!cancelled) setIsLoading(false);
            }
        }

        loadAcademicData();
        return () => {
            cancelled = true;
        };
    }, [authenticatedRequest, loadAttempt]);

    async function saveNewCourse(payload) {
        setCourseSubmitting(true);
        setCourseSubmissionError("");
        try {
            const course = await createCourse(authenticatedRequest, payload);
            setCourses((current) => sortCourses([...current, course]));
            setCourseModalOpen(false);
        } catch (error) {
            setCourseSubmissionError(error.message || "Unable to create the course.");
        } finally {
            setCourseSubmitting(false);
        }
    }

    async function saveNewRecord(payload) {
        setRecordSubmitting(true);
        setRecordSubmissionError("");
        try {
            const record = await createAcademicRecord(authenticatedRequest, payload);
            setAcademicRecords((current) => sortRecords([...current, record]));
            setRecordCourse(null);
        } catch (error) {
            setRecordSubmissionError(error.message || "Unable to create the academic record.");
        } finally {
            setRecordSubmitting(false);
        }
    }

    async function saveEditedRecord(payload) {
        if (!editingRecord) return;
        setEditSubmitting(true);
        setEditSubmissionError("");
        try {
            const record = await updateAcademicRecord(
                authenticatedRequest,
                editingRecord.id,
                payload,
            );
            setAcademicRecords((current) => sortRecords(
                current.map((item) => item.id === record.id ? record : item),
            ));
            setEditingRecord(null);
        } catch (error) {
            setEditSubmissionError(error.message || "Unable to update the academic record.");
        } finally {
            setEditSubmitting(false);
        }
    }

    async function confirmDeleteRecord() {
        if (!deletingRecord) return;
        setDeleteSubmitting(true);
        setDeleteSubmissionError("");
        try {
            await deleteAcademicRecord(authenticatedRequest, deletingRecord.id);
            setAcademicRecords((current) => (
                current.filter((record) => record.id !== deletingRecord.id)
            ));
            setDeletingRecord(null);
        } catch (error) {
            setDeleteSubmissionError(error.message || "Unable to delete the academic record.");
        } finally {
            setDeleteSubmitting(false);
        }
    }

    function openCourseModal() {
        setCourseSubmissionError("");
        setCourseModalOpen(true);
    }

    function openRecordModal(course) {
        setRecordSubmissionError("");
        setRecordCourse(course);
    }

    function openEditModal(record) {
        setEditSubmissionError("");
        setEditingRecord(record);
    }

    function openDeleteModal(record) {
        setDeleteSubmissionError("");
        setDeletingRecord(record);
    }

    function closeDeleteModal() {
        if (deleteSubmitting) return;
        setDeletingRecord(null);
        setDeleteSubmissionError("");
    }

    const recordsForCourse = (course) => academicRecords
        .filter((record) => record.course_id === course.id);
    const editingCourse = editingRecord
        ? courses.find((course) => course.id === editingRecord.course_id)
            || editingRecord.course
        : null;

    const addCourseButton = (
        <button type="button" onClick={openCourseModal} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#3f7854] px-4 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(37,89,58,0.2)] transition hover:bg-[#356c49] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4b8360]">
            <AppIcon name="plus" className="size-[18px]" /> Add Course
        </button>
    );

    return (
        <AppShell>
            <DashboardPageHeader
                eyebrow="Academic context"
                title="Academic Records"
                description="Organize course requirements, deadlines, submission status, and grades in one place."
                actions={!isLoading && !loadError && courses.length ? addCourseButton : null}
            />

            {isLoading ? (
                <section aria-live="polite" className="rounded-[20px] border border-[#e0e7e2] bg-white px-6 py-14 text-center">
                    <span className="mx-auto block size-9 animate-spin rounded-full border-4 border-[#d6e4d9] border-t-[#3f7854]" aria-hidden="true" />
                    <p className="mt-4 text-sm font-medium text-[#60736b]">Loading courses and academic records…</p>
                </section>
            ) : loadError ? (
                <section role="alert" className="rounded-[20px] border border-danger/25 bg-[#fff7f5] px-6 py-10 text-center">
                    <h2 className="font-serif text-2xl font-semibold text-[#763e39]">Academic records could not be loaded</h2>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-danger">{loadError}</p>
                    <button type="button" onClick={() => setLoadAttempt((attempt) => attempt + 1)} className="mt-6 inline-flex h-11 items-center rounded-xl bg-[#3f7854] px-5 text-sm font-semibold text-white hover:bg-[#356c49]">
                        Try again
                    </button>
                </section>
            ) : courses.length === 0 ? (
                <section className="rounded-[20px] border border-dashed border-[#bdd0c1] bg-white px-6 py-14 text-center shadow-[0_5px_20px_rgba(22,51,40,0.035)] sm:px-10">
                    <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[#eaf3eb] text-[#437d56]"><AppIcon name="records" className="size-7" /></span>
                    <h2 className="mt-5 font-serif text-2xl font-semibold text-[#173e30]">Start tracking your academic activities.</h2>
                    <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-[#718078]">Adding courses and academic records helps AnimoLog understand workload patterns and provide more meaningful wellness insights.</p>
                    <button type="button" onClick={openCourseModal} className="mt-7 inline-flex h-11 items-center gap-2 rounded-xl bg-[#3f7854] px-4 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(37,89,58,0.2)] transition hover:bg-[#356c49] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4b8360]">
                        <AppIcon name="plus" className="size-[18px]" /> Add First Course
                    </button>
                </section>
            ) : (
                <div className="space-y-6">
                    {courses.map((course) => (
                        <CourseSection
                            key={course.id}
                            course={course}
                            records={recordsForCourse(course)}
                            onAddRecord={openRecordModal}
                            onEditRecord={openEditModal}
                            onDeleteRecord={openDeleteModal}
                        />
                    ))}
                </div>
            )}

            <Modal open={courseModalOpen} onClose={() => setCourseModalOpen(false)} title="Add course" description="Start with the course details used to organize your academic records." size="max-w-lg">
                <CourseForm
                    onSave={saveNewCourse}
                    onCancel={() => setCourseModalOpen(false)}
                    isSubmitting={courseSubmitting}
                    submissionError={courseSubmissionError}
                />
            </Modal>

            <Modal open={Boolean(recordCourse)} onClose={() => setRecordCourse(null)} title="Add academic record" description="Add an objective course requirement, deadline, or grade." size="max-w-2xl">
                {recordCourse && (
                    <AcademicRecordForm
                        course={recordCourse}
                        onSave={saveNewRecord}
                        onCancel={() => setRecordCourse(null)}
                        isSubmitting={recordSubmitting}
                        submissionError={recordSubmissionError}
                    />
                )}
            </Modal>

            <Modal
                open={Boolean(editingRecord)}
                onClose={() => setEditingRecord(null)}
                closeDisabled={editSubmitting}
                title="Edit academic record"
                description="Update this record while keeping it under its current course."
                size="max-w-2xl"
            >
                {editingRecord && editingCourse && (
                    <AcademicRecordForm
                        key={editingRecord.id}
                        course={editingCourse}
                        record={editingRecord}
                        onSave={saveEditedRecord}
                        onCancel={() => setEditingRecord(null)}
                        isSubmitting={editSubmitting}
                        submissionError={editSubmissionError}
                    />
                )}
            </Modal>

            <Modal
                open={Boolean(deletingRecord)}
                onClose={closeDeleteModal}
                closeDisabled={deleteSubmitting}
                title="Delete academic record?"
                description="This action cannot be undone."
                size="max-w-lg"
            >
                {deletingRecord && (
                    <div>
                        <div className="rounded-xl border border-[#ead7d3] bg-[#fff7f5] p-4">
                            <p className="text-sm text-[#7f5c56]">You are about to delete:</p>
                            <p className="mt-1 font-semibold text-[#713e39]">{deletingRecord.title}</p>
                        </div>
                        {deleteSubmissionError && (
                            <div role="alert" className="mt-4 rounded-xl border border-danger/25 bg-[#fff3f1] px-4 py-3 text-sm font-medium text-danger">
                                {deleteSubmissionError}
                            </div>
                        )}
                        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                            <Button type="button" variant="secondary" size="compact" fullWidth={false} onClick={closeDeleteModal} disabled={deleteSubmitting}>Cancel</Button>
                            <Button type="button" size="compact" fullWidth={false} onClick={confirmDeleteRecord} disabled={deleteSubmitting} className="bg-[#a84f47] hover:bg-[#91453e] disabled:bg-[#dcc4c0]">
                                {deleteSubmitting ? "Deleting…" : "Delete record"}
                            </Button>
                        </div>
                    </div>
                )}
            </Modal>
        </AppShell>
    );
}

export default AcademicRecords;
