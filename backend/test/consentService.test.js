const assert = require("node:assert/strict");
const test = require("node:test");

const {
    PRIVACY_NOTICE_VERSION,
    acceptConsent
} = require("../src/services/consentService");

test("acceptConsent records the hardcoded notice version for the authenticated student", async () => {
    let updateValues;
    let requestedStudentId;
    let requestedFields;
    const supabase = {
        from: (table) => {
            assert.equal(table, "students");
            return {
                update: (values) => {
                    updateValues = values;
                    return {
                        eq: (field, value) => {
                            assert.equal(field, "id");
                            requestedStudentId = value;
                            return {
                                select: (fields) => {
                                    requestedFields = fields;
                                    return {
                                        maybeSingle: async () => ({
                                            data: {
                                                id: "student-id",
                                                student_number: "20240001",
                                                ...values
                                            },
                                            error: null
                                        })
                                    };
                                }
                            };
                        }
                    };
                }
            };
        }
    };

    const student = await acceptConsent(supabase, "student-id", { consent: true });

    assert.equal(requestedStudentId, "student-id");
    assert.equal(updateValues.consent_given, true);
    assert.equal(updateValues.privacy_notice_version, PRIVACY_NOTICE_VERSION);
    assert.ok(Number.isFinite(Date.parse(updateValues.consented_at)));
    assert.match(requestedFields, /consent_given/);
    assert.equal(student.privacy_notice_version, "v1.0");
});

test("acceptConsent requires an explicit and unambiguous acceptance payload", async () => {
    for (const payload of [undefined, null, {}, { consent: false }, { consent: true, extra: true }]) {
        await assert.rejects(
            acceptConsent({}, "student-id", payload),
            (error) => error.statusCode === 400 && error.message.includes("consent")
        );
    }
});

test("acceptConsent reports a missing student record and database errors", async () => {
    const missingStudentSupabase = {
        from: () => ({
            update: () => ({
                eq: () => ({
                    select: () => ({
                        maybeSingle: async () => ({ data: null, error: null })
                    })
                })
            })
        })
    };
    const failingSupabase = {
        from: () => ({
            update: () => ({
                eq: () => ({
                    select: () => ({
                        maybeSingle: async () => ({ data: null, error: new Error("database unavailable") })
                    })
                })
            })
        })
    };

    await assert.rejects(
        acceptConsent(missingStudentSupabase, "student-id", { consent: true }),
        (error) => error.statusCode === 404 && error.message === "Student record not found"
    );
    await assert.rejects(
        acceptConsent(failingSupabase, "student-id", { consent: true }),
        (error) => error.statusCode === 500 && error.message === "Unable to record consent"
    );
});
