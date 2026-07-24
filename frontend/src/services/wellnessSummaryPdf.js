const PAGE_MARGIN = 48;
const CONTENT_WIDTH = 499;
const BODY_COLOR = [57, 80, 68];
const MUTED_COLOR = [105, 125, 115];
const GREEN = [50, 104, 72];

function formatDate(value, options = { month: "long", day: "numeric", year: "numeric" }) {
    if (!value) return "Not available";
    return new Date(value).toLocaleDateString("en-PH", options);
}

function formatWeek(value) {
    if (!value) return "Not available";
    const start = new Date(`${value}T00:00:00`);
    const end = new Date(start);
    end.setDate(end.getDate() + 6);
    return `${formatDate(start, { month: "short", day: "numeric" })} - ${formatDate(end, { month: "short", day: "numeric", year: "numeric" })}`;
}

function getLatestCheckIn(checkIns) {
    return [...checkIns].sort((a, b) => new Date(b.submitted_at || b.week_start) - new Date(a.submitted_at || a.week_start))[0] || null;
}

function getWellnessIndex(checkIn) {
    if (!checkIn) return null;
    const ratings = [
        6 - checkIn.stress_level,
        checkIn.mood_level,
        checkIn.sleep_quality,
        checkIn.motivation_level,
        6 - checkIn.burnout_level,
        checkIn.energy_level,
    ].filter(Number.isFinite);
    return ratings.length ? Math.round((ratings.reduce((total, value) => total + value, 0) / (ratings.length * 5)) * 100) : null;
}

function getStressSeverity(stressLevel) {
    return ["Not available", "Low", "Mild", "Moderate", "High", "Severe"][stressLevel] || "Not available";
}

function getPrimaryStressContext(latestCheckIn, dimensionScores) {
    if (!latestCheckIn) return "Not available";
    const score = dimensionScores.find((item) => item.check_in_id === latestCheckIn.id);
    if (!score) return "No calculated context available";

    const contexts = [
        ["Academic engagement", score.academic_engagement_score],
        ["Personal wellbeing", score.personal_wellbeing_score],
        ["Logistical load", score.logistical_load_score],
        ["Role load", score.role_load_score],
        ["Course environment", score.course_environment_score],
    ].filter(([, value]) => Number.isFinite(value));
    const [label, value] = contexts.sort(([, left], [, right]) => right - left)[0] || [];
    return label ? `${label} (${value}/100 calculated risk)` : "No calculated context available";
}

function getResponsibilities(profile) {
    return [
        profile.is_employed && `Part-time work: ${profile.work_hours_per_week || 0} hours/week`,
        profile.has_ojt && `OJT / internship: ${profile.ojt_hours_per_week || 0} hours/week`,
        profile.is_athlete && `Athletics: ${profile.athlete_hours_per_week || 0} hours/week`,
        profile.has_caregiving_responsibility && `Caregiving: ${profile.caregiving_hours_per_week || 0} hours/week`,
        profile.has_organization_responsibility && `Student organization${profile.organization_role ? ` (${profile.organization_role})` : ""}: ${profile.organization_hours_per_week || 0} hours/week`,
    ].filter(Boolean);
}

function createFilename(student, generatedAt) {
    const name = `${student.first_name || "student"}-${student.last_name || "wellness"}`.toLowerCase().replace(/[^a-z0-9]+/g, "-");
    return `${name}-wellness-summary-${generatedAt.slice(0, 10)}.pdf`;
}

