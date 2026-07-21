import AppIcon from "../ui/AppIcon";
import AcademicRecordCard from "./AcademicRecordCard";

function CourseSection({ course, records, onAddRecord }) {
    return (
        <section className="rounded-[20px] border border-[#e0e7e2] bg-white p-5 shadow-[0_5px_20px_rgba(22,51,40,0.035)] sm:p-6">
            <div className="flex flex-col gap-4 border-b border-[#e8ede9] pb-5 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#4b8360]">{course.code}</p>
                    <h2 className="mt-1 font-serif text-2xl font-semibold tracking-[-0.02em] text-[#173e30]">{course.name}</h2>
                </div>
                <button type="button" onClick={() => onAddRecord(course)} className="inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-xl border border-[#c8d9cb] bg-[#f7fbf7] px-4 text-sm font-semibold text-[#34734d] transition hover:border-[#94b39a] hover:bg-[#edf6ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4b8360]">
                    <AppIcon name="plus" className="size-[18px]" /> Add Academic Record
                </button>
            </div>
            <div className="mt-5">
                <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#789087]">Academic records</p>
                <div className="mt-3 space-y-3">
                    {records.length ? records.map((record) => <AcademicRecordCard key={record.id} record={record} />) : (
                        <div className="rounded-xl bg-[#f5f7f5] px-4 py-5 text-sm text-[#718078]">No academic records yet. Add an assignment, quiz, exam, or other course requirement.</div>
                    )}
                </div>
            </div>
        </section>
    );
}

export default CourseSection;
