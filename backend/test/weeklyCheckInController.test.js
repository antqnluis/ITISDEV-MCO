const assert = require("node:assert/strict");
const test = require("node:test");

const weeklyCheckInService = require("../src/services/weeklyCheckInService");
const weeklyCheckInController = require("../src/controllers/weeklyCheckInController");

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

test("current returns a frontend-friendly completion status", { concurrency: false }, async () => {
    const original = weeklyCheckInService.getCurrentCheckIn;
    const checkIn = { id: "check-in-id", week_start: "2026-07-20" };

    try {
        weeklyCheckInService.getCurrentCheckIn = async (supabase, studentId) => {
            assert.equal(supabase, "student-client");
            assert.equal(studentId, "student-id");
            return { weekStart: "2026-07-20", checkIn };
        };

        const completedResponse = createResponse();
        await weeklyCheckInController.current({
            supabase: "student-client",
            user: { id: "student-id" }
        }, completedResponse);
        assert.equal(completedResponse.statusCode, 200);
        assert.deepEqual(completedResponse.body, {
            success: true,
            weekStart: "2026-07-20",
            completed: true,
            checkIn
        });

        weeklyCheckInService.getCurrentCheckIn = async () => ({
            weekStart: "2026-07-20",
            checkIn: null
        });
        const incompleteResponse = createResponse();
        await weeklyCheckInController.current({
            supabase: "student-client",
            user: { id: "student-id" }
        }, incompleteResponse);
        assert.deepEqual(incompleteResponse.body, {
            success: true,
            weekStart: "2026-07-20",
            completed: false,
            checkIn: null
        });
    } finally {
        weeklyCheckInService.getCurrentCheckIn = original;
    }
});

test("current maps service failures to the API error response", { concurrency: false }, async () => {
    const original = weeklyCheckInService.getCurrentCheckIn;

    try {
        weeklyCheckInService.getCurrentCheckIn = async () => {
            const error = new Error("Unable to retrieve the current weekly check-in");
            error.statusCode = 500;
            throw error;
        };
        const res = createResponse();

        await weeklyCheckInController.current({
            supabase: "student-client",
            user: { id: "student-id" }
        }, res);

        assert.equal(res.statusCode, 500);
        assert.deepEqual(res.body, {
            success: false,
            message: "Unable to retrieve the current weekly check-in"
        });
    } finally {
        weeklyCheckInService.getCurrentCheckIn = original;
    }
});
