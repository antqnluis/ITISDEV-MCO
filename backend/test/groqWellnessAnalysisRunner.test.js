const assert = require("node:assert/strict");
const test = require("node:test");

const {
  MODEL,
  SYNTHETIC_FIXTURE,
  buildWellnessPrompt,
  parseWellnessPayload,
  printLiveResult,
  runLiveGroqWellnessAnalysis,
  validateTestEnvironment,
  validateWellnessPayload
} = require("../scripts/testGroqWellnessAnalysis");

const validPayload = {
  risk_category: "high",
  stress_severity_level: "severe",
  primary_stress_context: "personal_wellbeing",
  weekly_summary: "The synthetic student is experiencing elevated concern.",
  reflection_keywords: ["deadlines", "commute", "exhausted"],
  recommendations: ["Protect a recovery block tonight."]
};

test("validateTestEnvironment requires only the live Groq credential", () => {
  assert.deepEqual(validateTestEnvironment({
    GROQ_API_KEY: " test-groq-key "
  }), {
    apiKey: "test-groq-key"
  });

  assert.throws(
    () => validateTestEnvironment({}),
    /GROQ_API_KEY is required/
  );
});

test("buildWellnessPrompt includes every synthetic input and output field", () => {
  const prompt = buildWellnessPrompt(SYNTHETIC_FIXTURE);

  for (const score of Object.values(SYNTHETIC_FIXTURE.scores)) {
    assert.match(prompt, new RegExp(String(score).replace(".", "\\.")));
  }

  assert.ok(prompt.includes(SYNTHETIC_FIXTURE.reflection));
  assert.ok(prompt.includes(SYNTHETIC_FIXTURE.supportText));
  assert.ok(prompt.includes('"weekly_summary"'));
  assert.ok(prompt.includes('"recommendations"'));
});

test("validateWellnessPayload accepts a database-compatible response", () => {
  assert.equal(validateWellnessPayload(validPayload), validPayload);
  assert.deepEqual(
    parseWellnessPayload(JSON.stringify(validPayload)),
    validPayload
  );
});

test("validateWellnessPayload rejects invalid enum, summary, keyword, and recommendation fields", () => {
  const cases = [
    {
      payload: { ...validPayload, risk_category: "urgent" },
      message: /risk_category/
    },
    {
      payload: { ...validPayload, stress_severity_level: "extreme" },
      message: /stress_severity_level/
    },
    {
      payload: { ...validPayload, primary_stress_context: "finances" },
      message: /primary_stress_context/
    },
    {
      payload: { ...validPayload, weekly_summary: " " },
      message: /weekly_summary/
    },
    {
      payload: { ...validPayload, reflection_keywords: ["Deadlines", "commute", "exhausted"] },
      message: /lowercase/
    },
    {
      payload: { ...validPayload, reflection_keywords: ["deadlines", "commute"] },
      message: /reflection_keywords/
    },
    {
      payload: { ...validPayload, recommendations: [] },
      message: /recommendations/
    }
  ];

  for (const scenario of cases) {
    assert.throws(
      () => validateWellnessPayload(scenario.payload),
      scenario.message
    );
  }

  assert.throws(() => parseWellnessPayload("not-json"), /invalid JSON/);
});

test("runLiveGroqWellnessAnalysis calls the expected model and parses its response", async () => {
  let request;
  const groq = {
    chat: {
      completions: {
        async create(value) {
          request = value;
          return {
            model: MODEL,
            choices: [{
              finish_reason: "stop",
              message: { content: JSON.stringify(validPayload) }
            }],
            usage: { total_tokens: 100 }
          };
        }
      }
    }
  };

  const result = await runLiveGroqWellnessAnalysis({ groq });

  assert.equal(request.model, MODEL);
  assert.deepEqual(request.response_format, { type: "json_object" });
  assert.equal(request.temperature, 0);
  assert.ok(request.messages[0].content.includes(SYNTHETIC_FIXTURE.reflection));
  assert.deepEqual(result, {
    payload: validPayload,
    model: MODEL,
    finishReason: "stop",
    usage: { total_tokens: 100 }
  });
});

test("printLiveResult displays the generated payload and token usage", () => {
  const output = [];
  const logger = { log: (value) => output.push(String(value)) };

  printLiveResult({
    payload: validPayload,
    model: MODEL,
    finishReason: "stop",
    usage: { total_tokens: 100 }
  }, logger);

  const text = output.join("\n");
  assert.match(text, /contract test passed/);
  assert.ok(text.includes(MODEL));
  assert.ok(text.includes(validPayload.weekly_summary));
  assert.match(text, /100/);
});
