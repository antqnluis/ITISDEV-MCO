import { useState } from "react";
import { useNavigate } from "react-router-dom";
import AppShell from "../components/layout/AppShell";
import AppIcon from "../components/ui/AppIcon";
import DashboardPageHeader from "../components/ui/DashboardPageHeader";
import { usePrototypeData } from "../context/usePrototypeData";
import { downloadWellnessSummaryPdf } from "../services/wellnessSummaryPdf";

const goals = ["Managing Stress", "Managing Workload", "Time Management", "Healthy Routines", "Academic Balance", "Better Sleep", "Staying Motivated"];
const responsibilities = [
    { enabled: "is_employed", hours: "work_hours_per_week", label: "Part-time work", icon: "briefcase" },
    { enabled: "has_ojt", hours: "ojt_hours_per_week", label: "OJT / internship", icon: "records" },
    { enabled: "is_athlete", hours: "athlete_hours_per_week", label: "Athletics", icon: "heart" },
    { enabled: "has_caregiving_responsibility", hours: "caregiving_hours_per_week", label: "Caregiving", icon: "heart" },
    { enabled: "has_organization_responsibility", hours: "organization_hours_per_week", label: "Student organization", icon: "user" },
];

const inputClass = "h-11 w-full rounded-xl border border-[#d7e0da] bg-white px-3.5 text-sm text-[#18392d] outline-none transition placeholder:text-[#9aa8a1] focus:border-[#60906e] focus:ring-2 focus:ring-[#4b8360]/15 disabled:cursor-not-allowed disabled:bg-[#f1f3f1] disabled:text-[#839089]";

function FormField({ id, label, hint, children }) {
    return <div><label htmlFor={id} className="mb-1.5 block text-sm font-semibold text-[#345449]">{label}</label>{children}{hint && <p className="mt-1.5 text-xs leading-5 text-[#829089]">{hint}</p>}</div>;
}

