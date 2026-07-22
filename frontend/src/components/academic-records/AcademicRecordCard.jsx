import StatusBadge from "../ui/StatusBadge";

function formatDueDate(value) {
    return new Date(value).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" });
}

function formatType(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
}

function AcademicRecordCard({ record }) {
    const score = record.score !== null && record.score !== undefined
        ? `${record.score}${record.max_score ? ` / ${record.max_score}` : ""}`
        : "Not graded";

    return (
        <article className="rounded-xl border border-[#e2e9e4] bg-[#fdfefc] p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.12em] text-[#718a7d]">{formatType(record.record_type)}</p>
                    <h3 className="mt-1 text-base font-semibold text-[#27483a]">{record.title}</h3>
                </div>
                <StatusBadge value={record.submission_status} />
            </div>
            <div className="mt-4 grid gap-2 text-xs leading-5 text-[#6b7e75] sm:grid-cols-3">
                <p><span className="font-semibold text-[#526b5f]">Due:</span> {formatDueDate(record.due_at)}</p>
                <p><span className="font-semibold text-[#526b5f]">Score:</span> {score}</p>
                <p><span className="font-semibold text-[#526b5f]">Time:</span> {record.estimated_hours}h · {formatType(record.estimated_workload)}</p>
            </div>
        </article>
    );
}

export default AcademicRecordCard;
