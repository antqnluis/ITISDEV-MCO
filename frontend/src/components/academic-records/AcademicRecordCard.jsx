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

function AcademicRecordCard({ record }) {
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
                <StatusBadge value={record.submission_status} label={formatType(record.submission_status)} />
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
