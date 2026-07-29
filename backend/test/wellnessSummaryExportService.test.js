const assert = require("node:assert/strict");
const test = require("node:test");

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";

const authService = require("../src/services/authService");
const profileService = require("../src/services/profileService");
const weeklyCheckInService = require("../src/services/weeklyCheckInService");
const wellnessDimensionScoreService = require("../src/services/wellnessDimensionScoreService");
const wellnessSummaryExportService = require("../src/services/wellnessSummaryExportService");

function preserveServiceFunctions() {
    return {
        getCurrentStudent: authService.getCurrentStudent,
        getProfile: profileService.getProfile,
        listCheckIns: weeklyCheckInService.listCheckIns,
        listWellnessDimensionScores: wellnessDimensionScoreService.listWellnessDimensionScores
    };
}

function restoreServiceFunctions(originals) {
    authService.getCurrentStudent = originals.getCurrentStudent;
    profileService.getProfile = originals.getProfile;
    weeklyCheckInService.listCheckIns = originals.listCheckIns;
    wellnessDimensionScoreService.listWellnessDimensionScores =
        originals.listWellnessDimensionScores;
}

test("getWellnessSummary returns an allow-listed current summary for the authenticated student", { concurrency: false }, async () => {
    const originals = preserveServiceFunctions();
    const user = { id: "student-id", email: "student@example.com" };
    const profile = { id: "profile-id", student_id: user.id, college: "CCS" };
    const latestCheckIn = {
        id: "check-in-latest",
        student_id: user.id,
        week_start: "2026-07-20"
    };
    const olderCheckIn = {
        id: "check-in-older",
        student_id: user.id,
        week_start: "2026-07-13"
    };
    const dimensionScore = {
        id: "score-id",
        student_id: user.id,
        check_in_id: latestCheckIn.id
    };

    try {
        authService.getCurrentStudent = async (supabase, studentId) => {
            assert.equal(supabase, "student-client");
            assert.equal(studentId, user.id);
            return {
                id: user.id,
                first_name: "Jamie",
                last_name: "Student",
                student_number: "12345678",
                consent_given: true,
                privacy_notice_version: "v1.0"
            };
        };
        profileService.getProfile = async (supabase, studentId) => {
            assert.equal(supabase, "student-client");
            assert.equal(studentId, user.id);
            return profile;
        };
        weeklyCheckInService.listCheckIns = async (supabase, studentId) => {
            assert.equal(supabase, "student-client");
            assert.equal(studentId, user.id);
            return [latestCheckIn, olderCheckIn];
        };
        wellnessDimensionScoreService.listWellnessDimensionScores =
            async (supabase, studentId, query) => {
                assert.equal(supabase, "student-client");
                assert.equal(studentId, user.id);
                assert.deepEqual(query, {
                    limit: "1",
                    offset: "0",
                    check_in_id: latestCheckIn.id
                });
                return {
                    wellnessDimensionScores: [dimensionScore],
                    pagination: { has_more: false }
                };
            };

        const summary = await wellnessSummaryExportService.getWellnessSummary(
            "student-client",
            user,
            { now: new Date("2026-07-27T04:00:00.000Z") }
        );

        assert.deepEqual(summary, {
            generated_at: "2026-07-27T04:00:00.000Z",
            student: {
                first_name: "Jamie",
                last_name: "Student",
                student_number: "12345678",
                email: user.email
            },
            profile,
            check_ins: [latestCheckIn],
            dimension_scores: [dimensionScore]
        });
        assert.equal("consent_given" in summary.student, false);
        assert.equal("id" in summary.student, false);
    } finally {
        restoreServiceFunctions(originals);
    }
});

test("getWellnessSummary succeeds without check-ins and skips the score query", { concurrency: false }, async () => {
    const originals = preserveServiceFunctions();
    let scoreQueryCalled = false;

    try {
        authService.getCurrentStudent = async () => ({
            first_name: "Jamie",
            last_name: "Student",
            student_number: "12345678"
        });
        profileService.getProfile = async () => ({ college: "CCS" });
        weeklyCheckInService.listCheckIns = async () => [];
        wellnessDimensionScoreService.listWellnessDimensionScores = async () => {
            scoreQueryCalled = true;
            return { wellnessDimensionScores: [] };
        };

        const summary = await wellnessSummaryExportService.getWellnessSummary(
            "student-client",
            { id: "student-id", email: "student@example.com" }
        );

        assert.deepEqual(summary.check_ins, []);
        assert.deepEqual(summary.dimension_scores, []);
        assert.equal(scoreQueryCalled, false);
    } finally {
        restoreServiceFunctions(originals);
    }
});