export async function createWellnessSummaryPdf(data) {
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF({ unit: "pt", format: "a4" });
    const latestCheckIn = getLatestCheckIn(data.check_ins || []);
    const wellnessIndex = getWellnessIndex(latestCheckIn);
    const responsibilities = getResponsibilities(data.profile);
    let y = 0;

    function addPageHeader() {
        doc.setFillColor(...GREEN);
        doc.rect(0, 0, 595, 96, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(19);
        doc.text("AnimoLog", PAGE_MARGIN, 43);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(11);
        doc.text("Personal Wellness Summary", PAGE_MARGIN, 65);
        doc.setFontSize(8.5);
        doc.text("Student-owned export for voluntary sharing", PAGE_MARGIN, 80);
        y = 126;
    }

    function ensureSpace(height) {
        if (y + height <= 770) return;
        doc.addPage();
        addPageHeader();
    }

    function addSection(title) {
        ensureSpace(32);
        doc.setTextColor(...GREEN);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(12);
        doc.text(title, PAGE_MARGIN, y);
        doc.setDrawColor(210, 224, 214);
        doc.line(PAGE_MARGIN, y + 8, PAGE_MARGIN + CONTENT_WIDTH, y + 8);
        y += 27;
    }

    function addKeyValues(items) {
        const columnWidth = 238;
        items.forEach(([label, value], index) => {
            const column = index % 2;
            if (column === 0) ensureSpace(44);
            const x = PAGE_MARGIN + column * (columnWidth + 23);
            const text = doc.splitTextToSize(String(value || "Not available"), columnWidth);
            doc.setTextColor(...MUTED_COLOR);
            doc.setFont("helvetica", "bold");
            doc.setFontSize(8);
            doc.text(label.toUpperCase(), x, y);
            doc.setTextColor(...BODY_COLOR);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text(text, x, y + 15);
            if (column === 1 || index === items.length - 1) y += Math.max(42, text.length * 12 + 27);
        });
    }

    function addParagraph(text) {
        const lines = doc.splitTextToSize(text || "Not provided.", CONTENT_WIDTH);
        ensureSpace(lines.length * 13 + 8);
        doc.setTextColor(...BODY_COLOR);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(10);
        doc.text(lines, PAGE_MARGIN, y);
        y += lines.length * 13 + 8;
    }

    function addList(items, fallback) {
        if (!items.length) {
            addParagraph(fallback);
            return;
        }
        items.forEach((item) => {
            const lines = doc.splitTextToSize(item, CONTENT_WIDTH - 16);
            ensureSpace(lines.length * 13 + 4);
            doc.setFillColor(...GREEN);
            doc.circle(PAGE_MARGIN + 4, y - 3, 2, "F");
            doc.setTextColor(...BODY_COLOR);
            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text(lines, PAGE_MARGIN + 16, y);
            y += lines.length * 13 + 4;
        });
    }

    addPageHeader();
    doc.setTextColor(...MUTED_COLOR);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.text(`Generated ${formatDate(data.generated_at)}`, PAGE_MARGIN, y);
    y += 28;

    addSection("Student information");
    addKeyValues([
        ["Name", `${data.student.first_name} ${data.student.last_name}`],
        ["Student number", data.student.student_number],
        ["Email", data.student.email],
        ["Export date", formatDate(data.generated_at)],
    ]);

    addSection("Academic profile");
    addKeyValues([
        ["College", data.profile.college],
        ["Program", data.profile.program],
        ["Year level", `Year ${data.profile.year_level}`],
        ["Current academic term", `Term ${data.profile.current_academic_term}`],
        ["Daily commute", `${data.profile.commute_minutes_per_day || 0} minutes`],
        ["Available study time", `${data.profile.available_study_hours_per_week || 0} hours/week`],
    ]);

    addSection("Wellness goals");
    addList(data.profile.wellness_goals || [], "No wellness goals selected.");

    addSection("Recurring responsibilities");
    addList(responsibilities, "No recurring responsibilities recorded.");

    addSection("Additional context");
    addParagraph(data.profile.additional_context);

    addSection("Latest weekly wellness summary");
    if (latestCheckIn) {
        addKeyValues([
            ["Week of", formatWeek(latestCheckIn.week_start)],
            ["Submitted", formatDate(latestCheckIn.submitted_at)],
            ["Stress", `${latestCheckIn.stress_level}/5`],
            ["Mood", `${latestCheckIn.mood_level}/5`],
            ["Sleep quality", `${latestCheckIn.sleep_quality}/5`],
            ["Motivation", `${latestCheckIn.motivation_level}/5`],
            ["Burnout", `${latestCheckIn.burnout_level}/5`],
            ["Energy", `${latestCheckIn.energy_level}/5`],
            ["Available study time", `${latestCheckIn.available_study_hours || 0} hours`],
        ]);
        doc.setTextColor(...MUTED_COLOR);
        doc.setFont("helvetica", "bold");
        doc.setFontSize(8);
        doc.text("STUDENT REFLECTION", PAGE_MARGIN, y);
        y += 15;
        addParagraph(latestCheckIn.reflection || "No reflection was added.");
    } else {
        addParagraph("No weekly wellness summary is available yet.");
    }

    addSection("Wellness indicators");
    addKeyValues([
        ["Student Wellness Index", wellnessIndex === null ? "Not available" : `${wellnessIndex}/100`],
        ["Stress Severity Level", getStressSeverity(latestCheckIn?.stress_level)],
        ["Primary Stress Context", getPrimaryStressContext(latestCheckIn, data.dimension_scores || [])],
    ]);

    ensureSpace(52);
    doc.setFillColor(237, 245, 239);
    doc.roundedRect(PAGE_MARGIN, y, CONTENT_WIDTH, 42, 8, 8, "F");
    doc.setTextColor(...MUTED_COLOR);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    const note = doc.splitTextToSize("This student-owned summary is intended for voluntary sharing with university support services or another trusted person. It is not a clinical assessment or diagnosis.", CONTENT_WIDTH - 24);
    doc.text(note, PAGE_MARGIN + 12, y + 16);

    const pageCount = doc.getNumberOfPages();
    for (let page = 1; page <= pageCount; page += 1) {
        doc.setPage(page);
        doc.setTextColor(...MUTED_COLOR);
        doc.setFontSize(8);
        doc.text(`AnimoLog personal wellness summary - Page ${page} of ${pageCount}`, PAGE_MARGIN, 812);
    }

    return doc;
}

export async function downloadWellnessSummaryPdf(data) {
    const document = await createWellnessSummaryPdf(data);
    document.save(createFilename(data.student, data.generated_at));
}
