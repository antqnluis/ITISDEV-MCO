const test = require("node:test");
const assert = require("node:assert/strict");
const {
    analyzeCheckIn,
    loadOpenAIClient
} = require("../src/routes/AI_analysis");

function createResponse() {
    return {
        statusCode: null,
        payload: null,
        status(code) {
            this.statusCode = code;
            return this;
        },
        json(payload) {
            this.payload = payload;
            return this;
        }
    };
}

test("the AI route module loads without the OpenAI package", () => {
    assert.equal(typeof analyzeCheckIn, "function");
    assert.equal(typeof loadOpenAIClient, "function");
});

test("the lazy OpenAI loader reports an unavailable dependency", () => {
    const previousApiKey = process.env.OPENAI_API_KEY;
    process.env.OPENAI_API_KEY = "test-api-key";

    try {
        assert.throws(
            () => loadOpenAIClient(() => {
                const error = new Error("Cannot find module 'openai'");
                error.code = "MODULE_NOT_FOUND";
                throw error;
            }),
            (error) => error.statusCode === 503
                && error.message === "AI analysis is currently unavailable"
        );
    } finally {
        if (previousApiKey === undefined) {
            delete process.env.OPENAI_API_KEY;
        } else {
            process.env.OPENAI_API_KEY = previousApiKey;
        }
    }
});

test("the analysis handler returns 503 when OpenAI is not configured", async () => {
    const previousApiKey = process.env.OPENAI_API_KEY;
    delete process.env.OPENAI_API_KEY;
    const response = createResponse();

    try {
        const result = await analyzeCheckIn({ body: {} }, response);

        assert.equal(response.statusCode, 503);
        assert.deepEqual(response.payload, {
            success: false,
            message: "AI analysis is currently unavailable"
        });
        assert.equal(result, response);
    } finally {
        if (previousApiKey !== undefined) {
            process.env.OPENAI_API_KEY = previousApiKey;
        }
    }
});
