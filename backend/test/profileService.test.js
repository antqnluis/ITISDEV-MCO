// dont mind me im a test function

const assert = require("node:assert/strict");
const test = require("node:test");

const {
    createProfile,
    getProfile,
    updateProfile,
    deleteProfile
} = require("../src/services/profileService");

const baseProfile = {
    id: "profile-id",
    student_id: "student-id",
    college: "College of Computing",
    program: "BSIT",
    year_level: 3,
    current_academic_term: 1,
    wellness_goals: ["Managing Stress"],
    commute_minutes_per_day: 30,
    available_study_hours_per_week: 10,
    has_caregiving_responsibility: false,
    caregiving_hours_per_week: 0,
    is_employed: false,
    work_hours_per_week: 0,
    has_ojt: false,
    ojt_hours_per_week: 0,
    is_athlete: false,
    athlete_hours_per_week: 0,
    has_organization_responsibility: false,
    organization_role: null,
    organization_hours_per_week: 0,
    additional_context: null,
    onboarding_completed_at: "2026-07-11T00:00:00.000Z"
};

test("createProfile uses the authenticated student ID and sets onboarding completion", async () => {
    let insertedProfile;
    const supabase = {
        from: (table) => {
            assert.equal(table, "student_profiles");
            return {
                insert: (profile) => {
                    insertedProfile = profile;
                    return {
                        select: () => ({
                            single: async () => ({
                                data: { ...baseProfile, ...profile },
                                error: null
                            })
                        })
                    };
                }
            };
        }
    };

    const profile = await createProfile(supabase, "student-id", {
        college: " College of Computing ",
        program: " BSIT ",
        year_level: 3,
        current_academic_term: 1,
        wellness_goals: [" Managing Stress ", "Better Sleep"],
        is_employed: true,
        work_hours_per_week: 12
    });

    assert.equal(insertedProfile.student_id, "student-id");
    assert.equal(insertedProfile.college, "College of Computing");
    assert.equal(insertedProfile.program, "BSIT");
    assert.equal(insertedProfile.current_academic_term, 1);
    assert.deepEqual(insertedProfile.wellness_goals, ["Managing Stress", "Better Sleep"]);
    assert.equal(insertedProfile.work_hours_per_week, 12);
    assert.ok(Number.isFinite(Date.parse(insertedProfile.onboarding_completed_at)));
    assert.equal(profile.student_id, "student-id");
});

test("createProfile rejects invalid and duplicate profiles", async () => {
    await assert.rejects(
        createProfile({}, "student-id", {
            college: "College of Computing",
            program: "BSIT",
            year_level: 7,
            current_academic_term: 1
        }),
        (error) => error.statusCode === 400 && error.message.includes("year_level")
    );

    const duplicateSupabase = {
        from: () => ({
            insert: () => ({
                select: () => ({
                    single: async () => ({ data: null, error: { code: "23505" } })
                })
            })
        })
    };

    await assert.rejects(
        createProfile(duplicateSupabase, "student-id", {
            college: "College of Computing",
            program: "BSIT",
            year_level: 3,
            current_academic_term: 1
        }),
        (error) => error.statusCode === 409
    );
});

test("createProfile requires a valid academic term and defaults wellness goals", async () => {
    await assert.rejects(
        createProfile({}, "student-id", {
            college: "College of Computing",
            program: "BSIT",
            year_level: 3
        }),
        (error) => error.statusCode === 400 && error.message.includes("current_academic_term")
    );
    await assert.rejects(
        createProfile({}, "student-id", {
            college: "College of Computing",
            program: "BSIT",
            year_level: 3,
            current_academic_term: 4
        }),
        (error) => error.statusCode === 400 && error.message.includes("between 1 and 3")
    );

    let insertedProfile;
    const supabase = {
        from: () => ({
            insert: (profile) => {
                insertedProfile = profile;
                return {
                    select: () => ({
                        single: async () => ({ data: profile, error: null })
                    })
                };
            }
        })
    };
    await createProfile(supabase, "student-id", {
        college: "College of Computing",
        program: "BSIT",
        year_level: 3,
        current_academic_term: 1
    });

    assert.deepEqual(insertedProfile.wellness_goals, []);
});

