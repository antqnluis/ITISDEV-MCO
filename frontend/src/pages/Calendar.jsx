import { useMemo, useState } from "react";
import AppShell from "../components/layout/AppShell";
import AppIcon from "../components/ui/AppIcon";
import DashboardPageHeader from "../components/ui/DashboardPageHeader";
import Modal from "../components/ui/Modal";
import StatusBadge from "../components/ui/StatusBadge";
import { usePrototypeData } from "../context/usePrototypeData";

const DAY_MS = 24 * 60 * 60 * 1000;
const eventTypes = ["class", "assignment_deadline", "exam", "study_block", "rest_block", "ojt", "organization", "athletics", "caregiving", "work", "personal", "other"];

const eventStyle = {
    class: "border-[#b8d3c1] bg-[#edf6ef] text-[#326348]",
    assignment_deadline: "border-[#e7c89c] bg-[#fff6e7] text-[#8b5d20]",
    exam: "border-[#e7b5af] bg-[#fff0ee] text-[#9a4f47]",
    study_block: "border-[#b8cfdf] bg-[#eef6fb] text-[#426c87]",
    rest_block: "border-[#d8c9e5] bg-[#f7f0fb] text-[#755787]",
    ojt: "border-[#bed5ce] bg-[#edf7f4] text-[#397064]",
    organization: "border-[#e2c6dc] bg-[#fbf0f8] text-[#825c78]",
    athletics: "border-[#c8d6ad] bg-[#f4f8e9] text-[#60713c]",
    caregiving: "border-[#e7c7bd] bg-[#fff3ef] text-[#8c5b4d]",
    work: "border-[#c9c9df] bg-[#f2f2fa] text-[#595979]",
    personal: "border-[#efd4ac] bg-[#fff7e9] text-[#8b672f]",
    other: "border-[#d7deda] bg-[#f4f6f4] text-[#64716b]",
};

const inputClass = "h-11 w-full rounded-xl border border-[#d7e0da] bg-white px-3.5 text-sm text-[#18392d] outline-none transition placeholder:text-[#9aa8a1] focus:border-[#60906e] focus:ring-2 focus:ring-[#4b8360]/15";

function mondayOf(date) {
    const value = new Date(date);
    value.setHours(0, 0, 0, 0);
    const day = value.getDay() || 7;
    value.setDate(value.getDate() - day + 1);
    return value;
}

function toDateInput(value) {
    const date = new Date(value);
    const shifted = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
    return shifted.toISOString().slice(0, 10);
}

