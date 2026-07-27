const test = require("node:test");
const assert = require("node:assert/strict");
const { analysisUnavailable } = require("../src/routes/AI_analysis");

test("AI analysis returns a stable unavailable response while disabled", () => {
    const response = {
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

    const result = analysisUnavailable({}, response);

    assert.equal(response.statusCode, 503);
    assert.deepEqual(response.payload, {
        success: false,
        message: "AI analysis is currently unavailable"
    });
    assert.equal(result, response);
});