function Settings() {
    const { student, profile, updateSettings, exportWellnessSummary } = usePrototypeData();
    const navigate = useNavigate();
    const [studentForm, setStudentForm] = useState({ ...student });
    const [profileForm, setProfileForm] = useState({ ...profile, wellness_goals: [...profile.wellness_goals] });
    const [saved, setSaved] = useState(false);
    const [exportPrepared, setExportPrepared] = useState(false);
    const [exporting, setExporting] = useState(false);
    const [exportError, setExportError] = useState(false);

    function updateStudent(event) {
        setSaved(false);
        setStudentForm((current) => ({ ...current, [event.target.name]: event.target.value }));
    }

    function updateProfile(event) {
        const { name, value, type, checked } = event.target;
        setSaved(false);
        setProfileForm((current) => ({ ...current, [name]: type === "checkbox" ? checked : value }));
    }

    function toggleGoal(goal) {
        setSaved(false);
        setProfileForm((current) => ({
            ...current,
            wellness_goals: current.wellness_goals.includes(goal)
                ? current.wellness_goals.filter((item) => item !== goal)
                : [...current.wellness_goals, goal],
        }));
    }

    function submit(event) {
        event.preventDefault();
        const numberFields = ["year_level", "current_academic_term", "commute_minutes_per_day", "available_study_hours_per_week", ...responsibilities.map((item) => item.hours)];
        const normalizedProfile = { ...profileForm };
        numberFields.forEach((field) => { normalizedProfile[field] = Number(normalizedProfile[field] || 0); });
        responsibilities.forEach((item) => {
            if (!normalizedProfile[item.enabled]) normalizedProfile[item.hours] = 0;
        });
        if (!normalizedProfile.has_organization_responsibility) normalizedProfile.organization_role = null;
        updateSettings(studentForm, normalizedProfile);
        setSaved(true);
        window.scrollTo({ top: 0, behavior: "smooth" });
    }

    async function prepareWellnessSummaryExport() {
        setExporting(true);
        setExportPrepared(false);
        setExportError(false);
        try {
            await downloadWellnessSummaryPdf(exportWellnessSummary());
            setExportPrepared(true);
        } catch {
            setExportError(true);
        } finally {
            setExporting(false);
        }
    }

    return (
        <AppShell>
            <DashboardPageHeader
                eyebrow="Your account"
                title="Settings"
                description="Keep your academic context, goals, and recurring responsibilities accurate so that future insights reflect your real week."
            />

            {saved && <div role="status" className="mb-6 flex items-center gap-3 rounded-2xl border border-[#bfdbc7] bg-[#edf8f0] px-5 py-4 text-sm font-semibold text-[#2f6c47]"><span className="grid size-7 place-items-center rounded-full bg-[#4b8b62] text-white"><AppIcon name="check" className="size-4" /></span>Your settings were saved.</div>}

            <form onSubmit={submit} className="grid gap-6 xl:grid-cols-[1fr_340px]">
                <div className="space-y-6">
                    <section className="rounded-[20px] border border-[#e0e7e2] bg-white p-6 shadow-[0_5px_20px_rgba(22,51,40,0.035)] sm:p-7">
                        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#edf4ee] text-[#47775a]"><AppIcon name="user" className="size-5" /></span><div><h2 className="font-serif text-xl font-semibold text-[#173e30]">Personal information</h2><p className="mt-0.5 text-xs text-[#798881]">Stored with your student account</p></div></div>
                        <div className="mt-6 grid gap-5 sm:grid-cols-2">
                            <FormField id="first-name" label="First name"><input id="first-name" name="first_name" required maxLength={100} value={studentForm.first_name} onChange={updateStudent} className={inputClass} /></FormField>
                            <FormField id="last-name" label="Last name"><input id="last-name" name="last_name" required maxLength={100} value={studentForm.last_name} onChange={updateStudent} className={inputClass} /></FormField>
                            <FormField id="student-number" label="Student number"><input id="student-number" name="student_number" required minLength={4} maxLength={30} value={studentForm.student_number} onChange={updateStudent} className={inputClass} /></FormField>
                            <FormField id="email-address" label="DLSU email" hint="Email changes require account verification."><input id="email-address" type="email" disabled value={studentForm.email} className={inputClass} /></FormField>
                        </div>
                    </section>

                    <section className="rounded-[20px] border border-[#e0e7e2] bg-white p-6 shadow-[0_5px_20px_rgba(22,51,40,0.035)] sm:p-7">
                        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#edf4ee] text-[#47775a]"><AppIcon name="book" className="size-5" /></span><div><h2 className="font-serif text-xl font-semibold text-[#173e30]">Academic profile</h2><p className="mt-0.5 text-xs text-[#798881]">Your baseline academic context</p></div></div>
                        <div className="mt-6 grid gap-5 sm:grid-cols-2">
                            <FormField id="college" label="College"><select id="college" name="college" value={profileForm.college} onChange={updateProfile} className={inputClass}><option>College of Computer Studies</option><option>College of Engineering</option><option>College of Science</option><option>College of Business</option><option>College of Liberal Arts</option></select></FormField>
                            <FormField id="program" label="Program"><input id="program" name="program" required value={profileForm.program} onChange={updateProfile} className={inputClass} /></FormField>
                            <FormField id="year-level" label="Year level"><select id="year-level" name="year_level" value={profileForm.year_level} onChange={updateProfile} className={inputClass}>{[1, 2, 3, 4, 5, 6].map((year) => <option key={year} value={year}>Year {year}</option>)}</select></FormField>
                            <FormField id="term" label="Current academic term"><select id="term" name="current_academic_term" value={profileForm.current_academic_term} onChange={updateProfile} className={inputClass}>{[1, 2, 3].map((term) => <option key={term} value={term}>Term {term}</option>)}</select></FormField>
                            <FormField id="commute" label="Daily commute (minutes)"><input id="commute" name="commute_minutes_per_day" type="number" min="0" max="1440" value={profileForm.commute_minutes_per_day} onChange={updateProfile} className={inputClass} /></FormField>
                            <FormField id="study-hours-weekly" label="Available study hours / week"><input id="study-hours-weekly" name="available_study_hours_per_week" type="number" min="0" max="168" step="0.5" value={profileForm.available_study_hours_per_week} onChange={updateProfile} className={inputClass} /></FormField>
                        </div>
                    </section>

                    <section className="rounded-[20px] border border-[#e0e7e2] bg-white p-6 shadow-[0_5px_20px_rgba(22,51,40,0.035)] sm:p-7">
                        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#edf4ee] text-[#47775a]"><AppIcon name="briefcase" className="size-5" /></span><div><h2 className="font-serif text-xl font-semibold text-[#173e30]">Recurring responsibilities</h2><p className="mt-0.5 text-xs text-[#798881]">Hours that regularly compete for time in your week</p></div></div>
                        <div className="mt-6 grid gap-3 sm:grid-cols-2">
                            {responsibilities.map((item) => {
                                const enabled = profileForm[item.enabled];
                                return (
                                    <div key={item.enabled} className={`rounded-2xl border p-4 transition ${enabled ? "border-[#bcd3c2] bg-[#f1f7f2]" : "border-[#e1e7e2] bg-[#fafbf9]"}`}>
                                        <label className="flex cursor-pointer items-center gap-3"><input type="checkbox" name={item.enabled} checked={enabled} onChange={updateProfile} className="size-4 accent-[#4b8360]" /><span className={`grid size-8 place-items-center rounded-lg ${enabled ? "bg-[#dcecdf] text-[#3d7351]" : "bg-[#ecefed] text-[#7b8984]"}`}><AppIcon name={item.icon} className="size-4" /></span><span className="text-sm font-semibold text-[#345449]">{item.label}</span></label>
                                        {enabled && <div className="mt-4"><label htmlFor={item.hours} className="mb-1.5 block text-xs font-semibold text-[#60736a]">Hours per week</label><input id={item.hours} name={item.hours} type="number" min="0" max="168" step="0.5" value={profileForm[item.hours]} onChange={updateProfile} className={inputClass} /></div>}
                                    </div>
                                );
                            })}
                        </div>
                        {profileForm.has_organization_responsibility && <div className="mt-5"><FormField id="organization-role" label="Organization role"><input id="organization-role" name="organization_role" maxLength={200} value={profileForm.organization_role || ""} onChange={updateProfile} className={inputClass} placeholder="e.g. Vice President" /></FormField></div>}
                    </section>

                    <section className="rounded-[20px] border border-[#e0e7e2] bg-white p-6 shadow-[0_5px_20px_rgba(22,51,40,0.035)] sm:p-7">
                        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#edf4ee] text-[#47775a]"><AppIcon name="heart" className="size-5" /></span><div><h2 className="font-serif text-xl font-semibold text-[#173e30]">Wellness goals</h2><p className="mt-0.5 text-xs text-[#798881]">Choose up to 10 areas you want AnimoLog to support</p></div></div>
                        <div className="mt-6 flex flex-wrap gap-2.5">
                            {goals.map((goal) => {
                                const selected = profileForm.wellness_goals.includes(goal);
                                return <button key={goal} type="button" aria-pressed={selected} onClick={() => toggleGoal(goal)} className={`rounded-full border px-4 py-2 text-sm font-semibold transition ${selected ? "border-[#79a986] bg-[#e7f2e9] text-[#326748]" : "border-[#dce4de] bg-white text-[#687a72] hover:border-[#b8cbbd]"}`}>{selected && <span className="mr-1.5">✓</span>}{goal}</button>;
                            })}
                        </div>
                        <div className="mt-6"><FormField id="additional-context" label="Additional context" hint="Optional details that help explain your usual workload or schedule."><textarea id="additional-context" name="additional_context" rows={4} maxLength={2000} value={profileForm.additional_context || ""} onChange={updateProfile} className={`${inputClass} h-auto py-3`} /></FormField></div>
                    </section>

                    <div className="flex justify-end"><button type="submit" className="h-12 w-full rounded-xl bg-[#3f7854] px-7 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(37,89,58,0.2)] hover:bg-[#356c49] sm:w-auto">Save settings</button></div>
                </div>

                <aside className="space-y-6 xl:self-start">
                    <section className="rounded-[20px] border border-[#dce5df] bg-[#edf5ef] p-6">
                        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-full bg-[#d9eadc] text-[#39724e]"><AppIcon name="check" className="size-5" /></span><div><h2 className="font-serif text-lg font-semibold text-[#214a36]">Privacy consent</h2><p className="text-xs text-[#698075]">Active</p></div></div>
                        <dl className="mt-5 space-y-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-[#667972]">Notice version</dt><dd className="font-semibold text-[#2d5741]">{student.privacy_notice_version}</dd></div><div className="flex justify-between gap-4"><dt className="text-[#667972]">Accepted</dt><dd className="font-semibold text-[#2d5741]">{new Date(student.consented_at).toLocaleDateString("en-PH", { month: "short", day: "numeric", year: "numeric" })}</dd></div></dl>
                        <p className="mt-5 border-t border-[#cfdfd2] pt-4 text-xs leading-5 text-[#6f8178]">Only you can access your personal wellness data.</p>
                    </section>

                    <section className="rounded-[20px] border border-[#dce5df] bg-white p-6 shadow-[0_5px_20px_rgba(22,51,40,0.035)]">
                        <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#edf4ee] text-[#47775a]"><AppIcon name="download" className="size-5" /></span><div><h2 className="font-serif text-lg font-semibold text-[#173e30]">Export Wellness Summary</h2><p className="text-xs text-[#798881]">Your data, your choice</p></div></div>
                        <p className="mt-4 text-sm leading-6 text-[#718078]">You own your data. Export a personal wellness summary if you would like to share it with a counselor, adviser, or another trusted person.</p>
                        <button type="button" onClick={prepareWellnessSummaryExport} disabled={exporting} className="mt-5 inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#3f7854] px-4 text-sm font-semibold text-white shadow-[0_5px_14px_rgba(37,89,58,0.2)] hover:bg-[#356c49] disabled:cursor-wait disabled:opacity-70"><AppIcon name="download" className="size-4" /> {exporting ? "Preparing PDF..." : "Export Your Data (PDF)"}</button>
                        {exportPrepared && <p role="status" className="mt-3 text-xs leading-5 text-[#4b7359]">Your wellness summary PDF has been downloaded.</p>}
                        {exportError && <p role="alert" className="mt-3 text-xs leading-5 text-[#a24c45]">We could not create your PDF. Please try again.</p>}
                    </section>

                    <section className="rounded-[20px] border border-[#ecd4d0] bg-[#fffafa] p-6">
                        <h2 className="font-serif text-lg font-semibold text-[#713e39]">Session</h2>
                        <p className="mt-2 text-sm leading-6 text-[#8b6b67]">Signing out returns to the login screen.</p>
                        <button type="button" onClick={() => navigate("/")} className="mt-5 inline-flex h-10 w-full items-center justify-center gap-2 rounded-xl border border-[#e2bdb7] text-sm font-semibold text-[#9a4f47] hover:bg-[#fff0ee]"><AppIcon name="logout" className="size-4" /> Sign out</button>
                    </section>
                </aside>
            </form>
        </AppShell>
    );
}

export default Settings;