function toTimeInput(value) {
    return new Date(value).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

function combineDateTime(date, time) {
    return new Date(`${date}T${time || "00:00"}:00`).toISOString();
}

function formatHours(totalMinutes) {
    if (totalMinutes < 60) return `${totalMinutes} min`;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = totalMinutes % 60;
    return minutes ? `${hours}h ${minutes}m` : `${hours}h`;
}

function EventForm({ event, weekStart, onSave, onCancel }) {
    const defaultDate = event ? toDateInput(event.starts_at) : toDateInput(weekStart);
    const [form, setForm] = useState({
        title: event?.title || "",
        event_type: event?.event_type || "class",
        date: defaultDate,
        start_time: event ? toTimeInput(event.starts_at) : "09:00",
        end_time: event?.ends_at ? toTimeInput(event.ends_at) : "10:00",
        all_day: event?.all_day || false,
        location: event?.location || "",
        description: event?.description || "",
        status: event?.status || "scheduled",
    });

    function update(eventObject) {
        const { name, value, type, checked } = eventObject.target;
        setForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    }

    function submit(eventObject) {
        eventObject.preventDefault();
        onSave({
            ...event,
            title: form.title.trim(),
            event_type: form.event_type,
            starts_at: combineDateTime(form.date, form.all_day ? "00:00" : form.start_time),
            ends_at: combineDateTime(form.date, form.all_day ? "23:59" : form.end_time),
            all_day: form.all_day,
            location: form.location.trim() || null,
            description: form.description.trim() || null,
            status: form.status,
            academic_record_id: event?.academic_record_id || null,
        });
    }

    return (
        <form onSubmit={submit} className="space-y-5">
            <div>
                <label htmlFor="event-title" className="mb-1.5 block text-sm font-semibold text-[#345449]">Event title</label>
                <input id="event-title" name="title" required maxLength={300} value={form.title} onChange={update} className={inputClass} placeholder="What is happening?" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
                <div>
                    <label htmlFor="event-type" className="mb-1.5 block text-sm font-semibold text-[#345449]">Event type</label>
                    <select id="event-type" name="event_type" value={form.event_type} onChange={update} className={inputClass}>
                        {eventTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="event-status" className="mb-1.5 block text-sm font-semibold text-[#345449]">Status</label>
                    <select id="event-status" name="status" value={form.status} onChange={update} className={inputClass}>
                        <option value="scheduled">Scheduled</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option>
                    </select>
                </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-[1.2fr_0.8fr_0.8fr]">
                <div><label htmlFor="event-date" className="mb-1.5 block text-sm font-semibold text-[#345449]">Date</label><input id="event-date" name="date" type="date" required value={form.date} onChange={update} className={inputClass} /></div>
                <div><label htmlFor="event-start" className="mb-1.5 block text-sm font-semibold text-[#345449]">Starts</label><input id="event-start" name="start_time" type="time" disabled={form.all_day} required={!form.all_day} value={form.start_time} onChange={update} className={`${inputClass} disabled:bg-[#f1f3f1] disabled:text-[#9ba59f]`} /></div>
                <div><label htmlFor="event-end" className="mb-1.5 block text-sm font-semibold text-[#345449]">Ends</label><input id="event-end" name="end_time" type="time" min={form.start_time} disabled={form.all_day} required={!form.all_day} value={form.end_time} onChange={update} className={`${inputClass} disabled:bg-[#f1f3f1] disabled:text-[#9ba59f]`} /></div>
            </div>
            <label className="flex items-center gap-2.5 text-sm font-medium text-[#536a61]"><input name="all_day" type="checkbox" checked={form.all_day} onChange={update} className="size-4 accent-[#4b8360]" /> This is an all-day event</label>
            <div><label htmlFor="event-location" className="mb-1.5 block text-sm font-semibold text-[#345449]">Location <span className="font-normal text-[#8a9992]">(optional)</span></label><input id="event-location" name="location" maxLength={500} value={form.location} onChange={update} className={inputClass} placeholder="Room, building, or online" /></div>
            <div><label htmlFor="event-description" className="mb-1.5 block text-sm font-semibold text-[#345449]">Notes <span className="font-normal text-[#8a9992]">(optional)</span></label><textarea id="event-description" name="description" maxLength={4000} rows={3} value={form.description} onChange={update} className={`${inputClass} h-auto py-3`} placeholder="Add helpful details" /></div>
            <div className="flex flex-col-reverse gap-3 border-t border-[#e5ebe6] pt-5 sm:flex-row sm:justify-end">
                <button type="button" onClick={onCancel} className="h-11 rounded-xl border border-[#ced9d1] px-5 text-sm font-semibold text-[#4f675d] hover:bg-[#f3f6f3]">Cancel</button>
                <button type="submit" className="h-11 rounded-xl bg-[#3f7854] px-5 text-sm font-semibold text-white hover:bg-[#356c49]">{event ? "Save changes" : "Add event"}</button>
            </div>
        </form>
    );
}

function Calendar() {
    const { calendarEvents, saveEvent } = usePrototypeData();
    const [weekStart, setWeekStart] = useState(() => mondayOf(new Date()));
    const [filter, setFilter] = useState("all");
    const [editingEvent, setEditingEvent] = useState(null);
    const [modalOpen, setModalOpen] = useState(false);
    const days = useMemo(() => Array.from({ length: 7 }, (_, index) => new Date(weekStart.getTime() + index * DAY_MS)), [weekStart]);
    const weekEnd = new Date(weekStart.getTime() + 7 * DAY_MS);
    const visibleEvents = calendarEvents
        .filter((event) => new Date(event.starts_at) >= weekStart && new Date(event.starts_at) < weekEnd)
        .filter((event) => filter === "all" || event.event_type === filter)
        .sort((a, b) => new Date(a.starts_at) - new Date(b.starts_at));
    const activeTypes = [...new Set(calendarEvents.map((event) => event.event_type))];
    const eventCountByType = visibleEvents.reduce((counts, event) => ({
        ...counts,
        [event.event_type]: (counts[event.event_type] || 0) + 1,
    }), {});
    const statusCounts = visibleEvents.reduce((counts, event) => ({
        ...counts,
        [event.status]: (counts[event.status] || 0) + 1,
    }), {});
    const plannedMinutes = visibleEvents.reduce((total, event) => {
        if (event.all_day || !event.ends_at) return total;
        const duration = new Date(event.ends_at) - new Date(event.starts_at);
        return duration > 0 ? total + Math.round(duration / 60000) : total;
    }, 0);
    const summaryGroups = [
        { label: "Classes", types: ["class"] },
        { label: "Assessments", types: ["assignment_deadline", "exam"] },
        { label: "Study blocks", types: ["study_block"] },
        { label: "Rest blocks", types: ["rest_block"] },
        { label: "Work & OJT", types: ["work", "ojt"] },
        { label: "Activities", types: ["organization", "athletics", "caregiving", "personal", "other"] },
    ].map((group) => ({
        ...group,
        count: group.types.reduce((total, type) => total + (eventCountByType[type] || 0), 0),
    }));

    function openNew() {
        setEditingEvent(null);
        setModalOpen(true);
    }

    function openEdit(event) {
        setEditingEvent(event);
        setModalOpen(true);
    }

    function handleSave(event) {
        saveEvent(event);
        setModalOpen(false);
    }

    return (
        <AppShell>
            <DashboardPageHeader
                eyebrow="Plan your week"
                title="Calendar"
                description="Keep academic deadlines, classes, study time, recovery, and outside responsibilities in one view."
                actions={<button type="button" onClick={openNew} className="inline-flex h-11 items-center gap-2 rounded-xl bg-[#3f7854] px-4 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(37,89,58,0.2)] hover:bg-[#356c49]"><AppIcon name="plus" className="size-[18px]" /> Add event</button>}
            />

            <section className="overflow-hidden rounded-[20px] border border-[#e0e7e2] bg-white shadow-[0_6px_22px_rgba(22,51,40,0.04)]">
                <div className="flex flex-col gap-4 border-b border-[#e7ece8] p-5 sm:p-6 lg:flex-row lg:items-center lg:justify-between">
                    <div className="flex items-center gap-2">
                        <button type="button" onClick={() => setWeekStart((date) => new Date(date.getTime() - 7 * DAY_MS))} aria-label="Previous week" className="grid size-10 place-items-center rounded-xl border border-[#d9e2dc] text-[#597068] hover:bg-[#f3f6f3]"><AppIcon name="chevronLeft" className="size-5" /></button>
                        <button type="button" onClick={() => setWeekStart(mondayOf(new Date()))} className="h-10 rounded-xl border border-[#d9e2dc] px-4 text-sm font-semibold text-[#496359] hover:bg-[#f3f6f3]">Today</button>
                        <button type="button" onClick={() => setWeekStart((date) => new Date(date.getTime() + 7 * DAY_MS))} aria-label="Next week" className="grid size-10 place-items-center rounded-xl border border-[#d9e2dc] text-[#597068] hover:bg-[#f3f6f3]"><AppIcon name="chevronRight" className="size-5" /></button>
                        <h2 className="ml-2 hidden font-serif text-xl font-semibold text-[#173e30] sm:block">
                            {weekStart.toLocaleDateString("en-PH", { month: "long", day: "numeric" })} – {days[6].toLocaleDateString("en-PH", { month: "long", day: "numeric", year: "numeric" })}
                        </h2>
                    </div>
                    <label className="flex items-center gap-2 text-sm text-[#5e7169]"><AppIcon name="filter" className="size-4" /><span className="sr-only sm:not-sr-only">Show</span><select value={filter} onChange={(event) => setFilter(event.target.value)} className="h-10 min-w-44 rounded-xl border border-[#d9e2dc] bg-white px-3 text-sm font-medium outline-none focus:border-[#60906e]"><option value="all">All event types</option>{activeTypes.map((type) => <option key={type} value={type}>{type.replaceAll("_", " ")}</option>)}</select></label>
                </div>

                <div className="overflow-x-auto">
                    <div className="grid min-w-[1050px] grid-cols-7 divide-x divide-[#edf0ed]">
                        {days.map((day) => {
                            const dayEvents = visibleEvents.filter((event) => new Date(event.starts_at).toDateString() === day.toDateString());
                            const isToday = day.toDateString() === new Date().toDateString();
                            return (
                                <section key={day.toISOString()} className="min-h-[470px] bg-[#fdfdfb]">
                                    <header className={`border-b border-[#edf0ed] px-3 py-4 text-center ${isToday ? "bg-[#eef6ef]" : "bg-white"}`}>
                                        <p className={`text-[11px] font-bold uppercase tracking-[0.12em] ${isToday ? "text-[#39724e]" : "text-[#809089]"}`}>{day.toLocaleDateString("en-PH", { weekday: "short" })}</p>
                                        <p className={`mx-auto mt-1 grid size-8 place-items-center rounded-full text-sm font-semibold ${isToday ? "bg-[#3f7854] text-white" : "text-[#304d41]"}`}>{day.getDate()}</p>
                                    </header>
                                    <div className="space-y-2 p-2.5">
                                        {dayEvents.map((event) => (
                                            <article key={event.id} className={`group rounded-xl border p-3 ${eventStyle[event.event_type]} ${event.status === "cancelled" ? "opacity-55" : ""}`}>
                                                <div className="flex items-start justify-between gap-1">
                                                    <p className={`text-[10px] font-bold uppercase tracking-[0.07em] ${event.status === "cancelled" ? "line-through" : ""}`}>{event.all_day ? "All day" : toTimeInput(event.starts_at)}</p>
                                                    <button type="button" onClick={() => openEdit(event)} aria-label={`Edit ${event.title}`} className="grid size-6 place-items-center rounded-md opacity-0 transition hover:bg-white/60 focus:opacity-100 group-hover:opacity-100"><AppIcon name="edit" className="size-3.5" /></button>
                                                </div>
                                                <h3 className={`mt-1 text-xs font-bold leading-4 ${event.status === "cancelled" ? "line-through" : ""}`}>{event.title}</h3>
                                                {event.location && <p className="mt-2 flex items-start gap-1 text-[10px] leading-4 opacity-80"><AppIcon name="location" className="mt-0.5 size-3 shrink-0" />{event.location}</p>}
                                            </article>
                                        ))}
                                    </div>
                                </section>
                            );
                        })}
                    </div>
                </div>

                {visibleEvents.length === 0 && <div className="border-t border-[#edf0ed] px-6 py-8 text-center text-sm text-[#74837d]">No events match this week and filter.</div>}
            </section>

            <section className="mt-6 rounded-[20px] border border-[#e0e7e2] bg-white p-6">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="text-xs font-bold uppercase tracking-[0.13em] text-[#789087]">Week overview</p><h2 className="mt-1 font-serif text-xl font-semibold text-[#173e30]">Your schedule at a glance</h2></div>
                    <div className="flex flex-wrap gap-2">{[...new Set(visibleEvents.map((event) => event.status))].map((status) => <StatusBadge key={status} value={status} />)}</div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                    <article className="rounded-xl border border-[#e5ebe7] bg-[#fbfdfb] p-4"><p className="text-xs font-semibold text-[#70817a]">Events this week</p><p className="mt-1 text-2xl font-bold text-[#29483b]">{visibleEvents.length}</p><p className="mt-1 text-xs text-[#7b8984]">{statusCounts.scheduled || 0} scheduled</p></article>
                    <article className="rounded-xl border border-[#e5ebe7] bg-[#fbfdfb] p-4"><p className="text-xs font-semibold text-[#70817a]">Planned time</p><p className="mt-1 text-2xl font-bold text-[#29483b]">{formatHours(plannedMinutes)}</p><p className="mt-1 text-xs text-[#7b8984]">Timed events only</p></article>
                    <article className="rounded-xl border border-[#e5ebe7] bg-[#fbfdfb] p-4"><p className="text-xs font-semibold text-[#70817a]">Completed</p><p className="mt-1 text-2xl font-bold text-[#29483b]">{statusCounts.completed || 0}</p><p className="mt-1 text-xs text-[#7b8984]">{statusCounts.cancelled || 0} cancelled</p></article>
                </div>
                <div className="mt-5 border-t border-[#e8ede9] pt-5">
                    <p className="text-xs font-bold uppercase tracking-[0.13em] text-[#789087]">Schedule mix</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {summaryGroups.map((group) => (
                            <div key={group.label} className="flex items-center justify-between rounded-xl border border-[#e5ebe7] px-4 py-3">
                                <span className="text-sm font-medium text-[#536a61]">{group.label}</span>
                                <span className="grid size-7 place-items-center rounded-full bg-[#eef5ef] text-xs font-bold text-[#39724e]">{group.count}</span>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {modalOpen && (
                <Modal open onClose={() => setModalOpen(false)} title={editingEvent ? "Edit calendar event" : "Add calendar event"} description="Event fields mirror the calendar data stored by AnimoLog.">
                    <EventForm event={editingEvent} weekStart={weekStart} onSave={handleSave} onCancel={() => setModalOpen(false)} />
                </Modal>
            )}
        </AppShell>
    );
}

export default Calendar;
