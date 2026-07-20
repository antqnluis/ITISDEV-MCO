const assert = require("node:assert/strict");
const test = require("node:test");

const { requireConsent } = require("../src/middleware/consentMiddleware");

function createRequest(result) {
    const filters = [];
    const request = {
        select(fields) {
            assert.equal(fields, "id, consent_given, privacy_notice_version");
            return request;
        },
        eq(field, value) {
            filters.push([field, value]);
            return request;
        },
        maybeSingle: async () => result
    };

    return {
        filters,
        req: {
            user: { id: "student-id" },
            supabase: {
                from(table) {
                    assert.equal(table, "students");
                    return request;
                }
            }
        }
    };
}

function createResponse() {
    return {
        statusCode: null,
        body: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(body) {
            this.body = body;
            return this;
        }
    };
}

test("requireConsent allows the current privacy-notice version", async () => {
    const { req, filters } = createRequest({
        data: {
            id: "student-id",
            consent_given: true,
            privacy_notice_version: "v1.0"
        },
        error: null
    });
    const res = createResponse();
    let nextCalled = false;

    await requireConsent(req, res, () => {
        nextCalled = true;
    });

    assert.equal(nextCalled, true);
    assert.deepEqual(filters, [["id", "student-id"]]);
    assert.equal(res.statusCode, null);
});

test("requireConsent rejects missing, declined, and outdated consent", async () => {
    const cases = [
        { consent_given: false, privacy_notice_version: null },
        { consent_given: true, privacy_notice_version: "v0.9" }
    ];

    for (const consent of cases) {
        const { req } = createRequest({ data: { id: "student-id", ...consent }, error: null });
        const res = createResponse();
        let nextCalled = false;

        await requireConsent(req, res, () => {
            nextCalled = true;
        });

        assert.equal(nextCalled, false);
        assert.equal(res.statusCode, 403);
        assert.deepEqual(res.body, {
            success: false,
            message: "Current privacy consent is required"
        });
    }
});

test("requireConsent reports missing students and database failures", async () => {
    const missing = createRequest({ data: null, error: null });
    const missingResponse = createResponse();
    await requireConsent(missing.req, missingResponse, () => {});
    assert.equal(missingResponse.statusCode, 404);
    assert.equal(missingResponse.body.message, "Student record not found");

    const failing = createRequest({ data: null, error: new Error("database unavailable") });
    const failingResponse = createResponse();
    await requireConsent(failing.req, failingResponse, () => {});
    assert.equal(failingResponse.statusCode, 500);
    assert.equal(failingResponse.body.message, "Unable to verify privacy consent");

    const thrownResponse = createResponse();
    await requireConsent({
        user: { id: "student-id" },
        supabase: {
            from() {
                throw new Error("client unavailable");
            }
        }
    }, thrownResponse, () => {});
    assert.equal(thrownResponse.statusCode, 500);
    assert.equal(thrownResponse.body.message, "Unable to verify privacy consent");
});