test("profile writes reject malformed wellness goals", async () => {
    const requiredProfile = {
        college: "College of Computing",
        program: "BSIT",
        year_level: 3,
        current_academic_term: 1
    };

    await assert.rejects(
        createProfile({}, "student-id", { ...requiredProfile, wellness_goals: "Managing Stress" }),
        (error) => error.statusCode === 400 && error.message.includes("array")
    );
    await assert.rejects(
        createProfile({}, "student-id", { ...requiredProfile, wellness_goals: [" "] }),
        (error) => error.statusCode === 400 && error.message.includes("non-empty strings")
    );
    await assert.rejects(
        createProfile({}, "student-id", {
            ...requiredProfile,
            wellness_goals: Array.from({ length: 11 }, (_, index) => `Goal ${index}`)
        }),
        (error) => error.statusCode === 400 && error.message.includes("at most 10")
    );
});

test("getProfile scopes the query to the authenticated student", async () => {
    let requestedStudentId;
    const supabase = {
        from: (table) => {
            assert.equal(table, "student_profiles");
            return {
                select: () => ({
                    eq: (field, value) => {
                        assert.equal(field, "student_id");
                        requestedStudentId = value;
                        return {
                            maybeSingle: async () => ({ data: baseProfile, error: null })
                        };
                    }
                })
            };
        }
    };

    const profile = await getProfile(supabase, "student-id");

    assert.equal(requestedStudentId, "student-id");
    assert.equal(profile.id, "profile-id");
});

test("updateProfile validates fields and updates only the caller's profile", async () => {
    let updateValues;
    let updatedStudentId;
    let callCount = 0;
    const supabase = {
        from: () => {
            callCount += 1;

            if (callCount === 1) {
                return {
                    select: () => ({
                        eq: () => ({
                            maybeSingle: async () => ({ data: baseProfile, error: null })
                        })
                    })
                };
            }

            return {
                update: (values) => {
                    updateValues = values;
                    return {
                        eq: (field, value) => {
                            assert.equal(field, "student_id");
                            updatedStudentId = value;
                            return {
                                select: () => ({
                                    maybeSingle: async () => ({
                                        data: { ...baseProfile, ...values },
                                        error: null
                                    })
                                })
                            };
                        }
                    };
                }
            };
        }
    };

    const profile = await updateProfile(supabase, "student-id", {
        is_employed: true,
        work_hours_per_week: 16,
        current_academic_term: 2,
        wellness_goals: [" Managing Workload "],
        additional_context: "Taking a part-time job this term"
    });

    assert.deepEqual(updateValues, {
        is_employed: true,
        work_hours_per_week: 16,
        current_academic_term: 2,
        wellness_goals: ["Managing Workload"],
        additional_context: "Taking a part-time job this term"
    });
    assert.equal(updatedStudentId, "student-id");
    assert.equal(profile.work_hours_per_week, 16);
});

test("updateProfile rejects an organization role when the responsibility is disabled", async () => {
    const supabase = {
        from: () => ({
            select: () => ({
                eq: () => ({
                    maybeSingle: async () => ({ data: baseProfile, error: null })
                })
            })
        })
    };

    await assert.rejects(
        updateProfile(supabase, "student-id", {
            organization_role: "President"
        }),
        (error) => error.statusCode === 400
            && error.message.includes("has_organization_responsibility")
    );
});

test("deleteProfile deletes only the authenticated student's profile", async () => {
    let deletedStudentId;
    const supabase = {
        from: (table) => {
            assert.equal(table, "student_profiles");
            return {
                delete: () => ({
                    eq: (field, value) => {
                        assert.equal(field, "student_id");
                        deletedStudentId = value;
                        return {
                            select: () => ({
                                maybeSingle: async () => ({ data: { id: "profile-id" }, error: null })
                            })
                        };
                    }
                })
            };
        }
    };

    await deleteProfile(supabase, "student-id");

    assert.equal(deletedStudentId, "student-id");
});

test("deleteProfile reports missing profiles and database failures", async () => {
    const missingProfileSupabase = {
        from: () => ({
            delete: () => ({
                eq: () => ({
                    select: () => ({
                        maybeSingle: async () => ({ data: null, error: null })
                    })
                })
            })
        })
    };
    const failedSupabase = {
        from: () => ({
            delete: () => ({
                eq: () => ({
                    select: () => ({
                        maybeSingle: async () => ({ data: null, error: { message: "Database unavailable" } })
                    })
                })
            })
        })
    };

    await assert.rejects(
        deleteProfile(missingProfileSupabase, "student-id"),
        (error) => error.statusCode === 404 && error.message === "Student profile not found"
    );
    await assert.rejects(
        deleteProfile(failedSupabase, "student-id"),
        (error) => error.statusCode === 500 && error.message === "Unable to delete the student profile"
    );
});
