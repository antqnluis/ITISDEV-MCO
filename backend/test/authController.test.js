const assert = require("node:assert/strict");
const test = require("node:test");

process.env.SUPABASE_URL ||= "https://example.supabase.co";
process.env.SUPABASE_ANON_KEY ||= "test-anon-key";

const authService = require("../src/services/authService");
const authController = require("../src/controllers/authController");

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

test("updateMe returns the authenticated student's updated account", { concurrency: false }, async () => {
    const original = authService.updateCurrentStudent;
    const student = {
        id: "student-id",
        first_name: "Jamie",
        last_name: "Reyes"
    };

    try {
        authService.updateCurrentStudent = async (supabase, studentId, payload) => {
            assert.equal(supabase, "student-client");
            assert.equal(studentId, "student-id");
            assert.deepEqual(payload, {
                first_name: "Jamie",
                last_name: "Reyes"
            });
            return student;
        };
        const res = createResponse();

        await authController.updateMe({
            supabase: "student-client",
            user: { id: "student-id" },
            body: {
                first_name: "Jamie",
                last_name: "Reyes"
            }
        }, res);

        assert.equal(res.statusCode, 200);
        assert.deepEqual(res.body, {
            success: true,
            student
        });
    } finally {
        authService.updateCurrentStudent = original;
    }
});

test("updateMe preserves known errors and hides unknown failures", { concurrency: false }, async () => {
    const original = authService.updateCurrentStudent;

    try {
        authService.updateCurrentStudent = async () => {
            const error = new Error("Student record not found");
            error.statusCode = 404;
            throw error;
        };
        const missingResponse = createResponse();
        await authController.updateMe({
            supabase: "student-client",
            user: { id: "student-id" },
            body: {}
        }, missingResponse);
        assert.equal(missingResponse.statusCode, 404);
        assert.deepEqual(missingResponse.body, {
            success: false,
            message: "Student record not found"
        });

        authService.updateCurrentStudent = async () => {
            throw new Error("sensitive database detail");
        };
        const failingResponse = createResponse();
        await authController.updateMe({
            supabase: "student-client",
            user: { id: "student-id" },
            body: {}
        }, failingResponse);
        assert.equal(failingResponse.statusCode, 500);
        assert.deepEqual(failingResponse.body, {
            success: false,
            message: "Server error"
        });
    } finally {
        authService.updateCurrentStudent = original;
    }
});
