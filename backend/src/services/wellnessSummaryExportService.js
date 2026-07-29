const authService = require("./authService");
const profileService = require("./profileService");
const weeklyCheckInService = require("./weeklyCheckInService");
const wellnessDimensionScoreService = require("./wellnessDimensionScoreService");

async function getWellnessSummary(supabase, user, { now = new Date() } = {}) {
    const [student, profile, checkIns] = await Promise.all([
        authService.getCurrentStudent(supabase, user.id),
        profileService.getProfile(supabase, user.id),
        weeklyCheckInService.listCheckIns(supabase, user.id)
    ]);

    const latestCheckIn = checkIns[0] || null;
    let dimensionScores = [];

    if (latestCheckIn) {
        const result = await wellnessDimensionScoreService.listWellnessDimensionScores(
            supabase,
            user.id,
            {
                limit: "1",
                offset: "0",
                check_in_id: latestCheckIn.id
            }
        );
        dimensionScores = result.wellnessDimensionScores || [];
    }

    return {
        generated_at: now.toISOString(),
        student: {
            first_name: student.first_name,
            last_name: student.last_name,
            student_number: student.student_number,
            email: user.email
        },
        profile,
        check_ins: latestCheckIn ? [latestCheckIn] : [],
        dimension_scores: dimensionScores
    };
}

module.exports = {
    getWellnessSummary
};
