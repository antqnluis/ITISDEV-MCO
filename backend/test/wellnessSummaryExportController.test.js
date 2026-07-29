const assert = require("node:assert/strict");
const test = require("node:test");

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";

const wellnessSummaryExportService = require("../src/services/wellnessSummaryExportService");
const wellnessSummaryExportController = require("../src/controllers/wellnessSummaryExportController");

function createResponse() {
    return {
        statusCode: null,
        body: null,
        headers: {},
        set(name, value) {
            this.headers[name] = value;
            return this;
        },
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

test("get returns the wellness summary and prevents response caching", { concurrency: false }, async () => {
    const original = wellnessSummaryExportService.getWellnessSummary;
    const summary = { generated_at: "2026-07-27T04:00:00.000Z" };

    try {
        wellnessSummaryExportService.getWellnessSummary = async (supabase, user) => {
            assert.equal(supabase, "student-client");
            assert.deepEqual(user, {
                id: "student-id",
                email: "student@example.com"
            });
            return summary;
        };
        const res = createResponse();

        await wellnessSummaryExportController.get({
            supabase: "student-client",
            user: {
                id: "student-id",
                email: "student@example.com"
            }
        }, res);

        assert.equal(res.statusCode, 200);
        assert.equal(res.headers["Cache-Control"], "no-store");
        assert.deepEqual(res.body, {
            success: true,
            wellnessSummary: summary
        });
    } finally {
        wellnessSummaryExportService.getWellnessSummary = original;
    }
});

test("get preserves service error statuses without exposing unknown errors", { concurrency: false }, async () => {
    const original = wellnessSummaryExportService.getWellnessSummary;

    try {
        wellnessSummaryExportService.getWellnessSummary = async () => {
            const error = new Error("Student profile not found");
            error.statusCode = 404;
            throw error;
        };
        const missingResponse = createResponse();
        await wellnessSummaryExportController.get({
            supabase: "student-client",
            user: { id: "student-id" }
        }, missingResponse);

        assert.equal(missingResponse.statusCode, 404);
        assert.deepEqual(missingResponse.body, {
            success: false,
            message: "Student profile not found"
        });
        assert.equal(missingResponse.headers["Cache-Control"], "no-store");

        wellnessSummaryExportService.getWellnessSummary = async () => {
            throw new Error("sensitive database detail");
        };
        const failingResponse = createResponse();
        await wellnessSummaryExportController.get({
            supabase: "student-client",
            user: { id: "student-id" }
        }, failingResponse);

        assert.equal(failingResponse.statusCode, 500);
        assert.deepEqual(failingResponse.body, {
            success: false,
            message: "Server error"
        });
    } finally {
        wellnessSummaryExportService.getWellnessSummary = original;
    }
});
