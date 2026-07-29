import AppIcon from "../ui/AppIcon";
import StatusBadge from "../ui/StatusBadge";

function formatDueDate(value) {
    if (!value) return "No due date";
    return new Date(value).toLocaleDateString("en-PH", {
        month: "short",
        day: "numeric",
        year: "numeric",
    });
}

function formatType(value) {
    if (!value) return "Not applicable";
    const label = value.replaceAll("_", " ");
    return label.charAt(0).toUpperCase() + label.slice(1);
}

function AcademicRecordCard({ onDelete, onEdit, record }) {
    const score = record.score !== null && record.score !== undefined
        ? `${record.score} / ${record.max_score}`
        : "Not graded";
    const gradePercentage = record.grade_percentage !== null
        && record.grade_percentage !== undefined
        ? `${record.grade_percentage}%`
        : "Not available";

    return (
        <article className="rounded-xl border border-[#e2e9e4] bg-[#fdfefc] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <div className="flex flex-wrap items-center gap-2">
                        <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#718a7d]">{formatType(record.record_type)}</p>
                        {record.source === "mock" && (
                            <span className="rounded-full bg-[#f1f1ef] px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-[#747b77]">Demo · Read only</span>
                        )}
                    </div>
                    <h3 className="mt-1 text-base font-semibold text-[#27483a]">{record.title}</h3>
                </div>
                <div className="flex items-center gap-2">
                    <StatusBadge value={record.submission_status} label={formatType(record.submission_status)} />
                    {record.source === "manual" && (
                        <>
                            <button type="button" onClick={() => onEdit(record)} aria-label={`Edit ${record.title}`} className="grid size-9 place-items-center rounded-lg border border-[#d4dfd6] text-[#47775a] transition hover:border-[#9db9a2] hover:bg-[#edf5ee] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#4b8360]">
                                <AppIcon name="edit" className="size-4" />
                            </button>
                            <button type="button" onClick={() => onDelete(record)} aria-label={`Delete ${record.title}`} className="grid size-9 place-items-center rounded-lg border border-[#ead2ce] text-[#a05249] transition hover:border-[#d8aaa3] hover:bg-[#fff1ef] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#a05249]">
                                <AppIcon name="trash" className="size-4" />
                            </button>
                        </>
                    )}
                </div>
            </div>
            <div className="mt-4 grid gap-2 text-xs leading-5 text-[#6b7e75] sm:grid-cols-3">
                <p><span className="font-semibold text-[#526b5f]">Due:</span> {formatDueDate(record.due_at)}</p>
                <p><span className="font-semibold text-[#526b5f]">Score:</span> {score}</p>
                <p><span className="font-semibold text-[#526b5f]">Grade:</span> {gradePercentage}</p>
            </div>
        </article>
    );
}

export default AcademicRecordCard;
